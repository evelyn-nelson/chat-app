package server

import (
	"chat-app-server/db"
	"time"
)

type CreateGroupRequest struct {
	Name      string    `json:"name" binding:"required"`
	StartTime time.Time `json:"start_time" binding:"required"`
	EndTime   time.Time `json:"end_time" binding:"required"`
}

type CreateGroupResponse struct {
	Group db.Group `json:"group"`
}

type GetGroupsResponse struct {
	Groups []db.GetAllGroupsRow `json:"groups"`
}

type GetGroupResponse struct {
	Group db.GetGroupByIdRow `json:"group"`
}

type UpdateGroupRequest struct {
	Name      *string    `json:"name,omitempty"`
	StartTime *time.Time `json:"start_time,omitempty"`
	EndTime   *time.Time `json:"end_time,omitempty"`
}

type UpdateGroupResponse struct {
	Group db.UpdateGroupRow `json:"group"`
}

type DeleteGroupResponse struct {
	Group db.DeleteGroupRow `json:"group"`
}
