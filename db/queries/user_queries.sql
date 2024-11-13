-- name: GetAllUsers :many
SELECT "id", "username", "created_at", "updated_at" FROM users;

-- name: GetUserById :one
SELECT "id", "username", "created_at", "updated_at" FROM users WHERE id = $1;

-- name: GetUserByUsername :one
SELECT "id", "username", "created_at", "updated_at" FROM users WHERE username = $1;

-- name: GetAllUsersInGroup :many
SELECT users.id AS user_id, users.username, groups.id AS group_id, groups.name, user_groups.admin, user_groups.created_at AS joined_at
FROM users 
JOIN user_groups ON user_groups.user_id = users.id 
JOIN groups ON groups.id = user_groups.group_id
WHERE groups.id = $1;

-- name: InsertUser :one
INSERT INTO users (username) VALUES ($1) RETURNING *;