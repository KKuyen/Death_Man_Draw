# Nguồn Blender bộ Bài Phép pixel

- `magic_cards_pixel.blend`: model thẻ ở hệ nguồn Blender (mặt trước -Y), 29 texture packed; root `prop_magic_card` trong `EXPORT`, nguồn không cần file ảnh bên ngoài.
- `magic_cards_preview.blend`: 35 texture packed, camera orthographic, các collection `SOURCE`, `EXPORT`, `PREVIEW`; dùng để chỉnh/xem render mẫu.
- Dựng lại từ root: `python3 scripts/blender/run.py --only cards` hoặc `node scripts/cards/gen.mjs`.
- Xác minh nguồn và roundtrip GLB: `python3 scripts/blender/run.py --verify-cards`.
- Grid gốc/22 hình/overlay: `scripts/blender/pixel_cards.py`; mặt bài và lưng qua `arcane_finish.py` để có pigment trầm, khung đồng khắc và sắc độ vật liệu. Overlay giữ pipeline riêng. Không dùng font, ảnh tải mạng hay hệ vẽ SVG. Primitive recipes gồm từng pixel hoàn thiện xuất sang `scripts/cards/pixel-recipes.json` phục vụ rasterizer Node dự phòng.
- Contact sheets trong `assets/previews/cards-pixel/` có bản 256 px, 120 px và khay 56 px; cả 22 mặt/lưng và sáu overlay đều được tự xem ở các kích thước này.
- Mặt trước mẫu model là K01; mặt sau dùng `public/cards/back.png`. Runtime scene thay texture theo ID và quyền hiển thị; node/anchor không chứa danh tính bài riêng.
- Kích thước thực 0,064×0,088 m, dày 0,0008 m, bo góc 0,003 m; 64 tam giác, ba vật liệu. UV mặt sau đảo ngang để đọc đúng; sampler Closest/NEAREST.
