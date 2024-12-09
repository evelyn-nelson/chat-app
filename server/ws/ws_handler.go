package ws

import (
	"chat-app-server/db"
	"chat-app-server/util"
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	hub  *Hub
	db   *db.Queries
	ctx  context.Context
	conn *pgx.Conn
}

func NewHandler(h *Hub, db *db.Queries, ctx context.Context, conn *pgx.Conn) *Handler {
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
	user, err := util.GetUser(c, h.db, h.ctx)

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
	client.ReadMessage(h.hub, h.db, h.ctx)
}

// func (h *Handler) JoinGroup(c *gin.Context) {
// 	var req JoinGroupRequest

// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}
// 	group, err := h.db.GetGroupById(h.ctx, req.ID)

// 	if err != nil {
// 		if err.Error() == "no rows in result set" {
// 			c.JSON(http.StatusUnauthorized, gin.H{"error": "Group not found"})
// 			return
// 		} else {
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 			return
// 		}
// 	}

// 	if _, ok := h.hub.Groups[group.ID]; !ok {
// 		h.hub.Groups[group.ID] = &Group{
// 			ID:   group.ID,
// 			Name: group.Name,
// 		}
// 	}

// }

func (h *Handler) InviteUsersToGroup(c *gin.Context) {
	user, err := util.GetUser(c, h.db, h.ctx)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req InviteUsersToGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	UserGroup, err := h.db.GetUserGroupByGroupIDAndUserID(h.ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if !UserGroup.Admin {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not admin"})
		return
	}

	users, err := h.db.GetUsersByEmails(h.ctx, req.Emails)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var user_groups []db.UserGroup

	for _, user := range users {
		user_group, err := h.db.InsertUserGroup(h.ctx, db.InsertUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}, Admin: false})
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
	user, err := util.GetUser(c, h.db, h.ctx)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req RemoveUserFromGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	UserGroup, err := h.db.GetUserGroupByGroupIDAndUserID(h.ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if !UserGroup.Admin {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not admin"})
		return
	}

	userToKick, err := h.db.GetUserByEmail(h.ctx, req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user_group, err := h.db.DeleteUserGroup(h.ctx, db.DeleteUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: req.GroupID, Valid: true}})
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

// func (h *Handler) JoinGroupOld(c *gin.Context) {
// 	groupIDstr := c.Param("groupID")
// 	ID, err := strconv.Atoi(groupIDstr)
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}
// 	int32GroupID := int32(ID)

// 	username := c.Query("username")

// 	user, err := h.db.GetUserByUsername(h.ctx, username)

// 	if err != nil {
// 		if err.Error() == "no rows in result set" {
// 			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
// 			return
// 		} else {
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 			return
// 		}
// 	}

// 	_, err = h.db.GetUserGroupByGroupIDAndUserID(h.ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: int32GroupID, Valid: true}})
// 	if err != nil {
// 		if err.Error() == "no rows in result set" {
// 			_, err = h.db.InsertUserGroup(h.ctx, db.InsertUserGroupParams{
// 				UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
// 				GroupID: pgtype.Int4{Int32: int32GroupID, Valid: true},
// 			})
// 			if err != nil {
// 				fmt.Println("InsertUserGroup error: ", err)
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 		} else {
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 			return
// 		}
// 	}

// 	group, err := h.db.GetGroupById(h.ctx, int32GroupID)

// 	if err != nil {
// 		if err.Error() == "no rows in result set" {
// 			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
// 			return
// 		} else {
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 			return
// 		}
// 	}

// 	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 	}

// 	cl := &Client{
// 		Conn:    conn,
// 		Message: make(chan *Message, 10),
// 		GroupID: groupID,
// 		User:    db.GetUserByIdRow(user),
// 	}
// 	h.InitializeGroup(groupID, group.Name)
// 	h.hub.Register <- cl

// 	go cl.WriteMessage()
// 	cl.ReadMessage(h.hub, h.db, h.ctx)
// }

func (h *Handler) CreateGroup(c *gin.Context) {
	user, err := util.GetUser(c, h.db, h.ctx)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	group, err := h.db.InsertGroup(h.ctx, req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.InitializeGroup(group.ID, group.Name)
	_, err = h.db.InsertUserGroup(h.ctx, db.InsertUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: group.ID, Valid: true}, Admin: true})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

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
	user, err := util.GetUser(c, h.db, h.ctx)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	groups, err := h.db.GetGroupsForUser(h.ctx, user.ID)

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error retrieving groups: %v\n", err)
		return
	}

	c.JSON(http.StatusOK, groups)
}

func (h *Handler) GetUsersInGroup(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	groupID := int32(ID)

	users, err := h.db.GetAllUsersInGroup(h.ctx, groupID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}
