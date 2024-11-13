-- name: GetAllUserGroups :many
SELECT "id", "user_id", "group_id", "admin", "created_at", "updated_at" FROM user_groups;

-- name: GetAllUserGroupsForUser :many
SELECT "id", "user_id", "group_id", "admin", "created_at", "updated_at" FROM user_groups WHERE user_id = $1;

-- name: GetAllUserGroupsForGroup :many
SELECT "id", "user_id", "group_id", "admin", "created_at", "updated_at" FROM user_groups WHERE group_id = $1;

-- name: GetUserGroupByID :one
SELECT "id", "user_id", "group_id", "admin", "created_at", "updated_at" FROM user_groups WHERE id = $1;

-- name: GetUserGroupByGroupIDAndUserID :one
SELECT "id", "user_id", "group_id", "admin", "created_at", "updated_at" FROM user_groups WHERE user_id = $1 AND group_id = $2;

-- name: InsertUserGroup :one
INSERT INTO user_groups ("user_id", "group_id", "admin") VALUES ($1, $2, $3) RETURNING *;