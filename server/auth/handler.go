package auth

import (
	"chat-app-server/db"
	"context"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5" // Import the uuid package
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db   *db.Queries
	ctx  context.Context
	conn *pgxpool.Pool
}

func NewAuthHandler(db *db.Queries, ctx context.Context, conn *pgxpool.Pool) *AuthHandler {
	return &AuthHandler{
		db:   db,
		ctx:  ctx,
		conn: conn,
	}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	ctx := c.Request.Context()
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

	user, err := h.db.InsertUser(ctx, db.InsertUserParams{Username: req.Username, Email: req.Email, Password: pgtype.Text{String: string(hash), Valid: true}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Signup failed"})
		return
	}

	claims := Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

func (h *AuthHandler) Login(c *gin.Context) {
	ctx := c.Request.Context()
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request"})
		return
	}
	user, err := h.db.GetUserByEmailInternal(ctx, req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Login failed"})
		return
	}

	pwd := []byte(user.Password.String)
	err = bcrypt.CompareHashAndPassword(pwd, []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Incorrect password"})
		return
	}

	claims := Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 1)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}
