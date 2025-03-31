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
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client := NewClient(conn, user)

	h.hub.Register <- client

	go client.WriteMessage()
	client.ReadMessage(h.hub, h.db, ctx)
}

func (h *Handler) InviteUsersToGroup(c *gin.Context) {
	ctx := c.Request.Context()
	user, err := util.GetUser(c, h.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req InviteUsersToGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	UserGroup, err := h.db.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if !UserGroup.Admin {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not admin"})
		return
	}

	users, err := h.db.GetUsersByEmails(ctx, req.Emails)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var user_groups []db.UserGroup

	for _, user := range users {
		user_group, err := h.db.InsertUserGroup(ctx, db.InsertUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}, Admin: false})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		user_groups = append(user_groups, user_group)
		if client, ok := h.hub.Clients[user.ID]; ok {
			h.hub.AddClientToGroup(client, req.GroupID)
			client.AddGroup(req.GroupID)
		}
	}

	c.JSON(http.StatusOK, user_groups)
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

	UserGroup, err := h.db.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user_group, err := h.db.DeleteUserGroup(ctx, db.DeleteUserGroupParams{UserID: pgtype.Int4{Int32: userToKick.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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

	_, err = qtx.InsertUserGroup(ctx, db.InsertUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: group.ID, Valid: true}, Admin: true})
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
	if _, ok := h.hub.Groups[groupID]; !ok {
		h.hub.Groups[groupID] = &Group{
			ID:      groupID,
			Name:    name,
			Clients: make(map[int32]*Client),
		}
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
			fmt.Fprintf(os.Stderr, "Error retrieving groups: %v\n", err)
			c.JSON(http.StatusInternalServerError, err)
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

	deleteParams := db.DeleteUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: groupID, Valid: true}}

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
					c.JSON(http.StatusInternalServerError, "Failed to assign new admin")
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
			fmt.Fprintf(os.Stderr, "Error retrieving users: %v\n", err)
			c.JSON(http.StatusInternalServerError, err)
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
