# Trạng thái engine Bài Phép — cập nhật Codex 04/10/2026

Báo cáo và bằng chứng đầy đủ: [CODEX_RULES_RESULT.md](CODEX_RULES_RESULT.md).

## Đã hoàn tất trong scope
- X01–X03 hidden, giữ nguyên bản ép lộ cũ khi tráo; test cả ba biến thể và đúng lá bị ép lộ.
- K10 Lá soi phép hinted, chỉ người dùng thấy danh tính phép, không lộ spare; Thầm lặng che hint; N09 Màn sương hai lần.
- K07 Quả cầu soi hidden, `timing:anyTime`, dùng ngoài lượt khi playing; bot cũng dùng ngoài lượt.
- Public shuffle đúng một lần mỗi ván; test sáu ván có bộ 52 lá mới, test modifier/xóa lá tráo cũ.
- Bot tận dụng K01/K07 cho quyết định cược và K10 để chọn mục tiêu; smart mặc định có thể mua K10. Metadata soi thêm chỉ trong snapshot riêng, không có cờ thật/giả.
- Sửa bot all-in do cỡ tố nhỏ dù ví lớn. Mặc định cuối: blind mỗi 16 ván, tăng ×1,5; all dự trữ 100 chip; cỡ tố theo pot giảm 5%; giá gốc giữ nguyên, tăng 10% mỗi mức blind.
- Sim/merger cùng dùng delta mua chợ đầu theo chính sách; provenance/hash brain, bonus ván cuối, lỗi invariant làm command fail, launcher kiểm tra mọi PID.

## Bằng chứng cuối
- `scripts/sim/results/codex-complete`: 800/800 trận, 0 vi phạm, không chạm trần; hash source khớp.
- 27,56 ván/trận (trung vị 23), gần mục tiêu khoảng 26 nhưng không đúng 26.
- Win rate all 15,125%, cheap 22,875%, none 34%, smart 28%. Đây là mẫu bot, không phải ngưỡng chắc chắn.
- N01/N06/N02 tiền nhận/mua 152,7 / 54,2 / 65,3; chưa trừ giá thực theo mức blind.
- 59 test không cần socket qua; root typecheck, typecheck scope/sim và server build qua.

## Giới hạn còn rõ ràng
1. Full `vitest run packages apps/server` đã thử ba lần nhưng sandbox chặn listen localhost: 59 qua, 5 integration chưa chạy. Chưa xác minh e2e HTTP/SDK/browser với bundle cuối; chạy lại ngoài môi trường chặn bind.
2. Khảo sát 22 lá đã có, nhưng delta vẫn là quan sát, không phải EV nhân quả. K08 bị gắn cờ −9,64 điểm (SE 2,68); K02 −7,04 điểm (SE 3,65, nhiễu). Không khẳng định tất cả lá đã cân bằng hoàn hảo. Bảng và raw JSON ở `scripts/sim/results/codex-complete`.
3. Thông tin soi có thể giả/lỗi thời; bot dùng heuristic thận trọng, chưa giải poker tối ưu. Frontend/art/desktop có báo cáo riêng, không thuộc kiểm chứng lượt này.
