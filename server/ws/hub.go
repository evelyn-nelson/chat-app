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

type RemoveClientFromGroupMsg struct {
	UserID  int32
	GroupID int32
}

type AddClientToGroupMsg struct {
	UserID  int32
	GroupID int32
}

type InitializeGroupMsg struct {
	GroupID int32
	Name    string
	AdminID int32
}

type DeleteHubGroupMsg struct {
	GroupID int32
}

type Hub struct {
	Clients     map[int32]*Client
	Groups      map[int32]*Group
	Register    chan *Client
	Unregister  chan *Client
	Broadcast   chan *Message
	RemoveUser  chan *RemoveClientFromGroupMsg
	AddUser     chan *AddClientToGroupMsg
	InitGroup   chan *InitializeGroupMsg
	DeleteGroup chan *DeleteHubGroupMsg
	mutex       sync.RWMutex
}

func NewHub(db *db.Queries, ctx context.Context, conn *pgxpool.Pool) *Hub {
	groups, err := db.GetAllGroups(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to initialize ws hub: %v\n", err)
		os.Exit(1)
	}
	hub := &Hub{
		Clients:     make(map[int32]*Client),
		Groups:      make(map[int32]*Group),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		Broadcast:   make(chan *Message, 256),
		RemoveUser:  make(chan *RemoveClientFromGroupMsg),
		AddUser:     make(chan *AddClientToGroupMsg),
		InitGroup:   make(chan *InitializeGroupMsg),
		DeleteGroup: make(chan *DeleteHubGroupMsg),
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
		case removeMsg := <-h.RemoveUser:
			h.mutex.RLock()
			client, clientExists := h.Clients[removeMsg.UserID]
			h.mutex.RUnlock()

			if clientExists {
				h.RemoveClientFromGroup(client, removeMsg.GroupID)
				client.RemoveGroup(removeMsg.GroupID)
				log.Printf("Hub processed request to remove client %d from group %d state.", removeMsg.UserID, removeMsg.GroupID)
			} else {
				log.Printf("Hub received remove request for disconnected client %d from group %d.", removeMsg.UserID, removeMsg.GroupID)
			}
		case addMsg := <-h.AddUser:
			h.mutex.RLock()
			client, clientExists := h.Clients[addMsg.UserID]
			h.mutex.RUnlock()

			if clientExists {
				h.AddClientToGroup(client, addMsg.GroupID)
				client.AddGroup(addMsg.GroupID)
				log.Printf("Hub processed request to add client %d to group %d state.", addMsg.UserID, addMsg.GroupID)
			} else {
				log.Printf("Hub received add request for disconnected client %d to group %d.", addMsg.UserID, addMsg.GroupID)
			}
		case initMsg := <-h.InitGroup:
			h.mutex.Lock()
			if _, exists := h.Groups[initMsg.GroupID]; !exists {
				h.Groups[initMsg.GroupID] = &Group{
					ID:      initMsg.GroupID,
					Name:    initMsg.Name,
					Clients: make(map[int32]*Client),
				}
				log.Printf("Hub initialized group structure for group %d", initMsg.GroupID)

				client, clientExists := h.Clients[initMsg.AdminID]
				if clientExists {
					h.Groups[initMsg.GroupID].Clients[initMsg.AdminID] = client
					client.AddGroup(initMsg.GroupID)
					log.Printf("Added creating admin %d to new group %d in hub", initMsg.AdminID, initMsg.GroupID)
				}
			}
			h.mutex.Unlock()
		case delMsg := <-h.DeleteGroup:
			h.mutex.Lock()
			delete(h.Groups, delMsg.GroupID)
			h.mutex.Unlock()
			log.Printf("Hub removed group structure for deleted group %d", delMsg.GroupID)

		}
	}
}

func (h *Hub) broadcastMessage(message *Message, queries *db.Queries, ctx context.Context) {
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
	for _, client := range group.Clients {
		select {
		case client.Message <- message:
		default:
			log.Printf("Could not send message to client %d", client.User.ID)
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
