package ws

import (
	"chat-app-server/db"
	"chat-app-server/util"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
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
		return true
	},
}

func (h *Handler) EstablishConnection(c *gin.Context) {
	user, err := util.GetUser(c, h.db)
	if err != nil {
		log.Printf("Error getting user for WebSocket connection: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client := NewClient(conn, user)
	log.Printf("Client %d (%s) connected.", client.User.ID, client.User.Username)

	h.hub.Register <- client

	defer func() {
		log.Printf("Initiating cleanup for client %d (%s).", client.User.ID, client.User.Username)
		h.hub.Unregister <- client
		client.cancel()
		err := client.conn.Close()
		if err != nil {
			log.Printf("Error closing connection for client %d: %v", client.User.ID, err)
		}
		log.Printf("Cleanup finished for client %d.", client.User.ID)
	}()

	go client.WriteMessage()
	client.ReadMessage(h.hub, h.db)
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				log.Printf("User %d already in group %d, skipping invite.", user.ID, req.GroupID)
				continue
			} else {
				log.Printf("Error inserting user_group for user %d: %v", user.ID, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add one or more users to the group"})
				return
			}
		}
		successfulInvites = append(successfulInvites, userGroup)
		invitedUserIDs = append(invitedUserIDs, user.ID)
	}

	err = tx.Commit(ctx)

	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize group creation"})
		return
	}

	for _, userID := range invitedUserIDs {
		if client, ok := h.hub.Clients[userID]; ok {
			h.hub.AddClientToGroup(client, req.GroupID)
			client.AddGroup(req.GroupID)
		}
	}

	c.JSON(http.StatusOK, successfulInvites)
}

func (h *Handler) RemoveUserFromGroup(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req RemoveUserFromGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	UserGroup, err := h.db.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{
		UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if !UserGroup.Admin {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not admin"})
		return
	}

	userToKick, err := h.db.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User specified for removal not found"})
		} else {
			log.Printf("Error fetching user to remove %s: %v", req.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user information"})
		}
		return
	}

	user_group, err := h.db.DeleteUserGroup(ctx, db.DeleteUserGroupParams{
		UserID:  pgtype.Int4{Int32: userToKick.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User was not found in the group for removal"})
		} else {
			log.Printf("Error removing user %d from group %d: %v", userToKick.ID, req.GroupID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user from group"})
		}
		return
	}

	if client, ok := h.hub.Clients[userToKick.ID]; ok {
		h.hub.RemoveClientFromGroup(client, req.GroupID)
		client.RemoveGroup(req.GroupID)
	}

	c.JSON(http.StatusOK, user_group)
}

func (h *Handler) CreateGroup(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
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

	if req.StartTime.Before(time.Now().Add(-1 * time.Minute)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be in the future"})
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

	params := db.InsertGroupParams{
		Name: req.Name,
		StartTime: pgtype.Timestamp{
			Time:  req.StartTime,
			Valid: true,
		},
		EndTime: pgtype.Timestamp{
			Time:  req.EndTime,
			Valid: true,
		},
	}
	group, err := qtx.InsertGroup(ctx, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = qtx.InsertUserGroup(ctx, db.InsertUserGroupParams{
		UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: group.ID, Valid: true},
		Admin:   true,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err = tx.Commit(ctx)

	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize group creation"})
		return
	}

	h.InitializeGroup(group.ID, group.Name)

	if client, ok := h.hub.Clients[user.ID]; ok {
		h.hub.AddClientToGroup(client, group.ID)
		client.AddGroup(group.ID)
	}

	c.JSON(http.StatusOK, group)
}

func (h *Handler) InitializeGroup(groupID int32, name string) {
	h.hub.mutex.Lock()
	defer h.hub.mutex.Unlock()

	if _, ok := h.hub.Groups[groupID]; !ok {
		h.hub.Groups[groupID] = &Group{
			ID:      groupID,
			Name:    name,
			Clients: make(map[int32]*Client),
		}
		log.Printf("Initialized hub group structure for group %d", groupID)
	}
}

func (h *Handler) GetGroups(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	groups, err := h.db.GetGroupsForUser(ctx, user.ID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
			groups = make([]db.GetGroupsForUserRow, 0)
		} else {
			log.Printf("Error retrieving data [groups]: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve data"})
			return
		}
	}
	if len(groups) == 0 {
		groups = make([]db.GetGroupsForUserRow, 0)
	}
	c.JSON(http.StatusOK, groups)
}

func (h *Handler) GetUsersInGroup(c *gin.Context) {
	ctx := c.Request.Context()
	ID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	groupID := int32(ID)

	users, err := h.db.GetAllUsersInGroup(ctx, groupID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *Handler) LeaveGroup(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err})
		return
	}

	ID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	groupID := int32(ID)

	tx, err := h.conn.Begin(ctx)

	if err != nil {
		log.Printf("Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start database operation"})
		return
	}

	defer tx.Rollback(ctx)

	qtx := h.db.WithTx(tx)

	deleteParams := db.DeleteUserGroupParams{
		UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: groupID, Valid: true},
	}

	deletedUserGroup, err := qtx.DeleteUserGroup(ctx, deleteParams)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User is not a member of this group"})
		} else {
			log.Printf("Error deleting user_group link: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user from group"})
		}
		return
	}

	remainingUserGroups, err := qtx.GetAllUserGroupsForGroup(ctx, pgtype.Int4{Int32: groupID, Valid: true})
	groupIsEmpty := false
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
			groupIsEmpty = true
			err = nil
		} else {
			log.Printf("Error retrieving remaining user_groups: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check group status"})
			return
		}
	} else if len(remainingUserGroups) == 0 {
		groupIsEmpty = true
	}

	if groupIsEmpty {
		_, err = qtx.DeleteGroup(ctx, groupID)
		if err != nil {
			log.Printf("Error deleting empty group %d: %v", groupID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clean up empty group"})
			return
		}
	} else {
		if deletedUserGroup.Admin {
			anyAdmin := false
			for _, ug := range remainingUserGroups {
				if ug.Admin {
					anyAdmin = true
					break
				}
			}
			if !anyAdmin && len(remainingUserGroups) > 0 {
				promoteParams := db.UpdateUserGroupParams{
					UserID:  remainingUserGroups[0].UserID,
					GroupID: remainingUserGroups[0].GroupID,
					Admin:   true,
				}
				_, err = qtx.UpdateUserGroup(ctx, promoteParams)
				if err != nil {
					log.Printf("Error promoting new admin for group %d: %v", groupID, err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign new admin"})
					return
				}
			}
		}
	}

	err = tx.Commit(ctx)

	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize group creation"})
		return
	}

	if client, ok := h.hub.Clients[user.ID]; ok {
		h.hub.RemoveClientFromGroup(client, groupID)
		client.RemoveGroup(groupID)
	}

	c.JSON(http.StatusOK, deletedUserGroup)
}

func (h *Handler) GetRelevantUsers(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	users, err := h.db.GetRelevantUsers(ctx, pgtype.Int4{Int32: user.ID, Valid: true})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
			users = make([]db.GetRelevantUsersRow, 0)
		} else {
			log.Printf("Error retrieving data [messages]: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve data"})
			return
		}
	}

	c.JSON(http.StatusOK, users)
}

func (h *Handler) GetRelevantMessages(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	dbMessages, err := h.db.GetRelevantMessages(ctx, pgtype.Int4{Int32: user.ID, Valid: true})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
			dbMessages = make([]db.GetRelevantMessagesRow, 0)
		} else {
			fmt.Fprintf(os.Stderr, "Error retrieving messages: %v\n", err)
			c.JSON(http.StatusInternalServerError, err)
			return
		}
	}

	messages := make([]Message, 0)
	for _, message := range dbMessages {
		messages = append(messages, Message{
			ID:      message.ID,
			Content: message.Content,
			GroupID: message.GroupID.Int32,
			User: MessageUser{ID: message.UserID.Int32,
				Username: message.Username},
			Timestamp: message.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, messages)
}
