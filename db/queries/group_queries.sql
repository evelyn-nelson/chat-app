-- name: GetAllGroups :many
SELECT "id", "name", "created_at", "updated_at" FROM groups;

-- name: GetGroupById :one
SELECT "id", "name", "created_at", "updated_at" FROM groups WHERE id = $1;

-- name: InsertGroup :one
INSERT INTO groups ("name") VALUES ($1) RETURNING *; 

