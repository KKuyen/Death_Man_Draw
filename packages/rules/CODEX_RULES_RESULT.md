> Xác minh điều phối sau bàn giao: toàn workspace 70/70 tests và 3/3 e2e trên bundle cuối đã qua; xem `CODEX_QA_RESULT.md` ở root. Các lỗi sandbox trong báo cáo bên dưới là lịch sử của phiên worker.

# Kết quả Rules/Server — Bài Phép

Ngày 04/10/2026. Node 22.23.2, workspace không có git. Chỉ sửa `packages/*`, `apps/server`, `scripts/sim`, `GAME_RULES.md`, `MAGIC_CATALOG.md`.

## Engine và bot

Các phần X01–X03 hidden, K10 hinted, N09, K07 `timing:anyTime` và public `shuffle` đã có khi nhận bàn giao. Đã kiểm tra và bổ sung regression:
- Cả ba lá tráo đều không đổi snapshot/log công khai, không gửi hint; test tráo đúng lá đã bị ép lộ xác nhận bản lộ cũ giữ nguyên.
- K10 chỉ trả danh tính lá phép cho người soi, không trả spare; Thầm lặng che hint, Màn sương trả kết quả giả và tiêu sau hai lần.
- K07 ngoài lượt trả đúng lá đỉnh bộ bài, giữ bí mật, từ chối trong chợ và lệnh thiếu/sai handId.
- Sáu ván liên tiếp đều phát đúng một public `shuffle`, bộ mới có 52 id duy nhất và thứ tự khác nhau; test riêng xác nhận modifier roll lại và lá tráo cũ biến mất.

Bot tận dụng thông tin đã nhận: K10 chọn mục tiêu tránh Áo giáp/Bài giả đã quan sát; K01 giảm mức tự tin trước bài mạnh của đối thủ; K07 dự đoán lá mở tiếp và bỏ dự đoán khi board đổi. Bot không nhận dữ liệu thật/giả của đối thủ, không đọc tiền/khay bí mật của người khác. Kết quả soi vẫn có thể sai hoặc lỗi thời. Thêm metadata riêng tùy chọn `PeekEntry.source/targetPlayerId/boardIds`; protocol v2 giữ nguyên.

Bot smart mặc định ưu tiên K10 ở mức 4 để có thể mua và dùng; bot dùng K07 ngoài lượt. Sửa nhánh all-in chỉ dành cho stack không đủ tố tối thiểu: trước đó một mức tố dự tính quá nhỏ cũng làm bot đẩy cả ví lớn vào pot.

## Cân bằng đã đo

Lệnh cuối, exit 0:

```sh
export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH
scripts/sim/run.sh scripts/sim/results/codex-complete 200 31
python3 scripts/sim/merge.py scripts/sim/results/codex-complete
```

800/800 trận kết thúc, 0 vi phạm, 0 trận chạm trần 200 ván. Trung bình **27,56 ván/trận**, trung vị 23, SE trung bình 0,67: gần mục tiêu khoảng 26, nhưng chưa đúng 26. Tỷ lệ thắng: **all 15,125%; cheap 22,875%; none 34%; smart 28%**. Đây là số đo của bốn chính sách bot, không phải bảo đảm tỷ lệ cho người thật hoặc mọi seed.

Điều chỉnh nhỏ đã giữ: blind tăng ×1,5 mỗi **16** ván (trước 14), all giữ **100** chip trước khi mua (trước 60), cỡ tố theo pot giảm **5%**, sửa all-in và cho smart mua K10. Giá gốc 22 lá và tăng giá 10% mỗi mức blind giữ nguyên. Cùng 800 seed trước tinh chỉnh cược/dự trữ, trung bình chỉ 23,39 ván; kết quả ở `scripts/sim/results/codex-final-defaults`.

[Bảng từng lá](../../scripts/sim/results/codex-complete/BALANCE.md) có lượt mua/dùng, ván giữ, giá gốc, delta thắng, SE và chip thực nhận/mua; [JSON](../../scripts/sim/results/codex-complete/merged.json) và bốn shard giữ config/seed/SHA256 brain để đối chiếu. Đã xác nhận hash khớp source bàn giao.

- K10: 2.007 lượt mua, 1.962 lượt dùng; K07: 406 mua, 405 dùng.
- N01: 152,7 chip/mua so với giá gốc 70; N06: 54,2 so với 55; N02: 65,3 so với 90 (bảo hiểm, không phải thu nhập chủ động). Đây là tiền nhận, chưa trừ giá thực tăng theo mức blind và không phải lợi nhuận nhân quả.
- K02: delta −7,04 điểm, SE 3,65 (nhiễu). K08: −9,64 điểm, SE 2,68, bị gắn cờ cần nghiên cứu tiếp. Không che các cờ này và không đổi giá theo một mẫu quan sát.
- Delta so người mua **chợ đầu** với người không mua **cùng chính sách**, tránh thiên lệch sống lâu mua nhiều. Chọn mua còn phụ thuộc offer/tổ hợp lá; chưa hiệu chỉnh tương quan ghế hoặc 22 so sánh. Chưa đo EV chip của các lá thông tin/phòng thủ/tráo. `all` chỉ vừa vượt 15% trong mẫu, chưa chứng minh một ngưỡng chắc chắn.

Sim lấy mặc định từ content, đếm cả bonus ván cuối ở phase `finished`, thống nhất phương pháp delta của shard/merger, trả exit khác 0 khi vi phạm/kẹt/chạm trần, kiểm tra exit từng PID và từ chối thư mục đã có kết quả. Dùng `node --import tsx` vì CLI tsx mở IPC socket bị sandbox chặn. Smoke 4 trận và ca chạm trần (exit 1) đã kiểm tra.

Một lượt phụ `codex-final-audited` có launcher exit 2 vì tôi sửa script khi nó còn chạy; bốn shard vẫn đủ 1.600 trận, merger chạy lại exit 0. Lượt cuối `codex-complete` dùng launcher cố định, exit 0; không lấy kết quả lượt phụ để tuyên bố launcher đã qua.

## Kiểm chứng thực tế

| Lệnh | Kết quả |
|---|---|
| `npx vitest run packages apps/server/test/unit.test.ts` | **59/59 qua**, 7 file |
| `npm run typecheck` | exit 0, toàn workspace |
| `tsc --noEmit -p packages/rules/tsconfig.json` | exit 0 |
| `tsc --noEmit -p packages/bots/tsconfig.json` | exit 0 |
| `tsc --noEmit -p apps/server/tsconfig.json` | exit 0 |
| `tsc --noEmit -p scripts/sim/tsconfig.json` | exit 0, bao gồm sim và source packages |
| `npm run build -w @saloon/server` | exit 0, bundle cập nhật |
| `npx vitest run packages apps/server` | **chưa xanh toàn bộ**: 59 qua, 5 integration không chạy; suite setup lỗi `listen EPERM` |

Log thật: [unit tests](verification/unit-tests.log), [typecheck](verification/typecheck.log), [sim typecheck](verification/sim-typecheck.log), [build](verification/server-build.log), [full suite](verification/full-suite.log).

Đã thử full suite ba lần trên cổng ngẫu nhiên riêng; sandbox đều từ chối bind `127.0.0.1` (lần cuối 30876), sau đó beforeAll timeout 60 giây. Đây không phải kết luận từ một test thời gian thực bị máy ngủ. Đã bổ sung server integration cho K10 routing/hint, K07 ngoài lượt và shuffle tới mọi socket, nhưng **chưa chạy được các assertion đó**. Chưa xác minh server HTTP/SDK/browser e2e với bundle cuối; cần chạy full suite trong môi trường cho mở cổng. Không thay test bằng skip để giấu lỗi, không chạy pkill và không kill process khác.

Không sửa frontend/art/desktop hoặc đưa lại cơ chế đã bỏ. Tài liệu scope đã đồng bộ visibility, anyTime, loại lá và nhịp blind.
