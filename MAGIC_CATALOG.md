# MAGIC_CATALOG — Bài Phép

Nguồn: packages/content/src/index.ts. 26 lá phép; R01 là bài tây dự trữ, không vào xổ số bài phép.

Chợ riêng gồm 4 ô; mỗi ô độc lập ngẫu nhiên là lá phép hoặc lá bài tây dự trữ (R01), xác suất ra lá dự trữ mỗi lần làm mới chợ là 25–75% ngẫu nhiên (không cố định tỉ lệ, không cộng thêm ô ngoài 4). Giữ lô hàng 3 ván; lá mua biến mất, không bù hàng. Hết chu kỳ tự làm mới miễn phí; làm mới ngay trả $40 × hệ số giá, bắt đầu chu kỳ 3 ván mới. K06 đã bỏ. Tối đa 5 ô chung cho phép và dự trữ.

Giá bài phép tăng khoảng 15% so với bản trước (làm tròn 5). Giá cuối = base × (1 + 0,1 × blind level), làm tròn 5; blind level tăng mỗi 16 ván.

Giá bài tây dự trữ: 45 + 6 × (rank − 2); A cao nhất ($117). Vàng +35, Muôn chất +45, Hạnh vận +20; bẫy/nguyền không cộng giá. Áp dụng cùng hệ số blind level. Lá đúng số/chất/modifier được thấy trước khi mua và nhận nguyên trạng.

X01–X03 đổi qua lại với bài tay trong lượt, không mất lá: bài tay cũ trở về ô dự trữ. Giữ sang ván sau. R01 (bài dự trữ mua ở chợ) chỉ đổi được **một lần**: bài tay cũ bị bỏ (vào discard), không lấy lại được, và ô phép bị tiêu luôn sau khi đổi. Mỗi lá có ID vật lý riêng; trùng số/chất hợp lệ. Sảnh cần 5 số khác nhau; đôi/ba/tứ xét số, thùng xét chất. Giữ quy tắc cũ: 5 lá cùng số vẫn xếp tứ quý. Bộ 52 lá mới có ID h<hand>-<rank><suit>, không đè lên dự trữ cũ.

Áo giáp bẫy: mua/giữ vẫn riêng, chỉ công khai lúc chặn bẫy số/chất trên tay. Chặn cả bẫy khi chia, đổi bài và K08; không chặn Nguyền, không mất lá, không xóa buff cũ khi ngăn bẫy mới. Thầm lặng không che thông báo công khai.

Trộm/Phá chọn ngẫu nhiên các ô đang giữ, không xem lén để chọn lá. Trộm thay chính ô lá Đạo chích (dùng được cả khay đầy), giữ nguyên lá dự trữ nếu trộm được. Không trộm nội tại đã giữ trùng. Tan biến phá tối đa hai ô (chỉ một nếu đối thủ còn một); ô trống không bị tiêu lá. Tên lá trộm/phá chỉ hai người biết; sự kiện dùng phép công khai. Đổi vận bỏ hai lá tay vào discard rồi rút hai lá đỉnh bộ, báo công khai nhưng không lộ bài mới.

| ID | Tên | Loại | Hiển thị | Trigger / thời điểm | Công dụng | Giá gốc | Tiêu | Âm thanh |
|---|---|---|---|---|---|---|---|---|
| N01 | Túi tiền | passive_triggered | hidden | win_pot | Thắng pot: nhận thêm 10% pot từ ngân hàng (tối đa 3 BB). | 80 | giữ lại | coin |
| N02 | Chống phá sản | passive_triggered | public | bankrupt | Hết tiền sau ván: ở lại với +100, lá mất. Một lần. | 105 | true | rescue |
| N03 | Kính lúp may | passive_triggered | hidden | deal | Bài tay: bẫy/nguyền có 50% bị gỡ; lá thường 10% thành buff. | 90 | giữ lại | lens |
| N04 | Áo giáp bẫy | passive_triggered | public | trap_applied | Chặn bẫy số/chất trên bài tay. Khi chặn: hiện áo giáp cho cả bàn. Giữ lại. | 75 | giữ lại | armor |
| N05 | Hạt giống vàng | passive_triggered | hidden | deal | Lá bài tay đầu tiên có 25% thành Vàng. | 85 | giữ lại | coin |
| N06 | Áo phao | passive_triggered | hidden | lose_showdown | Thua ở showdown: hoàn 10% tiền đã cược (tối đa 2 BB). | 65 | giữ lại | cushion |
| N07 | Thầm lặng | passive_continuous | hidden | liên tục | Mọi lá "có dấu hiệu" của bạn trở thành bí mật hoàn toàn. Không che lá công khai. | 100 | giữ lại | silence |
| N08 | Bài giả | passive_triggered | hidden | looked_at | Bị Soi/ép lộ: kẻ đó thấy một lá giả. Dùng được 2 lần rồi mất. | 80 | 2 | trick |
| N09 | Màn sương | passive_triggered | hidden | magic_looked_at | Bị Lá soi phép: kẻ đó thấy một lá phép giả. Dùng được 2 lần rồi mất. | 55 | 2 | trick |
| K01 | Lá soi | active | hinted | turn | Xem 1 lá ngẫu nhiên của 1 đối thủ. Họ chỉ nhận dấu hiệu mơ hồ. | 115 | true | peek |
| K10 | Lá soi phép | active | hinted | turn | Xem 1 lá phép ngẫu nhiên đối thủ đang giữ (hoặc "trống"). Họ chỉ nhận dấu hiệu mơ hồ. | 70 | true | peek |
| K02 | Ép lộ bài | active | public | turn | Một đối thủ phải lật 1 lá tay ngẫu nhiên cho cả bàn xem. | 125 | true | reveal |
| K03 | Đổi bài chung | active | public | turn | Thay 1 lá bài chung bằng lá trên đỉnh chồng bài. | 105 | true | board |
| K04 | Nâng buff | active | hidden | turn | Biến 1 lá bài tay thành Vàng hoặc Muôn chất. | 90 | true | enhance |
| K05 | Phá bẫy | active | hidden | turn | Gỡ bẫy/nguyền khỏi 1 lá bài tay. | 50 | true | cleanse |
| K07 | Quả cầu soi | active | hidden | anyTime | Bất cứ lúc nào trong ván: xem lá trên đỉnh chồng bài (lá sẽ được chia kế tiếp). | 80 | true | peek |
| K08 | Bùa bẫy | active | hinted | turn | Một lá tay ngẫu nhiên của đối thủ thành bẫy số hoặc bẫy chất. Họ nhận dấu hiệu mơ hồ. | 105 | true | curse |
| K09 | Mồi nhử | active | public | turn | Cả bàn thấy bạn dùng một lá bất kỳ. Không có tác dụng thật. | 45 | true | decoy |
| X01 | Bộ Hoàng gia | active | hidden | turn | Lá dự trữ 10–A (30% Vàng). Đổi với 1 lá tay. | 125 | giữ lại | swap |
| X02 | Bộ Muôn sắc | active | hidden | turn | Lá dự trữ ngẫu nhiên, luôn Muôn chất. Đổi với 1 lá tay. | 110 | giữ lại | swap |
| X03 | Bộ Cược mù | active | hidden | turn | Lá dự trữ ngẫu nhiên kèm buff hoặc debuff ngẫu nhiên. | 70 | giữ lại | swap |
| K11 | Đạo chích | active | public | turn | Trộm 1 lá phép ngẫu nhiên của đối thủ vào ô này. Không lộ lá trộm cho cả bàn. | 170 | true | steal |
| K12 | Tan biến | active | public | turn | Phá tối đa 2 lá phép ngẫu nhiên của đối thủ. Không lộ tên các lá bị phá. | 190 | true | shatter |
| K13 | Đổi vận | active | public | turn | Bỏ cả 2 lá tay, rút 2 lá mới từ bộ bài. Cả bàn biết bạn đổi, không thấy bài mới. | 140 | true | fortune |
| K14 | Mạ vàng | active | hidden | turn | Biến 1 lá bài tay thành Vàng. | 60 | true | gild |
| K15 | Biến chất | active | hidden | turn | Biến 1 lá bài tay thành Muôn chất. | 65 | true | gild |
| R01 | Bài dự trữ | active | hidden | turn | Đổi với 1 lá tay trong lượt của bạn. Lá cũ bị bỏ luôn, không lấy lại được. | 45+ (theo số) | true | swap |
