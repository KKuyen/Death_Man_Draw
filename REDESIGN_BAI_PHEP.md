# REDESIGN: Cơ chế "Bài Phép" (thay thế gian lận/tố cáo/ngón tay/shop đầu ván)

Nguồn: yêu cầu của user ngày 04/10/2026 (chơi thử bản desktop). Tài liệu này là **bản gốc duy nhất**; các agent đọc trước khi làm. Các mục "Mặc định điều phối" là quyết định tạm của điều phối để không phải hỏi lại; agent được phép đề xuất đổi nếu có lý do rõ trong file kết quả, nhưng không tự ý bỏ yêu cầu của user.

## Yêu cầu của user (nguyên ý)
1. Hiện tại **không xem được bài trên bàn** (lỗi/UX) -> phải sửa: bài chung và bài của mình phải xem rõ.
2. **Bỏ cơ chế gian lận và tố cáo**; tinh gọn thành **một cơ chế duy nhất: bài phép**.
3. **Bỏ cửa hàng đầu ván** (shop mở đầu 2 phút).
4. **Giữ cơ chế che giấu tiền** (ví bí mật; cược và pot công khai).
5. **Bỏ ngón tay** hoàn toàn (không còn ngón thật/giả/thế chấp bằng ngón/mất ngón).
6. Một người chơi giữ **tối đa 5 lá bài phép**.
7. **Mỗi khi bắt đầu ván mới** có **ngẫu nhiên các lá bài phép để chọn mua**, có **giá tiền**, ghi **công dụng nhỏ ở dưới** lá.
8. **Tạo model đồ họa cho các lá bài** để dễ phân biệt. Phong cách: tham khảo mạng, kiểu *Alice in Borderland* (ma mị, bí ẩn) nhưng vẫn là **hoạt họa của bài tây phương Tây** (cartoon card art).
9. Hai loại bài phép:
   - **Nội tại**: có tác dụng khi **đang cầm trên tay** (passive).
   - **Kích hoạt**: dùng vào thời điểm tùy lá; **kích hoạt xong là mất luôn**.
10. Ví dụ lá: 
   - **Bộ 52 lá tráo đổi** ("lá để đổi"): bộ bài tây thay đổi luôn nên luật chơi phải mở rộng cho phù hợp. Dùng **trong lượt của mình**: đổi **1 lá trên tay** với lá tráo đổi, **bạn nhận lại lá đang cầm**.
   - **Lá buff nhận tiền** khi cầm trên tay nếu thắng.
11. **Các lá trong bộ bài chính và các lá tráo đổi có thể mang buff/debuff** (ngẫu nhiên trên lá bài):
   - **Vàng**: thắng với 2 lá buff vàng -> cộng thêm tiền.
   - **Thỏa mãn mọi chất** (wild suit).
   - **Debuff bẫy** (bẫy số hoặc chất): lá bẫy **không thể ghép combo cùng chất (flush) hoặc sảnh (straight)**; "bắt buộc người chơi phải bỏ bài" (xem mặc định bên dưới).
   - Nghĩ thêm các buff/debuff khác cho bộ bài chính và lá tráo đổi (ngẫu nhiên trên lá bài).
12. Các lá phép khác:
   - **Lá soi**: soi 1 lá của người khác (ngẫu nhiên).
   - **Lá chống phá sản**: cho thêm 1 cơ hội và **+100 đô sau khi phá sản** (**không thể đổi tiền trước**, tức không dùng chủ động/không đổi/bán trước khi phá sản).
   - ... và nhiều lá khác (agent nghĩ thêm, giữ gọn).

## Mặc định điều phối (được phép đề xuất đổi)
- Giữ: Texas Hold'em 2–4 người, ví bí mật, bot, blind tăng dần, chợ bài phép, lobby Ready (không còn shop đầu ván: tất cả Ready -> vào trận ngay, ván 1 cũng có chợ bài phép ngay trước khi chia).
- Chợ bài phép: bắt đầu mỗi ván (kể cả ván 1), ~20–30 s, 4 offer ngẫu nhiên công khai theo RNG server (cùng 4 lá cho mọi người), mỗi người mua mỗi offer tối đa 1 lần, tối đa 5 lá phép trên tay (đầy thì phải bỏ 1 lá hoặc không mua). Giá hiển thị; công dụng ghi nhỏ dưới tên lá.
- Bỏ hoàn toàn: ngón tay, trick (T*), fake (F*), bẫy/đánh dấu (marks), gaze/quan sát/lookDown-exposure, tố cáo, dealer deals (DLR*), shop tự do, thế chấp ngón, cue lỗi ngón. Giữ look-down chỉ như hiệu ứng hình ảnh xem bài trên tay (không ảnh hưởng luật). Phá sản = hết tiền (bị loại), trừ lá chống phá sản.
- Mô hình bài: mỗi lá bài trong bộ 52 là một **thực thể** có id, rank, suit và danh sách modifier. Server tạo bộ bài mỗi ván; modifier gán ngẫu nhiên với tỉ lệ nhỏ. Lá tráo đổi là **lá bài dự trữ** (một lá bài tây có modifier riêng) nằm trong ô phép; khi dùng trong lượt của mình thì đổi chỗ với 1 lá trên tay, lá bài đang cầm thành lá dự trữ/bị bỏ (agent quyết định nhất quán, ghi luật). Tráo xong lá phép mất (kích hoạt = mất).
- "Bẫy": lá có modifier bẫy (số hoặc chất) **không được tính** vào flush/straight (vẫn tính cặp/ba/tứ); "bắt buộc bỏ bài": nếu bài mạnh nhất còn lại của người đó chỉ có thể là flush/straight nhờ lá bẫy thì tay bị hạ về hạng thấp (không bắt fold chủ động bằng UI). Agent đề xuất cách diễn giải gọn hơn nếu cần, ghi rõ.
- Số lượng: khoảng 14–20 lá phép (khoảng 5–6 nội tại, 8–10 kích hoạt, 2–3 lá tráo đổi/bộ bài), 6–8 modifier lá bài (buff: vàng, wild suit, may mắn, lửa... ; debuff: bẫy số, bẫy chất, nguyền...). ID mới, danh mục ở `MAGIC_CATALOG.md`. Giá cân bằng theo sim (ví 1000, blind 10/20).
- Chống phá sản: nội tại; khi tiền về 0 sau showdown, lá bị tiêu, nhận +100 và ở lại (một lần). Không bán/đổi.

## Đồ họa lá bài
- Mỗi lá phép: một model 3D thẻ (mặt trước có tên, art, loại nội tại/kích hoạt, giá, mô tả nhỏ; mặt sau thống nhất), dễ phân biệt ở cả 3D lẫn UI (icon/khung/màu theo loại).
- Style: bài tây hoạt họa + ma mị kiểu Alice in Borderland (ký hiệu bài, mặt nạ, đồng hồ, đôi mắt, hoa hồng đen, viền vàng tối, tím/đỏ thẫm). Tham khảo trên mạng (WebSearch cho phép), ghi nguồn tham khảo trong file kết quả, **không sao chép** tác phẩm có bản quyền.
- Modifier trên lá bài tây: hiệu ứng thị giác (viền vàng, ánh cầu vồng, vết xích/bẫy...).

## Phân công
- gameplay-agent: luật + engine + protocol + server + bot + sim + tài liệu (MAGIC_CATALOG.md, GAME_RULES.md). Viết **hợp đồng protocol trước** (CHANGES.md mục "Bài Phép contract") trong ~15 phút đầu.
- delivery-agent: scene.ts + model/texture lá bài (Blender/procedural) + sửa "không xem được bài trên bàn" ở 3D (bài chung to, rõ, đọc được từ mọi ghế) + animation dùng/mua lá phép.
- frontend-agent: UI (bỏ tất cả UI ngón/trick/dealer/accuse/shop đầu ván; thêm chợ bài phép bắt đầu ván, khay 5 ô bài phép, mô tả nhỏ, giá; hiển thị modifier lá bài; bài chung/bài mình xem rõ cả ở DOM), offline demo, e2e.

## CẬP NHẬT ĐỒ HỌA LÁ BÀI (user, 04/10 tối) — thay thế hướng dẫn cũ về art
- Thiết kế lại lá bài phép **đơn giản**, phong cách **"show, don't tell"**: **không có chữ nào trên lá bài**, không giá, không mô tả, không biểu tượng kind/visibility in sẵn. Chỉ có hình minh họa nhận ra được ngay.
- Phong cách tham khảo **Balatro**: **pixel art**, bảng màu hạn chế, viền dày, silhouette rõ, mỗi lá một biểu tượng/nhân vật dễ phân biệt. Vẫn giữ chất bài tây (góc bài, viền) nhưng tối giản.
- **Thông tin (tên, loại, mức hiển thị, giá, công dụng, trạng thái) do UI (DOM) hiển thị** quanh/dưới lá, không in lên texture. Popup trên đầu người dùng chỉ là lá art + tên người ở lớp UI/label 3D, không chữ trong texture.
- Texture: pixel gốc nhỏ (ví dụ 64×88) phóng ×4 bằng nearest-neighbor, filter NEAREST trong Babylon (không mờ). Mặt sau thống nhất, cũng pixel.
- Lớp phủ modifier lá bài tây cũng pixel, đơn giản (viền vàng, cầu vồng, xích bẫy...), không chữ.

## CẬP NHẬT MỚI NHẤT — user yêu cầu bỏ cảm giác đồ chơi (04/10 tối)
- User: “thiết kế lại các lá bài đi, hiện tại nó trông đơn giản và đồ chơi quá”. Hướng này thay thế yêu cầu mảng phẳng/viền giản dị trước đó.
- Giữ pixel art nguyên bản, 22 mặt riêng, không chữ trên texture; thông tin vẫn do DOM hiển thị.
- Tăng chiều sâu bằng bảng màu trầm, sắc đồng cổ, khung nhiều lớp có nét khắc đối xứng, ánh sáng rời rạc theo chất liệu và chi tiết riêng cho từng vật thể. Nền tối có quầng sáng hạn chế; không khung giấy sáng dày hoặc màu kẹo.
- Chợ ưu tiên tranh bài lớn, thông tin phía dưới; khay hạn chế glow, khung tối và nhãn rõ.
- Nguồn phần hoàn thiện: `scripts/blender/arcane_finish.py`; vẫn sinh bằng Blender và kiểm tra nearest-neighbor/fallback.
