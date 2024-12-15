package auth

import (
	"chat-app-server/db"
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
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
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
		return
	}

	pwd := []byte(req.Password)
	hash, err := bcrypt.GenerateFromPassword(pwd, bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Signup failed"})
		return
	}

	user, err := h.db.InsertUser(h.ctx, db.InsertUserParams{Username: req.Username, Email: req.Email, Password: pgtype.Text{String: string(hash), Valid: true}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Signup failed"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userID": user.ID,
		"iat":    time.Now().Unix(),
		"exp":    time.Now().Add(time.Hour * 1).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	fmt.Println("here 0")

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
		return
	}
	user, err := h.db.GetUserByEmailInternal(h.ctx, req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Login failed"})
		return
	}
	fmt.Println("here 1")

	pwd := []byte(user.Password.String)
	err = bcrypt.CompareHashAndPassword(pwd, []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Login failed"})
		return
	}
	fmt.Println("here 2")

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userID": user.ID,
		"iat":    time.Now().Unix(),
		"exp":    time.Now().Add(time.Hour * 1).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}
