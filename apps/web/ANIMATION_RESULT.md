> NOTE 04/10/2026: superseded by the Bài Phép redesign. Tricks/fingers/marks/shop animations described below were removed; see SCENE_API.md and assets/ART_RESULT.md.

# Animation result (04/10/2026)

Code: `apps/web/src/fx.ts` (new: cards, tweens, hand rig, props), `apps/web/src/scene.ts` (integration, look-down camera, API). API doc: `SCENE_API.md`. No assets/Blender changes were needed: every trick reuses an existing clip from the manifests; props come from `public/models/props/*.glb`; card faces/backs are canvas textures.

## Implemented
1. **Dealing**: hole cards fly deck -> seat on an arc (dealer plays `dealer_deal`), land face-down, then the player picks them up (`receive_item`; held-up pose when `pose.backsVisible`). Own cards go to the table and then into the first-person hands. Community cards: burn, deal face-down, flip.
2. **Flips**: board flip in place with lift (mid-pose on edge), showdown reveal flips cards on the table, staggered per player.
3. **Tricks**: all 9 motion kinds map to existing clips + a prop (sleeve, marker, mirror, lighter, coin, cloth, copy paper). First-person variant for your own seat. Fumble on error cues via `scene.onGameEvent`. Shop: fit/sell from public finger state, buy/sell from own inventory. Visuals depend on `motion.kind` only (no real/fake distinction).
4. **First-person hands**: two procedural hands hold your two cards at the bottom of the screen, faces toward you (verified readable, not mirrored). `setLookDown(true)`: camera tweens down, hands raise and enlarge the cards; release tweens back. Opponents' marked backs only from `observedBacks` (checked: card back materials become `back-slash|`, `back-cross|AS`).

## Verification (software GL, headless Chromium, slow ~1 fps)
- `npx tsc --noEmit`: 0 errors. `npm run build -w @saloon/web` OK.
- `apps/web/qa-anim2.mjs` fabricates snapshots and captures frame sequences into `reports/screenshots/anim/`: deal (`f1-deal-*`), dealt hand in your hands (`f1-dealt`), look-down (`f2-lookdown*`), opponent tricks (`f5-trick-<kind>-opp-a/b`), own first-person tricks (`f5-trick-<kind>-own`), held-up/fold (`f6-*`), flop/turn flips (`f3-*`), showdown (`f4-*`). I inspected deal, dealt, look-down, flop, showdown (own cards A♠ K♥ readable), mirror/coin tricks. `qa-anim.mjs` runs the same through the live offline demo.
- `npm run test:e2e:fast` (E2E_PORT=5196, preview build): 1 passed (2.4 min).
- Per-frame allocation: the tween system, rig and camera paths use preallocated vectors/quaternions; allocations happen per event (flights/clones). Not profiled with a heap tool. Dispose path (`fx.dispose`) disposes cards, textures, props, rig.

## Honest limits
- Frame rate in software GL is ~1 fps, so smoothness and timing were judged from time-scaled captures (`fx.timeScale`), not real-time playback. Real GPU performance is unmeasured. Animation time is clamped to 0.1 s per frame, so it runs slower than wall clock below 10 fps.
- Not all trick screenshots were reviewed one by one; props are small from the opponents' distance (coin, lighter, marker are hard to see at default zoom) and their placement on the hand sockets is approximate (no per-clip fine tuning). The first-person hands are crude capsules, not the character mesh.
- Opponents' purchases are not visible (wallet/inventory are private), only their finger changes.
- `onGameEvent` still needs wiring in App.tsx (frontend-agent). The DOM `.gx-peek` overlay duplicates the 3D look-down.
- Held-up opponent cards were checked numerically (pose, material) and not closely inspected visually; the seat-1 character leans over them (existing gaze logic).
- `qa-marks.mjs` is currently blocked by the new tutorial overlay (frontend); not re-verified through it.
- Multi-client online play (real server snapshots) was not exercised; only fabricated and offline-demo snapshots.

## Update: look-down framing and setHoldCards toggle (re-rendered)
- Look-down now aims at the table in front of you (0.9 m ahead, 0.62 m high) with the head 0.16 m lower, so opponents' faces fall out of the frame (heads cropped at the top edge); table, chips and hands/cards remain. Pair: `reports/screenshots/anim/lookdown-pair-before-lookup.png` / `lookdown-pair-after-lookdown.png`.
- `setHoldCards(null)` hides the held cards/hands, `setHoldCards([AS,KH])` shows them again (`hold-null.png`, `hold-array.png`). Note: the harness must call `setHoldCards(hand)` like App.tsx does; a stale `null` from a non-playing phase keeps the hands hidden by design.
- Verified with software GL on a private port (5195); build and tsc clean.

## Update: marks legible to the observer; own cards only while looking down
- Opponent held-up cards (`pose.backsVisible`) are now angled so the back faces the local observer's seat (nearly upright), instead of facing the table centre. `reports/screenshots/marks-cards.png` (qa-marks.mjs on port 5194): the held card at the neighbouring seat shows the ✕ glyph and the known-card hint (A♠) front-on. Gating by `backsVisible`/`observedBacks` unchanged.
- The local hands/cards are hidden unless looking down (visible once look-down >2 %, rising from below the screen), so they never sit under the action bar. Checked: `f1-dealt.png` (no hands, looking up) and `f2-lookdown.png` (hands + A♠ K♥ readable).
- If there is no local seat (spectator), held backs face the table centre.
