package server

import (
	"chat-app-server/db"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (api *API) CreateGroup(c *gin.Context) {
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group, err := api.db.InsertGroup(api.ctx, req.Name)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &CreateGroupResponse{
		Group: group,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) GetGroups(c *gin.Context) {
	groups, err := api.db.GetAllGroups(api.ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetGroupsResponse{
		Groups: groups,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) GetGroup(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	GroupID := int32(ID)

	group, err := api.db.GetGroupById(api.ctx, GroupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetGroupResponse{
		Group: group,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) UpdateGroup(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	GroupID := int32(ID)

	var req UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group, err := api.db.UpdateGroup(api.ctx, db.UpdateGroupParams{Name: req.Name, ID: GroupID})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &UpdateGroupResponse{
		Group: group,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) DeleteGroup(c *gin.Context) {
	ID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	GroupID := int32(ID)

	group, err := api.db.DeleteGroup(api.ctx, GroupID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &DeleteGroupResponse{
		Group: group,
	}

	c.JSON(http.StatusOK, res)
}
