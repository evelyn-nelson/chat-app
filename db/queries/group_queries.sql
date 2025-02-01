-- name: GetAllGroups :many
SELECT "id", "name", "created_at", "updated_at" FROM groups;

-- name: GetGroupById :one
SELECT "id", "name", "created_at", "updated_at" FROM groups WHERE id = $1;

-- name: GetGroupsForUser :many
SELECT groups.id, groups.name, groups.created_at, ug.admin, groups.updated_at,
json_agg(jsonb_build_object('id', u2.id, 'username', u2.username, 'email', u2.email, 'admin', ug2.admin))::text AS group_users 
FROM groups
JOIN user_groups ug ON ug.group_id = groups.id
JOIN users u ON u.id = ug.user_id
JOIN user_groups ug2 ON ug2.group_id = groups.id
JOIN users u2 ON u2.id = ug2.user_id
WHERE u.id = $1
GROUP BY groups.id, ug.id, u.id;

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