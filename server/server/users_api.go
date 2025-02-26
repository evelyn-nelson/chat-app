package server

import (
	"chat-app-server/db"
	"chat-app-server/util"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (api *API) GetUsers(c *gin.Context) {
	users, err := api.db.GetAllUsers(api.ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetUsersResponse{
		Users: users,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) GetUser(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := int32(ID)

	user, err := api.db.GetUserById(api.ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetUserResponse{
		User: user,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) WhoAmI(c *gin.Context) {
	user, err := util.GetUser(c, api.db, api.ctx)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)

}

func (api *API) UpdateUser(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := int32(ID)

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := api.db.UpdateUser(api.ctx, db.UpdateUserParams{Username: req.Username, Email: req.Email, ID: userID})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &UpdateUserResponse{
		User: user,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) DeleteUser(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := int32(ID)

	user, err := api.db.DeleteUser(api.ctx, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &DeleteUserResponse{
		User: user,
	}

	c.JSON(http.StatusOK, res)
}
