package util

import (
	"chat-app-server/db"
	"errors"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
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

func NullablePgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func NullablePgTimestamp(s *time.Time) pgtype.Timestamp {
	if s == nil {
		return pgtype.Timestamp{Valid: false}
	}
	return pgtype.Timestamp{Time: *s, Valid: true}
}
