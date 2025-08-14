## Playbooks

### Add a REST endpoint (Go)

1. Write SQL in `db/queries/*.sql` (SELECT/INSERT/UPDATE/DELETE as needed).
2. Generate code: `docker compose run --rm sqlc generate -f server/sqlc.yaml`.
3. Implement handler in `server/server/*.go` using `*db.Queries`.
4. Register route in `server/router/router.go`.
5. Start stack: `docker compose up`. Verify via curl or client. Tail logs with `docker-compose logs -f go-server`.

### Add a WebSocket flow (Go + Expo)

1. Define payload schema (server `ws/types.go` or inline) and any DB shape.
2. Implement server-side handling in `server/ws/handler.go` or `hub.go`.
3. Update client receive/send logic in `expo/components/context/WebSocketContext.tsx` and `MessageStoreContext.tsx`.
4. Start stack + expo: `docker compose up` and `cd expo && npx expo start`. Verify connection, auth, and message flow.

### Add a migration

1. Create `db/migrations/*_*.up.sql` and matching `.down.sql`.
2. Apply: `docker compose run --rm migrate -path /migrations -database "postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME:-postgres}?sslmode=disable" up`.
3. If API needs new queries, add to `db/queries/*.sql` and run sqlc generation.

### Add or adjust image upload/download

1. Server: extend `server/images/handler.go` if needed; keep size/extension checks.
2. Client: use `expo/services/imageService.ts` and `expo/hooks/useSendImage.ts` (and related) for upload path.
3. Ensure payload includes encrypted data and decryption metadata (key/nonce). Use `encryptionService.ts` helpers.

### Create a new screen/feature in Expo

1. Add a screen under `expo/app/(app)/...` per file-based routing.
2. Use contexts for data flow and persistence.
3. Interact with API via `expo/services/*` and `expo/util/custom-axios.js`.
4. Lint/tests: `npm run lint && npm run test`.

### Dependency updates

- Go: use `go get` to update; commit `go.mod` and `go.sum` via normal workflow (do not hand-edit `go.sum`).
- Expo: `npm i` to add/update; commit `expo/package.json` and `expo/package-lock.json` (do not hand-edit lock).

### Quick command reference (docker-first)

- Start stack: `docker compose up`
- Apply migrations: `docker compose run --rm migrate ...`
- Generate sqlc: `docker compose run --rm sqlc generate -f server/sqlc.yaml`
- Expo dev: `cd expo && npx expo start`
- Lint/test: `cd expo && npm run lint && npm run test`
