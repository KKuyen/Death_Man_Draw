# Bàn giao cho agent điều phối tiếp

> **BÀN GIAO CUỐI 04/10/2026 ~22:15: đọc `CODEX_QA_RESULT.md` trước.** Bài Phép đã tích hợp đủ; 70/70 tests, 3/3 e2e trên bundle cuối, desktop chơi hết ván, Docker/Caddy/Postgres checkpoint-restore qua. 22 lá đã đổi sang khung đồng cổ và nét khắc theo feedback mới nhất; ảnh `reports/screenshots/cards-pixel-sheet-120.png`. Các mục bên dưới là lịch sử.

> **ĐỌC TRƯỚC (cập nhật 04/10/2026 tối): THIẾT KẾ ĐÃ ĐỔI sang "Bài Phép".** Các phần cũ bên dưới về ngón tay, trick, tố cáo, dealer, marks/gaze, shop đầu ván, thế chấp ngón **đã bị thay thế** (chỉ còn giá trị lịch sử/hạ tầng). Nguồn sự thật: `REDESIGN_BAI_PHEP.md` (yêu cầu user), `GAME_DESIGN_BAI_PHEP.md` (luật + phân tích), `MAGIC_CATALOG.md`, `packages/protocol/CHANGES.md` (hợp đồng), `GAME_RULES.md`. Xem mục "TRẠNG THÁI BÀI PHÉP" ở cuối file.

Cập nhật ngày 04/10/2026, khoảng 01:48 giờ Việt Nam. Workspace: `/Users/quyen.tran5/lairgame`, macOS arm64, zsh. Đây là trạng thái đang làm dở; **chưa có game multiplayer chạy hoàn chỉnh**.

## Mục tiêu và cách làm

- Làm game poker Texas Hold’em multiplayer 3D trên web, dễ đóng gói desktop. Chủ đề gian lận, quan sát và tố cáo trong saloon miền Viễn Tây, đồ họa hoạt hình; cảm hứng Liar’s Bar, thiết kế nhân vật riêng.
- User đã yêu cầu nhiều agent code theo plan. Sau đó user gửi điều chỉnh qua terminal worker: chỉ giữ một Codex điều phối/phân tích/kiểm tra, phần code còn lại giao Claude Code, Sonnet 5.5. Worker đã chuyển tiếp điều chỉnh này trong inbox Orca; coordinator đã làm theo. Không tiếp tục cho Codex workers triển khai.
- User mới nhất yêu cầu tóm context để chuyển sang agent điều phối mới. Không tự hủy các Claude agent đang chạy.
- Đọc `GAME_RULES.md`, `CONTENT_CATALOG.md`, `DEVELOPMENT_PLAN.md`, `BLENDER_RULES.md`, `DESIGN_REVIEW.md` trước. Đây là design đã viết, có default nháp; không phải mọi thông số đã được user xác nhận.

## Luật cần giữ

Texas Hold’em, 2–4 người (prototype 4 ghế). Ví tiền bí mật; cược và pot công khai. Mỗi người có 10 ngón thật. Ngón cược là thế chấp, chỉ mất khi thua khoản tương ứng; bán ngón mất ngay. Mất 5 ngón thật hoặc phá sản thì bị loại; ngón giả khôi phục khả năng trick, không hồi mạng. **Đã bỏ hoàn toàn máu/chảy máu/HP.** Ngón giả gỗ/đồng làm trick lỗi phát tiếng. Trick loại A là thanh chạy qua lại, bấm đúng thời điểm; loại B như đánh dấu không minigame, cần chọn lúc hành động dễ bị lộ. Có giả vờ trick. Dealer và giao dịch dealer phải giữ. Mua ở lobby rẻ, giữa ván ×1.5, trong ván ×2. Mang đồ nhiều làm trick chậm/khó. Có buff một lần và thụ động, mua/bán đạo cụ, bài dự trữ, lắp ngón giả.

Catalog có 36 ID: I01–I10, B01–B10, T01–T07, F01–F03, H01–H02, DLR01–DLR04. Xem file thay vì tự phát minh ID mới. P0 gồm đổi bài tay áo, đánh dấu, gương, dealer signal, fake sleeve/mark, che bài, shop và ngón giả/buff; engine hiện đã triển khai cả catalog rộng hơn.

## Đã có trên filesystem

1. Root npm workspaces + TypeScript: `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`. Shared contract `packages/protocol/src/index.ts` thuộc coordinator; source exports cho workspace packages.
2. `packages/rules/src/{index,poker}.ts`: pure engine, poker evaluator, streets/betting/all-in/side pots, thế chấp theo dải đóng góp, inventory/economy, trick/timing/accuse, dealer, buff, serialize/restore, public/private snapshots. `packages/content/src/index.ts`: toàn catalog và helpers. Có test và báo cáo Claude, xem phần dưới.
3. `apps/web`: React + Vite + Babylon, toàn bộ khung UI, cảnh 3D, network, âm thanh procedural. Có lobby/room/bots/demo, bàn cược, wallet/hand riêng, drawer shop/trick/dealer/fingers/buffs, timing, tố cáo, showdown/reconnect. **Chưa build/browser QA; có lỗi TS đã biết.**
4. Assets Blender thực đã xuất: `public/models/environment.glb`, `public/models/characters/{coyote,lynx,badger,rabbit,dealer}.glb`, props; nguồn `.blend` dưới `assets/blender`, preview PNG dưới `assets/previews`, manifest và validation dưới `assets/manifests`; script `scripts/blender/**`.
5. **Chưa có** `apps/server`, `apps/desktop`, `infra`, CI, Playwright/config/check-assets root script. Root scripts đã tham chiếu những phần chưa được tạo. README/plan hiện chủ yếu phản ánh giai đoạn design, cần cập nhật sau triển khai.

## Dependencies và kiểm tra thực

- `npm install` root **vừa hoàn tất**, exit 0: 444 packages, 449 audited, mất 39 phút vì mạng chậm. Có `.bin` và lockfile rồi. Audit báo 12 vulnerabilities (2 moderate, 10 high); chưa phân tích, không chạy fix --force tùy tiện.
- Node mặc định là 20.20.2, quá cũ cho một số dependency. Dùng Node22 đã cài: `/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin/node`, đặt PATH tương ứng khi chạy npm/dev/test; không cài hệ thống lại.
- Coordinator chạy root `tsc --noEmit`: còn **hai lỗi** `apps/web/src/App.tsx:82`: `own?.peeks.length` có thể undefined và `own` null. Rules đã sạch TypeScript theo báo cáo engine agent.
- Content agent báo lần chạy mới nhất **51/51 tests qua, 0 TS errors** trong scope rules/content; engine agent báo trước đó 50/51 vì test B07 chưa tính small blind. Các báo cáo mâu thuẫn thời điểm do sửa song song. **Phải rerun sau khi test agent hoàn tất, không coi root đã pass.**
- Không có server chạy, chưa kiểm tra nhiều client thật, reconnect thật, cảnh web thật, Electron/Docker hay production deployment.
- Blender agent báo Khronos zero errors, Babylon import và Blender roundtrip đã qua; receipt thực ở manifests/logs. Chưa coordinator xác nhận ảnh preview cuối hoặc browser performance.

## Claude agents đã được worker launch bằng CLI

Chúng chạy trong Orca terminals, output redirect JSON nên màn hình yên lặng không có nghĩa bị treo. Không phải supervised Dispatch riêng. Chi tiết `packages/rules/HANDOFF.md`.

| Scope | Terminal | Kết quả |
|---|---|---|
| Engine source | `term_ec6b83cf-9214-4eee-9512-0d4eb2dc03fc` | `packages/rules/ENGINE_RESULT.md`, `claude-engine-result.json` đã có success |
| Acceptance tests | `term_7c6cd6b1-b1cd-4b2b-a440-2a96cb21ae91` | `packages/rules/TEST_RESULT.md`, `claude-tests-result.json`; lần kiểm tra cuối JSON còn 0 byte, terminal vẫn có lệnh đang chạy |
| Content/docs | `term_25a86e92-0ab8-4ae9-9fff-e6e9ba3bb6dc` | `packages/content/CONTENT_RESULT.md`, `claude-content-result.json` đã success; `packages/rules/IMPLEMENTATION.md` đã có |

Lệnh worker dùng: `claude -p --model claude-sonnet-5-5 --permission-mode bypassPermissions --output-format json < PROMPT > RESULT`. Prompts `packages/rules/CLAUDE_ENGINE_TASK.md`, `CLAUDE_TEST_TASK.md`, `packages/content/CLAUDE_CONTENT_TASK.md`. Scope disjoint. Broad Claude ban đầu đã bị interrupt; `claude-result.json` của broad không phải kết quả hoàn tất. Trước khi giao tiếp tiếp, đọc terminal/result để biết process đã xong chưa, tránh gửi prompt mới vào process đang chạy.

## Orca orchestration và lỗi khởi động cần biết

Skills đã dùng: `/Users/quyen.tran5/.agents/skills/orchestration/SKILL.md` và `orca-cli/SKILL.md`. Đọc version-matched bằng `orca skills get orchestration`, và conditional references theo guide. Không thay bằng native subagent nếu đang giữ provenance Orca.

- CLI cố định `/opt/homebrew/bin/orca` (gọi `orca`); runtime Orca 1.4.218.
- Run `run_f3091385aca2`.
- Coordinator cũ `term_10033105-c6b8-4366-9f1b-47d9cee37aae`; agent mới cần kiểm tra bind/caller và authority của chính mình, không giả danh handle cũ.
- Inbox cuối đã ack `delivery_0e252702998b`; check trả empty, không delivery pending tại mốc snapshot. Có thể có tin mới sau đó.
- Rules Codex task `task_d8cf22d5dc9d`, dispatch `ctx_1a9117c9de9a`: đã worker_done **failed** vì user yêu cầu handoff, không phải engine không có code. Worker-release trả `retained/user_takeover`; không đóng terminal user-owned.
- Blender Codex task `task_d84ad52edde7`, dispatch `ctx_8eb41b52fd98`, terminal `term_e17c0aff-4ce8-4015-aae9-993e527c770c`: coordinator đã yêu cầu viết report/worker_done và dừng turn; lúc snapshot chưa nhận worker_done. Không tự claim settled. Worker nói implementation xong, còn regeneration/review/report.
- Server task `task_bc844613a922`: 3 startup failures, **không agent nào bắt đầu code server**. Lượt Codex `ctx_668b4d9f2977` và `ctx_4f82753816fa` lỗi `account/read ... workspace routing discovery timed out (code -32603)` rồi về shell; đã stop/release. Lượt Claude `ctx_bf97f4db8022`, terminal `term_6f8f11a0-c7f4-4586-aedf-29451c15e6e6` bị `Agent startup blocked: agent-trust-workspace`.
- Frontend task `task_1ac57ec7171a`, dispatch `ctx_ec0318eb8c51`, terminal `term_257d5201-81ad-4ebb-acff-20e077c7b314`: cũng failed trước task vì trust workspace.
- Delivery task `task_763b9b8f3557`, dispatch `ctx_f25c73cd9321`, terminal `term_3a5db296-3c73-461e-9b7b-f1c1c56bf7ba`: cũng trust workspace, chưa làm gì.
- Screen frontend Claude hiện là menu “No, exit / Yes, I trust this folder” cho chính repo này; chưa xác nhận. Các terminal failed Claude hiện retained/user_takeover; không cleanup mù.
- Guide có circuit breaker: sau 3 consecutive failures một Task, không tạo Run/Dispatch khác để lách. Cần xử lý cấu hình trust/startup và chính sách retry đúng guide; **đừng launch thêm server task trùng vô hạn**. Có thể phải báo user nếu cần mở lại boundary.
- Task specs sẵn trong `.tools/tasks/{rules,server,blender,frontend,delivery}.txt`, receipts JSON. `worker-list --terminal-state reclaimable` cuối trả 0; không đồng nghĩa mọi task đã xong.

## Contract server/frontend đã thống nhất

Stack dự kiến: Colyseus 0.18, React19/Vite7, Babylon9; Node>=22.12; PostgreSQL persistence (local JSON fallback), Electron desktop, Docker/Caddy deployment. Đã tra npm stable ở thời điểm triển khai; agent server cần official docs/installed APIs.

Room type `saloon`, WS port2567; message `command` chứa Command; trả `welcome` `{playerId,code,roomId,protocolVersion}`, `public` RoomSnapshot, `private` PrivateSnapshot, `event` GameEvent, `error` `{message}`. GET `/health`, GET `/api/rooms` `{rooms:[{roomId,code,players,maxClients:4,phase}]}`. CORS localhost5173/config origin. Host lobby addBot tối đa3; ready/start/nextHand, bots dùng engine bình thường. Tick50ms, snapshot100–200ms, cryptographic RNG, handId/dedup/validate/rate-limit, reconnect45s, checkpoint/restore; không broadcast ví/hole cards/deck/true-fake labels. Server spec có chi tiết.

Engine exports `createGame(options)` / `restoreGame(snapshot,options)`; interface GameEngine và commands/types ở protocol. `serialize()` chứa secrets, chỉ server được giữ. Card ID `AS`, `KH`, `10D`, `2C`, rank số2–14.

## Lỗi/giới hạn cần agent mới giao xử lý

- Scene hiện cần **ẩn mặc định ngón prosthetic/cap**; GLTF không lưu enabled visibility. Node tên `finger_{thumb,index,middle,ring,pinky}_{l,r}_{real,prosthetic,cap}`. Prosthetic có multi-material child meshes, phải disable exact parent TransformNode, không chỉ child mesh.
- Tọa độ right-handed Y-up: bàn [0,.78,0], 2.4×1.65; seats [-1.35,0,.55],[-1,0,-1.15],[1,0,-1.15],[1.35,0,.55]; dealer [0,0,-1.55]; yaw atan2(-x,-z). Model source Blender -Y forward, GLB +Z forward. Players51bones/35clips, dealer41clips theo báo cáo. Xem manifest thay vì đoán.
- UI accuse đang hiện theo motion đang chạy, cần giữ action tối đa3s sau kết thúc. Refresh chưa tự reconnect hoàn chỉnh. Kiểm tra material leak khi pot render lại và scene async dispose.
- **Marks/gaze chưa hoàn chỉnh**: protocol thiếu pose/gaze/visible-back metadata; T03 chỉ dùng quy tắc ghế kề+target tới lượt+không che/motion, chưa LOS3D. Mark/B06 hiện dữ liệu private; chưa có quan sát vết đánh dấu trên lưng bài 3D. Đây là thiếu hụt gameplay thực, không được ghi “đã xong”.
- F03 `mechanical_tap` và lỗi ngón thật `wood_error`/`brass_error` khác cue name, có thể phân biệt giả bằng packet; cần thống nhất cue công khai/sound family và sửa test thích hợp. Không giữ leak chỉ vì test cũ.
- Timing client biết target/width, server clamp timestamp150ms; cần server-authoritative validation nhưng không hứa chống automation hoàn toàn.
- Engine dealerBuy trong ván được charged×2, defer sang ván sau; pending contract thiếu field private rõ ràng, hiện peek text báo. Cân nhắc protocol/UI đồng bộ.
- Restore chưa enforce chip conservation vì tests inject state; cần review persistence untrusted/corrupted state, không tự coi production-grade.

## Thứ tự tiếp tục

1. Nhận test agent và Blender report, kiểm tra process/ownership; không giẫm scope đang viết. Rerun rules/content tests với Node22.
2. Sửa vấn đề Claude workspace startup và recovery đúng Orca guide; giao Claude phần server/frontend/delivery qua specs sẵn, giữ duy nhất coordinator Codex. Server là chặn chính.
3. Server manifest được tạo thì `npm install` bổ sung một lần (root install giờ đã xong). Validate full repo TypeScript/build, secret boundaries, 2–4 real clients và bots/reconnect.
4. Giao frontend sửa TS, ngón visibility, timing/accuse, marks/dealer/UI; dùng Playwright chụp ảnh bàn thật và inspect trực quan. Không claim model đẹp/performance trước QA.
5. Hoàn thành Electron/Docker/CI/README/check-assets; test desktop thực, Docker nếu có. Chưa có credential/provider cho external hosting, không bịa deployed.
6. Cập nhật plan trạng thái theo evidence; báo rõ prototype/full catalog/balancing/production còn gì. Settlement và cleanup đúng ownership, không dừng ở việc tạo skeleton.

Root scripts hiện: `dev`, `build`, `typecheck`, `test`, `test:e2e`, `desktop`, `desktop:pack`, `models`, `check:assets`. Build/dev tổng hiện sẽ fail vì server chưa tồn tại. Có thể build riêng web sau fixes: `npm run build -w @saloon/web`. Rules tests: `node node_modules/vitest/vitest.mjs run --config packages/rules/vitest.config.ts`; rules TS: `node node_modules/typescript/bin/tsc --noEmit -p packages/rules/tsconfig.json`.

Blender portable DMG `.tools/blender.dmg` đã mount readonly `/Volumes/Blender 1`; script runner có path, chưa cài app hệ thống. Không unmount trong lúc asset worker chưa settled.

---
## CẬP NHẬT 04/10/2026 (điều phối Claude, phiên 2) — PROTOTYPE ĐẠT

Orca/Codex workers không còn dùng; các Claude agent (Agent tool) đã làm xong: server, frontend vòng 1–2, delivery, rules cue-fix.
Xác minh tự chạy (Node22): `npm run typecheck` 0 lỗi; `npm test` 86/86; `npm run build` OK; `check:assets` OK. E2E Playwright (offline demo + 2 browser thật tới server, refresh/rejoinKey) báo pass bởi frontend-agent.
Kết quả chi tiết: apps/server/SERVER_RESULT.md, apps/web/FRONTEND_RESULT.md, DELIVERY_RESULT.md, packages/rules/CUE_FIX_RESULT.md.
Chạy thử: server `npm run dev`/bundle (port 2567), web Vite 5173, desktop `npm run desktop`.

Chưa xong / rủi ro:
- UI accuse và thanh timing chưa test; bot offline không dùng trick. Audio chưa nghe thử, hiệu năng GPU chưa đo.
- Marks/gaze 3D chưa có (protocol thiếu pose/gaze). Tell nhỏ: lỗi B04 luôn _soft vs F03 30%.
- Docker, desktop:pack, CI GitHub, PostgreSQL chưa chạy thật. Restore chỉ có ceiling check, không full chip conservation. Chưa có spectator.
- 12 npm audit vulnerabilities chưa phân tích. Balancing chưa làm.

Việc tiếp theo cho đội Codex: (1) e2e accuse/timing với bot có trick; (2) marks/gaze + protocol; (3) cân bằng + test mô phỏng nhiều ván; (4) docker/pack/CI chạy thật; (5) audit deps; (6) polish 3D/UX.

---
## CẬP NHẬT CUỐI PHIÊN (04/10/2026 ~05:45) — prototype hoàn chỉnh mức kỹ thuật

Verified bởi điều phối: typecheck 0 lỗi, 101/101 test, build OK, check:assets OK. Ảnh bàn 3D 4 ghế có phông nền (reports/screenshots/seat-*.png).
Đã có: server Colyseus (bots mua/trick/tố cáo, rejoinKey băm, checkpoint JSON/Postgres, sửa race reconnect), web (demo offline + multiplayer, marks/gaze/hostId/blind động, e2e demo/multiplayer/tricks/bots), Electron pack (mac-arm64, chưa ký), Docker/Caddy/Postgres chạy local, CI workflow (chưa chạy trên GitHub), environment backdrop, cân bằng sim (7 policy 17–30% thắng), host reassignment, blind tăng dần.
Kết quả chi tiết: *_RESULT.md ở apps/server, apps/web, packages/rules (GAMEPLAY_RESULT, CUE_FIX_RESULT), DELIVERY_RESULT.md, assets/BLENDER_RESULT.md, reports/BALANCE.md, AUDIT.md.
Chạy e2e: playwright dùng cổng 5199 (5173 bị container khác chiếm); server thật cần CORS_ORIGIN=http://localhost:5199.

Còn mở: FPS thật chưa đo (chỉ software GL ~4fps); gaze chỉ là xoay cả thân, chưa có hướng mắt; chưa nghe âm thanh; Postgres/Docker image npm ci/TLS-wss/Windows-Linux/GitHub CI chưa xác minh; bot chưa dùng T03/F03/T05–T07/dealer; marker policy hơi yếu (cân nhắc giảm giá I03); tell còn lại: sleeve 1800ms vs T07 2400ms, coin/cover chỉ H; dùng _reconnections private của Colyseus; rejoinKey ai giữ cũng chiếm được ghế; chưa có spectator; demo spec 3+ phút dưới software GL.

---
## CẬP NHẬT 04/10/2026 chiều (Round 4–8) — gameplay + UX + animation
Đã thêm: pha shopping 120s có Ready → ván → showdown → chợ 20s với 4 offer công khai (buyOffer); packages/bots (bot mạnh, dùng chung server + demo offline); lệnh lookDown; RoomSnapshot.hostId/nextBlindInHands/nextBlinds; blind tăng mỗi 12 ván; UI viết lại (stepper, banner lượt, match strip, log, coach); animation chia/lật bài, trick, cầm bài + cúi xuống (apps/web/src/fx.ts, SCENE_API.md); phông nền môi trường; sửa race reconnect (ping 8s×5, grace 45s ở lobby).
Xác minh: typecheck 0 lỗi, 116/116 test (chạy khi máy rảnh; test thời gian thực có thể trượt nếu máy ngủ/tải nặng), build OK, check:assets OK, desktop:pack OK (12:44). E2E (bots, demo, tricks 2/2, multiplayer 3/3) pass theo frontend-agent trên cổng riêng 5199/2999.
Còn mở: FPS thật chưa đo (software GL 1–4fps), âm thanh chưa nghe, gaze chỉ xoay thân, bot chưa dùng T03/F03/T05–T07/dealer, chưa có spectator, Postgres/TLS/CI GitHub chưa xác minh, desktop chưa ký, sim win-rate theo policy chưa chạy lại với bot mới (chỉ fairness theo ghế), seat 0 thắng thấp ~3 điểm chưa điều tra.
Lưu ý: app desktop dùng lại server nào khỏe sẵn trên 2567 (có thể sai CORS) — nên cho app luôn tự chạy server riêng.


---
## TRẠNG THÁI BÀI PHÉP (04/10/2026 tối) — làm tiếp từ đây

### Thiết kế đã chốt với user
- Bỏ: gian lận/tố cáo, ngón tay, dealer, marks/gaze, shop đầu ván, shop tự do. Giữ: Texas Hold'em 2–4 người, ví ẩn, bot, blind tăng ×1,5 mỗi 12 ván, lobby Ready.
- **Chợ bài phép riêng, bí mật** đầu mỗi ván (kể cả ván 1): 4 offer ngẫu nhiên cho mỗi người, có giá + công dụng 1 dòng. Tối đa **5 ô** phép. Lá kích hoạt chưa dùng giữ sang ván sau; người bị loại mất hết.
- **3 loại lá** (`kind`): `active` (dùng xong mất), `passive_continuous` (liên tục khi cầm), `passive_triggered` (chờ sự kiện: deal, win_pot, lose_showdown, bankrupt, looked_at).
- **3 mức hiển thị** (`visibility`): `public` (cả bàn thấy thẻ lá trên đầu người dùng + âm thanh nổi bật + log), `hinted` (chỉ người bị tác động nhận dấu hiệu mơ hồ), `hidden` (không ai biết). **Thầm lặng (N07)** đổi mọi `hinted` của chủ thành `hidden`, không che `public`. Mua/giữ luôn bí mật tới khi dùng ở mức public.
- Quyết định gần nhất của user: bộ tráo đổi X01–X03 = **hidden**; **Lá soi có 2 biến thể**: K01 soi bài tay, K10 soi bài phép (cả hai hinted); **K07 'Quả cầu soi'**: hidden, dùng bất cứ lúc nào trong ván (`timing:'anyTime'`), xem lá trên cùng bộ bài; **xáo bài mới mỗi ván** (engine đã làm, thêm event `shuffle` + animation).
- Modifier lá bài tây: Vàng, Muôn chất, Hạnh vận, bẫy số, bẫy chất, nguyền (≈12% mỗi lá/ván; bẫy không tính cho sảnh/đồng chất).
- Lỗi cần sửa theo user: **"không xem được bài trên bàn"** — bài chung/bài tay phải đọc rõ ở 3D (mọi ghế) và có dải bài chung + bài mình trong HUD.
- Đồ họa lá bài: phong cách bài tây hoạt họa + ma mị kiểu Alice in Borderland; mỗi lá phép có art riêng, 3 khung màu theo `kind`, mặt sau thống nhất (`public/cards/<id>.png`).

### Đã xong (xác minh bởi điều phối)
- Engine/protocol/server/bots viết lại (agent gameplay): `vitest run packages apps/server` 47/47; catalog 20 lá (8 nội tại, 9 kích hoạt, 3 tráo đổi) trong `packages/content`; sim 800 ván 0 vi phạm bất biến, win-rate policy none 31.5 / cheap 26.9 / smart 26.5 / all 15.1, 23.7 ván/trận. Test Silent không rò rỉ. `PROTOCOL_VERSION=2`; checkpoint cũ không restore được.
- Hạ tầng cũ vẫn dùng được: Electron pack (mac-arm64, chưa ký), Docker/Caddy/Postgres, CI, reconnect fix (ping 8s×5, grace 45s), e2e trên cổng riêng 5199 + `CORS_ORIGIN`.

### Đang chạy khi ghi handoff (nếu đã chết thì giao lại)
1. Gameplay/server (agent `a5e8897a06422fdc7`): đổi X01–X03 sang hidden; thêm K10 Lá soi phép (+ có thể N09 Màn sương); K07 Quả cầu soi anyTime; event `shuffle` + test xáo; khảo sát cân bằng từng lá, mục tiêu ~26 ván/trận.
2. Scene/đồ họa (agent `a83cdcf92a816c95e`; sở hữu `apps/web/src/scene.ts`, `fx.ts`, `assets/*`, `public/cards`): sửa hiển thị bài trên bàn, sinh art lá phép (`scripts/cards`, `assets/MAGIC_CARD_STYLE.md`), thẻ lá bài hiện trên đầu người dùng (public) + âm thanh, hint cho hinted, animation mua/dùng/tráo/soi/xáo bài; tài liệu `SCENE_API.md`.
3. UI web (agent `ae933150d589b8d3c`; sở hữu phần còn lại `apps/web` + `tests/e2e`): bỏ UI cũ, chợ riêng đầu ván, khay 5 ô bài phép, modal kết quả soi, log phép công khai, badge modifier, demo offline mới, e2e.
**Web hiện chưa typecheck/build cho tới khi hai agent 2–3 xong** — breaking changes liệt kê trong `packages/protocol/CHANGES.md`.

### Việc còn lại sau khi 3 agent xong
- Chạy `npm run typecheck`, `npm test` (máy rảnh), `npm run build`, e2e (demo, multiplayer, bots) trên cổng riêng; xem ảnh chụp từng trạng thái; build lại desktop (`npm run desktop:pack`) và tắt app/server cũ trước khi mở (app dùng lại server khỏe sẵn trên 2567 có thể sai CORS).
- Cân bằng từng lá thật; xác nhận số ván; chơi thử có GPU thật (FPS, âm thanh chưa nghe).
- Mở: lá tráo đổi có thể tạo rank/suit trùng (tối đa 2 lá cùng rank+suit); bot chưa dùng hết chiến lược lá; spectator; Postgres/TLS/CI GitHub chưa xác minh; desktop chưa ký.
- Ghi chú vận hành: Orca mất ổn định (tạo pane lỗi timeout) — dùng Agent tool không đặt `name`; chỉ kill đúng PID của mình, không `pkill` rộng; máy hay ngủ làm test thời gian thực trượt.

### Dự phòng hết usage
User yêu cầu: nếu Claude sắp hết usage thì cập nhật file này rồi giao cho các worker Codex. Kế hoạch chi tiết, đội đề xuất và prompt mẫu: `CODEX_FALLBACK.md`. Codex CLI: `/Users/quyen.tran5/.local/bin/codex` (0.160.0), chạy `codex exec`.

### CHUYỂN GIAO CHO CODEX (04/10/2026 tối) — theo yêu cầu user
- Claude sắp hết usage → việc còn lại giao cho worker Codex model `gpt-6.1-sol`. Prompt từng worker: `.tools/codex/{rules,ui,scene,qa}.md`. Launcher: `.tools/codex/launch.sh [rules ui scene qa]` (chạy `codex exec -m gpt-6.1-sol -s workspace-write --skip-git-repo-check`; nếu worker không chạy được Playwright/server do sandbox thì đặt `SANDBOX=danger-full-access`). Log: `.tools/codex/logs/<worker>.log`. Kết quả mỗi worker: `CODEX_*_RESULT.md` (xem prompt).
- Thứ tự: scene worker đã chạy (độc lập). Rules worker chạy sau khi agent Claude luật ghi `packages/rules/ENGINE_STATUS.md`. UI worker chạy sau rules worker. QA worker chạy cuối (poll các CODEX_*_RESULT.md).
- Trạng thái Claude: UI agent đã dừng (`apps/web/UI_STATUS.md`: typecheck sạch, bots+multiplayer spec pass trên cổng riêng, popups/âm thanh chưa xem). Scene agent đã dừng (`assets/ART_RESULT.md`). Agent luật còn đang hoàn thiện (`packages/rules/ENGINE_STATUS.md` sẽ có khi xong).
- Xem thiết kế lá bài: `public/cards/*.png`, `reports/screenshots/cards-sheet-*.png`.
- (04/10 tối, cập nhật) Agent Claude luật đã xong (`packages/rules/ENGINE_STATUS.md`; 53/53 test; còn: chạy lại sim với mặc định cuối blindEvery=14, `all` ~14.9% hơi < 15%). Worker Codex đang chạy: `scene` (dùng **Blender** làm model + pixel art lá bài không chữ, `assets/CODEX_ART_RESULT.md`), `rules` (`packages/rules/CODEX_RULES_RESULT.md`), `ui` (`apps/web/CODEX_UI_RESULT.md`; UI vẽ toàn bộ thông tin quanh lá bài bằng DOM). `qa` chưa chạy: `.tools/codex/launch.sh qa` khi 3 worker kia ghi xong kết quả. Hướng đồ họa lá bài mới: xem cuối `REDESIGN_BAI_PHEP.md`.


## CHỐT BÀN GIAO — 04/10/2026 ~22:15

- Ba scope rules/UI/art đã tích hợp; worker cũ kết thúc. Nguồn hiện hành: REDESIGN_BAI_PHEP.md, GAME_RULES.md, MAGIC_CATALOG.md; QA điều phối: CODEX_QA_RESULT.md.
- Art cổ/ma mị, pixel không chữ, sắc đồng và vật liệu có chiều sâu; khung/overlay rõ ở 56/120 px. Chợ tranh lớn và giá mua sticky ở 720p.
- Root typecheck/build/assets xanh; 70/70 tests gồm integration thật, 3/3 browser e2e (demo/bots/multiplayer) trên bundle cuối. 80 ảnh popup/layout qua ở 4 ghế và 2 viewport.
- Desktop đóng gói mac-arm64, Electron41.10.7: server riêng cổng tự chọn, preload endpoint; đã chơi hết một ván. Art/bundle trong release khớp source bằng hash. Apple M4/Metal đo ngắn ~100 FPS ở showdown. App chưa ký.
- Docker npm ci đã sửa lockfile thiếu bots. Server/web images build qua; Caddy static/HTTP/WS và Postgres checkpoint/restart/rejoin giữ đúng người/ví/offer đã kiểm tra bằng container riêng. Production TLS và CI GitHub chưa chạy.
- Sim cuối 800 trận: 0 vi phạm, 27.56 ván/trận; all15.125/cheap22.875/none34/smart28%. Mặc định blind ×1.5 mỗi16 ván, giá tăng .1; bot mua/dùng K10, tận dụng soi và sửa all-in. K02/K08 cần playtest tiếp, không điều giá dựa trên delta quan sát một mẫu. Báo cáo reports/MAGIC_BALANCE.md.
- Còn mở: nghe audio, benchmark dài/nhiều GPU, Windows/Linux, signing, CI trên remote, HTTPS/WSS production, spectator và cân bằng với người thật. Không có deployment public.
