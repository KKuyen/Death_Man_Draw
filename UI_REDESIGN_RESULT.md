# UI/UX update — 6 October 2026

Applied [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) and [Vercel web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines).

## Result

- Unified responsive layouts for desktop, tablet, portrait and landscape phones. Main UI uses Barlow at 16/20 px; Cormorant remains for brand/card artwork.
- Simplified betting actions, improved spacing, focus states and bounded scrolling. Settings now uses a gear icon. End match and leave actions are in Settings → Room.
- Desktop chat reserves its own space; mobile chat retains keyboard/visual viewport handling. Room code remains visible during play.
- Five magic cards form a vertical desktop rail, with one click detail panel and readable effect descriptions. Mobile uses a dedicated sheet. Spectators do not see private-hand controls.
- Tab or the player-count button opens the roster. Host kick and transfer are available in both roster and Settings → Players. Local player muting is available there too.
- Mid-match kicks disconnect the target and revoke reconnect credentials. Committed chips remain in pot accounting; the removed engine seat is freed when the match resets.
- Help and quick guide match the new controls and three-hand shop cycle. Dialogs support Escape, focus trapping and focus restoration.

## Verified

- `npm run typecheck`: passed.
- `npm test`: 90 tests passed, including real server host-transfer/kick/rejoin checks.
- `npm run build`: web and server passed. Existing Babylon scene chunk-size warning remains.
- `tests/e2e/ui-redesign.spec.ts`: both tests passed (offline mobile interaction/rotation and three real clients transferring host and kicking during play).
- Screenshot audit: six game states × seven viewport sizes (320–1440 px), plus entry, magic details, chat, roster, help and four Settings tabs. No horizontal overflow or out-of-screen bounds in the audited primary game controls.

Screenshots and the audit JSON are local under `reports/screenshots/ui-redesign/` and `reports/UI_LAYOUT_AUDIT.json` (ignored by Git). Desktop packaging and public deployment were not part of this update.
