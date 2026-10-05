# Khảo sát cân bằng Bài Phép

800 trận; 27.56 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"measurementVersion": 2, "botSourceSha256": "ad6b6759f2c78151ceb1a7f0a7d6a107720652ef09e70f2d07af7703016f7eab", "blindEveryHands": 16, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[31, 32, 33, 34]`.

Tỷ lệ thắng: all 121/800 (15.1%), cheap 183/800 (22.9%), none 272/800 (34.0%), smart 224/800 (28.0%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 920 | 0 | 15758 | 248 | 2.02 | 2.88 | 152.7 |  |
| N02 | Chống phá sản | 90 | 718 | 0 | 10483 | 153 | -2.1 | 3.29 | 65.3 |  |
| N03 | Kính lúp may | 80 | 971 | 0 | 13975 | 275 | -1.95 | 2.62 | — |  |
| N04 | Áo giáp bẫy | 65 | 1728 | 0 | 17197 | 545 | -1.16 | 1.95 | — |  |
| N05 | Hạt giống vàng | 75 | 970 | 0 | 14075 | 241 | 1.83 | 2.88 | — |  |
| N06 | Áo phao | 55 | 1777 | 0 | 20582 | 557 | 0.31 | 1.99 | 54.2 |  |
| N07 | Thầm lặng | 85 | 277 | 0 | 796 | 145 | -3.31 | 3.09 | — |  |
| N08 | Bài giả | 70 | 283 | 0 | 808 | 140 | -1.88 | 3.22 | — |  |
| N09 | Màn sương | 50 | 742 | 0 | 3787 | 260 | 0.09 | 2.64 | — |  |
| K01 | Lá soi | 100 | 153 | 149 | 158 | 80 | 2.64 | 4.45 | — |  |
| K10 | Lá soi phép | 60 | 2007 | 1962 | 2257 | 386 | 1.28 | 2.29 | — |  |
| K02 | Ép lộ bài | 110 | 98 | 86 | 106 | 69 | -7.04 | 3.65 | — | delta>5(noisy) |
| K03 | Đổi bài chung | 90 | 295 | 193 | 445 | 152 | 2.44 | 3.36 | — |  |
| K04 | Nâng buff | 80 | 2372 | 2361 | 2448 | 268 | 3.18 | 2.8 | — |  |
| K05 | Phá bẫy | 45 | 3096 | 1252 | 22319 | 566 | -2.63 | 1.91 | — |  |
| K06 | Làm mới chợ | 30 | 1411 | 1058 | 2638 | 395 | 0.24 | 2.28 | — |  |
| K07 | Quả cầu soi | 70 | 406 | 405 | 411 | 179 | 2.83 | 3.16 | — |  |
| K08 | Bùa bẫy | 90 | 276 | 274 | 279 | 128 | -9.64 | 2.68 | — | DELTA>5 |
| K09 | Mồi nhử | 40 | 1187 | 840 | 1811 | 425 | -0.53 | 2.18 | — |  |
| X01 | Bộ Hoàng gia | 110 | 1342 | 1316 | 1653 | 160 | 3.04 | 3.44 | — |  |
| X02 | Bộ Muôn sắc | 95 | 2505 | 2331 | 4941 | 251 | 1.45 | 2.84 | — |  |
| X03 | Bộ Cược mù | 60 | 2846 | 1695 | 14897 | 570 | 3.16 | 2.01 | — |  |
