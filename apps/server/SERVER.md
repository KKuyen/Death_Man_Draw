# @saloon/server

Colyseus 0.18 backend for the saloon poker game. Room type `saloon`, WebSocket + HTTP on `127.0.0.1:2567` (`HOST=0.0.0.0` to expose).

## Commands (Node ≥ 22)
```sh
npm run dev -w @saloon/server        # tsx src/index.ts
npm run build -w @saloon/server      # esbuild bundle -> apps/server/dist/index.js (workspace TS sources are inlined)
npm run start -w @saloon/server      # node dist/index.js
npm run typecheck -w @saloon/server
npm test -w @saloon/server           # real colyseus SDK clients against an in-process server on :2599
node test/demo.mjs                   # manual: 1 human + 3 bots, prints the table log (server must be running)
node test/restore.mjs                # manual: kill -TERM mid-hand, restart, rejoin; needs dist/ built, run in apps/server
```
Config: see `.env.example` (`HOST`, `PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `DATA_DIR`).

## Protocol
Create/join options: `{name, character, code?}`. `create` makes a code-based room (random 5-char code, or valid `code`); `joinById(roomId, {code})` rejects a mismatching code. Messages: client→server `command`; server→client `welcome`, `public`, `private`, `event`, `error`. Snapshots are only messages (no replicated schema state). `playerId` = Colyseus `sessionId` (kept across reconnect).
HTTP: `GET /health`, `GET /api/rooms` → `{rooms:[{roomId,code,players,maxClients,phase}]}`. CORS only for `http://localhost:5173`, `http://127.0.0.1:5173` and `CORS_ORIGIN`.

## Behaviour
- Engine from `@saloon/rules` (`createGame`/`restoreGame`), tick 50 ms, snapshots on mutation + diff every 150 ms + 1 s heartbeat. RNG is `crypto.randomInt`.
- `addBot` is handled by the server (host only, lobby, max 3 bots, 4 seats); the engine rejects it. Bots only read their own private snapshot + the public snapshot; they check/call/raise by hand strength (with small bluff chance), act 0.7–2 s after their turn starts.
- Per-client token bucket (20 burst, 10/s), command must be an object ≤2 KB with `commandId` (1–128 chars); the engine validates shapes and dedups `[playerId, commandId]`. `tap.pressedAt` outliers are dropped; the engine clamps the rest.
- Reconnect: 45 s via `onDrop`/`allowReconnection`; room state and timers are server-owned. Client SDK `reconnect(token)` works.
- Persistence: checkpoints every ≤5 s while active, on shutdown and on dispose-free paths. PostgreSQL (`DATABASE_URL`, tables `room_checkpoints`, `room_events`, `schema_migrations`) else atomic JSON (tmp+rename, mode 0600) in `DATA_DIR/rooms`. On boot checkpointed rooms are re-created in a new room id with the same code; humans are disconnected for 45 s and re-claim their seat with `joinById(..., {rejoinKey})` (key delivered once in `welcome`; only its hash is persisted). Invalid checkpoints are quarantined as `*.corrupt`. Finished/empty rooms drop their checkpoint. Checkpoints contain secrets (decks, hands) — never served over HTTP/WS or logged.

## Known limits
See `SERVER_RESULT.md`.
