package server

import (
	"chat-app-server/util"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (api *API) WhoAmI(c *gin.Context) {
	user, err := util.GetUser(c, api.db)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)

}
