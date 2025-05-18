package ws

import (
	"chat-app-server/db"
	"context"
	"encoding/json"
	"log"
	"strconv"
	"sync"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
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

type PubSubMessage struct {
	Type           string      `json:"type"` // "chat_message", "user_added", "user_removed", etc.
	Payload        interface{} `json:"payload"`
	OriginServerID string      `json:"origin_server_id"` // To avoid self-processing if not needed
}

type ChatMessagePayload struct {
	Message *Message `json:"message"`
}

type UserGroupEventPayload struct {
	UserID  int32 `json:"user_id"`
	GroupID int32 `json:"group_id"`
}
type GroupEventPayload struct {
	GroupID int32  `json:"group_id"`
	Name    string `json:"name,omitempty"`
	AdminID int32  `json:"admin_id,omitempty"`
}

type Hub struct {
	Clients    map[int32]*Client // Clients connected to THIS instance
	Groups     map[int32]*Group  // Groups relevant to THIS instance (metadata + local clients)
	Register   chan *Client
	Unregister chan *Client
	// Broadcast is now for messages originating from THIS instance's clients
	// It will publish to Redis Pub/Sub instead of directly fanning out.
	Broadcast chan *Message

	// Channels for HTTP handlers to signal hub to perform Redis operations + Pub/Sub
	RemoveUserFromGroupChan chan *RemoveClientFromGroupMsg // Renamed for clarity
	AddUserToGroupChan      chan *AddClientToGroupMsg      // Renamed for clarity
	InitializeGroupChan     chan *InitializeGroupMsg
	DeleteHubGroupChan      chan *DeleteHubGroupMsg // Renamed for clarity

	mutex sync.RWMutex

	// Redis related
	redisClient *redis.Client
	serverID    string
	db          *db.Queries     // Keep for DB interactions
	pgxPool     *pgxpool.Pool   // Keep for DB transactions
	ctx         context.Context // Hub's context
}

const (
	redisClientServerPrefix  = "client:"    // client:<userID>:server_id -> serverInstanceID
	redisServerClientsPrefix = "server:"    // server:<serverID>:clients -> SET of userIDs
	redisUserGroupsPrefix    = "user:"      // user:<userID>:groups -> SET of groupIDs
	redisGroupMembersPrefix  = "group:"     // group:<groupID>:members -> SET of userIDs
	redisGroupInfoPrefix     = "groupinfo:" // groupinfo:<groupID> -> HASH {name: "..."}

	pubSubGroupMessagesChannel = "group_messages" // Actual channel will be group_messages:<groupID>
	pubSubGroupEventsChannel   = "group_events"   // Channel for user/group lifecycle events
)

func NewHub(
	dbQueries *db.Queries,
	ctx context.Context,
	conn *pgxpool.Pool,
	redisClient *redis.Client,
	serverID string,
) *Hub {
	hub := &Hub{
		Clients:                 make(map[int32]*Client),
		Groups:                  make(map[int32]*Group),
		Register:                make(chan *Client),
		Unregister:              make(chan *Client),
		Broadcast:               make(chan *Message, 256),
		RemoveUserFromGroupChan: make(chan *RemoveClientFromGroupMsg),
		AddUserToGroupChan:      make(chan *AddClientToGroupMsg),
		InitializeGroupChan:     make(chan *InitializeGroupMsg),
		DeleteHubGroupChan:      make(chan *DeleteHubGroupMsg),
		redisClient:             redisClient,
		serverID:                serverID,
		db:                      dbQueries,
		pgxPool:                 conn,
		ctx:                     ctx,
	}

	// Goroutine to listen to Redis Pub/Sub
	go hub.listenPubSub()

	// Optionally, populate hub.Groups with basic info from Redis or DB
	// This would be for caching group names, etc., not for authoritative membership.
	// For now, let's assume groups are populated as needed.

	return hub
}

func (h *Hub) listenPubSub() {
	groupMessagesPattern := pubSubGroupMessagesChannel + ":*"
	// For specific channels, you'd use Subscribe and list them.
	// PSubscribe is good for patterns. If you only have one events channel,
	// you could Subscribe to it directly.
	// For this example, let's assume we might want more event channels later,
	// so PSubscribe to a pattern or Subscribe to multiple fixed channels.

	// Let's subscribe to the specific events channel and pattern for messages
	pubsub := h.redisClient.Subscribe(h.ctx, pubSubGroupEventsChannel) // Subscribe to specific
	if err := pubsub.PUnsubscribe(h.ctx); err != nil {                 // Clear any previous PSubscriptions if any, for safety
		// This is optional, just ensuring clean state if code is rerun/reconnected
	}
	if err := pubsub.PSubscribe(h.ctx, groupMessagesPattern); err != nil { // Then PSubscribe
		log.Printf("Hub %s: Error PSubscribing to %s: %v", h.serverID, groupMessagesPattern, err)
		// Consider more robust error handling / retry here
		return
	}

	defer pubsub.Close()

	// Wait for confirmation that subscription is created before proceeding.
	// For PSubscribe, the first message is a "psubscribe" confirmation.
	// For Subscribe, it's a "subscribe" confirmation.
	// The Receive() method is low-level; using pubsub.Channel() is often simpler.
	// However, to be sure subscription is active before loop:
	// _, err := pubsub.Receive(h.ctx) // This was for v8, v9 is similar
	// if err != nil {
	//  log.Printf("Hub %s: Error receiving initial pubsub confirmation: %v", h.serverID, err)
	//  return
	// }
	// A more robust way for v9 to check subscription status is to inspect the first message from the channel
	// or handle the initial subscription message explicitly if needed.
	// For simplicity, often just starting the loop is fine, as the lib handles it.

	ch := pubsub.Channel()
	log.Printf("Hub %s listening to Redis Pub/Sub (Events: %s, Messages: %s)", h.serverID, pubSubGroupEventsChannel, groupMessagesPattern)

	for msg := range ch {
		// msg.Channel will be the specific channel (e.g., "group_messages:123" or "group_events")
		// msg.Payload will be the string payload

		var pubSubMsg PubSubMessage
		if err := json.Unmarshal([]byte(msg.Payload), &pubSubMsg); err != nil {
			log.Printf("Hub %s: Error unmarshalling pubsub message from channel %s: %v. Payload: %s",
				h.serverID, msg.Channel, err, msg.Payload)
			continue
		}

		// Optional: Avoid processing messages this instance originated if already handled.
		// if pubSubMsg.OriginServerID == h.serverID && (pubSubMsg.Type == "chat_message" /* or other types you handle locally first */) {
		//  log.Printf("Hub %s: Skipping self-originated PubSub message type %s for group/event", h.serverID, pubSubMsg.Type)
		//  continue
		// }

		log.Printf("Hub %s received from Redis PubSub channel %s: Type %s", h.serverID, msg.Channel, pubSubMsg.Type)

		switch pubSubMsg.Type {
		case "chat_message":
			var payload ChatMessagePayload
			if err := mapToStruct(pubSubMsg.Payload, &payload); err != nil {
				log.Printf("Error decoding chat_message payload: %v", err)
				continue
			}
			h.deliverChatMessage(payload.Message)
		case "user_added_to_group":
			var payload UserGroupEventPayload
			if err := mapToStruct(pubSubMsg.Payload, &payload); err != nil {
				log.Printf("Error decoding user_added_to_group payload: %v", err)
				continue
			}
			h.handleUserAddedToGroupEvent(payload.UserID, payload.GroupID)
		case "user_removed_from_group":
			var payload UserGroupEventPayload
			if err := mapToStruct(pubSubMsg.Payload, &payload); err != nil {
				log.Printf("Error decoding user_removed_from_group payload: %v", err)
				continue
			}
			h.handleUserRemovedFromGroupEvent(payload.UserID, payload.GroupID)
		case "group_created":
			var payload GroupEventPayload
			if err := mapToStruct(pubSubMsg.Payload, &payload); err != nil {
				log.Printf("Error decoding group_created payload: %v", err)
				continue
			}
			h.handleGroupCreatedEvent(payload.GroupID, payload.Name, payload.AdminID)
		case "group_deleted":
			var payload GroupEventPayload
			if err := mapToStruct(pubSubMsg.Payload, &payload); err != nil {
				log.Printf("Error decoding group_deleted payload: %v", err)
				continue
			}
			h.handleGroupDeletedEvent(payload.GroupID)
		}
	}
	log.Printf("Hub %s: PubSub channel closed.", h.serverID)
}

// Helper to convert map[string]interface{} from JSON to struct
func mapToStruct(data interface{}, result interface{}) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, result)
}

func (h *Hub) deliverChatMessage(message *Message) {
	h.mutex.RLock()
	group, groupExists := h.Groups[message.GroupID]
	h.mutex.RUnlock()

	if !groupExists {
		// This instance might not have the group cached if no local clients are in it.
		// Or, it might be a new group. For chat messages, if the group doesn't exist
		// locally, it means no clients from this instance are in it.
		return
	}

	group.mutex.RLock() // Lock for reading group.Clients
	defer group.mutex.RUnlock()

	for clientID, client := range group.Clients { // Iterate local clients in this group
		h.mutex.RLock()
		_, stillConnected := h.Clients[clientID]
		h.mutex.RUnlock()

		if stillConnected {
			select {
			case client.Message <- message:
			default:
				log.Printf("Hub %s: Client %d message channel full for group %d. Message dropped.", h.serverID, client.User.ID, message.GroupID)
			}
		}
	}
}

func (h *Hub) handleUserAddedToGroupEvent(userID, groupID int32) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	client, clientConnectedToThisInstance := h.Clients[userID]
	if clientConnectedToThisInstance {
		client.AddGroup(groupID)
		h.addClientToLocalGroupStruct(client, groupID)
		log.Printf("Hub %s: Updated local state for user %d added to group %d", h.serverID, userID, groupID)
	}
}

func (h *Hub) handleUserRemovedFromGroupEvent(userID, groupID int32) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	client, clientConnectedToThisInstance := h.Clients[userID]
	if clientConnectedToThisInstance {
		h.removeClientFromLocalGroupStruct(client, groupID)
		client.RemoveGroup(groupID)
		log.Printf("Hub %s: Updated local state for user %d removed from group %d", h.serverID, userID, groupID)
	}
}

func (h *Hub) handleGroupCreatedEvent(groupID int32, name string, adminID int32) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, exists := h.Groups[groupID]; !exists {
		h.Groups[groupID] = &Group{
			ID:      groupID,
			Name:    name,
			Clients: make(map[int32]*Client),
		}
		log.Printf("Hub %s: Cached new group %d (%s)", h.serverID, groupID, name)
	} else {
		h.Groups[groupID].Name = name // Update name if it changed
	}

	if admin, ok := h.Clients[adminID]; ok {
		h.Groups[groupID].Clients[adminID] = admin
		admin.AddGroup(groupID)
		log.Printf("Hub %s: Added admin %d to local cache for new group %d", h.serverID, adminID, groupID)
	}
}

func (h *Hub) handleGroupDeletedEvent(groupID int32) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if group, exists := h.Groups[groupID]; exists {
		group.mutex.Lock()
		for clientID, client := range group.Clients {
			client.RemoveGroup(groupID)
			log.Printf("Hub %s: Client %d removed from local cache of deleted group %d", h.serverID, clientID, groupID)
		}
		group.mutex.Unlock()
		delete(h.Groups, groupID)
		log.Printf("Hub %s: Removed group %d from local cache", h.serverID, groupID)
	}
}

func (h *Hub) Run() {
	log.Printf("Hub %s Run loop started", h.serverID)
	for {
		select {
		case client := <-h.Register:
			h.mutex.Lock()
			h.Clients[client.User.ID] = client
			h.mutex.Unlock()

			// Register client with this server instance in Redis
			clientKey := redisClientServerPrefix + strconv.Itoa(int(client.User.ID)) + ":server_id"
			serverClientsKey := redisServerClientsPrefix + h.serverID + ":clients"

			// Use a pipeline for multiple Redis commands
			pipe := h.redisClient.Pipeline()
			pipe.Set(h.ctx, clientKey, h.serverID, pongWait*2) // Expiration, should be refreshed
			pipe.SAdd(h.ctx, serverClientsKey, client.User.ID)
			_, err := pipe.Exec(h.ctx)
			if err != nil {
				log.Printf("Hub %s: Error registering client %d in Redis: %v", h.serverID, client.User.ID, err)
			} else {
				log.Printf("Hub %s: Registered client %d to this server in Redis", h.serverID, client.User.ID)
			}

			// Fetch user's groups from Redis and populate local state
			userGroupsKey := redisUserGroupsPrefix + strconv.Itoa(int(client.User.ID)) + ":groups"
			groupIDsStr, err := h.redisClient.SMembers(h.ctx, userGroupsKey).Result()
			if err != nil {
				log.Printf("Hub %s: Error fetching groups for user %d from Redis: %v", h.serverID, client.User.ID, err)
			} else {
				for _, groupIDStr := range groupIDsStr {
					groupID, convErr := strconv.Atoi(groupIDStr)
					if convErr != nil {
						log.Printf("Hub %s: Error converting groupID %s to int: %v", h.serverID, groupIDStr, convErr)
						continue
					}
					client.AddGroup(int32(groupID))
					h.addClientToLocalGroupStruct(client, int32(groupID))
				}
				log.Printf("Hub %s: Client %d joined %d groups locally based on Redis state.", h.serverID, client.User.ID, len(groupIDsStr))
			}

		case client := <-h.Unregister:
			h.mutex.Lock()
			if _, ok := h.Clients[client.User.ID]; ok {
				delete(h.Clients, client.User.ID)

				clientKey := redisClientServerPrefix + strconv.Itoa(int(client.User.ID)) + ":server_id"
				serverClientsKey := redisServerClientsPrefix + h.serverID + ":clients"

				pipe := h.redisClient.Pipeline()
				pipe.Del(h.ctx, clientKey)
				pipe.SRem(h.ctx, serverClientsKey, client.User.ID)
				_, err := pipe.Exec(h.ctx)
				if err != nil {
					log.Printf("Hub %s: Error unregistering client %d in Redis: %v", h.serverID, client.User.ID, err)
				} else {
					log.Printf("Hub %s: Unregistered client %d from this server in Redis", h.serverID, client.User.ID)
				}

				client.mutex.RLock()
				for groupID := range client.Groups {
					h.removeClientFromLocalGroupStruct(client, groupID)
				}
				client.mutex.RUnlock()
				close(client.Message)
				log.Printf("Hub %s: Client %d unregistered locally.", h.serverID, client.User.ID)
			}
			h.mutex.Unlock()

		case message := <-h.Broadcast: // Message from a local client to be broadcast
			savedMessage, err := h.db.InsertMessage(h.ctx, db.InsertMessageParams{
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

			payload := ChatMessagePayload{Message: message}
			pubSubMsg := PubSubMessage{
				Type:           "chat_message",
				Payload:        payload,
				OriginServerID: h.serverID,
			}
			serializedMsg, err := json.Marshal(pubSubMsg)
			if err != nil {
				log.Printf("Hub %s: Error marshalling chat message for PubSub: %v", h.serverID, err)
				continue
			}
			channel := pubSubGroupMessagesChannel + ":" + strconv.Itoa(int(message.GroupID))
			if err := h.redisClient.Publish(h.ctx, channel, serializedMsg).Err(); err != nil {
				log.Printf("Hub %s: Error publishing message to Redis PubSub channel %s: %v", h.serverID, channel, err)
			} else {
				log.Printf("Hub %s: Published message for group %d to Redis PubSub channel %s", h.serverID, message.GroupID, channel)
			}

		case removeMsg := <-h.RemoveUserFromGroupChan:
			groupMembersKey := redisGroupMembersPrefix + strconv.Itoa(int(removeMsg.GroupID)) + ":members"
			userGroupsKey := redisUserGroupsPrefix + strconv.Itoa(int(removeMsg.UserID)) + ":groups"

			pipe := h.redisClient.Pipeline()
			pipe.SRem(h.ctx, groupMembersKey, removeMsg.UserID)
			pipe.SRem(h.ctx, userGroupsKey, removeMsg.GroupID)
			_, err := pipe.Exec(h.ctx)

			if err != nil {
				log.Printf("Hub %s: Error removing user %d from group %d in Redis: %v", h.serverID, removeMsg.UserID, removeMsg.GroupID, err)
			} else {
				log.Printf("Hub %s: Removed user %d from group %d in Redis", h.serverID, removeMsg.UserID, removeMsg.GroupID)
				// Publish event
				eventPayload := UserGroupEventPayload{UserID: removeMsg.UserID, GroupID: removeMsg.GroupID}
				pubSubEvt := PubSubMessage{Type: "user_removed_from_group", Payload: eventPayload, OriginServerID: h.serverID}
				serializedEvt, _ := json.Marshal(pubSubEvt)
				h.redisClient.Publish(h.ctx, pubSubGroupEventsChannel, serializedEvt)
			}
			// Local cache update will be handled by the PubSub listener for "user_removed_from_group"

		case addMsg := <-h.AddUserToGroupChan:
			groupMembersKey := redisGroupMembersPrefix + strconv.Itoa(int(addMsg.GroupID)) + ":members"
			userGroupsKey := redisUserGroupsPrefix + strconv.Itoa(int(addMsg.UserID)) + ":groups"

			pipe := h.redisClient.Pipeline()
			pipe.SAdd(h.ctx, groupMembersKey, addMsg.UserID)
			pipe.SAdd(h.ctx, userGroupsKey, addMsg.GroupID)
			_, err := pipe.Exec(h.ctx)

			if err != nil {
				log.Printf("Hub %s: Error adding user %d to group %d in Redis: %v", h.serverID, addMsg.UserID, addMsg.GroupID, err)
			} else {
				log.Printf("Hub %s: Added user %d to group %d in Redis", h.serverID, addMsg.UserID, addMsg.GroupID)
				eventPayload := UserGroupEventPayload{UserID: addMsg.UserID, GroupID: addMsg.GroupID}
				pubSubEvt := PubSubMessage{Type: "user_added_to_group", Payload: eventPayload, OriginServerID: h.serverID}
				serializedEvt, _ := json.Marshal(pubSubEvt)
				h.redisClient.Publish(h.ctx, pubSubGroupEventsChannel, serializedEvt)
			}

		case initMsg := <-h.InitializeGroupChan:
			groupInfoKey := redisGroupInfoPrefix + strconv.Itoa(int(initMsg.GroupID))
			groupMembersKey := redisGroupMembersPrefix + strconv.Itoa(int(initMsg.GroupID)) + ":members"
			adminUserGroupsKey := redisUserGroupsPrefix + strconv.Itoa(int(initMsg.AdminID)) + ":groups"

			pipe := h.redisClient.Pipeline()
			pipe.HSet(h.ctx, groupInfoKey, "name", initMsg.Name, "id", initMsg.GroupID) // Store ID too for convenience
			pipe.SAdd(h.ctx, groupMembersKey, initMsg.AdminID)
			pipe.SAdd(h.ctx, adminUserGroupsKey, initMsg.GroupID)
			_, err := pipe.Exec(h.ctx)

			if err != nil {
				log.Printf("Hub %s: Error initializing group %d in Redis: %v", h.serverID, initMsg.GroupID, err)
			} else {
				log.Printf("Hub %s: Initialized group %d in Redis", h.serverID, initMsg.GroupID)
				eventPayload := GroupEventPayload{GroupID: initMsg.GroupID, Name: initMsg.Name, AdminID: initMsg.AdminID}
				pubSubEvt := PubSubMessage{Type: "group_created", Payload: eventPayload, OriginServerID: h.serverID}
				serializedEvt, _ := json.Marshal(pubSubEvt)
				h.redisClient.Publish(h.ctx, pubSubGroupEventsChannel, serializedEvt)
			}

		case delMsg := <-h.DeleteHubGroupChan:
			groupIDStr := strconv.Itoa(int(delMsg.GroupID))
			groupInfoKey := redisGroupInfoPrefix + groupIDStr
			groupMembersKey := redisGroupMembersPrefix + groupIDStr + ":members"

			// Get all members to update their individual group sets
			members, err := h.redisClient.SMembers(h.ctx, groupMembersKey).Result()
			if err != nil && err != redis.Nil {
				log.Printf("Hub %s: Error getting members for group %d deletion: %v", h.serverID, delMsg.GroupID, err)
				// Continue to attempt deletion of group keys anyway
			}

			pipe := h.redisClient.Pipeline()
			for _, memberIDStr := range members {
				userGroupsKey := redisUserGroupsPrefix + memberIDStr + ":groups"
				pipe.SRem(h.ctx, userGroupsKey, delMsg.GroupID)
			}
			pipe.Del(h.ctx, groupMembersKey)
			pipe.Del(h.ctx, groupInfoKey)
			_, execErr := pipe.Exec(h.ctx)

			if execErr != nil {
				log.Printf("Hub %s: Error deleting group %d from Redis: %v", h.serverID, delMsg.GroupID, execErr)
			} else {
				log.Printf("Hub %s: Deleted group %d from Redis", h.serverID, delMsg.GroupID)
				eventPayload := GroupEventPayload{GroupID: delMsg.GroupID}
				pubSubEvt := PubSubMessage{Type: "group_deleted", Payload: eventPayload, OriginServerID: h.serverID}
				serializedEvt, _ := json.Marshal(pubSubEvt)
				h.redisClient.Publish(h.ctx, pubSubGroupEventsChannel, serializedEvt)
			}
		}
	}
}

func (h *Hub) addClientToLocalGroupStruct(client *Client, groupID int32) {
	// This function assumes h.mutex is already locked if called from Run,
	// or locks appropriately if called from elsewhere. For simplicity, let's assume caller handles hub-level lock.
	// client.mutex should be RLocked if reading client.User.ID and Locked if modifying client.Groups.
	// group.mutex should be Locked for modifying group.Clients.

	h.mutex.Lock()
	group, exists := h.Groups[groupID]
	if !exists {
		name := "Unknown Group"
		groupInfoKey := redisGroupInfoPrefix + strconv.Itoa(int(groupID))
		redisName, err := h.redisClient.HGet(h.ctx, groupInfoKey, "name").Result()
		if err == nil {
			name = redisName
		} else if err != redis.Nil {
			log.Printf("Hub %s: Error fetching group name for %d from Redis: %v", h.serverID, groupID, err)
		}

		group = &Group{
			ID:      groupID,
			Name:    name,
			Clients: make(map[int32]*Client),
		}
		h.Groups[groupID] = group
		log.Printf("Hub %s: Cached group %d (%s) locally.", h.serverID, groupID, name)
	}
	h.mutex.Unlock()

	group.mutex.Lock()
	group.Clients[client.User.ID] = client
	group.mutex.Unlock()

	log.Printf("Hub %s: Added client %d to local cache for group %d", h.serverID, client.User.ID, groupID)
}

func (h *Hub) removeClientFromLocalGroupStruct(client *Client, groupID int32) {
	h.mutex.RLock()
	group, exists := h.Groups[groupID]
	h.mutex.RUnlock()

	if exists {
		group.mutex.Lock()
		delete(group.Clients, client.User.ID)
		log.Printf("Hub %s: Removed client %d from local cache for group %d", h.serverID, client.User.ID, groupID)
		isEmpty := len(group.Clients) == 0
		group.mutex.Unlock()

		if isEmpty {
			h.mutex.Lock()
			delete(h.Groups, groupID)
			h.mutex.Unlock()
			log.Printf("Hub %s: Removed group %d from local cache as no local clients are members.", h.serverID, groupID)
		}
	}
	// client.RemoveGroup(groupID) should have been called by the caller
}
