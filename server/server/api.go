package server

import (
	"chat-app-server/db"
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type API struct {
	db   *db.Queries
	ctx  context.Context
	conn *pgx.Conn
}

func NewAPI(db *db.Queries, ctx context.Context, conn *pgx.Conn) *API {
	return &API{
		db:   db,
		ctx:  ctx,
		conn: conn,
	}
}

func (api *API) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := api.db.InsertUser(api.ctx, db.InsertUserParams{Username: req.Username, Email: pgtype.Text{String: req.Email}})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &CreateUserResponse{
		User: user,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) GetUsers(c *gin.Context) {
	users, err := api.db.GetAllUsers(api.ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetUsersResponse{
		Users: users,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) GetUser(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := int32(ID)

	user, err := api.db.GetUserById(api.ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetUserResponse{
		User: user,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) UpdateUser(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := int32(ID)

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := api.db.UpdateUser(api.ctx, db.UpdateUserParams{Username: req.Username, Email: req.Email, ID: userID})

	// user, err := api.db.InsertUser(api.ctx, db.InsertUserParams{Username: req.Username, Email: pgtype.Text{String: req.Email}})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &UpdateUserResponse{
		User: user,
	}

	c.JSON(http.StatusOK, res)
}
