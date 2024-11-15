package ws

import (
	"chat-app-server/db"
	"fmt"
	"log"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn    *websocket.Conn
	Message chan *Message
	GroupID string            `json:"groupID"`
	User    db.GetUserByIdRow `json:"user"`
}

type Message struct {
	Content string            `json:"content"`
	GroupID string            `json:"groupID"`
	User    db.GetUserByIdRow `json:"user"`
}

func (c *Client) writeMessage() {
	defer func() {
		c.Conn.Close()
	}()
	for {
		msg, ok := <-c.Message
		if !ok {
			return
		}
		fmt.Println("@@@")
		fmt.Println(msg)
		c.Conn.WriteJSON(msg)
	}
}

func (c *Client) readMessage(hub *Hub) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, m, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		msg := &Message{
			Content: string(m),
			GroupID: c.GroupID,
			User:    c.User,
		}
		hub.Broadcast <- msg
	}
}
