# QUY TẮC TẠO MODEL BLENDER — WESTERN POKER SALOON

**Phiên bản:** 0.1 — ngày 04/10/2026.  
**Áp dụng cho:** model, rig, animation, vật liệu và export tài nguyên của game.  
**Tài liệu gốc:** [GAME_RULES.md v0.3](./GAME_RULES.md), [CONTENT_CATALOG.md](./CONTENT_CATALOG.md), [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).

Đây là quy chuẩn đề xuất cho sản xuất, chưa phải tài nguyên đã được tạo. Bối cảnh miền Viễn Tây, quán bar và hướng đồ họa Liar’s Bar là yêu cầu của người dùng. Danh sách nhân vật, kích thước và ngân sách dưới đây là phương án để triển khai và kiểm tra.

## 1. Hướng mỹ thuật

**Cảm giác mục tiêu:** một saloon miền Viễn Tây cũ, ấm, hơi bất an; những tay chơi hoạt hình có gương mặt dễ đọc đang ngồi sát nhau quanh bàn bài. Gỗ mòn, da sẫm, đồng xỉn, vải dày và ánh đèn vàng là vật liệu/chất liệu chủ đạo.

Tham chiếu cảm giác bàn chơi, nhân vật và không khí quán bar từ [Liar’s Bar — trang chính thức trên Steam](https://store.steampowered.com/app/3097560/Liars_Bar/). Thiết kế nhân vật, logo, hoa văn bài và saloon riêng cho dự án.

### Đặc điểm hình khối

- Nhân vật hoạt hình có tỉ lệ cơ thể đủ hợp lý để ngồi, cầm bài, với tay và đổi ngón.
- Đầu, bàn tay, lông mày và mõm được nhấn để đọc biểu cảm. Kích thước tay phục vụ thao tác, không phóng đại đến mức che hết bài.
- Silhouette rõ từ góc ngồi; góc cạnh được bevel có chủ đích, bề mặt không bóng như nhựa.
- Chi tiết lớn và trung bình trước; đường may, vân gỗ, vết mòn ưu tiên texture/normal thay vì hàng nghìn mesh nhỏ.
- Chất liệu da/lông theo mảng màu và khối. Dùng mesh hoặc texture gọn cho lông/tóc; tóc sợi mô phỏng không nằm trong baseline web.
- Phong cách hoạt hình không đồng nghĩa giảm toàn bộ đầu/tay thành khối thô. Khu vực mắt, môi, khớp tay cần đủ hình học để animation không gãy.

### Bảng màu dự kiến

| Vai trò | Màu định hướng |
| --- | --- |
| Gỗ tối | `#35251F` |
| Gỗ ấm | `#70462F` |
| Da nâu | `#50382B` |
| Vải đỏ rượu | `#753A3A` |
| Nỉ bàn xanh trầm | `#31594E` |
| Đồng xỉn | `#A88149` |
| Bài giấy ngà | `#E9D9B8` |
| Đèn ấm | `#EDB96B` |
| Ánh hắt lạnh | `#75888B` |

Đây là palette khởi điểm. Ưu tiên độ tương phản của tay với bàn, bài với tay và ngón giả với vùng cần đọc; kiểm tra dưới ánh sáng game thay vì chỉ nhìn màu trong Blender.

## 2. Yêu cầu hình ảnh xuất phát từ gameplay

1. Người chơi nhìn được bàn tay đối thủ, đường đưa tay vào tay áo, thao tác chạm lưng bài và tín hiệu của dealer.
2. Động tác thật và nghi binh có cùng kiểu dấu hiệu công khai. Không làm ngón giả, buff hoặc trick thật phát sáng như biển báo gian lận.
3. Bài riêng có thể được chủ sở hữu xem nhưng phải che hợp lý với các ghế khác; camera và mạng cùng đảm nhiệm bí mật này.
4. Mọi nhân vật chơi được có **hai bàn tay, mỗi bàn tay 5 ngón phân biệt**. Nếu dùng thú nhân, giữ cấu trúc tay phục vụ luật; không đổi một loài thành 3 ngón hoặc móng không thao tác được.
5. Từng vị trí ngón phải hỗ trợ thật / trống / giả mà vẫn giữ rig và clip hoạt động.
6. Mất ngón được đọc bằng hình dáng và trạng thái bàn tay. Không tạo tài nguyên thanh máu, hiệu ứng chảy máu liên tục hoặc đồ cầm máu vì luật đã bỏ hệ thống này.
7. Ánh sáng, khói, độ sâu trường ảnh và đồ trang trí phải giữ khả năng đọc các dấu hiệu trên bàn.

## 3. Danh sách tài nguyên và thứ tự làm

### A0 — Khối thử trước khi làm chi tiết

- Một bàn poker, 4 ghế người chơi, vị trí riêng cho dealer, sàn và tường dạng khối.
- Một cơ thể ngồi mẫu và một đôi tay đủ 10 ngón.
- Một lá bài hai mặt, một chip, một ngón giả mẫu.
- Camera từng ghế và marker bàn để kiểm tra khoảng với tay.

**Hoàn tất A0 khi:** mọi ghế nhìn được ít nhất những vùng tay cần quan sát; dealer không che cố định một người; mặt bài riêng không vô tình hướng ra đối thủ khi idle.

### A1 — Nhân vật đầu tiên và thao tác cốt lõi

- Một nhân vật hoàn chỉnh dùng rig chuẩn.
- Module 10 ngón thật, 10 vị trí trống có mặt đóng và ngón giả tương ứng.
- Bài, bài dự trữ, tay áo, chip và dụng cụ đánh dấu.
- Clip ngồi, nhìn bài, cược, tráo bài, đánh dấu, nghi binh, thất bại và tố cáo.

### A2 — Dealer và đạo cụ gameplay

- Dealer riêng, bộ chia bài, cắt bài, nhận/gửi tín hiệu, gây xao nhãng.
- Gương nhỏ, ví/túi bài, hộp ngón giả, vật phẩm ma thuật, đồ giao hàng.
- Bàn/ghế có material và các điểm gắn gameplay đúng kích thước.

### A3 — Bộ nhân vật và saloon hoàn chỉnh

- Thêm 3 nhân vật chơi được dùng chung hợp đồng rig và socket.
- Quầy bar, kệ chai, đèn, cửa lật, cột gỗ, cửa sổ, bảng hiệu và vài cụm trang trí.
- LOD, texture tối ưu, ánh sáng game, biểu cảm/idle biến thể.
- Props mở rộng theo catalog: khăn tẩy I05, giấy sao I06, bật lửa I07, đồng xu I08, vật liệu/module ngón đồng I10; một mesh lá ma thuật với mặt/icon B01–B10.

**Đề xuất nhân vật, chưa chốt D5:** chó đồng cỏ mang phong thái cao bồi; linh miêu ăn mặc lịch sự; lửng làm thương nhân; thỏ tai cụp làm tay chơi. Dealer mặc sơ mi/ghi-lê có tay áo rõ, silhouette khác người chơi. Tên, giới tính, loài dealer và thiết kế chi tiết quyết định ở brief nhân vật.

## 4. Tỉ lệ, không gian và camera

### 4.1. Đơn vị và hướng

- Blender dùng Metric, **1 unit = 1 mét**, unit scale 1.
- Quy ước nguồn: +Z hướng lên; nhân vật nhìn về -Y; +X là phía phải khi đặt nhân vật trong pose chuẩn.
- glTF xuất với +Y hướng lên qua exporter chuẩn. Dùng một asset hiệu chuẩn có mũi tên trước/phải/trên để kiểm tra mapping trong engine; không sửa dấu xoay tùy hứng riêng từng model.
- Với Babylon.js đề xuất cấu hình scene theo hệ tay phải và xác nhận GLB thử ở M0; ghi lại kết quả chuyển trục trong manifest.
- Root nhân vật ở giữa hai bàn chân trên sàn trong pose nguồn. Tọa độ ghế và pelvis do điểm neo trong game quyết định.
- Apply scale/rotation của mesh và armature **trước khi bind/animate**. Với rig đã có animation, phải kiểm tra bind pose/clip khi đổi transform; không chạy apply transforms hàng loạt một cách máy móc.

### 4.2. Kích thước khởi điểm để blockout

| Thành phần | Kích thước đề xuất |
| --- | --- |
| Nhân vật đứng | Khoảng 1,65–1,90 m, chưa tính tai/mũ |
| Mặt ghế | Cao khoảng 0,45–0,48 m |
| Mặt bàn | Cao khoảng 0,76–0,80 m |
| Bàn poker | Khoảng 2,4 × 1,65 m, bo tròn các góc/cạnh |
| Lá bài | Khoảng 0,063 × 0,088 m; độ dày nhỏ nhưng không bằng 0 |
| Chip | Đường kính khoảng 0,04 m |
| Saloon cần thấy trong bản đầu | Khoảng 10 × 8 m; chiều cao phù hợp đèn và góc camera |

Đo lại ở A0. Nếu cần phóng đại bài/chip cho dễ đọc, dùng một tỉ lệ thống nhất cả bộ, ghi vào manifest và kiểm tra pose tay.

### 4.3. Bố trí cảnh

- Bàn chơi là trung tâm; quầy bar làm nền theo một hướng, cửa sổ tạo ánh hắt theo hướng khác.
- Dealer có chỗ riêng, đủ tầm với vào bộ bài và bài chung; không chiếm ghế người chơi.
- Chai/cốc cao, đèn treo thấp hoặc tay vịn không che đường nhìn quan trọng.
- Gương của trick là đạo cụ gameplay có điều kiện sử dụng; gương trang trí trong quán không tự dựng thêm camera làm lộ bài.
- Camera bàn ở độ cao mắt khi ngồi, có giới hạn yaw/pitch, không bay tự do để nhìn bài từ sau lưng.
- Đánh giá camera ít nhất ở 16:9 và 16:10; xác định vùng UI để thanh timing không che tay đối thủ.

## 5. Mesh và topology

- Mesh deform có edge loop phù hợp ở vai, khuỷu, cổ tay và từng khớp ngón.
- Kiểm tra normal, mặt trùng, diện tích tam giác quá nhỏ và self-intersection trước export.
- Dùng bevel vừa đủ để cạnh gỗ, chip và đồ kim loại bắt sáng. Giới hạn subdivision khi xuất game.
- Tách phần cần thay đổi trạng thái: ngón, bài, đạo cụ cầm tay, kính/gương và phụ kiện được đổi.
- Các cụm tĩnh xa bàn có thể gộp theo material để giảm draw calls; giữ tách các vật cần cử động/quan sát.
- Mô hình dùng modifier/Geometry Nodes được chuyển thành mesh ở bản export nếu cần; giữ bản nguồn chỉnh sửa được trong .blend.
- Triangulate bản export nhất quán để hình học và normal không đổi giữa Blender/engine.

## 6. Rig chuẩn và bàn tay module

### 6.1. Quy ước bones

Tên ổn định, ASCII, không khoảng trắng, phân biệt trái/phải theo cơ thể nhân vật:

```text
root
pelvis
spine_01 / spine_02 / chest / neck / head
clavicle_l / upperarm_l / forearm_l / hand_l
clavicle_r / upperarm_r / forearm_r / hand_r
finger_thumb_01_l / finger_thumb_02_l / finger_thumb_03_l
finger_index_01_l / finger_index_02_l / finger_index_03_l
finger_middle_01_l / finger_middle_02_l / finger_middle_03_l
finger_ring_01_l / finger_ring_02_l / finger_ring_03_l
finger_pinky_01_l / finger_pinky_02_l / finger_pinky_03_l
... cùng mẫu cho bên r
thigh_l / shin_l / foot_l
thigh_r / shin_r / foot_r
```

Rig control/IK có thể phức tạp trong Blender; bản game xuất các deform bones và bake kết quả cần thiết. Mục tiêu tối đa khoảng 80 deform bones/nhân vật, tối đa 4 ảnh hưởng xương/vertex, weight đã normalize. Đây là ngân sách dự án, không phải giới hạn bắt buộc của định dạng.

### 6.2. Cách làm ngón tháo/lắp

Mỗi vị trí có ba nhóm hiển thị, cùng skeleton:

```text
finger_index_l_real
finger_index_l_prosthetic
finger_index_l_cap
```

- Lặp mẫu cho đủ 10 ngón.
- Ngón thật và giả skin vào cùng chuỗi bones ở đúng vị trí, bind pose tương thích.
- Vùng tiếp giáp có loop/mặt đóng và cuff/cap để không thấy lỗ xuyên bàn tay khi tắt mesh ngón.
- Mỗi vị trí chỉ bật biến thể hợp lệ theo state. Phần cap không chồng mặt gây nhấp nháy với ngón thật/giả.
- Không xóa bones hoặc scale bone về 0 để biểu diễn ngón mất. Điều đó có thể làm hỏng skin/clip/socket của ngón giả.
- Ngón giả dùng gỗ/đồng/cơ cấu khớp đơn giản, đọc được trong cận cảnh; không cần mô phỏng vật lý thật để tạo tiếng.
- Sự kiện lỗi từ game kích hoạt âm thanh; animation có mốc tham chiếu, không tự phát ngẫu nhiên mỗi khi ngón chuyển động.
- Thế chấp là trạng thái gameplay; model chỉ đổi khi kết quả yêu cầu ngón mất. Không tắt ngón ngay lúc đặt cược.

### 6.3. Bàn tay góc nhìn thứ nhất

- Ưu tiên dùng cùng rig/pose và cùng logic module với tay thế giới.
- Nếu cần asset tay riêng để tăng chi tiết, phải ánh xạ đủ 10 vị trí và clip; không để nhìn thấy hai bộ tay hoặc hai lá bài cùng lúc.
- Che mặt bài đối thủ là quyết định dữ liệu và trình bày; không gắn texture lá thật lên model public rồi hy vọng mặt sau che hết.

### 6.4. Sockets

Các node được xuất và liệt kê trong manifest:

```text
socket_card_l
socket_card_r
socket_chips_r
socket_tool_l
socket_tool_r
socket_sleeve_l
socket_sleeve_r
socket_eye
socket_seat
```

Socket gắn với bone hoặc node phù hợp, có hướng cầm và transform kiểm tra trong engine. Điểm trên bàn gồm `anchor_board`, `anchor_deck`, `anchor_pot`, `anchor_seat_01` đến `04`, `anchor_dealer`; bổ sung điểm đặt bài/chip mỗi ghế theo cùng quy ước.

## 7. Animation và dấu hiệu gian lận

### 7.1. Clip cần có

| Nhóm | Clip bắt buộc dự kiến |
| --- | --- |
| Cơ bản | `idle_seated`, `look_cards`, `look_left`, `look_right`, `place_bet`, `fold_cards` |
| Tráo bài loại A | `sleeve_prepare`, `sleeve_hold`, `sleeve_finish`, `sleeve_fumble` |
| Đánh dấu loại B | `mark_prepare`, `mark_contact`, `mark_recover`, `mark_interrupt` |
| Gương | `mirror_prepare`, `mirror_hold`, `mirror_recover` |
| Tố cáo | `accuse`, `accused_react`, `accuse_wrong_react` |
| Dealer | `dealer_idle`, `dealer_deal`, `dealer_reveal`, `dealer_cut`, `dealer_signal`, `dealer_distract` |
| Ngón/đồ | `show_hand`, `fit_prosthetic`, `receive_item`, `sell_item` |
| Kết quả | `win_react`, `lose_react`, `eliminated` |

Clip/biến thể bổ sung cho nội dung: `cover_cards` cho H02; động tác lau/sao dấu cho T05/T06; biến thể hai lá của chuỗi sleeve cho T07; `tap_joint` và `flip_coin` cho F03/H01. Dùng chung track phù hợp, nhưng vẫn ghi từng ánh xạ ID trong manifest để không quên tài nguyên cần cho catalog.

Không phải nhân vật nào cũng cần clip dealer. Các nhân vật chơi được có cùng tập tên clip dùng chung; biến thể biểu cảm có thể thêm hậu tố nhưng không thay tên bắt buộc.

### 7.2. Quy tắc dựng chuyển động

- Baseline 30 FPS khi author/bake; engine nội suy theo thời gian thật. Thời gian hiệu ứng dùng giây/normalized time, không hardcode theo một frame rate hiển thị.
- Loại A tách prepare → hold loop → finish/fumble. Khi người chơi bấm sớm/muộn, game kết thúc hold đúng nhịp; không kéo giãn toàn bộ clip đến mức lộ động tác khác giữa người thật và giả.
- Loại B có mốc chạm/áp dụng rõ; không chờ một thanh timing vô hình.
- Fake dùng cùng track cử động công khai hoặc cùng họ clip với trick thật. Clip riêng cho góc nhìn chủ sở hữu được phép có khác biệt cần thiết, nhưng sự kiện gửi đối thủ không được mang nhãn thật/giả.
- Động tác subtle nhưng phải đọc được ở camera bàn. Dùng video góc đối thủ để quyết định biên độ, không phán đoán từ camera quay cận trong Blender.
- Root motion không tự đẩy nhân vật rời ghế trong các clip ngồi. Điểm tay tiếp xúc bàn/bài được kiểm tra chống trượt/xuyên.
- Head/gaze có thể dùng điều khiển runtime; bake các constraint cần cho clip xuất. Mũ/vành mũ không che hoàn toàn mắt trong trạng thái mặc định.

### 7.3. Metadata đi cùng clip

Mỗi hành động có các mốc `commit`, `effect`, `exposureStart`, `exposureEnd`, `soundCue` nếu áp dụng, trong file manifest riêng. Marker ghi trong Blender chỉ là nguồn author; không giả định exporter tự chuyển marker thành event gameplay.

Metadata mô tả cách hiển thị. Server vẫn quyết định đổi bài, khóa tiền, tố cáo hoặc tiếng ngón giả dựa trên kết quả được xác nhận; clip bị lag không được làm chuyển tiền hai lần.

## 8. Vật liệu, UV và texture

- Dùng material tương thích PBR metallic/roughness, bắt đầu từ Principled BSDF với đầu vào texture rõ ràng.
- Vật liệu procedural phức tạp được bake trước export nếu cần; render đẹp trong Blender chưa có nghĩa shader đó sẽ xuất nguyên dạng.
- Base color/emissive được quản lý như dữ liệu màu; roughness/metallic/normal là dữ liệu phi màu. Kiểm tra color space cả nguồn lẫn engine.
- Texture nhân vật tối đa 2K ở LOD0; props thường 512–1K; các cụm phòng dùng atlas/trim sheet phù hợp. Tăng độ phân giải chỉ sau khi thấy thiếu chi tiết ở camera game.
- Mục tiêu tối đa khoảng 4 material/nhân vật; ngón thật dùng atlas nhân vật, ngón giả dùng material dùng chung.
- Mặt bài: mesh mặt trước/mặt sau rõ ràng; cùng lưng bài công khai, mặt trước do quyền hiển thị quyết định. Bộ 52 mặt có thể dùng atlas, nhưng chỉ gán UV/face identity đúng cho người được phép.
- Dấu đánh bài dùng lớp chi tiết nhẹ/có thể bật theo state, không thêm geometry quá dày. Metadata của dấu không tự chứa rank/suit công khai.
- Hạn chế alpha blend chồng nhiều lớp, kính trong suốt nhiều tầng và hiệu ứng gương render texture cho mọi chai. Chai xa dùng vật liệu đơn giản.
- Tối ưu nén texture/mesh ở bước tích hợp sau khi xác nhận loader/decoder trên các nền tảng. Luôn có bản GLB gốc để so sánh sai lệch.

## 9. Ngân sách tài nguyên khởi điểm

Các giá trị là mục tiêu sản xuất để đo, chưa phải số liệu đã đạt.

| Asset | Tam giác LOD0 đề xuất | Ghi chú |
| --- | --- | --- |
| Một nhân vật hoặc dealer | 12.000–18.000 | Tính cả phần tay hiển thị và quần áo; giữ mắt/tay đủ mượt |
| Đôi tay cận cảnh riêng nếu cần | 4.000–6.000 | Chỉ dùng khi có lý do về góc nhìn, kiểm tra chi phí thêm |
| Ngón giả mỗi module | 150–500 | Tái sử dụng mesh/material theo vị trí/biến thể |
| Bàn | 3.000–6.000 | Chi tiết tập trung cạnh và mặt bàn |
| Ghế | 1.000–2.000 | Tái sử dụng geometry |
| Lá bài | Dưới 100 | Dùng instance/geometry chung khi phù hợp |
| Chip | 80–200 | Dùng instance cho các chồng chip |
| Prop nhỏ | 200–1.500 | Tùy khoảng cách và vai trò gameplay |
| Saloon nền, chưa tính nhân vật | Khoảng 60.000–80.000 | Dùng module và culling phần không thấy |

- Tổng cảnh mục tiêu không quá khoảng **250k tam giác hiển thị**, **180 draw calls** ở cấu hình cơ sở của plan.
- File GLB một nhân vật hướng tới khoảng 2–5 MB sau tối ưu asset, tùy texture/animation; theo dõi toàn bộ tải ban đầu mục tiêu 30 MB đã nén.
- LOD1/LOD2 giảm hình học ở thân/phụ kiện trước. Các ngón, bài, dấu marking và góc phản sáng gameplay phải giữ khả năng đọc tương đương.
- Nếu ngân sách bị vượt vì module ngón tạo nhiều draw calls, đo và tối ưu material/mesh, không gộp mất khả năng bật từng ngón.
- Chỉ ghi “đạt ngân sách” sau khi đo trong engine với đủ 4 người, dealer, props và ánh sáng.

## 10. Ánh sáng và môi trường

- Key light ấm trên bàn, ánh hắt nhẹ ở mặt/tay, nền quán tối hơn nhưng còn đọc được không gian.
- Emissive đèn chỉ là phần nhìn thấy; số đèn thật và shadow được giới hạn ở runtime.
- Sử dụng ánh sáng môi trường/bake khi phù hợp cho nền tĩnh; nhân vật và đạo cụ hoạt động vẫn cần tương tác ánh sáng rõ.
- Chỉ bật bóng cho nguồn/đối tượng có giá trị ở góc nhìn bàn; thử chất lượng thấp để bảo đảm dấu hiệu không mất theo tùy chọn đồ họa.
- Fog, bụi và bloom có mức nhẹ. Motion blur/DOF không làm khó đọc thời điểm thao tác hoặc lá bài.
- Ánh sáng preview Blender và ánh sáng game đều cần ảnh kiểm tra; file scene ánh sáng preview tách khỏi scene export asset.

## 11. Tổ chức file, tên và export

### 11.1. Nguồn và sản phẩm

```text
assets/blender/characters/char_coyote/char_coyote.blend
assets/blender/characters/char_coyote/textures/
assets/blender/characters/char_coyote/README.md
assets/blender/props/prop_prosthetic_set.blend
assets/blender/environments/env_saloon.blend
assets/manifests/char_coyote.asset.json
assets/previews/char_coyote/
public/models/characters/char_coyote.glb
```

Tên ví dụ là quy ước dự kiến, không phải file đã tồn tại. Dùng `char_`, `prop_`, `env_`, `mat_`, `tex_`, `rig_` cho nhóm tương ứng. ID gameplay không đổi tùy ý khi sửa hình dáng.

### 11.2. Nguồn Blender

- Chọn Blender 4.5 LTS cho pipeline đề xuất; ghi chính xác phiên bản patch và exporter đã kiểm tra ở M0.
- Collection tách `SOURCE`, `EXPORT`, `RIG_CONTROLS`, `PREVIEW`; chỉ export phần cần chạy trong game.
- Texture có đường dẫn tương đối hoặc pack vào nguồn bàn giao; không phụ thuộc file riêng ngoài repo.
- Script dựng asset phải có tham số/seed khi dùng ngẫu nhiên và có thể chạy lại; output tự sinh tách khỏi nguồn đã chỉnh tay để không ghi đè ngoài ý muốn.
- Giữ bản nguồn có modifier/control để chỉnh sửa; export từ bản sao/collection phù hợp.

### 11.3. Export game

Định dạng runtime là **glTF 2.0 dạng .glb**. Blender có importer/exporter glTF chính thức của Khronos tích hợp; kiểm tra tính tương thích qua vòng export–import và trong engine. [Nguồn exporter glTF Blender](https://github.com/KhronosGroup/glTF-Blender-IO).

- Export selection/collection đúng asset; loại camera/đèn preview và control rig không dùng trong runtime.
- Bake các constraint/IK cần thiết thành transform của deform bones; kiểm tra từng clip xuất đủ tên, thời lượng, track.
- Giữ skins, normals, UV và texture cần thiết. Nếu dùng morph/biểu cảm, kiểm tra chúng thực sự có trong GLB và đạt ngân sách.
- Không assume custom shader, constraint, driver hoặc physics Blender tự chạy trong engine.
- Import GLB sang scene trống để kiểm tra nhanh, sau đó nạp bằng chính loader của game.
- Lưu báo cáo glTF Validator, thống kê mesh/material/bones/triangles, danh sách clip/socket và ảnh preview theo version asset.

## 12. Manifest bàn giao tối thiểu

Mỗi asset phải có:

- `assetId`, `assetVersion`, `contractVersion`, nguồn `.blend`, file `.glb`, phiên bản Blender/exporter.
- Đơn vị, bounds, forward/up thực tế sau import.
- Tên root, deform bones bắt buộc, sockets, biến thể từng ngón.
- Tên/thời lượng clip và metadata hành động liên quan.
- Số tam giác, material, texture/dung lượng, LOD và phần ước tính draw calls cần xác nhận ở runtime.
- Các material có thể thay đổi khi chạy; quyền hiển thị đối với bài/dấu/vật phẩm.
- Nguồn gốc các texture/asset phụ được sử dụng và thông tin sử dụng lại cần thiết.

Nếu asset chỉ là đồ tĩnh thì bỏ các trường rig/clip không áp dụng, nhưng vẫn phải có ID, nguồn, kích thước và thống kê.

## 13. Checklist nghiệm thu

### Kiểm tra cấu trúc

- [ ] Mở được .blend, đủ texture, đúng đơn vị và export collection.
- [ ] GLB nạp được, validator không có lỗi; cảnh báo được đọc và giải thích.
- [ ] Đủ node/bone/socket/clip theo manifest; không có tên trùng gây ánh xạ sai.
- [ ] Không có negative scale hoặc bind pose bất thường chưa được giải quyết.
- [ ] Đã ghi thống kê thật của file export, không chỉ đếm mesh nguồn.

### Kiểm tra hình ảnh và thao tác

- [ ] Có preview trước/nghiêng/sau, wireframe, ngồi, cầm bài và góc nhìn của các ghế đối thủ.
- [ ] Thử riêng từng vị trí của cả 10 ngón ở trạng thái thật/trống/giả.
- [ ] Thử nắm bài, chụm cái–trỏ, giấu lá, marking và thất bại với ngón giả.
- [ ] Không lộ lỗ bàn tay, xuyên bàn, trượt bài khỏi socket hoặc hai bộ tay chồng nhau.
- [ ] Trick thật và nghi binh không bị phân biệt chỉ bằng một hiệu ứng màu/clip name trong sự kiện công khai.
- [ ] Bài kín không lộ mặt/UV identity ngoài quyền hiển thị của người xem.
- [ ] Cử động dealer và dấu hiệu marking còn đọc được ở mức đồ họa thấp.
- [ ] Âm thanh gắn mốc đúng khi chạy trong game, không phát hai lần sau reconnect.

### Kiểm tra hiệu năng và bàn giao

- [ ] Đo cảnh đủ người và props trên cấu hình tham chiếu.
- [ ] Nguồn .blend, GLB, manifest, texture và preview cùng version.
- [ ] Ghi giới hạn đã biết và cách chạy lại script/export.
- [ ] Xem kết quả trong game trước khi kết luận asset hoàn tất.

Một ảnh render đẹp chưa đủ để nghiệm thu model cho dự án này. Tài nguyên phải phục vụ được thao tác, quan sát, đổi ngón và đồng bộ với luật chơi.
