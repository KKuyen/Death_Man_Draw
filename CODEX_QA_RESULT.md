# Bàn giao cuối — Bài Phép, 04/10/2026

Đã hoàn thành các phần triển khai và QA cục bộ còn lại trong handoff. Các worker cũ đã kết thúc; không còn tiến trình Codex/sim đang sửa source. Thiết kế mới nhất của user (“bài đơn giản và đồ chơi quá”) đã được áp dụng lên cả 22 lá, mặt sau, khay và chợ.

## Thay đổi

- Pixel art không chữ chuyển sang màu trầm, khung đồng cổ, nét khắc, nền tối và sắc độ vật liệu rời rạc. Thêm chi tiết riêng cho từng hình. Bẫy số/bẫy chất dùng màu và silhouette khác nhau; cỏ bốn lá có bốn lá hình tim đối xứng. Blender tạo PNG, GLB, nguồn `.blend` và sheets; fallback Node cho RGBA giống hệt.
- Chợ dùng tranh lớn hơn, chữ bên ngoài texture, panel tối và viền nhẹ. Khay giảm glow. Ở 720p, nút mua/giá bám cạnh dưới khi cuộn; bỏ banner chợ giữa màn hình. Bài chung/bài riêng luôn có HUD đọc rõ.
- Bot dùng kết quả K01/K10/K07, xử lý dữ liệu soi có thể sai/lỗi thời, tránh all-in một ví lớn chỉ vì mức raise dự tính thấp. Luật hidden/hinted/public, xáo lại mỗi ván và giữ bí mật đều có regression.
- Desktop khởi động **server riêng trên cổng localhost tự chọn**; preload truyền endpoint sang web, không dùng nhầm server cũ :2567. Có thư mục dữ liệu riêng cho QA. App đóng gói chứa đúng art và bundle server cuối.
- Đồng bộ lockfile thiếu workspace bot, sửa lỗi Docker `npm ci`. Cập nhật README, hướng art, báo cáo cân bằng và handoff. Không đưa lại các cơ chế đã bỏ.

## Bằng chứng đã chạy

Node 22.23.2. Tất cả lệnh bên dưới đã chạy thực; không dùng test-list thay cho e2e.

| Kiểm tra | Kết quả / bằng chứng |
| --- | --- |
| `npm run typecheck` | PASS, `reports/final-typecheck.log` |
| `npm test` | **70/70 PASS**, 9 files, `reports/final-tests.log` |
| Build web + server | PASS, `reports/final-build.log`; web/bundle được build lại trong đóng gói cuối |
| `npm run check:assets` | PASS, `reports/final-assets.log` |
| Pixel/fallback/NEAREST | PASS, `assets/manifests/pixel-art-verification.json`; 22 lá + lưng + 6 overlays, 64×88 → 256×352, RGBA identical |
| E2E build cuối | **3/3 PASS**, demo/bots/multiplayer-refresh-rejoinKey, `reports/final-e2e-release.log` |
| Popup/layout | **80 trạng thái**, 4 ghế × 1440×900/1280×720 × 10; `reports/screenshots/pop-qa-receipt.json`, `reports/popups-qa.log` |
| `npm run desktop:pack` | PASS, Electron 41.10.7 mac-arm64, `reports/final-desktop-pack.log` |
| App đóng gói chơi thật | PASS, một ván tới showdown qua server riêng; `reports/desktop-qa.json`, screenshots `desktop-final-*` |
| Hash release | PASS, art source/web/packaged và server bundle khớp; `reports/release-verification.json` |
| Docker server + web images | PASS, `reports/final-docker-build.log`, `reports/final-docker-web-build.log` |
| Postgres/Caddy runtime | PASS, private market được checkpoint rồi phục hồi đúng người/ví/offer; SDK chơi qua HTTP/WS proxy, web/PNG được phục vụ; `reports/docker-qa.json` |
| Runtime dependency audit | **0 findings** với `npm audit --omit=dev`; `reports/runtime-audit.json`. Lệnh này không bao gồm Electron/tooling devDependencies. |
| Cân bằng | 800 trận, 0 vi phạm, 0 chạm trần, 27,56 ván/trận; `reports/MAGIC_BALANCE.md`, nguồn/shard/hash ở `scripts/sim/results/codex-complete` |

70 test bao gồm 5 integration thật: chợ/offer riêng; hint chỉ đến nạn nhân; Thầm lặng không rò thông tin; K10 không trả spare; K07 ngoài lượt; shuffle đến mọi socket; bí mật ví/bài/khay; dedup/rate limit; reconnect; 200 lần reconnect nhanh qua các pha. Các test integration từng bị sandbox của worker chặn nay đã chạy thành công ở phiên điều phối.

Popup QA dùng snapshot/sự kiện tổng hợp trong phòng offline thật, không chứng minh mọi phép được kích hoạt trọn luồng qua browser multiplayer. Regression engine và socket integration kiểm tra logic/routing riêng. Ảnh scene/animation của worker ở `reports/screenshots/pixel-scene/`.

Đo ngắn trong app đóng gói ở showdown 4 người: renderer **ANGLE Metal / Apple M4**, khoảng **100 FPS** trong 6 mẫu; receipt desktop ghi vendor/renderer/số đo. Không coi đây là benchmark nhiều thiết bị hoặc mọi hiệu ứng.

## Các lần thất bại và cách khắc phục

- E2E lần đầu bằng SwiftShader bị timeout khi nhiều scene/process chạy đồng thời; giữ log `reports/final-e2e.log`. Demo và reconnect qua lại được kiểm tra bằng Metal, rồi **rerun cả ba specs trên bundle cuối**. Không quy thất bại cho máy ngủ, không bỏ assertion.
- Popup timed banner biến mất trong lúc chụp software GL: script đo geometry trước và dùng clock pause/resume khi chụp. Receipt cuối kiểm tra cả bốn footer mua ở mỗi viewport.
- Docker `npm ci` báo thiếu `@saloon/bots`: cập nhật package-lock, build lại thành công.
- Docker restore-check lần đầu gọi cổng host tạm cũ sau restart. Log cho thấy phòng đã restore; sửa harness đọc lại port mapping. Rerun xác nhận đúng player/wallet/offers. Không phải lỗi restore của engine.
- Desktop harness truyền sai vị trí options của `waitForFunction`: sửa polling/timeout rồi chơi hết ván; lỗi này chỉ nằm ở QA script.

## Xem và chạy

- Bộ cuối: `reports/screenshots/cards-pixel-sheet-120.png`; bản 56 px: `cards-pixel-sheet-56.png`; overlays: `cards-pixel-sheet-overlays.png`.
- App: `release/mac-arm64/Dead Man's Draw.app`.
- Dev/demo: `npm run dev`; desktop source: `npm run desktop`.
- Nguồn art: `scripts/blender/pixel_cards.py`, `arcane_finish.py`, `assets/blender/cards/*.blend`.

## Còn cần xác minh bên ngoài phiên này

- App chưa ký; chưa build/chơi trên Windows/Linux, chưa chạy workflow trên GitHub (workspace chưa có git remote), chưa xác minh chứng chỉ HTTPS/WSS production. Không có deployment bên ngoài.
- Âm thanh chưa được nghe thử. GPU mới đo ngắn trên M4; chưa có bài đo dài/nhiều máy.
- Cân bằng mang tính prototype: all 15,125%, cheap 22,875%, none 34%, smart 28%. K02/K08 có delta âm cần nghiên cứu; delta quan sát không chứng minh nhân quả. Chưa playtest với người thật.
- Chưa thêm spectator; không nằm trong phần triển khai Bài Phép đã chốt. Các nhận định production/bảo mật nâng cao trong tài liệu cũ không được suy ra chỉ từ những kiểm tra này.

Chỉ dừng các server/web do phiên điều phối tạo. Container/network QA đã dọn theo đúng tên riêng; không dừng server cũ của user.
