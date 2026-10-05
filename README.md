# Dead Man’s Draw — Bài Phép

Texas Hold’em 3D cho 2–4 người, ví tiền bí mật và bộ bài phép riêng. Đầu mỗi ván, mỗi người nhận một chợ bí mật gồm 4 lá; giữ tối đa 5 phép. Có phép kích hoạt, nội tại liên tục và nội tại chờ sự kiện. Thông tin riêng được xử lý phía server. Demo có 3 bot và chạy hoàn toàn trong trình duyệt.

Thiết kế hiện hành nằm trong [REDESIGN_BAI_PHEP.md](./REDESIGN_BAI_PHEP.md), [GAME_RULES.md](./GAME_RULES.md) và [MAGIC_CATALOG.md](./MAGIC_CATALOG.md). Các tài liệu về gian lận/ngón tay/dealer trước đây chỉ là lịch sử. Protocol hiện tại là phiên bản 2; checkpoint phiên bản cũ được cách ly.

## Chạy cục bộ

Dùng Node ≥22.12:

```sh
npm ci
npm run dev
```

Mở `http://localhost:5173`. Chọn **Chơi thử với 3 đối thủ máy**, hoặc mở bàn thật rồi cho người khác nhập mã bàn. Mọi người bấm sẵn sàng, chủ bàn bắt đầu; ván 1 cũng có chợ bài phép.

| Lệnh | Kết quả |
| --- | --- |
| `npm run build` | Build web và server |
| `npm run typecheck` / `npm test` | TypeScript và kiểm thử luật/bot/UI/server |
| `npm run test:e2e` | Demo, bot và multiplayer qua Playwright |
| `npm run check:assets` | Đối chiếu manifest/GLB |
| `node scripts/cards/verify-pixel.mjs` | Kiểm tra pixel NEAREST và ảnh dự phòng giống hệt Blender |
| `python3 scripts/blender/run.py --only cards` | Dựng lại bài phép, GLB và nguồn Blender |
| `npm run desktop` | Mở Electron với server riêng trên cổng localhost tự chọn |
| `npm run desktop:pack` | Tạo app macOS arm64 trong `release/mac-arm64` |
| `npm run desktop:smoke` | Kiểm tra tải web, model, endpoint và health rồi thoát |
| `node scripts/desktop-qa.mjs` | Chơi hết một ván trong app macOS đã đóng gói |
| `node scripts/docker-qa.mjs` | Kiểm tra Postgres/checkpoint/restart bằng container riêng |

Desktop luôn khởi động server của chính nó; preload truyền endpoint đúng sang web. `SALOON_DATA_DIR` cho phép dùng thư mục dữ liệu riêng khi kiểm thử. App macOS hiện chưa ký.

## Kiểm thử trình duyệt

```sh
PORT=3094 CORS_ORIGIN=http://localhost:5394 DATA_DIR=/tmp/lairgame-qa npm run dev -w @saloon/server
```

Ở terminal khác:

```sh
E2E_PORT=5394 E2E_SERVER=ws://localhost:3094 npm run test:e2e
```

Trên macOS, `E2E_GPU=1` dùng ANGLE Metal; mặc định dùng SwiftShader cho CI. Có thể đặt `CHROMIUM_PATH` nếu Chromium chưa nằm trong cache Playwright. Script `apps/web/qa-popups.mjs <web-port> all` chụp chợ, phép công khai, hint, kết quả soi, tooltip, panel dùng và pulse ở 4 ghế × 2 viewport; đây là kiểm tra snapshot/sự kiện dựng cho QA.

## Đồ họa và xác minh

26 lá phép không chữ, khung đồng cổ, màu trầm và chi tiết khắc. Tên/giá/công dụng nằm trong DOM. Nguồn có thể chỉnh sửa: `scripts/blender/pixel_cards.py`, `scripts/blender/arcane_finish.py`, `assets/blender/cards/*.blend`. [Quy chuẩn bài](./assets/MAGIC_CARD_STYLE.md) mô tả hướng mỹ thuật và cách sinh lại.

Ảnh và receipt nằm trong `reports/`; kết quả bàn giao tổng hợp ở [CODEX_QA_RESULT.md](./CODEX_QA_RESULT.md). Đã kiểm tra local: TypeScript, luật/bot/server, demo và multiplayer thật, app desktop chơi một ván, Docker server và Postgres khôi phục checkpoint. CI GitHub và HTTPS/WSS bằng chứng chỉ production chưa được chạy; âm thanh chưa nghe thử. Đo FPS local là mẫu ngắn trên Apple M4, không thay cho kiểm thử nhiều thiết bị.

## Deploy

Triển khai bằng Docker + Caddy (tự lấy HTTPS) + PostgreSQL, xem chi tiết tại [infra/README.md](./infra/README.md):

```sh
cp infra/.env.example infra/.env   # đặt POSTGRES_PASSWORD, PUBLIC_ORIGIN, PUBLIC_WS_URL
docker compose -f infra/docker-compose.yml --env-file infra/.env up --build -d
```

Không dùng Docker: `npm run build` rồi `node dist-bundle/server.mjs` (sau `npm run bundle:server`), phục vụ `apps/web/dist/` bằng static server bất kỳ.
