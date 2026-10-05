# Deployment (Docker + Caddy + PostgreSQL)

**Status: configuration written but NOT built or run** (Docker daemon was not running on the authoring machine). Treat as untested until you run it.

```sh
cp infra/.env.example infra/.env     # set POSTGRES_PASSWORD, SITE_ADDRESS, PUBLIC_ORIGIN, PUBLIC_WS_URL
docker compose -f infra/docker-compose.yml --env-file infra/.env up --build -d
docker compose -f infra/docker-compose.yml ps        # server + postgres should become "healthy"
curl http://localhost/health                          # proxied to the game server
```
- `PUBLIC_WS_URL` is baked into the web bundle at build time (`VITE_SERVER_URL`); changing the domain requires `--build`.
- TLS: set `SITE_ADDRESS` to your domain; Caddy obtains certificates automatically (ports 80/443 reachable). Use `localhost` for Caddy's internal CA, `:80` for plain HTTP.
- Volumes: `pgdata` (PostgreSQL), `serverdata` (JSON checkpoint fallback), `caddy_data` (certificates). Back up `pgdata`.
- Room checkpoints contain secrets (decks/hands); keep Postgres private (it is not published to the host).
- Server image is a single self-contained bundle (`scripts/bundle-server.mjs`); schema migrations run in the server on boot.
- Single server instance only: rooms live in process memory.
- Without Docker: `npm run build`, then `node dist-bundle/server.mjs` (after `npm run bundle:server`) plus any static server for `apps/web/dist`.
