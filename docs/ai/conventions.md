## Conventions

### Go (Gin, sqlc)

- Handlers live in `server/server/*.go` and `server/ws/*.go`; routes are wired in `server/router/router.go`.
- Access Postgres strictly via `*db.Queries` (sqlc outputs). Do not construct raw SQL in handlers.
- Use transactions for multi-stage writes to the database `tx, err := h.conn.Begin(ctx)`
- Add SQL in `db/queries/*.sql` and regenerate with `docker compose run --rm sqlc generate -f server/sqlc.yaml`.
- Use guard clauses and structured errors: `c.JSON(status, gin.H{"error": "message"})`.
- Keep handler nesting shallow; prefer early returns.
- Never log secrets or raw tokens.

### WebSocket (server/ws)

- Upgrade + auth: `/ws/establish-connection` authenticates via first message `{type:"auth", token}`.
- Use Hub channels for cross-cutting events: register/unregister, broadcast, add/remove user-group, initialize/delete group, update group info.
- Respect lock discipline in `hub.go` and group/client maps.
- Fanout through Redis Pub/Sub (`group_messages:*`, `group_events`).

### Expo / TypeScript

- Routing: file-based under `expo/app/(app)/...`.
- State: contexts in `expo/components/context/*` (`WebSocketContext`, `MessageStoreContext`, `GlobalStoreContext`).
- Persistence: `expo/store/Store.native.ts` (SQLite). Use `performSerialTransaction` for multi-row writes.
- Networking: `expo/util/custom-axios.js` and `expo/services/*`.
- E2EE: `expo/services/encryptionService.ts` for encrypt/decrypt utilities.
- Core Chat UI: `expo/components/ChatBox/*` orchestrates message list, calling decryption, bubbles, image viewer, composer.

### Migrations and SQLC

- Schema: add new `db/migrations/*_*.up.sql` and `.down.sql`.
- Apply: `docker compose run --rm migrate ... up`.
- Queries: add `db/queries/*.sql` and run sqlc generation (docker-first).
- Never edit generated files: `server/db/*_queries.sql.go`, `server/db/models.go`.

### Images

- Server enforces size (`MaxImageBytes`) and allowed extensions.
- Client-side encryption for images; payload includes objectKey, mimeType, key, nonce.
- Use `/images/presign-upload` and `/images/presign-download` endpoints.

### Testing and lint

- Client: `cd expo && npm run lint && npm run test`.
- Server: bring up stack via Docker and watch logs for runtime errors.

### Secrets and configuration

- Read secrets from environment. Do not commit or log secrets.
- Ensure `/api`, `/ws` (post-upgrade), and `/images` are behind JWT middleware.
