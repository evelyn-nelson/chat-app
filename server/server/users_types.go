package server

import (
	"chat-app-server/db"
)

type GetUsersResponse struct {
	Users []db.GetAllUsersRow `json:"users"`
}

type GetUserResponse struct {
	User db.GetUserByIdRow `json:"user"`
}

type UpdateUserRequest struct {
	Username *string `json:"username,omitempty"`
	Email    *string `json:"email,omitempty"`
}

type UpdateUserResponse struct {
	User db.UpdateUserRow `json:"user"`
}

type DeleteUserResponse struct {
	User db.DeleteUserRow `json:"user"`
}
