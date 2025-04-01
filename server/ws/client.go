package ws

import (
	"chat-app-server/db"
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Client struct {
	conn    *websocket.Conn
	Message chan *Message
	Groups  map[int32]bool
	User    db.GetUserByIdRow `json:"user"`
	mutex   sync.RWMutex
	ctx     context.Context
	cancel  context.CancelFunc
}

type MessageUser struct {
	ID       int32  `json:"id"`
	Username string `json:"username"`
}

type Message struct {
	ID        int32            `json:"id"`
	Content   string           `json:"content"`
	GroupID   int32            `json:"group_id"`
	User      MessageUser      `json:"user"`
	Timestamp pgtype.Timestamp `json:"timestamp"`
}

type RawMessage struct {
	Content  string `json:"content"`
	SenderID int32  `json:"sender_id"`
	GroupID  int32  `json:"group_id"`
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
)

func NewClient(conn *websocket.Conn, user db.GetUserByIdRow) *Client {
	ctx, cancel := context.WithCancel(context.Background())
	return &Client{
		conn:    conn,
		Message: make(chan *Message, 5),
		Groups:  make(map[int32]bool),
		User:    user,
		ctx:     ctx,
		cancel:  cancel,
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
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		log.Printf("WriteMessage goroutine for client %d exiting.", c.User.ID)
	}()
	for {
		select {
		case message, ok := <-c.Message:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				log.Printf("Client %d message channel closed by hub.", c.User.ID)
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.conn.WriteJSON(message)
			if err != nil {
				log.Printf("Error writing JSON for client %d: %v", c.User.ID, err)
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Error sending ping for client %d: %v", c.User.ID, err)
				return
			}
		case <-c.ctx.Done():
			log.Printf("Context cancelled for client %d, stopping writer.", c.User.ID)
			return
		}
	}
}

func (c *Client) ReadMessage(hub *Hub, queries *db.Queries) {
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var rawMessage RawMessage
		err := c.conn.ReadJSON(&rawMessage)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure) {
				log.Printf("Unexpected close error for client %d: %v", c.User.ID, err)
			} else if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				log.Printf("Context error reading message for client %d: %v", c.User.ID, err)
			} else {
				log.Printf("Read error for client %d: %v", c.User.ID, err)
			}
			break
		}

		if rawMessage.SenderID != c.User.ID {
			log.Printf("Unauthorized message attempt: claimed sender %d, actual user %d",
				rawMessage.SenderID, c.User.ID)
			continue
		}

		_, err = queries.GetUserGroupByGroupIDAndUserID(c.ctx, db.GetUserGroupByGroupIDAndUserIDParams{
			UserID:  pgtype.Int4{Int32: c.User.ID, Valid: true},
			GroupID: pgtype.Int4{Int32: rawMessage.GroupID, Valid: true},
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				log.Printf("User %d attempted to send message to unauthorized group %d (not a member)",
					c.User.ID, rawMessage.GroupID)
			} else {
				log.Printf("DB error checking group auth for user %d, group %d: %v",
					c.User.ID, rawMessage.GroupID, err)
			}
			continue
		}

		msg := &Message{
			Content: rawMessage.Content,
			GroupID: rawMessage.GroupID,
			User:    MessageUser{ID: c.User.ID, Username: c.User.Username},
		}

		select {
		case hub.Broadcast <- msg:
		case <-c.ctx.Done():
			log.Printf("Context cancelled for client %d while trying to broadcast.", c.User.ID)
			return
		default:
			log.Printf("Hub broadcast channel full for client %d. Message dropped.", c.User.ID)
		}
	}
	log.Printf("ReadMessage loop for client %d exiting.", c.User.ID)
}
