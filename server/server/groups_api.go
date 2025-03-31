package server

import (
	"chat-app-server/db"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (api *API) CreateGroup(c *gin.Context) {
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.EndTime.Before(req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}

	if req.StartTime.Before(time.Now().Add(-1 * time.Minute)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be in the future"})
		return
	}

	group, err := api.db.InsertGroup(api.ctx, db.InsertGroupParams{Name: req.Name, StartTime: pgtype.Timestamp{Time: req.StartTime, Valid: true}, EndTime: pgtype.Timestamp{Time: req.EndTime, Valid: true}})

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

	oldGroup, err := api.db.GetGroupById(api.ctx, GroupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "New start time is after existing end time"})
			return
		} else {
			c.JSON(http.StatusInternalServerError, err)
			return
		}
	}

	if req.StartTime != nil && req.EndTime == nil && oldGroup.EndTime.Time.Before(*req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New start time is after existing end time"})
		return
	} else if req.StartTime == nil && req.EndTime != nil && req.EndTime.Before(oldGroup.StartTime.Time) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New end time is before existing start time"})
		return
	} else if req.StartTime != nil && req.EndTime != nil && req.EndTime.Before(*req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be before start time"})
		return
	}

	if req.StartTime != nil && req.StartTime.Before(time.Now().Add(-1*time.Minute)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be in the future"})
		return
	}

	params := db.UpdateGroupParams{
		ID:        GroupID,
		Name:      pgtype.Text{},
		StartTime: pgtype.Timestamp{},
		EndTime:   pgtype.Timestamp{},
	}

	if req.Name != nil {
		params.Name.String = *req.Name
		params.Name.Valid = true
	}
	if req.StartTime != nil {
		params.StartTime.Time = *req.StartTime
		params.StartTime.Valid = !params.StartTime.Time.IsZero()
	}
	if req.EndTime != nil {
		params.EndTime.Time = *req.EndTime
		params.EndTime.Valid = !params.EndTime.Time.IsZero()
	}

	group, err := api.db.UpdateGroup(api.ctx, params)

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
