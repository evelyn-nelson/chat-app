package util

import (
	"chat-app-server/db"
	"context"
	"errors"

	"github.com/gin-gonic/gin"
)

func GetUser(c *gin.Context, queries *db.Queries, ctx context.Context) (db.GetUserByIdRow, error) {
	ID, exists := c.Get("userID")
	if !exists {
		return db.GetUserByIdRow{}, errors.New("UserID not found")
	}

	if _, ok := ID.(int32); ok {
		return db.GetUserByIdRow{}, errors.New("UserID is not an int32")
	} else {
		user, err := queries.GetUserById(ctx, ID.(int32))
		if err != nil {
			return db.GetUserByIdRow{}, errors.New("user not found")
		}
		return user, nil
	}
}
