package server

import (
	"chat-app-server/db"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

func (api *API) CreateUserGroup(c *gin.Context) {
	var req CreateUserGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user_group, err := api.db.InsertUserGroup(api.ctx, db.InsertUserGroupParams{UserID: pgtype.Int4{Int32: int32(req.UserID), Valid: true}, GroupID: pgtype.Int4{Int32: int32(req.GroupId), Valid: true}, Admin: req.Admin})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &CreateUserGroupResponse{
		UserGroup: user_group,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) GetUserGroups(c *gin.Context) {
	user_groups, err := api.db.GetAllUserGroups(api.ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetUserGroupsResponse{
		UserGroups: user_groups,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) GetUserGroup(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID32 := int32(userID)

	groupID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	groupID32 := int32(groupID)
	user_group, err := api.db.GetUserGroupByGroupIDAndUserID(api.ctx, db.GetUserGroupByGroupIDAndUserIDParams{UserID: pgtype.Int4{Int32: userID32, Valid: true}, GroupID: pgtype.Int4{Int32: groupID32, Valid: true}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &GetUserGroupResponse{
		UserGroup: user_group,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) UpdateUserGroup(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID32 := int32(userID)

	groupID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	groupID32 := int32(groupID)

	var req UpdateUserGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user_group, err := api.db.UpdateUserGroup(api.ctx, db.UpdateUserGroupParams{Admin: req.Admin, UserID: pgtype.Int4{Int32: userID32, Valid: true}, GroupID: pgtype.Int4{Int32: groupID32, Valid: true}})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &UpdateUserGroupResponse{
		UserGroup: user_group,
	}

	c.JSON(http.StatusOK, res)
}

func (api *API) DeleteUserGroup(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID32 := int32(userID)

	groupID, err := strconv.Atoi(c.Param("groupID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	groupID32 := int32(groupID)

	user_group, err := api.db.DeleteUserGroup(api.ctx, db.DeleteUserGroupParams{UserID: pgtype.Int4{Int32: userID32, Valid: true}, GroupID: pgtype.Int4{Int32: groupID32, Valid: true}})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := &DeleteUserGroupResponse{
		UserGroup: user_group,
	}

	c.JSON(http.StatusOK, res)
}
