# LUẬT CHƠI — Hold'em + Bài Phép

**Phiên bản:** 1.0 (Bài Phép), 04/10/2026. Thay thế hoàn toàn luật cũ (ngón tay, trick, đánh dấu, tố cáo, dealer, shop tự do, shop đầu trận — đã bỏ).
**Nguồn:** `REDESIGN_BAI_PHEP.md` (yêu cầu user), `GAME_DESIGN_BAI_PHEP.md` (thiết kế). Danh mục lá: [`MAGIC_CATALOG.md`](./MAGIC_CATALOG.md). Hợp đồng protocol: `packages/protocol/CHANGES.md`. Số liệu thật nằm ở `packages/content/src/index.ts`.

## 1. Tóm tắt
Texas Hold'em 2–4 người. Trước mỗi ván (kể cả ván 1) mỗi người **bí mật** mua tối đa 5 **lá bài phép** từ **chợ riêng** của mình; bộ 52 lá có thể mang **modifier** (buff/debuff) ngẫu nhiên. Ví tiền bí mật; cược và pot công khai. Hết tiền thì bị loại (trừ khi có Chống phá sản). Còn một người là thắng.

## 2. Vòng chơi
1. **Lobby**: 2–4 người (bot lấp chỗ), tất cả Sẵn sàng, chủ phòng bắt đầu → vào **chợ** ngay (không còn shop đầu trận).
2. **Mỗi ván**: Chợ bài phép (25 s; bấm Xong để rút ngắn) → dựng bộ 52 lá thực thể, gán modifier → chia 2 lá → blind → preflop/flop/turn/river → showdown (8 s) → ván sau.
3. Trong lượt mình, ngoài Bỏ/Theo/Tố/All-in, được **dùng lá kích hoạt** (không kết thúc lượt). Riêng Quả cầu soi K07 dùng được cả ngoài lượt khi ván đang diễn ra; Làm mới chợ K06 chỉ dùng trong chợ.
4. Blind 10/20, ×1,5 mỗi 16 ván. Ví đầu 1000. Mục tiêu khoảng 26 ván/trận; số đo và giới hạn xem `packages/rules/CODEX_RULES_RESULT.md`.
5. Phá sản = ví về 0 sau ván (kể cả blind ngắn thì all-in blind). Người bị loại mất hết lá phép.

## 3. Thông tin
| Thông tin | Ai thấy |
|---|---|
| Cược, pot, bài chung (kèm modifier), blind, ai còn trong ván | Mọi người |
| Ví tiền | Chỉ chủ ví |
| Chợ của bạn, bạn mua gì, đang giữ lá nào | Chỉ bạn |
| Modifier trên bài tay | Chỉ chủ; lộ khi showdown hoặc khi bị Ép lộ |
| Việc dùng lá phép | Theo `visibility` của lá (mục 5) |

## 4. Bài tây thực thể và modifier
Mỗi lá: `{id, rank, suit, modifiers[]}`; id duy nhất, rank/suit có thể trùng sau tráo đổi (tối đa 2 lá cùng rank+suit). Mỗi lá của bộ có 12% mang **1** modifier.
- Buff: **Vàng** (showdown, ≥2 lá Vàng trong 5 lá thắng → +max(2 BB, 10% pot), tối đa 6 BB, từ ngân hàng); **Muôn chất** (tính là mọi chất cho thùng); **Hạnh vận** (lá trong 5 lá thắng → +1 BB).
- Debuff: **Bẫy số** (không vào sảnh), **Bẫy chất** (không vào thùng), **Nguyền** (lá trong 5 lá thắng → −1 BB, đốt). Bẫy vẫn tính đôi/ba/tứ/cù lũ.
- Đánh giá: chọn 5 lá tốt nhất trong 7 theo luật trên; bẫy tự làm tay "hạ về hạng cao nhất hợp lệ" (không có fold cưỡng bức). Hơn 4 lá cùng rank (tráo đổi) vẫn là Tứ quý. Bẫy thắng Muôn chất (một lá chỉ có 1 modifier nên chỉ xảy ra khi đổi modifier).
- Bonus Vàng/Hạnh vận/Nguyền chỉ ở showdown.

## 5. Bài phép
- **5 ô**. Mua khi đầy phải chọn lá để thay (mất, không hoàn tiền). Không mua trùng lá nội tại đang giữ. Tiền mua bị đốt.
- **Chợ riêng**: 4 offer ngẫu nhiên theo trọng số hiếm, mỗi offer mua 1 lần; giá tăng 10% mỗi mức blind.
- Ba loại: **Kích hoạt** (dùng theo thời điểm ghi trên lá, dùng xong mất; lá chưa dùng giữ sang ván sau), **Nội tại xuyên suốt** (có hiệu lực khi đang giữ), **Nội tại kích hoạt** (chờ sự kiện: chia bài, thắng pot, thua showdown, về 0 tiền, bị Soi/Ép lộ; có thể tiêu sau khi chạy).
- **Hiển thị khi dùng/chạy**: `public` (cả bàn thấy thẻ lá trên đầu + âm thanh to + log), `hinted` (chỉ nạn nhân nhận dấu hiệu mơ hồ, không biết ai/lá nào), `hidden` (không ai biết). **Thầm lặng** biến mọi lá `hinted` của chủ thành `hidden`, không che lá `public`.
- **Tráo đổi** (Bộ Hoàng gia/Muôn sắc/Cược mù, `hidden`): mang 1 lá dự trữ; trong lượt mình đổi bí mật với 1 lá tay, lá tay cũ bị loại, lá phép mất.
- **Bài giả**: bị Soi/Ép lộ thì kẻ đó thấy lá giả (2 lần). **Màn sương**: bị Lá soi phép thì kẻ đó thấy lá phép giả (2 lần). **Mồi nhử**: cả bàn thấy bạn "dùng" một lá khác, không tác dụng.
- Danh sách 22 lá (thêm Lá soi phép K10, Màn sương N09; Quả cầu soi K07 dùng được bất cứ lúc nào trong ván), giá, trọng số, âm thanh: xem `MAGIC_CATALOG.md`.

## 6. Kinh tế và cân bằng (mô phỏng trận 4 bot)
Tiền chi chợ bị đốt; thưởng Vàng/Hạnh vận/Túi tiền/Áo phao/Chống phá sản do ngân hàng chi; bất biến: `Σví + pot + đốt − mint = 4×1000`. Kết quả sim ghi ở báo cáo giao việc (win rate theo chính sách mua và số ván/trận).

## 7. Không còn trong game
Ngón tay (thật/giả/thế chấp), trick T*, giả vờ F*, đạo cụ đánh dấu, quan sát lưng bài, tố cáo, dealer DLR*, shop tự do/đầu trận, thanh timing. Look-down chỉ còn là hiệu ứng hình ảnh phía client, không ảnh hưởng luật.
