package util

import (
	"chat-app-server/db"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func GetUser(c *gin.Context, queries *db.Queries) (db.GetUserByIdRow, error) {
	ctx := c.Request.Context()
	ID, exists := c.Get("userID")
	if !exists {
		return db.GetUserByIdRow{}, errors.New("UserID not found")
	}

	if _, ok := ID.(uuid.UUID); !ok {
		return db.GetUserByIdRow{}, errors.New("UserID is not a uuid")
	} else {
		fmt.Println("ID", ID)
		user, err := queries.GetUserById(ctx, ID.(uuid.UUID))
		if err != nil {
			fmt.Println(err.Error())
			return db.GetUserByIdRow{}, errors.New("user not found")
		}
		return user, nil
	}
}

func UserInGroup(ctx context.Context, userID uuid.UUID, groupID uuid.UUID, queries *db.Queries) (bool, error) {
	_, dbErr := queries.GetUserGroupByGroupIDAndUserID(ctx, db.GetUserGroupByGroupIDAndUserIDParams{
		UserID:  &userID,
		GroupID: &groupID,
	})

	if dbErr != nil {
		if errors.Is(dbErr, pgx.ErrNoRows) {
			return false, nil
		} else {
			return false, dbErr
		}
	}
	return true, nil
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
