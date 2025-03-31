package util

import (
	"chat-app-server/db"
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
)

func GetUser(c *gin.Context, queries *db.Queries) (db.GetUserByIdRow, error) {
	ctx := c.Request.Context()
	ID, exists := c.Get("userID")
	if !exists {
		return db.GetUserByIdRow{}, errors.New("UserID not found")
	}

	if _, ok := ID.(int32); !ok {
		return db.GetUserByIdRow{}, errors.New("UserID is not an int32")
	} else {
		fmt.Println("ID", ID)
		user, err := queries.GetUserById(ctx, ID.(int32))
		if err != nil {
			fmt.Println(err.Error())
			return db.GetUserByIdRow{}, errors.New("user not found")
		}
		return user, nil
	}
}
