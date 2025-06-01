-- name: RegisterDeviceKey :one
INSERT INTO device_keys (
    user_id,
    device_identifier,
    public_key,
    last_seen_at
) VALUES (
    $1, $2, $3, now()
)
ON CONFLICT (user_id, device_identifier) DO UPDATE SET
    public_key = EXCLUDED.public_key,
    last_seen_at = now()
RETURNING *;

-- name: GetDeviceKeyByIdentifier :one
SELECT * FROM device_keys
WHERE user_id = $1 AND device_identifier = $2
LIMIT 1;

-- name: GetDeviceKeysForUser :many
SELECT * FROM device_keys
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpdateDeviceKeyLastSeen :exec
UPDATE device_keys
SET last_seen_at = now()
WHERE user_id = $1 AND device_identifier = $2;

-- name: DeleteDeviceKey :exec
DELETE FROM device_keys
WHERE user_id = $1 AND device_identifier = $2;

-- name: DeleteAllDeviceKeysForUser :exec
DELETE FROM device_keys
WHERE user_id = $1;

