package auth

import "github.com/golang-jwt/jwt/v5"

type Claims struct {
	UserID string `json:"userID"`
	jwt.RegisteredClaims
}

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
