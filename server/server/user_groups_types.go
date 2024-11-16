package server

import (
	"chat-app-server/db"
)

type CreateUserGroupRequest struct {
	UserID  int  `json:"user_id"`
	GroupId int  `json:"group_id"`
	Admin   bool `json:"admin"`
}

type CreateUserGroupResponse struct {
	UserGroup db.UserGroup `json:"user_group"`
}

type GetUserGroupsResponse struct {
	UserGroups []db.GetAllUserGroupsRow `json:"user_groups"`
}

type GetUserGroupResponse struct {
	UserGroup db.GetUserGroupByGroupIDAndUserIDRow `json:"user_group"`
}

type UpdateUserGroupRequest struct {
	Admin bool `json:"admin"`
}

type UpdateUserGroupResponse struct {
	UserGroup db.UpdateUserGroupRow `json:"user_group"`
}

type DeleteUserGroupResponse struct {
	UserGroup db.DeleteUserGroupRow `json:"user_group"`
}
