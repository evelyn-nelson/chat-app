-- name: ReserveGroup :one
INSERT INTO group_reservations (
    group_id,
    user_id
) VALUES (
    $1, $2
)
RETURNING *;

-- name: GetGroupReservation :one
SELECT * FROM group_reservations
WHERE group_id = $1
LIMIT 1;

-- name: GetGroupReservationsForUser :many
SELECT * FROM group_reservations
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: DeleteGroupReservation :exec
DELETE FROM group_reservations
WHERE group_id = $1 AND user_id = $2;

-- name: DeleteAllGroupReservationsForUser :exec
DELETE FROM group_reservations
WHERE user_id = $1;

