-- name: GetAllGroups :many
SELECT "id", "name", "created_at", "updated_at" FROM groups;

-- name: GetGroupById :one
SELECT "id", "name", "created_at", "updated_at" FROM groups WHERE id = $1;

-- name: GetGroupsForUser :many
SELECT groups.id, groups.name, groups.created_at, ug.admin, groups.updated_at FROM groups
JOIN user_groups ug ON ug.group_id = groups.id
JOIN users u ON u.id = ug.user_id
WHERE u.id = $1;

-- name: InsertGroup :one
INSERT INTO groups ("name") VALUES ($1) RETURNING *; 

-- name: UpdateGroup :one
UPDATE groups
SET
    "name" = $2
WHERE id = $1
RETURNING "id", "name", "created_at", "updated_at";

-- name: DeleteGroup :one
DELETE FROM groups
WHERE id = $1 RETURNING "id", "name", "created_at", "updated_at";