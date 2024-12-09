package ws

import (
	"chat-app-server/db"
	"context"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgtype"
)

type Client struct {
	Conn    *websocket.Conn
	Message chan *Message
	Groups  map[int32]bool
	User    db.GetUserByIdRow `json:"user"`
	mutex   sync.RWMutex
}

type Message struct {
	ID      int32             `json:"id"`
	Content string            `json:"content"`
	GroupID int32             `json:"group_id"`
	User    db.GetUserByIdRow `json:"user"`
}

type RawMessage struct {
	Content  string `json:"content"`
	SenderID int32  `json:"sender_id"`
	GroupID  int32  `json:"group_id"`
}

func NewClient(conn *websocket.Conn, user db.GetUserByIdRow) *Client {
	return &Client{
		Conn:    conn,
		Message: make(chan *Message, 5),
		Groups:  make(map[int32]bool),
		User:    user,
	}
}

func (c *Client) AddGroup(groupID int32) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.Groups[groupID] = true
}

func (c *Client) RemoveGroup(groupID int32) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	delete(c.Groups, groupID)
}

func (c *Client) WriteMessage() {
	defer c.Conn.Close()
	for msg := range c.Message {
		err := c.Conn.WriteJSON(msg)
		if err != nil {
			log.Printf("Error writing message: %v", err)
			return
		}
	}
}
func (c *Client) ReadMessage(hub *Hub, queries *db.Queries, ctx context.Context) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		var rawMessage RawMessage
		err := c.Conn.ReadJSON(&rawMessage)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		if rawMessage.SenderID != c.User.ID {
			log.Printf("Unauthorized message attempt: claimed sender %d, actual user %d",
				rawMessage.SenderID, c.User.ID)
			continue
		}

		_, err = queries.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{
			UserID:  pgtype.Int4{Int32: c.User.ID, Valid: true},
			GroupID: pgtype.Int4{Int32: rawMessage.GroupID, Valid: true},
		})
		if err != nil {
			log.Printf("User %d attempted to send message to unauthorized group %d",
				c.User.ID, rawMessage.GroupID)
			continue
		}

		msg := &Message{
			Content: rawMessage.Content,
			GroupID: rawMessage.GroupID,
			User:    c.User,
		}

		hub.Broadcast <- msg
	}
}
