// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.27.0
// source: user_queries.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const getAllUsers = `-- name: GetAllUsers :many
SELECT "id", "username", "email", "created_at", "updated_at" FROM users
`

type GetAllUsersRow struct {
	ID        int32            `json:"id"`
	Username  string           `json:"username"`
	Email     pgtype.Text      `json:"email"`
	CreatedAt pgtype.Timestamp `json:"created_at"`
	UpdatedAt pgtype.Timestamp `json:"updated_at"`
}

func (q *Queries) GetAllUsers(ctx context.Context) ([]GetAllUsersRow, error) {
	rows, err := q.db.Query(ctx, getAllUsers)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetAllUsersRow
	for rows.Next() {
		var i GetAllUsersRow
		if err := rows.Scan(
			&i.ID,
			&i.Username,
			&i.Email,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getAllUsersInGroup = `-- name: GetAllUsersInGroup :many
SELECT users.id AS user_id, users.username, groups.id AS group_id, groups.name, user_groups.admin, user_groups.created_at AS joined_at
FROM users 
JOIN user_groups ON user_groups.user_id = users.id 
JOIN groups ON groups.id = user_groups.group_id
WHERE groups.id = $1
`

type GetAllUsersInGroupRow struct {
	UserID   int32            `json:"user_id"`
	Username string           `json:"username"`
	GroupID  int32            `json:"group_id"`
	Name     string           `json:"name"`
	Admin    bool             `json:"admin"`
	JoinedAt pgtype.Timestamp `json:"joined_at"`
}

func (q *Queries) GetAllUsersInGroup(ctx context.Context, id int32) ([]GetAllUsersInGroupRow, error) {
	rows, err := q.db.Query(ctx, getAllUsersInGroup, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetAllUsersInGroupRow
	for rows.Next() {
		var i GetAllUsersInGroupRow
		if err := rows.Scan(
			&i.UserID,
			&i.Username,
			&i.GroupID,
			&i.Name,
			&i.Admin,
			&i.JoinedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getAllUsersInternal = `-- name: GetAllUsersInternal :many
SELECT "id", "username", "email", "password", "created_at", "updated_at" FROM users
`

type GetAllUsersInternalRow struct {
	ID        int32            `json:"id"`
	Username  string           `json:"username"`
	Email     pgtype.Text      `json:"email"`
	Password  pgtype.Text      `json:"password"`
	CreatedAt pgtype.Timestamp `json:"created_at"`
	UpdatedAt pgtype.Timestamp `json:"updated_at"`
}

func (q *Queries) GetAllUsersInternal(ctx context.Context) ([]GetAllUsersInternalRow, error) {
	rows, err := q.db.Query(ctx, getAllUsersInternal)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetAllUsersInternalRow
	for rows.Next() {
		var i GetAllUsersInternalRow
		if err := rows.Scan(
			&i.ID,
			&i.Username,
			&i.Email,
			&i.Password,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getUserById = `-- name: GetUserById :one
SELECT "id", "username", "email", "created_at", "updated_at" FROM users WHERE id = $1
`

type GetUserByIdRow struct {
	ID        int32            `json:"id"`
	Username  string           `json:"username"`
	Email     pgtype.Text      `json:"email"`
	CreatedAt pgtype.Timestamp `json:"created_at"`
	UpdatedAt pgtype.Timestamp `json:"updated_at"`
}

func (q *Queries) GetUserById(ctx context.Context, id int32) (GetUserByIdRow, error) {
	row := q.db.QueryRow(ctx, getUserById, id)
	var i GetUserByIdRow
	err := row.Scan(
		&i.ID,
		&i.Username,
		&i.Email,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getUserByIdInternal = `-- name: GetUserByIdInternal :one
SELECT "id", "username", "email", "password", "created_at", "updated_at" FROM users WHERE id = $1
`

type GetUserByIdInternalRow struct {
	ID        int32            `json:"id"`
	Username  string           `json:"username"`
	Email     pgtype.Text      `json:"email"`
	Password  pgtype.Text      `json:"password"`
	CreatedAt pgtype.Timestamp `json:"created_at"`
	UpdatedAt pgtype.Timestamp `json:"updated_at"`
}

func (q *Queries) GetUserByIdInternal(ctx context.Context, id int32) (GetUserByIdInternalRow, error) {
	row := q.db.QueryRow(ctx, getUserByIdInternal, id)
	var i GetUserByIdInternalRow
	err := row.Scan(
		&i.ID,
		&i.Username,
		&i.Email,
		&i.Password,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getUserByUsername = `-- name: GetUserByUsername :one
SELECT "id", "username", "email", "created_at", "updated_at" FROM users WHERE username = $1
`

type GetUserByUsernameRow struct {
	ID        int32            `json:"id"`
	Username  string           `json:"username"`
	Email     pgtype.Text      `json:"email"`
	CreatedAt pgtype.Timestamp `json:"created_at"`
	UpdatedAt pgtype.Timestamp `json:"updated_at"`
}

func (q *Queries) GetUserByUsername(ctx context.Context, username string) (GetUserByUsernameRow, error) {
	row := q.db.QueryRow(ctx, getUserByUsername, username)
	var i GetUserByUsernameRow
	err := row.Scan(
		&i.ID,
		&i.Username,
		&i.Email,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getUserByUsernameInternal = `-- name: GetUserByUsernameInternal :one
SELECT "id", "username", "email", "password", "created_at", "updated_at" FROM users WHERE username = $1
`

type GetUserByUsernameInternalRow struct {
	ID        int32            `json:"id"`
	Username  string           `json:"username"`
	Email     pgtype.Text      `json:"email"`
	Password  pgtype.Text      `json:"password"`
	CreatedAt pgtype.Timestamp `json:"created_at"`
	UpdatedAt pgtype.Timestamp `json:"updated_at"`
}

func (q *Queries) GetUserByUsernameInternal(ctx context.Context, username string) (GetUserByUsernameInternalRow, error) {
	row := q.db.QueryRow(ctx, getUserByUsernameInternal, username)
	var i GetUserByUsernameInternalRow
	err := row.Scan(
		&i.ID,
		&i.Username,
		&i.Email,
		&i.Password,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const insertUser = `-- name: InsertUser :one
INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, created_at, updated_at, email, password
`

type InsertUserParams struct {
	Username string      `json:"username"`
	Email    pgtype.Text `json:"email"`
}

func (q *Queries) InsertUser(ctx context.Context, arg InsertUserParams) (User, error) {
	row := q.db.QueryRow(ctx, insertUser, arg.Username, arg.Email)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Username,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.Email,
		&i.Password,
	)
	return i, err
}

const updateUser = `-- name: UpdateUser :one
UPDATE users 
SET
    "username" = coalesce($1, "username"),
    "email" = coalesce($2, "email")
WHERE id = $3
RETURNING "id", "username", "email", "created_at", "updated_at"
`

type UpdateUserParams struct {
	Username pgtype.Text `json:"username"`
	Email    pgtype.Text `json:"email"`
	ID       int32       `json:"id"`
}

type UpdateUserRow struct {
	ID        int32            `json:"id"`
	Username  string           `json:"username"`
	Email     pgtype.Text      `json:"email"`
	CreatedAt pgtype.Timestamp `json:"created_at"`
	UpdatedAt pgtype.Timestamp `json:"updated_at"`
}

func (q *Queries) UpdateUser(ctx context.Context, arg UpdateUserParams) (UpdateUserRow, error) {
	row := q.db.QueryRow(ctx, updateUser, arg.Username, arg.Email, arg.ID)
	var i UpdateUserRow
	err := row.Scan(
		&i.ID,
		&i.Username,
		&i.Email,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
