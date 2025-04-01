package ws

import (
	"chat-app-server/db"
	"context"
	"fmt"
	"log"
	"os"
	"sync"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Group struct {
	ID      int32             `json:"id"`
	Name    string            `json:"name"`
	Clients map[int32]*Client `json:"clients"`
	mutex   sync.RWMutex
}

type Hub struct {
	Clients    map[int32]*Client
	Groups     map[int32]*Group
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan *Message
	mutex      sync.RWMutex
}

func NewHub(db *db.Queries, ctx context.Context, conn *pgxpool.Pool) *Hub {
	groups, err := db.GetAllGroups(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to initialize ws hub: %v\n", err)
		os.Exit(1)
	}
	hub := &Hub{
		Clients:    make(map[int32]*Client),
		Groups:     make(map[int32]*Group),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan *Message, 5),
	}
	hub.mutex.Lock()
	for _, group := range groups {
		hub.Groups[group.ID] = &Group{
			ID:      group.ID,
			Name:    group.Name,
			Clients: make(map[int32]*Client),
		}
	}
	hub.mutex.Unlock()

	return hub
}

func (h *Hub) Run(db *db.Queries, ctx context.Context) {
	for {
		select {
		case client := <-h.Register:
			h.mutex.Lock()
			h.Clients[client.User.ID] = client
			h.mutex.Unlock()
			groups, err := db.GetGroupsForUser(ctx, client.User.ID)
			if err != nil {
				log.Printf("Error fetching user groups: %v", err)
				continue
			}
			for _, group := range groups {
				groupID := group.ID
				client.AddGroup(groupID)
				h.AddClientToGroup(client, groupID)
			}
		case client := <-h.Unregister:
			h.mutex.Lock()
			delete(h.Clients, client.User.ID)
			h.mutex.Unlock()

			for groupID := range client.Groups {
				h.RemoveClientFromGroup(client, groupID)
			}
			close(client.Message)
		case message := <-h.Broadcast:
			h.broadcastMessage(message, db, ctx)
		}

	}
}

func (h *Hub) broadcastMessage(message *Message, queries *db.Queries, ctx context.Context) {
	groupUsers, err := queries.GetAllUsersInGroup(ctx, message.GroupID)
	if err != nil {
		log.Printf("Error fetching group users: %v", err)
		return
	}

	authorizedUsers := make(map[int32]bool)
	for _, user := range groupUsers {
		authorizedUsers[user.UserID] = true
	}

	savedMessage, err := queries.InsertMessage(ctx, db.InsertMessageParams{
		UserID:  pgtype.Int4{Int32: message.User.ID, Valid: true},
		GroupID: pgtype.Int4{Int32: message.GroupID, Valid: true},
		Content: message.Content,
	})
	if err != nil {
		log.Printf("Error saving message: %v", err)
		return
	}

	message.ID = savedMessage.ID
	message.Timestamp = savedMessage.CreatedAt

	h.mutex.RLock()
	group, exists := h.Groups[message.GroupID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	group.mutex.RLock()
	for userID, client := range group.Clients {
		if authorizedUsers[userID] {
			select {
			case client.Message <- message:
			default:
				log.Printf("Could not send message to client %d", client.User.ID)
			}
		}
	}
	group.mutex.RUnlock()
}

func (h *Hub) AddClientToGroup(client *Client, groupID int32) {
	h.mutex.Lock()
	if _, exists := h.Groups[groupID]; !exists {
		h.Groups[groupID] = &Group{
			ID:      groupID,
			Clients: make(map[int32]*Client),
		}
	}
	group := h.Groups[groupID]
	h.mutex.Unlock()

	group.mutex.Lock()
	group.Clients[client.User.ID] = client
	group.mutex.Unlock()
}

func (h *Hub) RemoveClientFromGroup(client *Client, groupID int32) {
	h.mutex.RLock()
	group, exists := h.Groups[groupID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	group.mutex.Lock()
	delete(group.Clients, client.User.ID)
	group.mutex.Unlock()
}
