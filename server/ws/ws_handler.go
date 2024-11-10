package ws

import (
	"chat-app-server/db"
	"cmp"
	"context"
	"fmt"
	"math/rand/v2"
	"net/http"
	"os"
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
)

type Handler struct {
	hub  *Hub
	db   *db.Queries
	ctx  context.Context
	conn *pgx.Conn
}

func NewHandler(h *Hub) *Handler {
	ctx := context.Background()

	conn, err := pgx.Connect(context.Background(), os.Getenv("DB_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}

	db := db.New(conn)
	return &Handler{hub: h, db: db, ctx: ctx, conn: conn}
}

func (h *Handler) Close() {
	if h.conn != nil {
		h.conn.Close(h.ctx)
	}
}

type CreateGroupRequest struct {
	Name string `json:"name"`
	User User   `json:"user"`
}

type CreateGroupResponse struct {
	Name  string `json:"name"`
	Admin User   `json:"admin"`
	ID    string `json:"id"`
}

func (h *Handler) CreateGroup(c *gin.Context) {
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := fmt.Sprintf("%v", rand.IntN(2000))
	h.hub.Groups[id] = &Group{
		ID:      id,
		Name:    req.Name,
		Admin:   req.User,
		Clients: make(map[string]*Client),
	}

	res := CreateGroupResponse{
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

func (h *Handler) JoinGroup(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	groupID := c.Param("groupID")
	clientID := c.Query("userID")
	username := c.Query("username")

	user := &User{
		Username: username,
	}

	cl := &Client{
		Conn:    conn,
		GroupID: groupID,
		ID:      clientID,
		Message: make(chan *Message, 10),
		User:    *user,
	}

	// join new user and
	h.hub.Register <- cl

	go cl.writeMessage()
	cl.readMessage(h.hub)
}

type CreateAndJoinGroupRequest struct {
	Name     string `json:"name"`
	ClientID string `json:"userID"`
	User     User   `json:"user"`
}

type CreateAndJoinGroupResponse struct {
	Group    GroupRes `json:"group"`
	ClientID string   `json:"userID"`
	User     User     `json:"user"`
}

func (h *Handler) CreateAndJoinGroup(c *gin.Context) {
	var req CreateAndJoinGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := fmt.Sprintf("%v", rand.IntN(2000))
	h.hub.Groups[id] = &Group{
		ID:      id,
		Name:    req.Name,
		Admin:   req.User,
		Clients: make(map[string]*Client),
	}

	group := GroupRes{
		Admin: req.User,
		Name:  req.Name,
		ID:    id,
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	user := &User{
		Username: req.User.Username,
	}

	cl := &Client{
		Conn:    conn,
		GroupID: group.ID,
		ID:      req.ClientID,
		Message: make(chan *Message, 10),
		User:    *user,
	}

	res := CreateAndJoinGroupResponse{
		Group:    group,
		ClientID: req.ClientID,
		User:     req.User,
	}

	h.hub.Register <- cl

	c.JSON(http.StatusOK, res)

	go cl.writeMessage()
	cl.readMessage(h.hub)

}

type GroupRes struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Admin User   `json:"admin"`
}

func GroupResCompare(a Group, b Group) int {
	aInt, errA := strconv.Atoi(a.ID)
	if errA != nil {
		return 0
	}
	bInt, errB := strconv.Atoi(b.ID)
	if errB != nil {
		return 0
	}
	return cmp.Compare(aInt, bInt)
}

func (h *Handler) GetGroups(c *gin.Context) {
	fmt.Println("here")
	ExistingGroups, err := h.db.GetAllGroups(h.ctx)

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error retrieving groups: %v\n", err)
	}

	for i := 0; i < len(ExistingGroups); i++ {
		fmt.Println(ExistingGroups[i].Name)
	}
	groups := make([]GroupRes, 0)

	for _, r := range h.hub.Groups {
		groups = append(groups, GroupRes{
			ID:    r.ID,
			Name:  r.Name,
			Admin: r.Admin,
		})
	}
	slices.SortFunc(groups, GroupResCompare)
	c.JSON(http.StatusOK, groups)
}

type ClientRes struct {
	ID   string `json:"id"`
	User User   `json:"user"`
}

func ClientResCompare(a ClientRes, b GroupRes) int {
	aInt, errA := strconv.Atoi(a.ID)
	if errA != nil {
		return 0
	}
	bInt, errB := strconv.Atoi(b.ID)
	if errB != nil {
		return 0
	}
	return cmp.Compare(aInt, bInt)
}

func (h *Handler) GetClients(c *gin.Context) {
	clients := make([]ClientRes, 0)
	groupID := c.Param("groupID")

	if _, ok := h.hub.Groups[groupID]; !ok {
		c.JSON(http.StatusOK, clients)
		return
	}
	for _, c := range h.hub.Groups[groupID].Clients {
		clients = append(clients, ClientRes{
			ID:   c.ID,
			User: c.User,
		})
	}

	c.JSON(http.StatusOK, clients)
}
