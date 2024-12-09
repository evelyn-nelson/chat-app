-- name: GetAllMessages :many
SELECT id, content, user_id, group_id, created_at, updated_at FROM messages;

-- name: GetMessageById :one
SELECT id, content, user_id, group_id, created_at, updated_at FROM messages WHERE id = $1;

-- name: InsertMessage :one
INSERT INTO messages ("user_id", "group_id", "content") VALUES ($1,$2,$3) RETURNING *;

-- name: DeleteMessage :one
DELETE FROM messages
WHERE id = $1 RETURNING *;