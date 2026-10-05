# Delivery result (04/10/2026)

## Added
- `apps/desktop/{main.cjs,electron-builder.yml,package.json}`: Electron serves `apps/web/dist` on 127.0.0.1 (random port), spawns `dist-bundle/server.mjs` via ELECTRON_RUN_AS_NODE (reuses a healthy server on :2567), CORS set to the local origin, sandbox + contextIsolation, no nodeIntegration, external links to system browser. Env: `SALOON_DEV_URL`, `SALOON_NO_SERVER`, `PORT`, `SALOON_WEB_DIR`, `SALOON_SERVER_ENTRY`. Packaging resources include web dist (all models) and the server bundle.
- `scripts/bundle-server.mjs` (self-contained esbuild bundle, no node_modules needed), `scripts/check-assets.mjs`, root `vitest.config.ts` (excludes Playwright specs which previously made `npm test` fail), `.dockerignore`, `dist-bundle/` in `.gitignore`.
- Root scripts: `bundle:server`, `desktop`, `desktop:pack`, `desktop:smoke` updated/added.
- `infra/{Dockerfile,Caddyfile,docker-compose.yml,.env.example,README.md}`, `.github/workflows/ci.yml` (typecheck, test, build, bundle, check:assets, Playwright, docker build).
- README.md and DEVELOPMENT_PLAN.md §10 updated. tests/e2e already existed (not touched).

## Verified (this machine, Node 22.23.2)
- `npm run build` exit 0; `npm run typecheck` 0 errors; `npm run check:assets` OK (19 manifest entries, 20 GLB); `npm test` 6 files / 85 tests pass.
- Server bundle runs standalone: `/health` -> `{"ok":true,...,"persistence":"json"}`.
- Electron headless (`SALOON_SMOKE=1`, own server on :2633): page loaded, title "Dead Man’s Draw — Western Poker", React root + canvas present, `/models/environment.glb` 200 `model/gltf-binary`, child server healthy, exited with app. WebGL shader-log errors (software GL) appeared but the page rendered. Not verified: UI actually connecting from the desktop to a non-default server port (web defaults to ws://host:2567), real GPU, visible window.

## NOT verified
- Docker: CLI present but daemon not running; Dockerfile/compose/Caddyfile never built or validated. Caddy WebSocket routing (matchers on /matchmake, Connection: Upgrade) is by reading Colyseus conventions, may need adjustment.
- `desktop:pack` (electron-builder) never run; CI never run on GitHub; Playwright e2e not run by me (frontend owns specs).
- No production hosting, domain or TLS tested.

---
# Round 2 (verification attempts)

## Fixed along the way
- `electron-builder.yml`: paths were relative to the wrong dir (`output` resolved to `/Users/release`); now relative to repo root, main = `apps/desktop/main.cjs`. Removed `apps/desktop/package.json` (it made a new workspace the lockfile did not know).
- Bundled server did not auto-start when the path contained a space (`Dead Man's Draw.app`) because `apps/server/src/index.ts`'s main-guard compares an un-encoded path. `scripts/bundle-server.mjs` now starts the server explicitly when that guard would not match (without double start; a first attempt started it twice and caused a Postgres migration race).

## Verified
- `npm run desktop:pack` (unsigned, `CSC_IDENTITY_AUTO_DISCOVERY=false`) -> `release/mac-arm64/Dead Man's Draw.app` (280 MB). Running its binary with `SALOON_SMOKE=1 SALOON_HEADLESS=1 PORT=2644`: server child healthy from the bundled `server.mjs`, page loaded with canvas, `/models/environment.glb` 200 model/gltf-binary, server exited with the app. Only the mac-arm64 `dir` target was built; win/linux targets untried; app is unsigned/unnotarized.
- Docker Desktop was installed; started with `open -a Docker`. `docker compose -f infra/docker-compose.yml --env-file infra/.env up --build -d` built and all 3 services came up healthy. Through Caddy on :80: `/health` -> `{"ok":true,"persistence":"postgres"}` (rows in `room_checkpoints` seen via psql), `/` 200, `/models/*.glb` 200, `POST /matchmake/create/saloon` 200, raw WebSocket upgrade 101, and a **real Chromium page** loaded the web app from Caddy and received a WebSocket message from the room through Caddy. Stack torn down afterwards, test `.env` removed.
- Local runs of CI commands: `typecheck` 0 errors, `npm test` 92 passed, `build`, `bundle:server`, `check:assets` all exit 0.

## Problems found / still open
- **`npm ci` fails** (also in CI and originally in the Dockerfile): `package-lock.json` is out of sync, missing `esbuild` (a devDependency of apps/server). I did not touch dependencies. Fix: `npm install --package-lock-only` (lead/dependency owner), then change `infra/Dockerfile` back to `npm ci` (there is a TODO; it currently uses `npm install --ignore-scripts`, which is not reproducible). CI `verify` job will fail at `npm ci` until the lock is fixed.
- The Node `@colyseus/sdk` client (`new Client('http://127.0.0.1').create(...)`) failed to connect through Caddy on :80 with an empty ServerError, while the same sockets opened with the `ws` library and with Chromium succeeded, and the SDK works directly against :2567. Cause not found; browsers (the real client) work. Treat Node-SDK-through-Caddy as unexplained.
- Not tested: TLS/domain certificates, `wss://`, multi-room load, win/linux desktop packages, GitHub-hosted CI itself, Docker `web` image in CI.
- `npm run test:e2e` was started locally but did not finish within ~12 minutes (specs are owned by the frontend agent); I killed it, so Playwright is **unverified** here and may also be too slow/hanging for CI.

---
# Round 3: Electron 41
- `electron` upgraded `^39.0.0` -> `^41.10.7` (installed 41.10.7) with `npm install electron@^41.10.7 --save-dev --ignore-scripts`; the Electron binary was fetched with `node node_modules/electron/install.js`. No `audit fix`.
- `npm run desktop:smoke` (dev Electron 41): page loaded, canvas present, GLB 200 (note: it reused an already-running server on :2567, so the server-spawn path was covered by the packaged run below).
- `npm run desktop:pack` with electron=41.10.7 succeeded; packaged app smoke (`PORT=2655`) spawned its bundled server, loaded the page, GLB 200. `npm run typecheck` still 0 errors.
- Side effect: the npm install also refreshed `package-lock.json`; `npm ci --dry-run` is now in sync (esbuild present), so the earlier lockfile problem is resolved. `infra/Dockerfile` switched back to `npm ci` — validated only by `npm ci --dry-run` on a copy of the Dockerfile's file subset, **the Docker image was not rebuilt** after this change.

---
# Round 3 follow-up
- **Lockfile / `npm ci`:** verified in a clean scratchpad copy (no node_modules): `npm ci --ignore-scripts` -> 525 packages, exit 0, esbuild present. Dockerfile uses `npm ci`. A Docker rebuild with it started but the in-container download stalled >50 min (network), so the **`npm ci` Docker build was not completed**; the previous images (built with `npm install`) were used for the checks below.
- **Node SDK through Caddy: cause found.** Node's native WebSocket (undici) sends `Connection: upgrade` (lowercase); the Caddyfile matcher `header Connection *Upgrade*` is case-sensitive, so the request fell through to `file_server` and the handshake failed. Browsers/`ws` send `Upgrade`, hence they worked. Fixed with `header_regexp conn Connection (?i)upgrade` in `infra/Caddyfile`; hot-reloaded into the running container and `@colyseus/sdk` create/welcome/public messages through Caddy then worked. The Caddyfile in the baked image was not rebuilt (copied + reloaded only).
- **CI e2e split:** `ci.yml` now has `e2e-fast` (demo spec only, `npm run test:e2e:fast`, `E2E_PREVIEW=1` against the built web, 15 min timeout, needs `verify`) and `e2e-full` (all specs with the real bundled server started; nightly cron + manual `workflow_dispatch` only, 45 min). Root scripts `test:e2e:fast` / `test:e2e:full` added. Spec files and `playwright.config.ts` untouched. YAML not validated by a parser (no PyYAML); workflow never run on GitHub.
- **e2e-fast locally: not verified.** My run failed at the lobby assertion because port 5173 on this machine is occupied by an unrelated Docker container (`iguru-frontend`), and Playwright's `reuseExistingServer` attached to it. Free the port (or change it) to run it; I did not stop that container.

---
# Round 4: dedicated e2e port
- `playwright.config.ts`: web port is now `E2E_PORT` (default **5199**) for baseURL, dev/preview command and webServer URL; `reuseExistingServer` only when `E2E_REUSE=1` (so it never attaches to an unrelated app on 5173). Specs untouched. frontend-agent informed.
- CORS: the web server needs no CORS; the game server does. CI `e2e-full` now starts the server with `CORS_ORIGIN=http://localhost:5199`. For local multiplayer/tricks specs start the server yourself with `CORS_ORIGIN=http://localhost:<E2E_PORT>`. (webServer env is not used for this because the config does not start the game server.)
- Verified: `E2E_PORT=5198 E2E_PREVIEW=1 npm run test:e2e:fast` -> **1 passed (2.9 min)** on a heavily loaded machine (software GL). Two earlier runs on 5199 were killed externally (SIGTERM, probably another agent's `pkill playwright`), not test failures. Demo spec takes ~3 min here, so the CI `e2e-fast` 15-min limit is fine but the per-test 180 s timeout is tight on slow runners.
