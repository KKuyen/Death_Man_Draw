# Frontend result — Bài Phép redesign (04/10/2026)

Scope: apps/web (except src/scene.ts, src/fx.ts) and tests/e2e. Built against the Bài Phép contract in packages/protocol (CHANGES.md, MAGIC_CATALOG.md), including the later visibility/kind model (active / passive_continuous / passive_triggered; public / hinted / hidden).

## Done
- Removed all UI for fingers, tricks, fakes, dealer, accuse, opening/free shop, marks/gaze, finger mortgage, timing minigame, cover button (Drawers.tsx, Timing.tsx deleted; Nameplates, ActionBar, coach, hint, help rewritten).
- DOM card visibility: always-visible community-card strip (`.gx-board`, 5 fixed slots) and a large own-hand display with modifier badge + caption (`.gx-hand`, class `private-cards`). 3D look-down (S) is flavour only; it sends no command.
- Flow: lobby Ready -> start -> private market of hand 1. Market (`PrivateMarket`): 4 own offers with art (`/cards/<id>.png`, cropped to the illustration; glyph fallback), name, kind tag, visibility pill + one-line "what opponents see", trigger text for triggered passives, effect text, price, buy; full tray asks which slot to replace. Tray (`MagicTray`): 5 slots, kind badge (KH / NT / NT·CHỜ), visibility glyph (owner only), "chờ <sự kiện>" for triggered, pulse when usable, glow when an own use/notice event fires; use panel with timing prompt and parameters (target for K01/K02/K08/K10, hand card, K04 modifier, board card for K03, swap with spare). `usable` comes from the server, so "any time" cards work when the flag lands.
- Events: public `magicUsed` -> banner "X dùng <lá> [lên Y]" with card art + `playMagicCue` + optional `scene.showMagicUse` hook (only called if the scene defines it); `magicHint` -> private hint toast; purchase/use/notice -> private toast. Nothing about opponents' cards, purchases or wallets is ever rendered. Peek/force results -> modal "Bạn thấy: ..." with a generic "may be deceived" note (never marked verified). Log shows last 8 lines incl. own private lines (lock icon).
- Stepper: Chợ -> Preflop -> Flop -> Turn -> River -> Showdown; banner/coach/hint updated. Opponent plates avoid the board strip; K02-revealed cards show on the plate.
- Offline demo: `@saloon/rules` + `@saloon/bots`, private events (`to`) filtered by player id.
- Scene calls are wrapped in try/catch so a scene exception cannot blank the DOM UI.
- e2e: demo.spec.ts rewritten (passes: 2.8 min, `E2E_PREVIEW=1 E2E_PORT=5292` — use the built bundle, because Vite HMR full-reloads reset the in-browser offline room when other agents edit files); tricks.spec.ts deleted; bots.spec.ts and multiplayer.spec.ts updated for the new flow but NOT run (need the real server, not started).
- Screenshots 1440x900 and 1280x720 of lobby, market, bought, preflop, use panel, flop, river, showdown: reports/screenshots/bp-*.png. No overlaps left in those frames. QA script: apps/web/qa-ui-bp.mjs (note: qa-magic.mjs now belongs to the art agent).

## Not verified / open
- bots.spec / multiplayer.spec against the real server; K10 and K07 "any time" (engine flags not yet in my build) only handled generically (K10 target picker + `magicId` on peek entries are guesses).
- Swap cards (X01-X03) hidden: UI reads visibility from content/offers, nothing hardcoded; no public toast unless the server sends `magicUsed`.
- Peek modal and magicUsed banner not exercised end-to-end (bots rarely use them in the demo run); audio not listened to; FPS under software GL only.
