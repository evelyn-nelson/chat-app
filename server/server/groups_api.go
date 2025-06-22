package server

import (
	"chat-app-server/db"
	"chat-app-server/util"
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (api *API) ReserveGroup(c *gin.Context) {
	user, err := util.GetUser(c, api.db)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found or unauthorized"})
		return
	}

	groupID, err := uuid.Parse(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	_, err = api.db.GetGroupById(c.Request.Context(), groupID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		log.Printf("Error reserving group %s for user %s: %v", groupID, user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reserve group"})
		return
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusConflict, gin.H{"error": "Group already exists"})
		return
	}

	_, err = api.db.ReserveGroup(c.Request.Context(), db.ReserveGroupParams{
		GroupID: groupID,
		UserID:  user.ID,
	})
	if err != nil {
		log.Printf("Error reserving group %s for user %s: %v", groupID, user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reserve group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group reserved successfully"})
}
