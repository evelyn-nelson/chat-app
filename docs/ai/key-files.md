## Key files deep dive

### expo/components/context/WebSocketContext.tsx

- Purpose: Manages WebSocket lifecycle, authentication-on-open, retry strategy, and provides helper methods for group CRUD via HTTP.
- Public API: `establishConnection`, `disconnect`, `sendMessage`, `onMessage`, `removeMessageHandler`, `createGroup`, `updateGroup`, `leaveGroup`, `inviteUsersToGroup`, `removeUserFromGroup`, `getGroups`, `getUsers`.
- Auth handshake: immediately sends `{ type: "auth", token }` on `onopen`; expects `auth_success` before marking `connected`.
- Reconnects: capped backoff (`MAX_RETRIES`, jitter, `MAX_RETRY_DELAY`); `preventRetries` guards shutdown flows.
- Pitfalls: require `EXPO_PUBLIC_WS_HOST`; avoid `sendMessage` until `connected`; make handlers stable to avoid stale closures.

### expo/store/Store.native.ts

- Purpose: SQLite-backed cache for users/groups/messages with transactional writes and versioned migrations.
- API: `saveMessages`, `saveGroups`, `saveUsers`, `loadMessages`, `loadGroups`, `loadUsers`, `markGroupRead`, `clear*`, `close`.
- Concurrency: `performSerialTransaction` ensures one transaction at a time; use for multi-row operations.
- Migrations: driven by `PRAGMA user_version` (target version 9). Add new steps by bumping target and adding blocks.
- Pitfalls: JSON in `group_users`/`group_admin_map`; index alignment with read patterns; always sort messages by timestamp.

### server/ws/handler.go

- Purpose: HTTP endpoints related to groups and users plus the WebSocket upgrade/auth path.
- Endpoints: `EstablishConnection`, `CreateGroup`, `UpdateGroup`, `InviteUsersToGroup`, `RemoveUserFromGroup`, `LeaveGroup`, `GetGroups`, `GetUsersInGroup`, `GetRelevantUsers`, `GetRelevantMessages`.
- Patterns: guard auth/authorization (`util.GetUser`, `util.UserInGroup`), transact multi-step DB changes (`pgxpool.Begin`), return early on errors.
- Pitfalls: handle reservation checks for group creation; promote admin if last admin leaves; envelope JSON parsing for historical messages.

### server/ws/hub.go

- Purpose: In-memory hub coordinating connected clients, groups, and cross-instance events via Redis.
- Channels: `Register`, `Unregister`, `Broadcast`, `AddUserToGroupChan`, `RemoveUserFromGroupChan`, `InitializeGroupChan`, `DeleteHubGroupChan`, `UpdateGroupInfoChan`.
- Redis: presence keys (`client:...`, `server:...`), membership sets (`user:*:groups`, `group:*:members`), group info hash (`groupinfo:*`).
- Pub/Sub: `group_messages:*` for messages, `group_events` for add/remove/create/delete/update.
- Pitfalls: lock usage around hub/group maps; decode base64 before persisting; avoid blocking the Run loop; ensure Redis pipeline exec errors are handled.

### server/ws/client.go

- Purpose: Wrapper around a user's websocket connection with read/write loops and keepalive.
- Write: periodic ping, write JSON envelopes to `Message` channel with deadlines.
- Read: parse `ClientSentE2EMessage`, validate membership, forward to hub `Broadcast`.
- Pitfalls: respect `maxMessageSize`; handle context cancellation; set/refresh read deadlines via pong handler.

### expo/services/encryptionService.ts

- Purpose: E2EE utilities with concurrency limits, base64 conversion, text/image encryption/decryption.
- Outgoing: per-message symmetric key; per-recipient sealed envelopes with sender ephemeral key.
- Incoming: choose envelope by deviceId; decode to `DbMessage` for storage/decryption.
- Images: encrypt/decrypt helpers and payload builder carrying object key, mime type, key, nonce, dimensions, blurhash.
- Pitfalls: await `sodium.ready`; manage memory for large images; handle missing device envelope gracefully.

### expo/components/ChatBox/\*

- `ChatBox.tsx`: orchestrates message list, optimistic items, scroll, and composing.
- `ChatBubble.tsx`: text bubble presentation based on sender and theme.
- `ImageBubble.tsx`: fetch/decrypt image; uses blurhash/placeholder; avoid blocking UI thread.
- `ImageViewer.tsx`: fullscreen viewing; keep cached URIs.
- `MessageEntry.tsx`: composer; integrates with encryption/send hooks; handles images and text.
- `types.ts`: shared display types used by bubbles and list.
- Pitfalls: stable keys for list items; dedupe optimistic/server echoes; avoid heavy synchronous work in render.

### expo/components/context/MessageStoreContext.tsx

- Purpose: Holds message state per group, syncs historical messages, persists to SQLite, and manages optimistic displayables.
- Historical sync: GET `/ws/relevant-messages` → process via `encryptionService.processAndDecodeIncomingMessage` → `store.saveMessages` → reducer `SET_HISTORICAL_MESSAGES`.
- Live flow: `WebSocketContext.onMessage` handler → process → `ADD_MESSAGE` → persist → refresh groups.
- Pitfalls: require `deviceId`; prevent concurrent syncs; sort by timestamp; dedupe by message ID.
