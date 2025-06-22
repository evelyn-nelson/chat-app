package auth

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

func ValidateToken(tokenString string) (uuid.UUID, error) {
	if tokenString == "" {
		return uuid.Nil, fmt.Errorf("authorization token required")
	}
	if len(jwtSecret) == 0 {
		log.Println("Warning: JWT_SECRET environment variable not set.")
		return uuid.Nil, fmt.Errorf("JWT secret not configured on server")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		log.Printf("Token parsing error: %v", err)
		if errors.Is(err, jwt.ErrTokenMalformed) {
			return uuid.Nil, fmt.Errorf("malformed token")
		} else if errors.Is(err, jwt.ErrTokenExpired) {
			return uuid.Nil, fmt.Errorf("token is expired")
		} else if errors.Is(err, jwt.ErrTokenNotValidYet) {
			return uuid.Nil, fmt.Errorf("token not yet valid")
		} else if errors.Is(err, jwt.ErrTokenSignatureInvalid) {
			return uuid.Nil, fmt.Errorf("token signature is invalid")
		} else {
			return uuid.Nil, fmt.Errorf("couldn't handle token: %w", err)
		}
	}
	if !token.Valid {
		log.Printf("Token marked as invalid, though no specific error matched: %v", err)
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, fmt.Errorf("invalid token claims format")
	}

	userIDClaim, exists := claims["userID"]
	if !exists {
		return uuid.Nil, fmt.Errorf("userID claim missing in token")
	}

	userIDStr, ok := userIDClaim.(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("userID claim is not a string")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to parse userID as UUID: %w", err)
	}

	if userID == uuid.Nil {
		return uuid.Nil, fmt.Errorf("parsed userID is a Nil UUID")
	}

	log.Printf("Token validated successfully for userID: %s", userID)
	return userID, nil
}
