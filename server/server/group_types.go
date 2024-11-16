package server

import (
	"chat-app-server/db"
)

type CreateGroupRequest struct {
	Name string `json:"name"`
}

type CreateGroupResponse struct {
	Group db.Group `json:"group"`
}

type GetGroupsResponse struct {
	Groups []db.Group `json:"groups"`
}

type GetGroupResponse struct {
	Group db.Group `json:"group"`
}

type UpdateGroupRequest struct {
	Name string `json:"name"`
}

type UpdateGroupResponse struct {
	Group db.Group `json:"group"`
}

type DeleteGroupResponse struct {
	Group db.Group `json:"group"`
}
