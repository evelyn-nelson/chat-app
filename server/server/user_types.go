package server

import (
	"chat-app-server/db"

	"github.com/jackc/pgx/v5/pgtype"
)

type CreateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
}

type CreateUserResponse struct {
	User db.InsertUserRow `json:"user"`
}

type GetUsersResponse struct {
	Users []db.GetAllUsersRow `json:"users"`
}

type GetUserResponse struct {
	User db.GetUserByIdRow `json:"user"`
}

type UpdateUserRequest struct {
	Username pgtype.Text `json:"username,omitempty"`
	Email    pgtype.Text `json:"email,omitempty"`
}

type UpdateUserResponse struct {
	User db.UpdateUserRow `json:"user"`
}

type DeleteUserResponse struct {
	User db.DeleteUserRow `json:"user"`
}
