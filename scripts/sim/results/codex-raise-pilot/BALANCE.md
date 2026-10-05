# Khảo sát cân bằng Bài Phép

200 trận; 24.51 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"measurementVersion": 2, "botSourceSha256": "df230ebc705bf5b5449d4e42aeb1c053e794e481099c0594c36e84180adebca4", "blindEveryHands": 16, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[31, 32, 33, 34]`.

Tỷ lệ thắng: all 26/200 (13.0%), cheap 44/200 (22.0%), none 75/200 (37.5%), smart 55/200 (27.5%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 220 | 0 | 3318 | 63 | 1.5 | 5.48 | 135.0 |  |
| N02 | Chống phá sản | 90 | 168 | 0 | 2208 | 32 | 2.28 | 7.54 | 66.7 |  |
| N03 | Kính lúp may | 80 | 233 | 0 | 3131 | 58 | 3.27 | 5.54 | — |  |
| N04 | Áo giáp bẫy | 65 | 427 | 0 | 3994 | 157 | -1.9 | 3.6 | — |  |
| N05 | Hạt giống vàng | 75 | 218 | 0 | 2965 | 50 | -4.85 | 5.26 | — |  |
| N06 | Áo phao | 55 | 425 | 0 | 4895 | 143 | -2.29 | 3.76 | 53.7 |  |
| N07 | Thầm lặng | 85 | 61 | 0 | 163 | 37 | 13.89 | 7.45 | — | delta>5(noisy) |
| N08 | Bài giả | 70 | 65 | 0 | 178 | 26 | 7.16 | 8.11 | — | delta>5(noisy) |
| N09 | Màn sương | 50 | 174 | 0 | 798 | 67 | 2.49 | 5.14 | — |  |
| K01 | Lá soi | 100 | 32 | 32 | 33 | 19 | -2.73 | 7.48 | — |  |
| K10 | Lá soi phép | 60 | 478 | 470 | 535 | 99 | 1.72 | 4.4 | — |  |
| K02 | Ép lộ bài | 110 | 15 | 13 | 16 | 11 | -4.14 | 9.01 | — |  |
| K03 | Đổi bài chung | 90 | 82 | 45 | 122 | 36 | 1.08 | 6.33 | — |  |
| K04 | Nâng buff | 80 | 522 | 521 | 536 | 63 | 5.99 | 5.68 | — | delta>5(noisy) |
| K05 | Phá bẫy | 45 | 745 | 296 | 5149 | 150 | -6.39 | 3.55 | — | delta>5(noisy) |
| K06 | Làm mới chợ | 30 | 356 | 266 | 653 | 103 | 6.46 | 4.57 | — | delta>5(noisy) |
| K07 | Quả cầu soi | 70 | 85 | 84 | 88 | 36 | 11.25 | 7.35 | — | delta>5(noisy) |
| K08 | Bùa bẫy | 90 | 74 | 74 | 76 | 35 | -1.9 | 5.99 | — |  |
| K09 | Mồi nhử | 40 | 306 | 221 | 493 | 116 | -9.2 | 3.66 | — | DELTA>5 |
| X01 | Bộ Hoàng gia | 110 | 294 | 284 | 383 | 40 | -8.72 | 4.61 | — | delta>5(noisy) |
| X02 | Bộ Muôn sắc | 95 | 579 | 531 | 1160 | 66 | -7.18 | 4.62 | — | delta>5(noisy) |
| X03 | Bộ Cược mù | 60 | 705 | 425 | 3898 | 153 | 2.87 | 3.84 | — |  |
