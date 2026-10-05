# Kế hoạch dự phòng: giao việc cho đội Codex khi Claude sắp hết usage

Quyết định của user (04/10/2026): nếu điều phối Claude sắp hết usage/token thì **cập nhật HANDOFF_ROOT.md rồi giao cho các worker Codex** tiếp tục. (Điều này thay cho lệnh cũ "chỉ Claude code".)

## Điều kiện kích hoạt
- Claude báo sắp hết usage (cảnh báo hệ thống, lỗi quota/rate limit liên tiếp), hoặc agent con lỗi API kéo dài.
- Việc cần làm trước khi chuyển: (1) ghi trạng thái thật vào `HANDOFF_ROOT.md` (mục TRẠNG THÁI BÀI PHÉP), (2) tắt/ghi lại các agent đang chạy, (3) chạy `npm run typecheck && npm test` và ghi kết quả.

## Công cụ
- `codex` CLI 0.160.0 tại `/Users/quyen.tran5/.local/bin/codex`; chạy không tương tác: `codex exec --full-auto "<prompt>"` hoặc đưa prompt qua stdin (`codex exec - < FILE`). Dùng Node22: `export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH`.
- Orca (`/opt/homebrew/bin/orca`) có thể không ổn định (tạo pane lỗi timeout). Nếu Orca chạy được thì dùng skill `orchestration`; nếu không, chạy `codex exec` trực tiếp trong nền, mỗi worker một scope.

## Đội Codex đề xuất (scope không giao nhau)
1. **Coordinator Codex** (1 agent): đọc HANDOFF_ROOT.md, điều phối, chạy kiểm tra tổng, cập nhật handoff; không viết code vượt scope của worker.
2. **Rules/Server worker**: `packages/*`, `apps/server`, `scripts/sim` — theo `MAGIC_CATALOG.md`, `packages/protocol/CHANGES.md`.
3. **Scene/Art worker**: `apps/web/src/scene.ts`, `fx.ts`, `assets/*`, `scripts/cards`, `public/cards`.
4. **UI worker**: `apps/web` (trừ scene/fx), `tests/e2e`.
5. **QA/Delivery worker**: e2e trên cổng riêng, desktop pack, Docker, CI, balance sim.
Mỗi worker: đọc `HANDOFF_ROOT.md`, `REDESIGN_BAI_PHEP.md`, `GAME_DESIGN_BAI_PHEP.md`, file *_RESULT.md của scope mình; ghi kết quả vào file *_RESULT.md; không `pkill` rộng; chỉ kill PID của mình; báo trung thực những gì chưa kiểm chứng.

## Prompt mẫu cho mỗi worker
"Workspace /Users/quyen.tran5/lairgame. Dùng Node22. Đọc HANDOFF_ROOT.md (mục TRẠNG THÁI BÀI PHÉP), REDESIGN_BAI_PHEP.md, GAME_DESIGN_BAI_PHEP.md. Scope: <danh sách thư mục>. Việc: <mô tả>. Kiểm chứng bằng lệnh thật (typecheck/test/build/e2e cổng riêng), ghi kết quả trung thực vào <FILE>_RESULT.md. Không sửa file ngoài scope."
