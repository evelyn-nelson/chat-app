package ws

import (
	"fmt"
	"math/rand/v2"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Handler struct {
	hub *Hub
}

func NewHandler(h *Hub) *Handler {
	return &Handler{hub: h}
}

type CreateRoomRequest struct {
	Name string `json:"name"`
	User User   `json:"user"`
}

type CreateRoomResponse struct {
	Name  string `json:"name"`
	Admin User   `json:"admin"`
	ID    string `json:"id"`
}

func (h *Handler) CreateRoom(c *gin.Context) {
	var req CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := fmt.Sprintf("%v", rand.IntN(2000))
	h.hub.Rooms[id] = &Room{
		ID:      id,
		Name:    req.Name,
		Admin:   req.User,
		Clients: make(map[string]*Client),
	}

	res := CreateRoomResponse{
		Admin: req.User,
		Name:  req.Name,
		ID:    id,
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

func (h *Handler) JoinRoom(c *gin.Context) {
	fmt.Println("test")
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	roomID := c.Param("roomID")
	clientID := c.Query("userID")
	username := c.Query("username")

	fmt.Println("roomID", roomID)
	fmt.Println("clientID", clientID)
	fmt.Println("username", username)

	user := &User{
		Username: username,
	}

	cl := &Client{
		Conn:    conn,
		RoomID:  roomID,
		ID:      clientID,
		Message: make(chan *Message, 10),
		User:    *user,
	}
	m := &Message{
		Content: "A new user has joined the room",
		RoomID:  roomID,
		User:    *user,
	}

	// join new user and
	h.hub.Register <- cl
	h.hub.Broadcast <- m

	go cl.writeMessage()
	cl.readMessage(h.hub)

}

type RoomRes struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Admin User   `json:"admin"`
}

func (h *Handler) GetRooms(c *gin.Context) {
	rooms := make([]RoomRes, 0)

	for _, r := range h.hub.Rooms {
		rooms = append(rooms, RoomRes{
			ID:    r.ID,
			Name:  r.Name,
			Admin: r.Admin,
		})
	}

	c.JSON(http.StatusOK, rooms)
}

type ClientRes struct {
	ID   string `json:"id"`
	User User   `json:"user"`
}

func (h *Handler) GetClients(c *gin.Context) {
	clients := make([]ClientRes, 0)
	roomID := c.Param("roomID")

	if _, ok := h.hub.Rooms[roomID]; !ok {
		c.JSON(http.StatusOK, clients)
		return
	}
	for _, c := range h.hub.Rooms[roomID].Clients {
		clients = append(clients, ClientRes{
			ID:   c.ID,
			User: c.User,
		})
	}

	c.JSON(http.StatusOK, clients)
}
