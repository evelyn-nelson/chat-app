## System architecture (chat-app)

### Runtime surfaces

- Expo app (React Native 0.79 / Expo SDK 53), file-based routing under `expo/app/(app)/...`
- Go server (Gin) on 8080 behind Caddy (Docker)
- Postgres (via Docker), Redis (via Docker), S3 (image storage)

### Authentication

- JWT via `/auth/login` and `/auth/signup`
- Middleware protects `/api/*`, `/ws/*` (after upgrade) and `/images/*`

### Data layer

- Postgres with sqlc → typed accessors in `server/db/*.sql.go` (generated)
- Schema changes via `db/migrations/*.sql` (up/down)
- Queries live in `db/queries/*.sql` and are compiled with `sqlc` using `server/sqlc.yaml`

### Realtime

- WebSocket handshake at `/ws/establish-connection`
  - Client immediately sends `{ type: "auth", token }`
  - Server responds with `auth_success` or `auth_failure`
- Redis Pub/Sub for multi-instance fanout
  - Channels: `group_messages:*` and `group_events`
  - Hub in `server/ws/hub.go` coordinates local clients and Redis sync

### Media pipeline

- Presigned upload/download endpoints in `server/images/handler.go`
- Client uses `expo/services/imageService.ts` and `expo/hooks` to upload
- Server enforces size (`MaxImageBytes`) and extension allowlist
- Client encrypts images; payload carries decryption key/nonce (E2EE)

### Environment and configuration

- Root `.env`: `DB_USER`, `DB_PASSWORD`, `DB_URL`, `JWT_SECRET`, `REDIS_URL`, `S3_BUCKET`
- Expo `.env`: `EXPO_PUBLIC_HOST`, `EXPO_PUBLIC_WS_HOST`
- SQLC configured in `server/sqlc.yaml` (outputs in `server/db`)

### Local development (docker-first)

- Start stack: `docker compose up`
- Apply migrations: `docker compose run --rm migrate ...`
- Generate sqlc outputs: `docker compose run --rm sqlc generate -f server/sqlc.yaml`
- Expo dev server: `cd expo && npx expo start`

### Key packages and directories

- Server routing: `server/router/router.go`
- REST API: `server/server/*.go`
- WebSocket: `server/ws/*.go` (client, hub, handler, types)
- SQLC generated: `server/db/*_queries.sql.go`, `server/db/models.go`
- Expo contexts: `expo/components/context/*`
- Local SQLite store: `expo/store/Store.native.ts`

### Security notes

- Never log or hardcode secrets
- Validate membership (`util.UserInGroup`) for group-scoped actions
- Size and extension validation for images
- Enforce JWT middleware for protected routes
