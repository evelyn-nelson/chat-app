package ws

import (
	"chat-app-server/db"
	"context"
	"errors"
	"log"
	"net"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Client struct {
	conn    *websocket.Conn
	Message chan *Message
	Groups  map[uuid.UUID]bool
	User    *db.GetUserByIdRow `json:"user"`
	mutex   sync.RWMutex
	ctx     context.Context
	cancel  context.CancelFunc
}
type MessageUser struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
}

type Message struct {
	ID        uuid.UUID        `json:"id"`
	Content   string           `json:"content"`
	GroupID   uuid.UUID        `json:"group_id"`
	User      MessageUser      `json:"user"`
	Timestamp pgtype.Timestamp `json:"timestamp"`
}

type RawMessage struct {
	Content  string    `json:"content"`
	SenderID uuid.UUID `json:"sender_id"`
	GroupID  uuid.UUID `json:"group_id"`
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
)

func NewClient(conn *websocket.Conn, user *db.GetUserByIdRow) *Client {
	ctx, cancel := context.WithCancel(context.Background())
	return &Client{
		conn:    conn,
		Message: make(chan *Message, 10),
		Groups:  make(map[uuid.UUID]bool),
		User:    user,
		ctx:     ctx,
		cancel:  cancel,
	}
}

func (c *Client) AddGroup(groupID uuid.UUID) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.Groups[groupID] = true
}

func (c *Client) RemoveGroup(groupID uuid.UUID) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	delete(c.Groups, groupID)
}

func (c *Client) WriteMessage() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		log.Printf("WriteMessage goroutine for client %d (%s) exiting.", c.User.ID, c.User.Username)
	}()

	for {
		select {
		case message, ok := <-c.Message:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("Client %d (%s): Error setting write deadline: %v", c.User.ID, c.User.Username, err)
				return
			}
			if !ok {
				log.Printf("Client %d (%s) message channel closed by hub.", c.User.ID, c.User.Username)
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.conn.WriteJSON(message)
			if err != nil {
				log.Printf("Error writing JSON for client %d (%s): %v", c.User.ID, c.User.Username, err)
				return
			}
		case <-ticker.C:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("Client %d (%s): Error setting write deadline for ping: %v", c.User.ID, c.User.Username, err)
				return
			}
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Error sending ping for client %d (%s): %v", c.User.ID, c.User.Username, err)
				return
			}
		case <-c.ctx.Done():
			log.Printf("Context cancelled for client %d (%s), stopping writer.", c.User.ID, c.User.Username)
			return
		}
	}
}

func (c *Client) ReadMessage(hub *Hub, queries *db.Queries) {
	defer func() {
		log.Printf("ReadMessage loop for client %d (%s) exiting.", c.User.ID, c.User.Username)
	}()

	c.conn.SetReadLimit(maxMessageSize)
	if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Printf("Client %d (%s): Error setting initial read deadline: %v", c.User.ID, c.User.Username, err)
		return
	}
	c.conn.SetPongHandler(func(string) error {
		log.Printf("Client %d (%s) received pong.", c.User.ID, c.User.Username)
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		select {
		case <-c.ctx.Done():
			log.Printf("Client %d (%s): Context cancelled, stopping reader.", c.User.ID, c.User.Username)
			return
		default:
		}

		var rawMessage RawMessage
		err := c.conn.ReadJSON(&rawMessage)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("Client %d (%s): Unexpected WebSocket close error: %v", c.User.ID, c.User.Username, err)
			} else if ne, ok := err.(net.Error); ok && ne.Timeout() {
				log.Printf("Client %d (%s): WebSocket read timeout (no pong or message): %v", c.User.ID, c.User.Username, err)
			} else if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				log.Printf("Client %d (%s): Context error during WebSocket read: %v", c.User.ID, c.User.Username, err)
			} else if err.Error() == "websocket: close sent" || err.Error() == "websocket: close 1000 (normal)" {
				log.Printf("Client %d (%s): WebSocket connection closed normally.", c.User.ID, c.User.Username)
			} else {
				log.Printf("Client %d (%s): WebSocket read error: %v", c.User.ID, c.User.Username, err)
			}
			return
		}

		if rawMessage.SenderID != c.User.ID {
			log.Printf("Client %d (%s): Unauthorized message - claimed sender %d, actual user %d. Discarding.",
				c.User.ID, c.User.Username, rawMessage.SenderID, c.User.ID)
			continue
		}

		_, dbErr := queries.GetUserGroupByGroupIDAndUserID(c.ctx, db.GetUserGroupByGroupIDAndUserIDParams{
			UserID:  &c.User.ID,
			GroupID: &rawMessage.GroupID,
		})
		if dbErr != nil {
			if errors.Is(dbErr, pgx.ErrNoRows) {
				log.Printf("Client %d (%s) attempted to send message to unauthorized group %d (not a member per DB). Discarding.",
					c.User.ID, c.User.Username, rawMessage.GroupID)
			} else {
				log.Printf("Client %d (%s): DB error checking group %d authorization: %v. Discarding message.",
					c.User.ID, c.User.Username, rawMessage.GroupID, dbErr)
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
			log.Printf("Client %d (%s) sent message to hub for group %d", c.User.ID, c.User.Username, msg.GroupID)
		case <-c.ctx.Done():
			log.Printf("Client %d (%s): Context cancelled while trying to broadcast message.", c.User.ID, c.User.Username)
			return
		default:
			log.Printf("Hub broadcast channel full for client %d (%s). Message for group %d dropped.", c.User.ID, c.User.Username, msg.GroupID)
		}
	}
}
