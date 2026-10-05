> Xác minh điều phối sau bàn giao: toàn workspace 70/70 tests và 3/3 e2e trên bundle cuối đã qua; xem `CODEX_QA_RESULT.md` ở root. Các lỗi sandbox trong báo cáo bên dưới là lịch sử của phiên worker.

# Kết quả UI Bài Phép — Codex, 04/10/2026

**Trạng thái: code UI đã cập nhật; QA hình ảnh và e2e trình duyệt chưa xác minh được vì sandbox. Không coi nhiệm vụ QA đã hoàn tất.**

## Phạm vi và thay đổi

Chỉ sửa source trong `apps/web` (không sửa `src/scene.ts`, `src/fx.ts`, `src/magicSound.ts`) và `tests/e2e/demo.spec.ts`. Không sửa luật/server/catalog/assets. Build web sinh lại `apps/web/dist`.

- Tranh bài lấy nguyên ảnh `/cards/<id>.png`; bỏ CSS cắt/phóng texture cũ có chữ, dùng `object-fit: contain` và `image-rendering: pixelated`.
- Chợ: tên, badge đầy đủ **Kích hoạt / Nội tại xuyên suốt / Nội tại chờ sự kiện**, glyph + nhãn hiển thị, công dụng, thời điểm/tiêu hao, “Khi dùng: …” đều là DOM quanh ảnh. Giá mua là `MarketOffer.price` từ engine; vẫn hiện giá sau khi mua/offer nội tại đang giữ.
- Khay: ảnh riêng với tên, kind badge, visibility và trạng thái bên dưới; tooltip khi hover/focus hiển thị đầy đủ metadata, giá gốc và “Khi dùng: …”. Panel dùng lá chia sẻ cùng metadata; chọn đối thủ/bài tay/bài chung/buff; lá tráo vẫn có lá dự trữ riêng.
- Tên/ID/loại/hiển thị/trigger/consumed/timing/swap/giá gốc lấy từ `@saloon/content`; số ô lấy `DEFAULTS.magicSlots`. Bỏ bảng ID K01/K02/K03/K04/K05/K08/K10 gắn cứng trong UI. Contract chưa có schema tham số dùng lá, nên controls suy ra từ các cue hành động hiện có trong catalog (`peek/reveal/curse/enhance/cleanse/board`) cùng các flag. Nếu catalog đổi ý nghĩa cue hoặc thêm hành động mới, cần đồng bộ schema này.
- Nội tại có `consumed: 2` ghi mất sau **2 lần**, không còn ghi chạy một lần là mất. K07 dùng được ngoài lượt theo `usable`; lời nhắc ngoài lượt không còn phủ nhận phép `anyTime`.
- Banner public: art + người dùng/tên lá + kind/giá gốc/công dụng/thời điểm bằng DOM; **không render glyph/nhãn visibility riêng của chủ**. Tin `magicUsed` được tin theo engine kể cả ID giả của Mồi nhử. Hint `sensed` có câu mơ hồ riêng, không nêu người dùng/ID lá.
- K10 modal: metadata catalog quanh art, không render visibility riêng của đối thủ, xử lý `magicId: null` thành “Họ không giữ lá phép nào”; không lộ lá dự trữ.
- Đồng bộ bổ sung engine mới `PeekEntry.source/boardIds`: nhận diện K07 từ source + timing catalog; thông tin ghi rõ “tại lúc soi”, khi board đổi báo dự đoán có thể đã đổi. Khóa nhận diện modal gồm cả `magic` và modifier; xóa modal cũ khi peeks reset.
- Dọn timer toast khi component unmount; lọc event gửi cho người khác trước khi gọi scene; nút mute cũng gọi `scene.setSoundEnabled`.
- Help mô tả đủ ba loại phép. Không thêm lại cơ chế đã bỏ.

## QA script

`apps/web/qa-popups.mjs` được sửa để **chạy từ repo root**, tìm Chromium đã cài hoặc nhận `CHROMIUM_PATH`, ghi đường dẫn tuyệt đối theo vị trí script.

Khi chạy được, script đóng băng timer demo và dùng snapshot/event **tổng hợp** trên phòng offline thực bốn người, chuyển camera/self qua bốn ghế. Mỗi ghế ở **1440×900 và 1280×720** chụp: chợ, public-use, hint, K01, K10, K10 trống, K07, tooltip, use panel, tray pulse. Kiểm tra đủ 3 đối thủ/5 ô, popup nằm trong viewport, không chồng lên bottom controls và banner không có visibility pill. Dự kiến 80 ảnh `reports/screenshots/pop-<width>-seat<seat>-<state>.png` và `pop-qa-receipt.json`.

**Chưa tạo ảnh/receipt mới, chưa xem ảnh bốn ghế, chưa xác nhận không chồng lấn.** Các ảnh cũ trong reports không phải bằng chứng cho lần sửa này. CSS hiện cho chợ/panel cuộn khi chiều cao hạn chế và tách metadata khỏi art; đây chưa phải kết quả kiểm tra thị giác.

## Kiểm chứng đã chạy thật (Node 22.23.2)

Đặt PATH trong mọi lệnh Node/npm:

```sh
export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH
```

- `npm run typecheck`: **PASS**, exit 0, không lỗi TypeScript (chạy lại sau cập nhật source/boardIds).
- `npm run build -w @saloon/web`: **PASS**; có cảnh báo chunk Babylon >1800 kB, không phải lỗi build.
- `node node_modules/vitest/vitest.mjs run apps/web/src/ui/magic-ui.test.tsx packages/content packages/rules packages/bots apps/server/test/unit.test.ts`: **63/63 PASS, 8 files**. Bao gồm 6 kiểm tra UI mới: metadata của cả 22 lá; không gắn text vào art; visibility chỉ ở owner view; giá offer sau mua; K07 ngoài lượt; multi-use passives; provenance/dự đoán lỗi thời; tham số và lọc toast riêng/decoy. Kiểm tra render DOM dùng React SSR, không chứng minh bố cục CSS hay animation trình duyệt.
- `node --check apps/web/qa-popups.mjs`: **PASS**.
- `node node_modules/@playwright/test/cli.js test tests/e2e/demo.spec.ts tests/e2e/bots.spec.ts tests/e2e/multiplayer.spec.ts --list`: **PASS**, phát hiện đủ 3 specs. Đây chỉ là kiểm tra nạp specs, không phải e2e pass.

## Những lệnh bị chặn / không pass

- `npm test`: **FAIL do môi trường**. 54 tests pass; 5 server integration tests không chạy được. Hook startServer báo `listen EPERM 127.0.0.1:45299`, hết 60 s; cleanup của suite tiếp tục báo `app` undefined. Không sửa suite server vì ngoài scope.
- Vite dev port **5394**: `listen EPERM` khi bind `0.0.0.0`; thử lại `--host 127.0.0.1` vẫn `EPERM`.
- Server source thật: `PORT=3094 HOST=127.0.0.1 CORS_ORIGIN=http://localhost:5395 DATA_DIR=/private/tmp/lairgame-ui-3094 node --import tsx apps/server/src/index.ts`: `listen EPERM 127.0.0.1:3094`. Dừng riêng session đã khởi động bằng Ctrl-C; không pkill/kill diện rộng.
- `node apps/web/qa-popups.mjs 5394` từ **repo root**, chạy hai lần: Chromium chết ngay lúc launch vì `bootstrap_check_in ... MachPortRendezvous ... Permission denied (1100)`, SIGTRAP. Không phải kết quả overlap/ảnh.
- `E2E_SERVER=ws://localhost:3094 E2E_PREVIEW=1 E2E_PORT=5395 CORS_ORIGIN=http://localhost:5395 node node_modules/@playwright/test/cli.js test tests/e2e/demo.spec.ts tests/e2e/bots.spec.ts tests/e2e/multiplayer.spec.ts`: **FAIL trước khi chạy tests** vì preview `listen EPERM 0.0.0.0:5395`. Không spec nào được xác nhận pass trong phiên này.

Các lỗi quyền bind/Chromium đã thử lại; không gán cho máy ngủ. Phiên này không có quyền nâng sandbox, nên chưa thể chạy tiếp QA hình ảnh/e2e. Chưa nghe audio, chưa đo FPS/GPU, chưa kiểm chứng tray pulse hoặc cảnh 3D trên trình duyệt.

## Lệnh tiếp tục khi môi trường cho phép localhost và Chromium

Chạy từng process trên terminal riêng; chỉ dừng process do mình tạo.

```sh
export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH
npm run dev -w @saloon/web -- --port 5394 --strictPort
```

Từ root ở terminal khác:

```sh
export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH
node apps/web/qa-popups.mjs 5394 all
```

Sau khi xem ảnh và sửa lỗi bố cục nếu có, build web mới rồi chạy server source trên port riêng:

```sh
export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH
PORT=3094 HOST=127.0.0.1 CORS_ORIGIN=http://localhost:5395 DATA_DIR=/private/tmp/lairgame-ui-3094 node --import tsx apps/server/src/index.ts
```

E2E tự khởi động preview riêng, không attach web khác:

```sh
export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH
npm run build -w @saloon/web
E2E_SERVER=ws://localhost:3094 E2E_PREVIEW=1 E2E_PORT=5395 node node_modules/@playwright/test/cli.js test tests/e2e/demo.spec.ts tests/e2e/bots.spec.ts tests/e2e/multiplayer.spec.ts
```
