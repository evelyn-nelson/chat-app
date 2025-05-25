package ws

import (
	"chat-app-server/auth"
	"chat-app-server/db"
	"chat-app-server/util"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	hub  *Hub
	db   *db.Queries
	ctx  context.Context
	conn *pgxpool.Pool
}

func NewHandler(h *Hub, db *db.Queries, ctx context.Context, conn *pgxpool.Pool) *Handler {
	return &Handler{hub: h, db: db, ctx: ctx, conn: conn}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development. In production, restrict this.
		return true
	},
}

const (
	authTimeout = 10 * time.Second
)

type AuthMessage struct {
	Type  string `json:"type"`
	Token string `json:"token"`
}

type ServerResponseMessage struct {
	Type    string `json:"type"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

func (h *Handler) EstablishConnection(c *gin.Context) {
	requestCtx := c.Request.Context()

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer func() {
		log.Printf("Closing WebSocket connection from EstablishConnection for remote addr: %s", conn.RemoteAddr())
		conn.Close()
	}()

	var userID int32
	var user *db.GetUserByIdRow
	isAuthenticated := false

	if err := conn.SetReadDeadline(time.Now().Add(authTimeout)); err != nil {
		log.Printf("Error setting read deadline for auth: %v", err)
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Internal error during setup"))
		return
	}

	messageType, messageBytes, err := conn.ReadMessage()

	if err := conn.SetReadDeadline(time.Time{}); err != nil {
		log.Printf("Error resetting read deadline post-auth: %v", err)
	}

	if err != nil {
		log.Printf("Error reading auth message: %v", err)
		closeCode := websocket.ClosePolicyViolation
		errMsg := "Authentication error"
		if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseTryAgainLater) {
			log.Printf("Client disconnected before authenticating: %v", err)
			return
		} else if e, ok := err.(*websocket.CloseError); ok {
			log.Printf("Client sent close frame during auth phase: %v", e)
			return
		} else if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
			log.Println("Authentication timeout")
			errMsg = "Authentication timeout"
		}
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(closeCode, errMsg))
		return
	}

	if messageType == websocket.TextMessage {
		var authMsg AuthMessage
		if err := json.Unmarshal(messageBytes, &authMsg); err == nil && authMsg.Type == "auth" {
			extractedUserID, validationErr := auth.ValidateToken(authMsg.Token)
			if validationErr == nil {
				fetchedUser, dbErr := h.db.GetUserById(requestCtx, extractedUserID)
				if dbErr == nil {
					userID = extractedUserID
					user = &fetchedUser
					isAuthenticated = true
					log.Printf("User %d (%s) authenticated successfully via WebSocket.", userID, user.Username)
					response := ServerResponseMessage{Type: "auth_success", Message: "Authentication successful"}
					if err := conn.WriteJSON(response); err != nil {
						log.Printf("Error sending auth_success to user %d: %v", userID, err)
						// Don't immediately close; client might still proceed if they received it.
						// But this is a bad sign.
					}
				} else {
					log.Printf("Auth failed: could not fetch user data for ID %d: %v", extractedUserID, dbErr)
					response := ServerResponseMessage{Type: "auth_failure", Error: "Authentication failed: User data unavailable."}
					conn.WriteJSON(response)
					conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "Authentication failed"))
					return
				}
			} else {
				log.Printf("Authentication failed (token validation): %v", validationErr)
				response := ServerResponseMessage{Type: "auth_failure", Error: validationErr.Error()}
				conn.WriteJSON(response)
				conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "Authentication failed"))
				return
			}
		} else {
			log.Printf("Invalid or non-auth message received as first message. Type: %d, JSON Err: %v", messageType, err)
			response := ServerResponseMessage{Type: "auth_failure", Error: "Invalid or missing authentication message."}
			conn.WriteJSON(response)
			conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "Authentication required"))
			return
		}
	} else {
		log.Printf("Received non-text message type (%d) during authentication phase.", messageType)
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseUnsupportedData, "Expected text message for authentication."))
		return
	}

	if !isAuthenticated {
		log.Println("Critical internal error: Authentication incomplete but code proceeded.")
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Internal authentication error."))
		return
	}

	client := NewClient(conn, user) // NewClient creates its own context for the client's goroutines
	log.Printf("Client %d (%s) connected. Remote: %s", client.User.ID, client.User.Username, conn.RemoteAddr())

	h.hub.Register <- client

	defer func() {
		log.Printf("Initiating cleanup for client %d (%s).", client.User.ID, client.User.Username)
		h.hub.Unregister <- client
		log.Printf("Cleanup process initiated via defer for client %d (%s).", client.User.ID, client.User.Username)
	}()

	go client.WriteMessage()
	client.ReadMessage(h.hub, h.db)

	// When ReadMessage returns, the defer above will execute.
	log.Printf("EstablishConnection goroutine for client %d (%s) exiting.", client.User.ID, client.User.Username)
}

func (h *Handler) InviteUsersToGroup(c *gin.Context) {
	ctx := c.Request.Context()
	invitingUser, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	var req InviteUsersToGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inviterUserGroup, err := h.db.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{
		UserID:  pgtype.Int4{Int32: invitingUser.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Inviting user not part of the group"})
		} else {
			log.Printf("Error checking inviter admin status: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check user permissions"})
		}
		return
	}
	if !inviterUserGroup.Admin {
		c.JSON(http.StatusForbidden, gin.H{"error": "User does not have admin privileges for this group"})
		return
	}

	usersToInvite, err := h.db.GetUsersByEmails(ctx, req.Emails)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to retrieve users by email: " + err.Error()})
		return
	}

	if len(usersToInvite) == 0 {
		c.JSON(http.StatusOK, []db.UserGroup{})
		return
	}

	tx, err := h.conn.Begin(ctx)
	if err != nil {
		log.Printf("Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start database operation"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.db.WithTx(tx)
	var successfulInvites []db.UserGroup
	var invitedUserIDs []int32

	for _, user := range usersToInvite {
		userGroup, err := qtx.InsertUserGroup(ctx, db.InsertUserGroupParams{
			UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
			GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true},
			Admin:   false,
		})
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" { // Unique violation
				log.Printf("User %d already in group %d, skipping invite.", user.ID, req.GroupID)
				continue
			} else {
				log.Printf("Error inserting user_group for user %d, group %d: %v", user.ID, req.GroupID, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add one or more users to the group"})
				return
			}
		}
		successfulInvites = append(successfulInvites, userGroup)
		invitedUserIDs = append(invitedUserIDs, user.ID)
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("Failed to commit transaction for inviting users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize group invitations"})
		return
	}

	for _, userID := range invitedUserIDs {
		select {
		case h.hub.AddUserToGroupChan <- &AddClientToGroupMsg{UserID: userID, GroupID: req.GroupID}:
			log.Printf("Sent request to hub to process user %d addition to group %d", userID, req.GroupID)
		case <-ctx.Done():
			log.Printf("Context cancelled while trying to send AddUserToGroupChan for user %d, group %d", userID, req.GroupID)
			return
		default:
			log.Printf("Warning: Hub AddUserToGroupChan is full. Update for user %d group %d might be delayed or dropped.", userID, req.GroupID)
		}
	}
	c.JSON(http.StatusOK, successfulInvites)
}

func (h *Handler) RemoveUserFromGroup(c *gin.Context) {
	ctx := c.Request.Context()
	requestingUser, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	var req RemoveUserFromGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userGroup, err := h.db.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{
		UserID:  pgtype.Int4{Int32: requestingUser.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Requesting user not part of the group"})
		} else {
			log.Printf("Error checking admin status for user %d in group %d: %v", requestingUser.ID, req.GroupID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check user permissions"})
		}
		return
	}
	if !userGroup.Admin {
		c.JSON(http.StatusForbidden, gin.H{"error": "User does not have admin privileges to remove members from this group"})
		return
	}

	userToKick, err := h.db.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User specified for removal not found by email"})
		} else {
			log.Printf("Error fetching user to remove by email %s: %v", req.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user information for removal"})
		}
		return
	}

	if userToKick.ID == requestingUser.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Admins cannot remove themselves using this endpoint; use 'Leave Group' instead."})
		return
	}

	deletedUserGroup, err := h.db.DeleteUserGroup(ctx, db.DeleteUserGroupParams{
		UserID:  pgtype.Int4{Int32: userToKick.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User was not found in the group for removal"})
		} else {
			log.Printf("Error removing user %d from group %d: %v", userToKick.ID, req.GroupID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user from group"})
		}
		return
	}

	select {
	case h.hub.RemoveUserFromGroupChan <- &RemoveClientFromGroupMsg{UserID: userToKick.ID, GroupID: req.GroupID}:
		log.Printf("Sent request to hub to process user %d removal from group %d", userToKick.ID, req.GroupID)
	case <-ctx.Done():
		log.Printf("Context cancelled while trying to send RemoveUserFromGroupChan for user %d, group %d", userToKick.ID, req.GroupID)
		return
	default:
		log.Printf("Warning: Hub RemoveUserFromGroupChan is full. Update for user %d group %d might be delayed or dropped.", userToKick.ID, req.GroupID)
	}
	c.JSON(http.StatusOK, deletedUserGroup)
}

func (h *Handler) CreateGroup(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.EndTime.Before(req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}
	if req.StartTime.Before(time.Now().Add(-1 * time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be in the future"})
		return
	}

	tx, err := h.conn.Begin(ctx)
	if err != nil {
		log.Printf("Failed to begin transaction for group creation: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start database operation"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.db.WithTx(tx)
	groupParams := db.InsertGroupParams{
		Name:        req.Name,
		StartTime:   pgtype.Timestamp{Time: req.StartTime, Valid: true},
		EndTime:     pgtype.Timestamp{Time: req.EndTime, Valid: true},
		Description: util.NullablePgText(req.Description),
		Location:    util.NullablePgText(req.Location),
		ImageUrl:    util.NullablePgText(req.ImageUrl),
	}
	group, err := qtx.InsertGroup(ctx, groupParams)
	if err != nil {
		log.Printf("Error inserting group: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	_, err = qtx.InsertUserGroup(ctx, db.InsertUserGroupParams{
		UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: group.ID, Valid: true},
		Admin:   true,
	})
	if err != nil {
		log.Printf("Error inserting user_group for admin: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set group admin"})
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("Failed to commit transaction for group creation: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize group creation"})
		return
	}

	select {
	case h.hub.InitializeGroupChan <- &InitializeGroupMsg{GroupID: group.ID, Name: group.Name, AdminID: user.ID}:
		log.Printf("Sent request to hub to initialize group %d (%s) with admin %d", group.ID, group.Name, user.ID)
	case <-ctx.Done():
		log.Printf("Context cancelled while trying to send InitializeGroupChan for group %d", group.ID)
		return
	default:
		log.Printf("Warning: Hub InitializeGroupChan full for group %d. Initialization might be delayed or dropped.", group.ID)
	}
	c.JSON(http.StatusOK, group)
}

func (h *Handler) UpdateGroup(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	groupIDParam, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID format"})
		return
	}
	groupID := int32(groupIDParam)

	var req UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userGroup, err := h.db.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{
		GroupID: pgtype.Int4{Int32: groupID, Valid: true},
		UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusForbidden, gin.H{"error": "User does not belong to this group"})
		} else {
			log.Printf("Error fetching user_group for update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify group membership"})
		}
		return
	}
	if !userGroup.Admin {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not an admin of this group"})
		return
	}

	oldGroup, err := h.db.GetGroupById(ctx, groupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		} else {
			log.Printf("Error fetching group for update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve group details"})
		}
		return
	}

	startTime := oldGroup.StartTime.Time
	if req.StartTime != nil {
		startTime = *req.StartTime
	}
	endTime := oldGroup.EndTime.Time
	if req.EndTime != nil {
		endTime = *req.EndTime
	}
	if endTime.Before(startTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}
	if req.StartTime != nil && req.StartTime.Before(time.Now().Add(-1*time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be in the future"})
		return
	}

	updateParams := db.UpdateGroupParams{ID: groupID}
	updateParams.Name = util.NullablePgText(req.Name)
	updateParams.StartTime = util.NullablePgTimestamp(req.StartTime)
	updateParams.EndTime = util.NullablePgTimestamp(req.EndTime)
	updateParams.Description = util.NullablePgText(req.Description)
	updateParams.Location = util.NullablePgText(req.Location)
	updateParams.ImageUrl = util.NullablePgText(req.ImageUrl)

	_, err = h.db.UpdateGroup(ctx, updateParams)
	if err != nil {
		log.Printf("Error updating group %d: %v", groupID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update group"})
		return
	}

	fullGroupData, err := h.db.GetGroupWithUsersByID(
		ctx,
		db.GetGroupWithUsersByIDParams{
			GroupID:          groupID,
			RequestingUserID: pgtype.Int4{Int32: user.ID, Valid: true},
		},
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Should be rare if update succeeded, implies group vanished immediately.
			c.JSON(
				http.StatusNotFound,
				gin.H{"error": "Group not found after update"},
			)
		} else {
			log.Printf(
				"Error fetching group details after update for group %d: %v",
				groupID,
				err,
			)
			c.JSON(
				http.StatusInternalServerError,
				gin.H{"error": "Failed to retrieve updated group details"},
			)
		}
		return
	}

	var clientGroupUsers []ClientGroupUser
	groupUsersStr, ok := fullGroupData.GroupUsers.(string)
	if !ok {
		log.Printf(
			"Error: fullGroupData.GroupUsers is not type string as expected. Actual type: %T, value: %v for group %d",
			fullGroupData.GroupUsers,
			fullGroupData.GroupUsers,
			groupID,
		)
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": "Failed to process group user data (unexpected data type)"},
		)
		return
	}

	if err := json.Unmarshal(
		[]byte(groupUsersStr),
		&clientGroupUsers,
	); err != nil {
		log.Printf(
			"Error unmarshalling group_users JSON string '%s' for group %d: %v",
			groupUsersStr,
			groupID,
			err,
		)
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": "Failed to parse group user data"},
		)
		return
	}

	responseClientGroup := ClientGroup{
		ID:         fullGroupData.ID,
		Name:       fullGroupData.Name,
		CreatedAt:  fullGroupData.CreatedAt.Time,
		UpdatedAt:  fullGroupData.UpdatedAt.Time,
		GroupUsers: clientGroupUsers,
	}

	if fullGroupData.StartTime.Valid {
		responseClientGroup.StartTime = &fullGroupData.StartTime.Time
	}
	if fullGroupData.EndTime.Valid {
		responseClientGroup.EndTime = &fullGroupData.EndTime.Time
	}
	if fullGroupData.Description.Valid {
		responseClientGroup.Description = &fullGroupData.Description.String
	}
	if fullGroupData.Location.Valid {
		responseClientGroup.Location = &fullGroupData.Location.String
	}
	if fullGroupData.ImageUrl.Valid {
		responseClientGroup.ImageUrl = &fullGroupData.ImageUrl.String
	}

	if fullGroupData.Admin {
		responseClientGroup.Admin = fullGroupData.Admin
	} else {
		log.Printf(
			"Warning: Admin status from GetGroupWithUsersByID for user %d, group %d was NULL. Defaulting based on prior check.",
			user.ID,
			groupID,
		)
		responseClientGroup.Admin = userGroup.Admin
	}
	if userGroup.Admin && !responseClientGroup.Admin && fullGroupData.Admin {
		log.Printf(
			"Warning: Admin status mismatch for user %d, group %d. Initial: true, FromQuery: %v. Using query result.",
			user.ID, groupID, fullGroupData.Admin,
		)
	}

	if req.Name != nil {
		updatePayload := &GroupUpdateEventPayload{
			GroupID: fullGroupData.ID,
			Name:    fullGroupData.Name,
		}
		select {
		case h.hub.UpdateGroupInfoChan <- updatePayload:
			log.Printf(
				"Sent request to hub to process group info update for group %d",
				fullGroupData.ID,
			)
		case <-ctx.Done():
			log.Printf(
				"Context cancelled while trying to send UpdateGroupInfoChan for group %d",
				fullGroupData.ID,
			)
		default:
			log.Printf(
				"Warning: Hub UpdateGroupInfoChan full for group %d. Update might be delayed or dropped.",
				fullGroupData.ID,
			)
		}
	}

	c.JSON(http.StatusOK, UpdateGroupResponse{Group: responseClientGroup})
}

func (h *Handler) GetGroups(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	groups, err := h.db.GetGroupsForUser(ctx, user.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			groups = make([]db.GetGroupsForUserRow, 0)
		} else {
			log.Printf("Error retrieving groups for user %d: %v", user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve groups"})
			return
		}
	}
	if groups == nil {
		groups = make([]db.GetGroupsForUserRow, 0)
	}
	c.JSON(http.StatusOK, groups)
}

func (h *Handler) GetUsersInGroup(c *gin.Context) {
	ctx := c.Request.Context()
	groupIDParam, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID format"})
		return
	}
	groupID := int32(groupIDParam)

	user, err := util.GetUser(c, h.db)
	if err != nil {
		log.Printf("Error retrieving users for group %d: %v", groupID, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}
	_, err = h.db.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: groupID, Valid: true}})
	if err != nil {
		log.Printf("Error retrieving users for group %d: %v", groupID, err)
		c.JSON(http.StatusForbidden, gin.H{"error": "User does not have access to this group"})
		return
	}

	users, err := h.db.GetAllUsersInGroup(ctx, groupID)
	if err != nil {
		log.Printf("Error retrieving users for group %d: %v", groupID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users in group"})
		return
	}
	if users == nil {
		users = make([]db.GetAllUsersInGroupRow, 0)
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handler) LeaveGroup(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	groupIDParam, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID format"})
		return
	}
	groupID := int32(groupIDParam)

	tx, err := h.conn.Begin(ctx)
	if err != nil {
		log.Printf("Failed to begin transaction for leaving group: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start database operation"})
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.db.WithTx(tx)

	deletedUserGroup, err := qtx.DeleteUserGroup(ctx, db.DeleteUserGroupParams{
		UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: groupID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User is not a member of this group"})
		} else {
			log.Printf("Error deleting user_group link for user %d, group %d: %v", user.ID, groupID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user from group"})
		}
		return
	}

	remainingUserGroups, err := qtx.GetAllUserGroupsForGroup(ctx, pgtype.Int4{Int32: groupID, Valid: true})
	groupIsEmpty := false
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			groupIsEmpty = true
		} else {
			log.Printf("Error retrieving remaining user_groups for group %d: %v", groupID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check group status after leaving"})
			return
		}
	} else if len(remainingUserGroups) == 0 {
		groupIsEmpty = true
	}

	if groupIsEmpty {
		if _, err = qtx.DeleteGroup(ctx, groupID); err != nil {
			log.Printf("Error deleting empty group %d: %v", groupID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clean up empty group"})
			return
		}
		log.Printf("Group %d deleted as it became empty after user %d left.", groupID, user.ID)
	} else {
		// If the leaving user was an admin, promote another user if no admins are left.
		if deletedUserGroup.Admin {
			anyAdminLeft := false
			for _, ug := range remainingUserGroups {
				if ug.Admin {
					anyAdminLeft = true
					break
				}
			}
			if !anyAdminLeft && len(remainingUserGroups) > 0 {
				promoteParams := db.UpdateUserGroupParams{
					UserID:  remainingUserGroups[0].UserID,
					GroupID: remainingUserGroups[0].GroupID,
					Admin:   true,
				}
				if _, err = qtx.UpdateUserGroup(ctx, promoteParams); err != nil {
					log.Printf("Error promoting new admin for group %d: %v", groupID, err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign new admin"})
					return
				}
				log.Printf("User %d promoted to admin in group %d.", remainingUserGroups[0].UserID.Int32, groupID)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("Failed to commit transaction for leaving group: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize leaving group"})
		return
	}

	select {
	case h.hub.RemoveUserFromGroupChan <- &RemoveClientFromGroupMsg{UserID: user.ID, GroupID: groupID}:
		log.Printf("Sent request to hub to process user %d removal from group %d state", user.ID, groupID)
	case <-ctx.Done():
		log.Printf("Context cancelled while trying to send RemoveUserFromGroupChan for user %d, group %d", user.ID, groupID)
		return
	default:
		log.Printf("Warning: Hub RemoveUserFromGroupChan full for user %d group %d. Update might be delayed or dropped.", user.ID, groupID)
	}

	if groupIsEmpty {
		select {
		case h.hub.DeleteHubGroupChan <- &DeleteHubGroupMsg{GroupID: groupID}:
			log.Printf("Sent request to hub to delete empty group %d state", groupID)
		case <-ctx.Done():
			log.Printf("Context cancelled while trying to send DeleteHubGroupChan for group %d", groupID)
			return
		default:
			log.Printf("Warning: Hub DeleteHubGroupChan full for group %d. Deletion might be delayed or dropped.", groupID)
		}
	}
	c.JSON(http.StatusOK, deletedUserGroup)
}

func (h *Handler) GetRelevantUsers(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	users, err := h.db.GetRelevantUsers(ctx, pgtype.Int4{Int32: user.ID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			users = make([]db.GetRelevantUsersRow, 0)
		} else {
			log.Printf("Error retrieving relevant users for user %d: %v", user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve relevant users"})
			return
		}
	}
	if users == nil {
		users = make([]db.GetRelevantUsersRow, 0)
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handler) GetRelevantMessages(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	dbMessages, err := h.db.GetRelevantMessages(ctx, pgtype.Int4{Int32: user.ID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			dbMessages = make([]db.GetRelevantMessagesRow, 0)
		} else {
			log.Printf("Error retrieving relevant messages for user %d: %v", user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve relevant messages"})
			return
		}
	}

	messages := make([]Message, 0, len(dbMessages))
	for _, dbMsg := range dbMessages {
		messages = append(messages, Message{
			ID:        dbMsg.ID,
			Content:   dbMsg.Content,
			GroupID:   dbMsg.GroupID.Int32,
			User:      MessageUser{ID: dbMsg.UserID.Int32, Username: dbMsg.Username},
			Timestamp: dbMsg.CreatedAt,
		})
	}
	if messages == nil {
		messages = make([]Message, 0)
	}
	c.JSON(http.StatusOK, messages)
}
