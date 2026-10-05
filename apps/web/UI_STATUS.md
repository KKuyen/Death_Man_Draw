# UI status (frontend-agent, handoff)

## Done
- Bài Phép UI complete (see FRONTEND_RESULT.md): board strip, own hand, private market, 5-slot tray + use panel, toasts, peek modal, stepper/coach/hints, offline demo on rules+bots.
- Integration round: App.tsx event wiring per SCENE_API.md: `magicUsed` -> scene.showMagicUse + playMagicCategory(cue/def.sound); `magicHint` -> scene.onGameEvent + playHintCue; private `use` -> onGameEvent (auto pulseSlot); K10 result (`own.peeks[].magic`) -> scene.showMagicPeek + modal ("Họ không giữ lá phép nào" when null); K07 label -> "Lá trên cùng bộ bài"; `anyTime` timing text; `magic_looked_at` key fixed. `shuffle` event deliberately NOT forwarded (scene shuffles itself on new handId; would double).
- Typecheck 0 errors at last run.
- Debug hook: `?debug` exposes `window.__conn` (connection) for QA.

## Verified (own ports; server bundle built fresh, PORT=2991, CORS_ORIGIN=http://localhost:5291)
- demo.spec.ts passes (offline): `E2E_PREVIEW=1 E2E_PORT=5292 node node_modules/@playwright/test/cli.js test tests/e2e/demo.spec.ts` (after `npm run build -w @saloon/web`).
- bots.spec.ts passes (5 hands, no console errors): `E2E_SERVER=ws://localhost:2991 E2E_PREVIEW=1 E2E_PORT=5291 ... test tests/e2e/bots.spec.ts`.
- multiplayer.spec.ts passes after change: absence shortened 50s -> 25s because mid-match the engine eliminates a player absent >45s (server design), so rejoinKey cannot work after that. Run with `E2E_REUSE=1` + `npm run preview -w @saloon/web -- --port 5291 --strictPort` running.

## Not done / not exercised
- 4-seat popup screenshots (qa-popups.mjs written, never ran successfully: my last command used a wrong cwd). Next: start `npm run dev -w @saloon/web -- --port 5293 --strictPort` from repo root, then `cd apps/web && node qa-popups.mjs 5293` (injects magicUsed / magicHint / peeks via window.__conn). Screenshots go to reports/screenshots/pop-*.png; check overlaps at 1440x900 and 1280x720.
- Public-use banner, hint toast, K10/K07 modals, pulseSlot, showMagicPeek, sounds: wired but never seen end-to-end (bots did not trigger a banner in the bots run: magicToasts=0).
- Engine items still landing (X01-X03 hidden, N09, per-card balance): UI reads catalog/offers, nothing hardcoded; re-check market/tray text once catalog settles.
- No performance/FPS measurement; sound never listened to.
