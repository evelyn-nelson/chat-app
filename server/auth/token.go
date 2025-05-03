package auth

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

func ValidateToken(tokenString string) (int32, error) {
	if tokenString == "" {
		return 0, fmt.Errorf("authorization token required")
	}
	if len(jwtSecret) == 0 {
		log.Println("Warning: JWT_SECRET environment variable not set.")
		return 0, fmt.Errorf("JWT secret not configured on server")
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
			return 0, fmt.Errorf("malformed token")
		} else if errors.Is(err, jwt.ErrTokenExpired) {
			return 0, fmt.Errorf("token is expired")
		} else if errors.Is(err, jwt.ErrTokenNotValidYet) {
			return 0, fmt.Errorf("token not yet valid")
		} else if errors.Is(err, jwt.ErrTokenSignatureInvalid) {
			return 0, fmt.Errorf("token signature is invalid")
		} else {
			return 0, fmt.Errorf("couldn't handle token: %w", err)
		}
	}
	if !token.Valid {
		log.Printf("Token marked as invalid, though no specific error matched: %v", err)
		return 0, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, fmt.Errorf("invalid token claims format")
	}

	userIDClaim, exists := claims["userID"]
	if !exists {
		return 0, fmt.Errorf("userID claim missing in token")
	}

	var userID int32
	switch v := userIDClaim.(type) {
	case float64:
		userID = int32(v)
	case int:
		userID = int32(v)
	case int32:
		userID = v
	default:
		return 0, fmt.Errorf("invalid userID type (%T) in token", userIDClaim)
	}

	if userID <= 0 {
		return 0, fmt.Errorf("invalid userID value (%d) in token", userID)
	}

	log.Printf("Token validated successfully for userID: %d", userID)
	return userID, nil
}
