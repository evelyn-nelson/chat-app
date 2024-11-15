package ws

import (
	"chat-app-server/db"
	"context"
	"database/sql"
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

func (h *Handler) CreateGroup(c *gin.Context) {
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	group, err := h.db.InsertGroup(h.ctx, req.Name)
	groupID := fmt.Sprintf("%v", group.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.db.GetUserByUsername(h.ctx, req.Username)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		fmt.Println("No user found with that ID")
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = h.db.InsertUserGroup(h.ctx, db.InsertUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: group.ID, Valid: true}, Admin: true})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.InitializeGroup(groupID, group.Name)

	res := CreateGroupResponse{
		Name: req.Name,
		ID:   groupID,
	}

	c.JSON(http.StatusOK, res)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (h *Handler) JoinGroup(c *gin.Context) {
	groupID := c.Param("groupID")
	ID, err := strconv.Atoi(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	int32GroupID := int32(ID)

	username := c.Query("username")

	user, err := h.db.GetUserByUsername(h.ctx, username)

	if err != nil {
		if err.Error() == "no rows in result set" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	_, err = h.db.GetUserGroupByGroupIDAndUserID(h.ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: int32GroupID, Valid: true}})
	if err != nil {
		if err.Error() == "no rows in result set" {
			_, err = h.db.InsertUserGroup(h.ctx, db.InsertUserGroupParams{
				UserID:  pgtype.Int4{Int32: user.ID, Valid: true},
				GroupID: pgtype.Int4{Int32: int32GroupID, Valid: true},
			})
			if err != nil {
				fmt.Println("InsertUserGroup error: ", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	group, err := h.db.GetGroupById(h.ctx, int32GroupID)

	if err != nil {
		if err.Error() == "no rows in result set" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	cl := &Client{
		Conn:    conn,
		Message: make(chan *Message, 10),
		GroupID: groupID,
		User:    db.GetUserByIdRow(user),
	}
	h.InitializeGroup(groupID, group.Name)
	// join new user and
	h.hub.Register <- cl

	go cl.writeMessage()
	cl.readMessage(h.hub)
}

func (h *Handler) InitializeGroup(groupID string, name string) {
	if _, ok := h.hub.Groups[groupID]; !ok {
		h.hub.Groups[groupID] = &Group{
			ID:      groupID,
			Name:    name,
			Clients: make(map[string]*Client),
		}
	}
}

func (h *Handler) CreateAndJoinGroup(c *gin.Context) {
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.db.GetUserByUsername(h.ctx, req.Username)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		fmt.Println("No user found with that ID")
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	group, err := h.db.InsertGroup(h.ctx, req.Name)
	groupID := fmt.Sprintf("%v", group.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err = h.db.InsertUserGroup(h.ctx, db.InsertUserGroupParams{UserID: pgtype.Int4{Int32: user.ID, Valid: true}, GroupID: pgtype.Int4{Int32: group.ID, Valid: true}, Admin: true})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.InitializeGroup(groupID, group.Name)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cl := &Client{
		Conn:    conn,
		GroupID: groupID,
		Message: make(chan *Message, 10),
		User:    db.GetUserByIdRow(user),
	}

	res := CreateGroupResponse{
		Name: group.Name,
		ID:   groupID,
	}

	h.hub.Register <- cl

	c.JSON(http.StatusOK, res)

	go cl.writeMessage()
	cl.readMessage(h.hub)

}

func (h *Handler) GetGroups(c *gin.Context) {
	groups, err := h.db.GetAllGroups(h.ctx)

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
