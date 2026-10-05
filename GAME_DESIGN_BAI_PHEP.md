# Dead Man's Draw — Luật chơi mới: Hold'em + Bài Phép

Phiên bản thiết kế 04/10/2026. Thay thế phần gian lận/tố cáo/ngón tay/shop của `GAME_RULES.md` cũ. Đây là **nguồn sự thật cho lời văn luật**; số liệu cụ thể (giá, tỉ lệ) nằm ở `MAGIC_CATALOG.md` và được chỉnh bằng mô phỏng.

## 1. Tóm tắt một câu
Texas Hold'em 2–4 người; trước mỗi ván bạn **bí mật** mua tối đa 5 **lá bài phép** từ chợ riêng của bạn; bộ 52 lá có thể mang **buff/debuff** ngẫu nhiên. Thắng pot để sống sót, hết tiền thì bị loại.

## 2. Vòng chơi
1. **Lobby**: 2–4 người (bot lấp chỗ). Tất cả bấm Sẵn sàng → vào trận. Không còn shop đầu trận.
2. **Mỗi ván**:
   1. **Chợ bài phép** (20–30 s, mọi người cùng lúc, tự bấm "Xong" để rút ngắn).
   2. Dựng bộ bài (52 lá thực thể, gán modifier ngẫu nhiên), chia 2 lá/người, blind.
   3. Preflop → Flop → Turn → River → Showdown như Hold'em. Trong lượt mình, ngoài Bỏ/Theo/Tố/All-in, bạn có thể **dùng 1 lá phép kích hoạt** (nếu lá đó cho phép ở thời điểm đó).
   4. Chia pot, kết toán bonus, loại người hết tiền (trừ khi có lá Chống phá sản).
3. Blind tăng ×1,5 mỗi 12 ván. Thắng khi còn một người.

## 3. Thông tin công khai và bí mật
| Thông tin | Ai thấy |
|---|---|
| Cược, pot, bài chung, blind, ai còn trong ván | Mọi người |
| **Ví tiền** | Chỉ chủ ví |
| **Chợ của bạn (các offer, giá)** | Chỉ bạn — mỗi người có chợ riêng, RNG riêng |
| **Bạn mua gì, đang giữ lá phép nào** | Chỉ bạn (công khai nhiều nhất: số ô đã dùng, tùy chọn) |
| Modifier trên **bài chung** | Mọi người |
| Modifier trên **bài tay** của bạn | Chỉ bạn (đối thủ chỉ biết khi showdown) |
| **Việc dùng một lá phép** | **Công khai mặc định**: âm thanh nổi bật + lá bài hiện trên đầu người dùng cho cả bàn (xem §3a). Bị che nếu người dùng có **Thầm lặng** |
### 3a. Ba mức hiển thị khi dùng/kích hoạt một lá (CHỐT theo user, 04/10)
Mỗi lá phép có thuộc tính `visibility`:
1. **`public` — bắt buộc hiện**: cả bàn thấy tên lá hiện **trên đầu người dùng** (thẻ phóng to ~3 s) + **âm thanh nổi bật** + dòng nhật ký công khai "X dùng <lá>". Ví dụ: Chống phá sản, Lá ép lộ bài, Đổi bài chung, Mồi nhử. **Bộ tráo đổi là `hidden`** (CHỐT user).
2. **`hinted` — thầm lặng nhưng có dấu hiệu cho người bị ảnh hưởng**: cả bàn **không** biết; **chỉ người bị tác động** nhận một **dấu hiệu mơ hồ** ("ai đó nhìn bài bạn", rung nhẹ, v.v. — không nói ai, không nói lá nào). Ví dụ: Lá soi, tác động lên bài một người.
3. **`hidden` — không ai biết**: không âm thanh, không thẻ, không nhật ký, không dấu hiệu cho ai.
- Lá **Thầm lặng** (nội tại): khi bạn đang cầm, **mọi lá `hinted` của bạn trở thành `hidden`** (người bị ảnh hưởng cũng không nhận dấu hiệu). Thầm lặng **không** che các lá `public` (bắt buộc hiện).
- **Việc mua và giữ vẫn bí mật** (chợ riêng, danh sách lá đang giữ) cho tới khi lá được dùng ở mức `public`.
- Quyết định `visibility` được **server** áp dụng: client chỉ nhận sự kiện mà mình có quyền thấy (không bao giờ nhận sự kiện `hidden`; người bị ảnh hưởng nhận sự kiện `hint` riêng).

### 3a-bis. Phân loại bài phép (3 loại)
1. **Kích hoạt** (active): bạn chủ động dùng ở thời điểm lá cho phép; **dùng xong là mất**.
2. **Nội tại xuyên suốt** (continuous passive): có hiệu lực **liên tục** khi nằm trong ô (ví dụ Thầm lặng, Túi tiền cộng mỗi lần thắng nếu thiết kế như vậy, Áo giáp bẫy).
3. **Nội tại kích hoạt** (triggered passive): nằm trong ô **chờ sự kiện**, chỉ chạy khi sự kiện xảy ra (thắng pot, về 0 tiền, bị Soi, bị ép lộ bài, thua showdown...). Mỗi lá ghi rõ nó có bị tiêu sau khi chạy không và `visibility` của nó. Ví dụ: Chống phá sản (sự kiện: về 0 tiền, `public`, tiêu), Lừa dối/Bài giả (sự kiện: bị Soi/ép lộ, `hidden`, tiêu sau N lần), Túi tiền (sự kiện: thắng ván).
Catalog có trường `kind: "active" | "passive_continuous" | "passive_triggered"`, `trigger` (với triggered), `visibility`, `consumed` (bool/số lần).

### 3b. Phản Soi, lừa dối và đổi bài sau khi bị soi
- **Lá Soi mạnh** nên có đối trọng:
  - **Lá lừa dối / Bài giả** (nội tại): khi bạn bị **Soi** hoặc bị **ép lộ bài**, người đó thấy một lá **sai lệch** (một lá ngẫu nhiên khác, không phải bài thật của bạn); lá bị tiêu sau 1 lần hoặc vài lần (catalog).
  - **Mồi nhử** (kích hoạt, `public` giả): hiện hiệu ứng "dùng lá <X>" giả (X là một lá bất kỳ) cho cả bàn để đánh lạc hướng; không có tác dụng thật; mất sau khi dùng.
  - **Đổi bài sau khi bị soi**: được phép — bạn dùng **lá tráo đổi** trong lượt của mình sau khi nhận biết (nhờ hiệu ứng công khai ai Soi bạn) để thay đổi bài, biến thông tin soi được thành lỗi thời.
- Mọi hiệu ứng soi/lộ là kết quả **do server tính** (kể cả sai lệch); client không biết bài thật của người khác.

Hệ quả: tiền không rò qua tổng chip trên bàn vì ví ẩn; việc mua bán không xuất hiện trong nhật ký công khai.

## 4. Bài tây thực thể và modifier
- Bộ bài mỗi ván có 52 **thực thể** `{id, rank, suit, modifiers[]}`. Có thể trùng rank/suit sau khi tráo đổi (bộ bài "thay đổi luôn"), nhưng id luôn duy nhất.
- Mỗi lá có xác suất nhỏ (mặc định ~12%) mang **1 modifier**; bài chung sinh modifier công khai, bài tay chỉ chủ thấy.
- **Buff**:
  - **Vàng**: nếu tay thắng tốt nhất của bạn chứa ≥2 lá Vàng → +bonus (mặc định = 10% pot hoặc 2×BB, lấy từ ngân hàng, không từ đối thủ).
  - **Muôn chất** (wild suit): tính là bất kỳ chất nào để làm đồng chất.
  - **May mắn / Lửa / ...** (đề xuất): xem catalog; mỗi buff phải đọc được trong 1 dòng.
- **Debuff**:
  - **Bẫy số**: lá có rank bị bẫy không được tính vào **sảnh**.
  - **Bẫy chất**: lá bị bẫy không được tính vào **đồng chất**.
  - Lá bẫy vẫn tính cho đôi/ba/tứ/full. "Bắt buộc bỏ bài": nếu tay mạnh nhất của bạn chỉ còn là đồng chất/sảnh nhờ lá bẫy thì bị **hạ xuống hạng cao nhất hợp lệ** — không có fold cưỡng bức.
  - **Lời nguyền**: −bonus/pot nhỏ nếu lá nằm trong tay thắng.
- Giải quyết xung đột: Muôn chất vs bẫy chất → bẫy thắng (không tính vào đồng chất). Tối đa 1 modifier/lá.
- Thứ tự đánh giá: gán modifier → loại lá bẫy khỏi sảnh/đồng chất → xếp hạng bài tốt nhất → bonus.

## 5. Bài phép
- **5 ô**; mua khi ô đầy phải bỏ 1 lá (lá bỏ mất, không hoàn tiền).
- **Nội tại**: có hiệu lực khi nằm trong ô; tối đa 2 lá nội tại cùng loại tác dụng chồng.
- **Kích hoạt**: tự chọn lúc dùng (theo ô thời điểm của lá); dùng xong **mất luôn**.
- **Chợ riêng**: 4 offer ngẫu nhiên theo trọng số hiếm; giá hiển thị; mô tả 1 dòng nhỏ dưới tên. Mỗi offer mua tối đa 1 lần. Giá tăng nhẹ theo ván (hoặc theo blind) để theo kịp kinh tế.

### Danh sách đề xuất (agent chốt số trong MAGIC_CATALOG.md)
**Nội tại**
- **Túi tiền**: thắng ván → +x% pot (hoặc +chip cố định).
- **Chống phá sản** *(revealOnUse)*: về 0 tiền → ở lại với +100, lá mất. Không bán/đổi trước.
- **Kính lúp may**: modifier trên bài tay của bạn là buff có xác suất tăng khi chia.
- **Áo giáp bẫy**: bỏ qua 1 debuff bẫy trong tay bạn.
- **Hạt giống vàng**: lá đầu tiên của bài tay có thêm 25% thành Vàng.
**Kích hoạt**
- **Bộ 52 lá tráo đổi** (3 biến thể, `hidden`: không ai thấy/nghe việc tráo, danh tính lá bị loại cũng bí mật): giữ 1 lá bài dự trữ (có modifier riêng). Trong lượt mình, đổi 1 lá trên tay với lá dự trữ; lá bạn đang cầm trở thành bài dự trữ rồi lá phép mất (bộ bài thật bị thay đổi, id vẫn duy nhất).
- **Lá soi**: xem ngẫu nhiên 1 lá của 1 đối thủ bạn chọn (không chọn lá cụ thể). Đối thủ nhận thông báo mơ hồ.
- **Lá ép lộ bài** *(revealOnUse)*: một đối thủ phải lật 1 lá ngẫu nhiên công khai cho ván này.
- **Đổi bài chung**: thay lá bài chung kế tiếp bằng lá ngẫu nhiên khác (trước flop/turn/river).
- **Nâng buff**: biến 1 lá tay thành Vàng/Muôn chất.
- **Phá bẫy**: gỡ debuff khỏi 1 lá.
- **Mồi nhử**: hiện hiệu ứng dùng một lá giả cho cả bàn (đánh lạc hướng).
**Nội tại thêm (theo yêu cầu user)**
- **Thầm lặng**: dùng lá phép mà không ai biết (xem §3a).
- **Lừa dối / Bài giả**: bị Soi/ép lộ thì kẻ đó thấy lá sai lệch (xem §3b).

## 6. Kinh tế
- Ví 1000, blind 10/20, ~26 ván/trận (mục tiêu sim), blind tăng ×1,5 mỗi 12 ván.
- Chi cho chợ bị đốt (bank), thưởng Vàng/Túi tiền do ngân hàng chi → sim phải theo dõi tổng chip: `Σ ví + pot + đốt − tiền mint = hằng số`.
- Mục tiêu: chi trung bình ~15–25% ví/ván cho người mua đều; không chiến lược nào thắng quá 35% ở 4 người.

## 7. Phân tích và nhận xét

### Điểm mạnh
1. **Gọn và đọc được** hơn bản cũ: một hệ phép thay cho 5 hệ (ngón, trick, mark, tố cáo, dealer). Dễ onboard, dễ test, dễ cân bằng bằng mô phỏng.
2. **Hướng chiến lược rõ** (kiểu Balatro/roguelike deckbuilder): mỗi ván là quyết định xây dựng — mua gì, giữ gì, khi nào dùng. Bài tây thực thể + modifier cho cảm giác "bộ bài sống".
3. **Thông tin ẩn có chủ đích**: ví ẩn + chợ ẩn + chỉ vài lá `revealOnUse` tạo suy luận ("tại sao họ tố to thế?") mà không cần luật tố cáo.
4. **Server-authoritative sạch**: mọi bí mật là RNG/phiên server, không cần hệ gaze/quan sát 3D phức tạp.
5. **Mở rộng dễ**: thêm lá = thêm dữ liệu catalog.

### Rủi ro và đề xuất
1. **Mất bản sắc "gian lận – quan sát – tố cáo"** (cảm hứng Liar's Bar). Đây là rủi ro lớn nhất: sau khi bỏ, game thành Poker + Roguelike, mất yếu tố tâm lý xã hội. Giảm nhẹ: giữ *một* lớp suy luận nhỏ — thông báo mơ hồ khi bị Soi, vài lá `revealOnUse`, hiệu ứng "dùng lá phép" hiện cho cả bàn như tiếng rung nhưng không rõ lá nào (tùy chọn: lá **Mồi nhử** kích hoạt giả để đánh lạc hướng).
2. **Ngẫu nhiên chồng ngẫu nhiên** (RNG của bài + modifier + chợ). Giảm kỹ năng. Đề xuất: modifier thưa (~10–12%), chợ có trọng số theo tình huống (người ít tiền thấy lá rẻ/bảo hiểm hơn), và có lá giảm phương sai (Kính lúp may, Phá bẫy).
3. **Tuyết lăn (snowball)**: tiền → lá kiếm tiền → thêm tiền. Giảm: Túi tiền/Vàng lấy từ ngân hàng với trần mỗi ván; giá lá tăng theo ván; lá chống phá sản chỉ một lần.
4. **Lá Soi mạnh trong poker**: biết 1 lá đối thủ đổi cả EV. Giảm: chỉ 1 lá ngẫu nhiên, đối thủ nhận thông báo mơ hồ, giá cao, 1 lần/trận hoặc xuất hiện thưa.
5. **Luật thay bộ bài**: tráo đổi làm bộ bài có thể trùng rank/suit — cần ràng buộc id duy nhất, quy tắc 5 lá trùng (five-of-a-kind không tồn tại trong phép tính hạng?) → đề xuất: tối đa 2 lá cùng rank+suit trong bộ bài và five-of-a-kind không được đặc biệt hóa.
6. **Tương tác Muôn chất × Bẫy × Vàng** dễ sinh trường hợp biên khó đoán. Bắt buộc có bộ test thuộc tính (property tests) cho evaluator và bảng xếp hạng ví dụ trong docs.
7. **Tốc độ**: chợ đầu mỗi ván × ~26 ván → thêm ~10–13 phút/trận. Giảm: chợ chạy song song với việc chia bài, bấm Xong rút ngắn, bot tự quyết nhanh, ván sau người bị loại/đang all-in bỏ qua chợ.
8. **Rõ ràng UI**: 5 ô × nội tại/kích hoạt × modifier trên 9 lá có thể quá tải. Cần: tối đa 2 nội tại tác dụng hiển thị cùng lúc, khung màu theo loại, tooltip một dòng, nhật ký riêng.
9. **Bot**: cần chiến lược mua/dùng không thô; sim mới phải kiểm tra win-rate theo chính sách (mua đều, mua rẻ, không mua) để chắc phép có giá trị nhưng không bắt buộc.
10. **Bí mật bị rò gián tiếp**: kiểm tra thời gian phản hồi, số chip burn trong nhật ký, và animation dùng lá. Mọi sự kiện công khai phải qua lọc whitelist.

### Quyết định cần chốt (đề xuất mặc định)
| Câu hỏi | Mặc định |
|---|---|
| Chợ riêng hay chung | **Riêng mỗi người** (đúng ý "shop vẫn dấu") |
| Đối thủ có thấy số lá phép bạn giữ? | Không (hoặc chỉ số ô) |
| Người bị Soi/được báo? | Có, mơ hồ ("ai đó nhìn bài bạn") |
| Lá hết hạn cuối ván? | Nội tại giữ; kích hoạt chưa dùng giữ sang ván sau |
| Người bị loại | Bài phép mất |
| Trần hiệu ứng tiền | Có trần mỗi ván |
