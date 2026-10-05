# Đồ họa Bài Phép — pixel art không chữ

Yêu cầu mới nhất của user tại cuối `REDESIGN_BAI_PHEP.md` thay thế hướng mảng phẳng giản dị: bài cần trưởng thành, cổ và ma mị hơn, tránh cảm giác đồ chơi. Art nguyên bản, không sao chép hình tham chiếu, không dùng ảnh/font bên ngoài; hình minh họa vẫn tự kể công dụng.

- Gốc 64×88, xuất 256×352 bằng lặp từng pixel 4×4. Pigment trầm với các sắc độ vật liệu rời rạc: đồng cổ, giấy cũ, đá/quả cầu, xanh rêu và tím khói. Không chữ, giá, ID, mô tả, ký hiệu loại hay hiển thị in trên bài.
- Khung đồng nhiều lớp, nét khắc đối xứng, nền tối với quầng sáng chia bậc pixel và chi tiết riêng trên từng vật thể. Màu nền chọn theo hình minh họa, không mã hóa kind/visibility. Không blur hay nội suy màu; các sắc độ đều là pixel native.
- `arcane_finish.finish` là bước hoàn thiện sau `art`/`back`, trước tất cả lần xuất mặt bài và model. Giữ nguyên module `arcane_finish.py` và `preview_arcane.py` do primary author. Overlay không đi qua bước finish này.
- Tên, công dụng, giá, trạng thái do DOM quanh bài hiển thị. Popup 3D chỉ có art; scene không vẽ tên hay giá vào texture. Chỉ bài poker giữ chỉ số rank/suit để đọc bài.
- Babylon dùng NEAREST, không mipmap cho art phép. Canvas ghép overlay tắt image smoothing. Blender image texture dùng Closest và GLB giữ sampler NEAREST.
- `plain/<id>.png` là bản sao byte-identical của `<id>.png` để tương thích URL cũ.

## Hình của 22 lá (thứ tự contact sheet)

N01 túi vàng; N02 tim nứt có cánh/vầng sáng; N03 kính lúp cỏ bốn lá; N04 khiên; N05 đồng tiền nảy mầm; N06 phao; N07 chuông bị chặn; N08 mặt nạ hai màu; N09 mắt trong mây sương.

K01 mắt xanh lơ lửng **trên lá bài chữ nhật**; K02 đèn rọi lá bài; K03 hai lá đổi chiều; K04 lá vàng và mũi tên nâng; K05 xích gãy; K06 đồng hồ; K07 quả cầu chứa lá bài; K08 bẫy kẹp lá; K09 mặt nạ ma dài và áo choàng; K10 **quả cầu mắt tím có chóp vàng**. K01/K10 giữ họ mắt chung, khác silhouette, nền, màu và vật thể chính; xem `cards-pixel-sheet-twins.png`.

X01 vương miện và quạt bài; X02 cầu vồng trên lá; X03 xúc xắc.

Mặt sau: mắt đỏ trong hình thoi đồng trên nền tối khắc họa tiết. Sáu overlay trong suốt, không chữ:

- Vàng: viền đồng vàng và ba đồng xu xếp chồng.
- Muôn chất: dải cầu vồng trầm và huy hiệu hình thoi chứa bốn chất khác nhau.
- Hạnh vận: viền xanh; cỏ bốn lá bitmap viết tay, bốn lá hình tim quay đối xứng quanh tâm theo hình chữ thập, hai sắc xanh + highlight sáng, cuống ngắn cong. Hình lớn ở góc trên phải; N03 cũng dùng bitmap mới.
- Bẫy số: viền đỏ cam có gai; ba thanh tăng dần bị hàm bẫy có răng kẹp dưới, khác hẳn icon khóa cũ.
- Bẫy chất: viền tím có lưới; bốn pips bích giống nhau bị xích chéo chặn lại.
- Nguyền: viền đỏ rượu, sọ lớn có răng và vết nứt. Không dùng màu tím của Bẫy chất.

Đã tự xem toàn bộ 22 mặt + lưng và sáu overlay ở bản xuất 256 px, kích thước bài 120 px và khay 56 px. Sheet trong `assets/previews/cards-pixel/` và bản sao `reports/screenshots/`: `cards-pixel-sheet-1.png`, `-2.png`, `-twins.png`, `-overlays.png`, `cards-pixel-sheet-120.png`, `-56.png`, `cards-pixel-sheet-overlays-120.png`, `-56.png`.

## Dựng lại

`python3 scripts/blender/run.py --only cards` hoặc `node scripts/cards/gen.mjs`: Blender headless chạy `scripts/blender/pixel_cards.py`, viết grid vào bpy images, lưu PNG, nguồn `.blend` có texture packed, GLB và contact sheet/render model. Không cần trình duyệt để sinh art.

`node scripts/cards/gen.mjs --fallback`: rasterizer grid Node (rect/ellipse/poly) chạy lại primitive recipes sinh bởi Blender, gồm từng pixel finish được ghi bằng `Grid.rect`. Chỉ dùng khi Blender không khả dụng; không tạo model/source/render. Có thể đặt `CARD_OUT` để kiểm tra ảnh dự phòng mà không ghi đè sản phẩm Blender. `node scripts/cards/verify-pixel.mjs` phải cho RGBA fallback khớp tuyệt đối (maxChannelDifference = 0), cả 29 ảnh vẫn có block 4×4 đúng native.

Nguồn: `assets/blender/cards/magic_cards_pixel.blend`, `magic_cards_preview.blend`. Model: `public/models/props/magic_card.glb`; root `prop_magic_card`, không thêm/đổi anchor. Thẻ 0,064×0,088×0,0008 m, góc bo 0,003 m, vật liệu mặt trước/mặt sau/cạnh riêng, UV mặt sau đảo ngang đúng hướng, front runtime +Z.
