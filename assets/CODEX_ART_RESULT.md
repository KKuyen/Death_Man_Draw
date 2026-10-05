# Kết quả Scene/Art — Bài Phép pixel (04/10/2026)

Workspace: `/Users/quyen.tran5/lairgame`. Các đường dẫn bên dưới tính từ workspace này. Thực hiện bằng Node 22.23.2 và Blender portable 4.5.0 tại `/Volumes/Blender 1`; không dùng sub-agent, không sửa luật/protocol/UI, không đưa lại cơ chế đã bỏ.

## Cập nhật mới nhất — K11/K12/K13 qua lại pipeline arcane_finish + thêm một lớp đổ bóng/chi tiết cho toàn bộ 25 mặt (05/10/2026)

User: *"hoạ tiết các lá bài đơn giản quá, vẽ pixel chi tiết hơn đi có thể có đổ bóng trong tranh minh hoạ"*. Phát hiện gốc: `K11` (Đạo chích), `K12` (Tan biến), `K13` (Đổi vận) đã có silhouette show-don't-tell tốt sẵn trong `scripts/blender/pixel_cards.py::art()` (bàn tay găng tay đang chộp lá bài phát sáng; hai lá bài nứt/vỡ với vết nứt tia chớp và mảnh vỡ; vòng tròn định mệnh ôm hai lá bài), nhưng `scripts/blender/arcane_finish.py::details()` chưa có nhánh cho ba id này, và ba file PNG đang nằm trong `public/cards/` thực ra được sinh ra bởi một lượt khác, đơn giản hơn nhiều trước đó (pixel-recipes.json chỉ ghi 14–22 lệnh vẽ cho mỗi lá, so với hơn 3400 lệnh của K01 sau `finish()`) — nên ba lá này chưa từng đi qua bước khung đồng/quầng sáng/đổ bóng nhiều lớp như 19+ lá còn lại.

Đã sửa:
- `scripts/blender/arcane_finish.py`: thêm nhánh `details()` cho `K11` (ánh sáng khớp găng tay, viền sáng lá bài bị chộp, bóng đổ ở đầu ngón tay), `K12` (làm tối phần trong vết nứt, làm sáng viền mảnh vỡ, góc lá bài tướp), `K13` (các tia hoa văn toả tròn quanh vành bánh xe định mệnh, bệ vát viền, điểm sáng trên chồng bài).
- Nâng cấp **toàn bộ** hàm `finish()` (áp dụng cho cả 25 mặt — 24 lá + lưng — chứ không riêng ba lá mới) để có thêm một lớp chi tiết/đổ bóng theo đúng yêu cầu:
  - **Đổ bóng tiếp xúc (cast shadow)**: mỗi cột pixel tự tính điểm thấp nhất của silhouette (làm mượt ngang qua các cột lân cận), rồi làm tối nền ngay dưới chân vật thể chính với độ suy giảm dần — bóng đổ thật dưới từng vật thể thay vì hình cố định.
  - **Dithering nền**: thay băng nền 4 mức cứng bằng dithering Bayer 4×4 (ma trận `BAYER4`) trộn giữa hai mức liền kề theo ngưỡng từng pixel — quầng sáng/nền giờ có nhiều bậc tông hơn mà vẫn thuần pixel-art (không nội suy màu).
  - **Đổ bóng vật thể 5 bậc** (trước là 3 bậc: cạnh sáng/dither/phẳng): thêm bậc **sáng đặc biệt ở góc lồi** (khi cả cạnh trên và trái đều là biên, +22, ánh sáng từ góc trên-trái) và bậc **bóng tối ở góc lõm** (khi cả cạnh dưới và phải đều là biên, −18, bóng đổ chiều dưới-phải) — tạo cảm giác vật liệu có khối hơn, nhất quán hướng sáng trên mọi lá.
- Chạy lại toàn bộ pipeline gốc (`node scripts/cards/gen.mjs`, dùng Blender) — không viết generator mới, không chữ/giá/mô tả lên texture, giữ nguyên NEAREST/không mipmap, giữ nguyên 6 overlay (không đi qua `finish()`, không đổi — vẫn giữ `trapRank`/`trapSuit` phân biệt và `lucky` là cỏ bốn lá thật từ lượt trước).
- `scripts/cards/verify-pixel.mjs`: danh sách `expected` id đã lỗi thời (còn đòi K06 đã bỏ theo `MAGIC_CATALOG.md`, thiếu K11–K13) — sửa thành đúng 24 lá hiện hành (N01–09, K01–05,07–13, X01–03); báo cáo `cards` giờ lấy từ `expected.length` thay vì hằng số 22.
- Xoá file rác `public/cards/K06.png` và `public/cards/plain/K06.png` còn sót lại từ trước khi K06 bị bỏ khỏi danh mục (file ảnh không có id tương ứng trong manifest nữa).

File PNG, manifest (`public/cards/manifest.json`, 24 lá đúng thứ tự `art()`), model (`public/models/props/magic_card.glb`), nguồn Blender (`assets/blender/cards/magic_cards_pixel.blend`, `magic_cards_preview.blend`), recipes (`scripts/cards/pixel-recipes.json`) và các manifest trong `assets/manifests/` (`prop_magic_card.asset.json`, `saloon-assets.json`, `pixel-art-verification.json`) đều do chính `pixel_cards.py`/`verify-pixel.mjs` ghi lại trong lượt chạy này, không sửa tay.

### Đã tự xem lại (Read tool) trước khi báo xong
- `reports/screenshots/cards-pixel-sheet-1.png` (N01–N09, K01–K03) và `-2.png` (K04–K10, K11–K13, X01–X03, lưng): toàn bộ 25 mặt đều có khung đồng nhiều lớp + quầng sáng tối + đổ bóng/dither như nhau; K11 đọc rõ là bàn tay chộp lá bài phát sáng, K12 là hai lá bài nứt vỡ, K13 là bánh xe định mệnh quanh hai lá bài — không còn lá nào phẳng/viền mỏng.
- `reports/screenshots/cards-pixel-sheet-120.png` và `-56.png`: ở cỡ khay 56 px, K11/K12/K13 vẫn đọc được (tay+lá sáng; hai lá nứt; vòng tròn quanh hai lá), không mất chi tiết quan trọng.
- `reports/screenshots/cards-pixel-sheet-twins.png`: K01 (mắt xanh trên lá chữ nhật) và K10 (quả cầu mắt tím chóp vàng) vẫn phân biệt rõ ràng, không bị nhầm sau khi tăng chi tiết.
- `reports/screenshots/cards-pixel-sheet-overlays.png`, `-120.png`, `-56.png`: 6 overlay không đổi (không qua `finish()`), `trapRank` khác `trapSuit`, `lucky` vẫn là cỏ bốn lá — không hồi quy.
- `assets/previews/cards-pixel/magic-card-front.png`, `magic-card-back.png`: render model 3D thật (K01 trước/lưng) cho thấy rõ lớp đổ bóng/dither mới trên khung và quầng sáng.

### Kiểm chứng
| Lệnh | Kết quả |
|---|---|
| `node scripts/cards/gen.mjs` | Blender dựng lại 24 mặt + lưng + 6 overlay + GLB + 10 sheet; log in trực tiếp, không lỗi |
| `node scripts/cards/verify-pixel.mjs` | Đạt: `cards:24`, `artFiles:31`, 256×352 đúng block 4×4, plain byte-identical, fallback RGBA khớp tuyệt đối (`maxChannelDifference:0`), GLB 3 vật liệu/2 texture/sampler NEAREST đúng |
| `node scripts/blender/verify-gltf.mjs` | `props/magic_card.glb`: 0 errors, 0 warnings, 3 infos (như cũ) |
| `node scripts/blender/verify-babylon.mjs` | Import 20 GLB qua Babylon null engine thành công |
| `npm run check:assets` | Đạt: 19 manifest entries, 20 GLB |
| `npm run typecheck` | Đạt, 0 lỗi |
| `npm run build -w @saloon/web` | Đạt; cảnh báo bundle Babylon lớn còn tồn tại (không liên quan tới thay đổi này) |

Giới hạn trung thực của lượt này: chỉ chạy `build -w @saloon/web` (không chạy `-w @saloon/server`, e2e hay vitest) theo đúng phạm vi được giao (chỉ `assets/*`, `scripts/blender/*`, `scripts/cards/*`, `public/cards/*`, `public/models/props/magic_card.glb`, `assets/manifests/*`, `assets/previews/*`, `reports/screenshots/cards-pixel-*`); không chạm `apps/web/src`, `apps/server`, `packages/*`. Chưa đo cảm nhận trên GPU thật ở kích thước khay runtime, chỉ xem qua contact sheet Blender render ở 120/56 px.

## Cập nhật cuối — overlay dễ phân biệt + hướng đồng cổ

Yêu cầu mới nhất “thiết kế lại các lá bài đi, hiện tại nó trông đơn giản và đồ chơi quá” là hướng hiện hành. Cả 22 mặt + lưng dùng `arcane_finish.finish`: pigment trầm, nền tối có quầng sáng rời rạc, khung đồng nhiều lớp khắc đối xứng và chi tiết vật liệu riêng. Giữ nguyên hai module `scripts/blender/arcane_finish.py`, `scripts/blender/preview_arcane.py`; export PNG, texture model và recipes đều lấy finished grids. Overlay không qua finish.

- `trapRank`: khung đỏ cam có gai, ba thanh tăng dần bị hàm bẫy răng kẹp. `trapSuit`: khung tím có lưới, bốn pips bích giống nhau bị xích chéo chặn. Bỏ hoàn toàn cặp khóa/xích xanh gần giống nhau.
- `lucky`: bitmap viết tay, bốn lá hình tim đối xứng theo chữ thập gặp nhau tại tâm, hai sắc xanh + highlight sáng, cuống ngắn cong; tăng kích thước và căn giữa vùng huy hiệu góc. N03 dùng cùng bitmap mới.
- Vàng đổi ngôi sao thành ba đồng xu để khác Muôn chất (hình thoi chứa bốn chất trên viền cầu vồng). Nguyền dùng khung đỏ rượu và sọ có răng để khác hai bẫy. Cả sáu icon khác nhau bằng hình lẫn màu.
- Đã nhìn trực tiếp 22 mặt + lưng, sáu overlay và K01/K10/K07 ở bản xuất, 120 px và 56 px. K01 vẫn là mắt xanh trên lá chữ nhật; K10 là quả cầu mắt tím/chóp đồng; K07 là quả cầu chứa lá bài. Không thay texture bằng chữ để giải thích icon.

File cuối: `public/cards/{N01–N09,K01–K10,X01–X03,back}.png`; bản tương thích `public/cards/plain/`; `public/cards/overlays/{gold,wild,lucky,trapRank,trapSuit,cursed}.png`; `public/cards/badges/` tương ứng; `public/cards/manifest.json`. Nguồn/model: `assets/blender/cards/magic_cards_pixel.blend`, `magic_cards_preview.blend`, `public/models/props/magic_card.glb`. Recipes: `scripts/cards/pixel-recipes.json`. Hướng hình ảnh: `assets/MAGIC_CARD_STYLE.md`.

Sheet cuối trong **cả** `assets/previews/cards-pixel/` và `reports/screenshots/`: `cards-pixel-sheet-1.png`, `cards-pixel-sheet-2.png`, `cards-pixel-sheet-twins.png`, `cards-pixel-sheet-overlays.png`, `cards-pixel-sheet-120.png`, `cards-pixel-sheet-56.png`, `cards-pixel-sheet-overlays-120.png`, `cards-pixel-sheet-overlays-56.png`. Preview primary `reports/screenshots/cards-arcane-preview.png` và `assets/previews/cards-pixel/arcane-*.png` cũng đã dựng lại bằng module nguyên trạng để cập nhật cỏ bốn lá. Render model: `assets/previews/cards-pixel/magic-card-front.png`, `magic-card-back.png`.

Kiểm tra mới sau tích hợp: Blender regenerate đạt (`assets/previews/cards-pixel-build.log`); `verify-pixel.mjs` đạt 29 ảnh, block 4×4, plain byte-identical, **RGBA fallback khớp tuyệt đối, maxChannelDifference 0** (`assets/previews/arcane-validator.log`); packed sources và GLB roundtrip đạt (`assets/previews/arcane-roundtrip.log`); `npm run typecheck` đạt (`assets/previews/arcane-typecheck.log`); `node scripts/check-assets.mjs` đạt 19 entries/20 GLB. Theo giới hạn handoff, không chạy lại full build hoặc e2e; phần đó thuộc primary/UI owner. Các kết quả build/e2e bên dưới là lịch sử vòng trước, không phải receipt của lần art cuối này.

## Lịch sử vòng pixel đầu tiên

- Thay toàn bộ 22 mặt N01–N09, K01–K10, X01–X03, mặt sau và sáu overlay bằng pixel art nguyên bản, không chữ/giá/mô tả/ID/biểu tượng kind/visibility. Grid 64×88, xuất 256×352 bằng lặp pixel ×4. Vòng đầu dùng khung giấy ngà và mảng phẳng; đã thay bằng hướng đồng cổ ở cập nhật cuối trên.
- K01: mắt xanh trên lá bài chữ nhật; K10: quả cầu mắt tím có chóp vàng. K07 là quả cầu chứa lá, khác hai lá soi. Đã xem trực tiếp contact sheet của toàn bộ 22 lá, mặt sau, overlay, bảng so sánh K01/K10/K07 và render model.
- Author bằng **Blender Python**: grid rect/ellipse/poly ghi trực tiếp vào `bpy.data.images`, lưu PNG, `.blend` có texture packed, GLB và preview/contact sheet render bằng camera orthographic Blender. Generator Node mặc định gọi pipeline Blender; `--fallback` có rasterizer grid độc lập dùng primitive recipes. Đã kiểm tra ảnh dự phòng và ảnh Blender giống nhau hoàn toàn ở RGBA đã giải mã.
- Model thẻ bo góc có độ dày thật 0,0008 m, kích thước 0,064×0,088 m, bán kính bo 0,003 m; 64 tam giác, ba vật liệu trước/sau/cạnh, hai PNG nhúng. Root vẫn `prop_magic_card`, không đổi/thêm anchor; `prop_cards` giữ nguyên. UV mặt trước/sau đúng hướng, Blender Closest; sampler GLB `magFilter=9728`, `minFilter=9984` (nearest và nearest mip). Manifest model và manifest tổng đã cập nhật.
- Nguồn chính có 29 ảnh packed; nguồn preview có 35 ảnh packed. Collection `SOURCE`, `EXPORT`, `PREVIEW`; không cần file ảnh ngoài workspace.
- `public/cards/plain/` giữ để tương thích, từng ảnh là bản sao byte-identical của ảnh art chính. Các PNG cũ đã bị ghi đè; xóa generator vector không dùng `scripts/cards/art.mjs`. Cập nhật `assets/MAGIC_CARD_STYLE.md` và `public/cards/manifest.json`.
- Scene dùng NEAREST/no mipmap cho texture phép; face poker DynamicTexture dùng NEAREST và tắt smoothing khi ghép overlay. Không vẽ tên/giá lên bài phép hoặc popup; bỏ cả texture chữ hint, giữ edge pulse. **Chỉ số rank/suit trên bài poker vẫn giữ để đọc bài**; tên/công dụng/giá nằm trong DOM.
- Popup phân vị trí theo ghế và dùng các ô riêng; khi hơn năm popup đồng thời thì thu nhỏ thành hai hàng phía trên, tránh che bài chung. Đã xem sáu popup đồng thời và popup ghế 0/3 từ góc xem ghế 0 và 3, ở 16:10 và 16:9.
- Khi góc ghế xem thay đổi, scene dựng lại hướng bài chung/bài lộ thay vì giữ hướng cũ. Bài tay và bài chung được chụp/xem từ cả bốn ghế ở 1280×800.
- Xáo bài: tăng scale lên 1,65, tách hai chồng xa hơn, nâng cao/tilt/riffle rõ hơn; giữ thời lượng 1,9 s và chia sau xáo. Không thêm luật hay tín hiệu của cơ chế cũ.

## Kiểm chứng thực tế

| Lệnh | Kết quả |
|---|---|
| `node scripts/cards/gen.mjs` | Blender dựng PNG/model/source/render thành công; log `assets/previews/pixel-generation.log` |
| `node scripts/cards/verify-pixel.mjs` | Đủ 22 ID; 29 ảnh chính đúng 256×352 và từng block 4×4; plain giống byte; RGBA fallback giống hoàn toàn; root/material/sampler đúng |
| `python3 scripts/blender/run.py --verify-cards` | Mở được cả hai nguồn, toàn bộ ảnh packed; import GLB lại vào Blender; bounds/64 tam giác/ba vật liệu/UV/normal mặt trước-sau đúng |
| `node scripts/blender/verify-gltf.mjs` | `props/magic_card.glb`: **0 errors, 0 warnings**, 3 infos: UV cạnh không dùng + hai texture NPOT 256×352 đúng kích thước yêu cầu. Các warning 31/model nhân vật cũ không thuộc thay đổi này |
| `node scripts/blender/verify-babylon.mjs` | Babylon import 20 GLB thành công, gồm model phép mới |
| `npm run check:assets` | Đạt: 19 manifest entries, 20 GLB |
| `npm run typecheck` | Đạt, 0 lỗi sau sửa cuối; log `assets/previews/pixel-typecheck.log` |
| `npm test` | Đạt **68/68 tests**, 9 files, gồm server integration/reconnect; chạy ở phiên này trước các chỉnh bố cục popup cuối |
| `npm run build` | Đạt web + server sau sửa cuối; cảnh báo bundle Babylon lớn còn tồn tại; log `assets/previews/pixel-build.log` |
| `E2E_PORT=5317 node scripts/cards/qa-scene.mjs` | Đạt; 0 page errors; K03 id đổi thật, sáu lane popup riêng, sampling NEAREST, không còn mesh texture nhãn. Capture stepping 25 ms để không phụ thuộc máy ngủ |
| `E2E_PORT=5341 E2E_PREVIEW=1 npm run test:e2e:fast` | Đạt **1/1** demo e2e, 2,7 phút; log `assets/previews/pixel-e2e.log` |

Receipt cấu trúc: `assets/manifests/pixel-art-verification.json`, `pixel-blender-roundtrip.json`, `gltf-validation.json`, `babylon-verification.json`, `prop_magic_card.asset.json`. Receipt scene: `assets/previews/pixel-scene-checks.json`.

## Các file để xem trực tiếp

### Bộ art và model

- `reports/screenshots/cards-pixel-sheet-1.png` — thứ tự: N01–N09, K01–K03.
- `reports/screenshots/cards-pixel-sheet-2.png` — thứ tự: K04–K10, X01–X03, mặt sau.
- `reports/screenshots/cards-pixel-sheet-twins.png` — K01, K10, K07 cạnh nhau.
- `reports/screenshots/cards-pixel-sheet-overlays.png` — Vàng, Muôn chất, Hạnh vận, Bẫy số, Bẫy chất, Nguyền.
- `assets/previews/cards-pixel/magic-card-front.png`
- `assets/previews/cards-pixel/magic-card-back.png`
- `public/models/props/magic_card.glb`
- `assets/blender/cards/magic_cards_pixel.blend`
- `assets/blender/cards/magic_cards_preview.blend`
- `assets/blender/cards/README.md`

Từng mặt: `public/cards/N01.png`, `N02.png`, `N03.png`, `N04.png`, `N05.png`, `N06.png`, `N07.png`, `N08.png`, `N09.png`; `public/cards/K01.png`, `K02.png`, `K03.png`, `K04.png`, `K05.png`, `K06.png`, `K07.png`, `K08.png`, `K09.png`, `K10.png`; `public/cards/X01.png`, `X02.png`, `X03.png`; `public/cards/back.png`.

Overlay: `public/cards/overlays/gold.png`, `wild.png`, `lucky.png`, `trapRank.png`, `trapSuit.png`, `cursed.png`. Thư mục `badges/` có bản art không chữ tương ứng để tương thích UI.

### Ảnh animation đã chụp và tự xem

Tất cả nằm trong `reports/screenshots/pixel-scene/`:

- `16x10-board-seat0.png`, `16x10-board-seat1.png`, `16x10-board-seat2.png`, `16x10-board-seat3.png`.
- `16x10-hand-seat0.png`, `16x10-hand-seat1.png`, `16x10-hand-seat2.png`, `16x10-hand-seat3.png`.
- `K03-turning-down.png`, `K03-back.png`, `K03-turning-up.png`, `K03-replaced.png` — úp, thay Q♣ thành 2♠ Vàng, lật lại.
- `force-reveal-flight.png`, `force-reveal-flip.png`, `force-reveal-done.png` — Ép lộ 3♠.
- `K10-peek-back.png`, `K10-peek-edge.png`, `K10-peek-face.png` — lưng chung, cạnh lật, mặt K10.
- `pulse-slot-flip.png`, `pulse-slot-return.png`, `pulse-slot-done.png` — N01 xoay/bật và về ô.
- `popup-seats0-3.png`, `multiple-popups-16x10.png`, `16x9-popup-seats0-3.png`, `viewer-seat3-popups0-3.png`.
- `shuffle-lift.png`, `shuffle-split.png`, `shuffle-interleave.png`, `shuffle-square.png`, `shuffle-done.png`.
- `16x10-final.png`.

### Ảnh từ demo e2e thực (đã xem chợ và bài poker trong HUD)

- `reports/screenshots/pixel-e2e/e2e-market.png`
- `reports/screenshots/pixel-e2e/e2e-market-bought.png`
- `reports/screenshots/pixel-e2e/e2e-hand.png`
- `reports/screenshots/pixel-e2e/e2e-look-down.png`
- `reports/screenshots/pixel-e2e/e2e-showdown.png`

## Giới hạn trung thực

Ảnh scene dùng snapshot dựng cho QA và Chromium SwiftShader; animation được bước thời gian chủ động rồi render. Đã xác minh pose/mặt bài/đổi texture/bố cục và trạng thái kết thúc; **chưa đo FPS hoặc đánh giá độ mượt trên GPU thật**, chưa nghe âm thanh. Các sự kiện K03/Ép lộ/soi/pulse được gọi qua API/snapshot trong harness; chưa kiểm chứng trọn luồng sự kiện phép giữa nhiều client thật. Demo e2e kiểm tra luồng UI/offline, không thay cho kiểm tra multiplayer phép. Ảnh e2e look-down/showdown chụp sớm khi animation còn chạy chậm dưới SwiftShader, nên không được dùng để kết luận pose cuối của bài 3D; các ảnh scene đã bước hết animation ở trên mới kiểm tra pose đó. Bố cục popup đồng thời đã kiểm tra trong scene-only, chưa kiểm tra mọi lớp DOM chồng lên các popup này.

Model GLB được xác minh import Babylon riêng; scene hiện vẫn dùng geometry plane nhẹ và texture của bộ art cho khay/popup, chưa thay toàn bộ instance runtime bằng mesh GLB. Không sửa API của UI: tham số `name`/hint text vẫn được nhận để tương thích, nhưng không được vẽ vào texture.

Đã tắt đúng PID 10275 của Vite QA do phiên này mở; Playwright tự dọn preview server. Cổng 5317/5341 không còn listener sau kiểm tra. Không dùng pkill rộng, không tác động tiến trình worker khác.
