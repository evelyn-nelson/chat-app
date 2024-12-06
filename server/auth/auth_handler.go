package auth

import (
	"chat-app-server/db"
	"context"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type AuthHandler struct {
	db   *db.Queries
	ctx  context.Context
	conn *pgx.Conn
}

func NewAuthHandler(db *db.Queries, ctx context.Context, conn *pgx.Conn) *AuthHandler {
	return &AuthHandler{
		db:   db,
		ctx:  ctx,
		conn: conn,
	}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	// var req SignupRequest
	// if err := c.ShouldBindJSON(&req); err != nil {
	// 	c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
	// 	return
	// }

	// // pwd := []byte(req.Password)
	// // hash, err := bcrypt.GenerateFromPassword(pwd, bcrypt.MinCost)

}

func (h *AuthHandler) Login(c *gin.Context) {
	// var req LoginRequest

	// if err := c.ShouldBindJSON(&req); err != nil {
	// 	c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
	// 	return
	// }
	// user, err := h.db.GetUserByEmailInternal(h.ctx, pgtype.Text{String: req.Email, Valid: true})

}
