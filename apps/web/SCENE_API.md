# Scene API (`SaloonScene`, apps/web/src/scene.ts + src/fx.ts) — Bài Phép version

Almost everything is **automatic**: `scene.sync(snapshot, own, selfId)` (wired in App.tsx) diffs snapshots and plays animations. Explicit hooks below are for things that are *not* in snapshots (public magic events, hints, sounds) and for QA. All tracks are visual only; the scene never decides anything about rules.

Removed with the redesign: finger / prosthetic visuals, tricks (`playTrick`), shop (`playShop`), fumble, marks / observed backs, held-up opposing cards, actor gaze/lean. (`finger_*_prosthetic|cap` nodes in the GLBs stay hidden.)

## Called by the UI
| Method | Purpose |
| --- | --- |
| `sync(snap, own, selfId)` | Everything below that says "automatic". |
| `setLookDown(down)` / `lookingDown` | Camera pitches onto the table, your hole cards rise (big, readable) and the magic tray is shown. Hold = true. |
| `setHoldCards(cards \| null)` | Faces of your two hole cards (App passes `own.hand` while playing). `null` hides hands. |
| `showMagicUse(seat, cardId, opts?)` | **Only for `visibility: public` uses** (event `magicUsed`; incl. Decoy K09 with the fake id). The card art (`public/cards/plain/<id>.png`) scales in above that player's head (in front of the camera for your own seat) with a name tag, ~3 s, then fades. `opts` = target seat number (legacy) or `{name?, targetSeat?, ms?}`. Plays **no sound** — call `playMagicCategory(def.sound, seat)` from `magicSound.ts`. Swap cards (X01-X03) and hidden cards must not call it. |
| `showMagicHint(kind?, text?)` | Hinted card used on you (private event `magicHint`, `cue` = 'looked'/'hexed'): soft violet edge pulse + "Bạn cảm thấy có ai đó…" line (default text depends on `kind`). Also fired by `onGameEvent` for `magicHint` events. UI adds the sound with `playHintCue(kind)`. |
| `pulseSlot(slotOrMagicId)` | A held passive just triggered (win pot, bankrupt, looked-at …): that card in the tray makes a full flip, pops and glows, tray stays visible ~2.4 s. Automatic for private `use` events whose card is a passive; call it yourself when the engine reports a trigger some other way. |
| `showMagicPeek(seat, magicId, opts?)` | Private peek of an opponent's *held magic card* (K10 Lá soi phép): their card hovers by them face-down, flips face-up ~2 s, fades. Call only on the actor's client. |
| `peekFlash(card \| null, crystalBall=false)` | Your own private peek result (automatic from `own.peeks` with a `card`; a label matching /cầu\|crystal\|ball/ uses the crystal-ball look = K07 Quả cầu soi: the top-deck card floats inside a glass sphere ~2.8 s). |
| `peekedFlash()` | Somebody looked at your hand: red pulse, cards flinch (also on a private event of type `peeked`). |
| `shuffleDeck()` | Dealer riffle shuffle (~1.9 s, plays `dealer_cut`, halves lift/interleave/square up) + riffle sound. **Automatic at every new hand** (the deal starts after it). `setSoundEnabled(false)` mutes the scene's own sound (shuffle). |
| `showTray(seconds=3)` | Show the 3D 5-slot tray briefly (it also shows while looking down and during buy/use animations). |
| `onGameEvent(ev, seat)` | Feed *private* events: `magicHint` -> hint, `peeked` -> peekedFlash, `use` of a passive -> pulseSlot. Public `magicUsed` goes through `showMagicUse` (App.tsx already does this). |
| `setSoundEnabled(on)`, `setQuality(low)`, `seatScreen(seat)`, `animationStats()` | unchanged helpers. |

## Automatic (from `sync`)
- **Hand start** (new `handId`): shuffle (~1.9 s), then hole cards fly from the deck to each active seat (`handSize>0`, not eliminated); your own cards go to the table, then into your hands. Opponents' cards stay face-down on the table. Folded / eliminated: cards slide back to the deck (`fold_cards`).
- **Board (readability fix)**: community cards are big (x1.8), face-up, leaning toward YOU in a row that reads left-to-right from your seat, unlit textures with large corner indices; works from all four seat cameras. Burn + deal face-down + flip. Late join / reconnect places them instantly.
- **Showdown**: `snapshot.result.revealed` cards fly to a reading spot in front of their owner (scaled with distance, facing you) and flip. **Forced reveal (K02)**: `PublicPlayer.revealedCards` flips the owner's hole card(s) the same way, with embers.
- **Đổi bài chung (K03)**: if a board card id/modifier changes in place the card turns face-down, changes, turns back with embers.
- **Modifiers**: `Card.modifiers[0]` draws `public/cards/overlays/<modifier>.png` over the face (gold edge, rainbow wild, clover lucky, chains trapRank/trapSuit, purple smoke cursed). A modifier change on your hole card (K04/K05/K08/N03/N05) plays a small burst (gold = buff, violet = debuff).
- **Magic tray (own, `own.magic`)**: new slot = **buy animation** (card pops big in the view centre, then flies into its slot of the 5-slot tray at the bottom right); slot disappears = **use/discard animation** (card rises to the centre, burns with embers and fades). The tray is visible while looking down and for ~3 s around any change.
- **Swap (X01-X03)**: when a slot with `spare` vanishes and `own.hand[k].id === spare.id`, the old hole card burns off your hand while the spare rises into place (the swap card itself burns in the tray animation). Others see nothing (swap cards are hidden).
- **Peeks**: a new `own.peeks` entry with a `card` flashes the card big in front of you (gold flash; crystal ball for K07).

## Event wiring cheat sheet
| Event | Call |
| --- | --- |
| `magicUsed` (public) | `scene.showMagicUse(seat, ev.magicId, {targetSeat})` + `playMagicCategory(ev.cue ?? getMagic(id).sound, seat)` |
| `magicHint` (private) | `scene.onGameEvent(ev, seat)` (or `scene.showMagicHint(ev.cue, ev.text)`) + `playHintCue(ev.cue)` |
| `use` of passive (private) | `scene.onGameEvent(ev, seat)` (auto pulse) |
| triggered passive fires some other way | `scene.pulseSlot(magicId)` |
| K10 result for the actor | `scene.showMagicPeek(opponentSeat, magicId)` |

## Sound (`apps/web/src/magicSound.ts`, WebAudio, no assets)
`playMagicCategory(category, seat)` — 6 stereo families mapped from the catalog `sound` field: **coin** (coin, rescue, cushion), **peek** (peek, lens, reveal), **shift** (swap, board, market), **power** (enhance, cleanse, armor), **dark** (curse, trick, decoy), **hush** (silence). `playHintCue(kind)` faint whisper for hints, `playShuffle()` riffle (the scene calls it itself). `audio.ts` is owned by the UI; `magicSound.ts` can be used next to it or its functions re-exported.

## Card art files (`public/cards/`, generated by `node scripts/cards/gen.mjs`)
`<id>.png` (full face incl. visibility glyph = owner view), `plain/<id>.png` (no glyph: used for head pop-ups), `back.png` (unified back), `overlays/<modifier>.png`, `badges/<modifier>.png`, `manifest.json` (id, name, kind, swap, trigger, visibility, base price, `priceSlot` rect, frame colours). Frames: **Kích hoạt** red, **Nội tại xuyên suốt** violet (infinity icon), **Nội tại kích hoạt** teal (bolt icon), swap cards are Kích hoạt with a swap ribbon. Prices baked in are the base price; the DOM shows the live price.

## Notes
- Card orientation helper: `orient(normal, up, out)` in fx.ts (local +Z = face). `scene.fx.timeScale` slows everything for frame capture (QA only).
- QA harness without React: `apps/web/qa-scene.html` + `qa-vite.config.mjs` (builds only scene+fx); scripts `qa-art.mjs` (board/hand/showdown from all seats) and `qa-magic.mjs` (buy/use/popup/swap/peek/hint/pulse/forced reveal/ball/shuffle).
