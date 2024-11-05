-- name: GetAllUsers :many
SELECT "id", "username", "created_at", "updated_at" FROM users;

