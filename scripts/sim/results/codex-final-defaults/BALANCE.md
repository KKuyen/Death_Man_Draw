# Khảo sát cân bằng Bài Phép

800 trận; 23.39 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"measurementVersion": 2, "botSourceSha256": "32ed7522ece6fc26e24a09da588e348ee44252ae3b67496f592bb9ab5ff1b846", "blindEveryHands": 16, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[31, 32, 33, 34]`.

Tỷ lệ thắng: all 132/800 (16.5%), cheap 191/800 (23.9%), none 257/800 (32.1%), smart 220/800 (27.5%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 884 | 0 | 13260 | 248 | 3.8 | 2.93 | 134.7 |  |
| N02 | Chống phá sản | 90 | 671 | 0 | 8708 | 153 | -3.46 | 3.23 | 63.3 |  |
| N03 | Kính lúp may | 80 | 934 | 0 | 11863 | 275 | 0.54 | 2.73 | — |  |
| N04 | Áo giáp bẫy | 65 | 1644 | 0 | 15080 | 545 | 0.19 | 2.01 | — |  |
| N05 | Hạt giống vàng | 75 | 914 | 0 | 11819 | 241 | -3.62 | 2.73 | — |  |
| N06 | Áo phao | 55 | 1699 | 0 | 18347 | 557 | -0.66 | 2.0 | 49.2 |  |
| N07 | Thầm lặng | 85 | 262 | 0 | 697 | 145 | -0.78 | 3.36 | — |  |
| N08 | Bài giả | 70 | 294 | 0 | 734 | 140 | 0.78 | 3.5 | — |  |
| N09 | Màn sương | 50 | 686 | 0 | 3342 | 260 | 1.43 | 2.76 | — |  |
| K01 | Lá soi | 100 | 155 | 154 | 160 | 80 | -1.67 | 4.23 | — |  |
| K10 | Lá soi phép | 60 | 1870 | 1829 | 2091 | 386 | -0.8 | 2.28 | — |  |
| K02 | Ép lộ bài | 110 | 99 | 83 | 105 | 69 | -2.2 | 4.46 | — |  |
| K03 | Đổi bài chung | 90 | 308 | 185 | 449 | 152 | 0.75 | 3.38 | — |  |
| K04 | Nâng buff | 80 | 2192 | 2177 | 2277 | 268 | 2.21 | 2.82 | — |  |
| K05 | Phá bẫy | 45 | 2834 | 1064 | 19014 | 566 | -0.79 | 1.97 | — |  |
| K06 | Làm mới chợ | 30 | 1334 | 950 | 2446 | 395 | -3.34 | 2.25 | — |  |
| K07 | Quả cầu soi | 70 | 402 | 395 | 412 | 179 | -1.1 | 3.1 | — |  |
| K08 | Bùa bẫy | 90 | 283 | 278 | 288 | 128 | -3.83 | 3.33 | — |  |
| K09 | Mồi nhử | 40 | 1131 | 778 | 1816 | 425 | -2.41 | 2.2 | — |  |
| X01 | Bộ Hoàng gia | 110 | 1205 | 1178 | 1494 | 160 | 0.48 | 3.43 | — |  |
| X02 | Bộ Muôn sắc | 95 | 2200 | 2038 | 4324 | 251 | 0.92 | 2.86 | — |  |
| X03 | Bộ Cược mù | 60 | 2713 | 1605 | 13638 | 570 | 2.68 | 2.03 | — |  |
