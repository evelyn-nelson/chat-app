-- name: GetAllUsers :many
SELECT "id", "username", "email", "created_at", "updated_at" FROM users;

-- name: GetUserById :one
SELECT "id", "username", "email", "created_at", "updated_at" FROM users WHERE id = $1;

-- name: GetUserByUsername :one
SELECT "id", "username", "email", "created_at", "updated_at" FROM users WHERE username = $1;

-- name: GetUserByEmail :one
SELECT "id", "username", "email", "created_at", "updated_at" FROM users WHERE LOWER(email) = LOWER($1);

-- name: GetAllUsersInGroup :many
SELECT users.id AS user_id, users.username, groups.id AS group_id, groups.name, user_groups.admin, user_groups.created_at AS joined_at
FROM users 
JOIN user_groups ON user_groups.user_id = users.id 
JOIN groups ON groups.id = user_groups.group_id
WHERE groups.id = $1;

-- name: GetUsersByEmails :many
SELECT id, username, email, created_at, updated_at FROM users WHERE email = ANY(sqlc.arg('emails')::text[]);

-- name: GetUsersByIDs :many
SELECT id, username, email, created_at, updated_at FROM users WHERE id = ANY(sqlc.arg('ids')::UUID[]);

-- name: GetAllUsersInternal :many
SELECT "id", "username", "email", "password", "created_at", "updated_at" FROM users;

-- name: GetUserByIdInternal :one
SELECT "id", "username", "email", "password", "created_at", "updated_at" FROM users WHERE id = $1;

-- name: GetUserByEmailInternal :one
SELECT "id", "username", "email", "password", "created_at", "updated_at" FROM users WHERE LOWER(email) = LOWER($1);

-- name: InsertUser :one
INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING "id", "username", "email", "created_at", "updated_at";

-- name: UpdateUser :one
UPDATE users 
SET
    "username" = coalesce(sqlc.narg('username'), "username"),
    "email" = coalesce(sqlc.narg('email'), "email")
WHERE id = sqlc.arg('id')
RETURNING "id", "username", "email", "created_at", "updated_at";

-- name: DeleteUser :one
DELETE FROM users
WHERE id = $1 RETURNING "id", "username", "email", "created_at", "updated_at";

-- name: GetRelevantUsers :many
WITH s AS (
    SELECT g.id FROM groups g
    JOIN user_groups ug ON ug.group_id = g.id
    WHERE ug.user_id = $1
)
SELECT u.id, u.username, u.email, u.created_at, jsonb_object_agg(ug.group_id, ug.admin)::text AS group_admin_map FROM users u 
JOIN user_groups ug ON ug.user_id = u.id
JOIN s ON s.id = group_id
GROUP BY u.id;