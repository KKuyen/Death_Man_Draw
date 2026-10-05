# Khảo sát cân bằng Bài Phép

200 trận; 24.79 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"blindEveryHands": 18, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[41, 42, 43, 44]`.

Tỷ lệ thắng: all 33/200 (16.5%), cheap 46/200 (23.0%), none 52/200 (26.0%), smart 69/200 (34.5%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 243 | 0 | 4115 | 54 | -11.59 | 5.23 | 146.1 | DELTA>5 |
| N02 | Chống phá sản | 90 | 201 | 0 | 2713 | 45 | -7.82 | 6.32 | 62.7 | delta>5(noisy) |
| N03 | Kính lúp may | 80 | 263 | 0 | 3701 | 75 | -4.63 | 5.55 | — |  |
| N04 | Áo giáp bẫy | 65 | 466 | 0 | 4287 | 141 | 5.46 | 4.1 | — | delta>5(noisy) |
| N05 | Hạt giống vàng | 75 | 265 | 0 | 3549 | 61 | 8.04 | 5.99 | — | delta>5(noisy) |
| N06 | Áo phao | 55 | 464 | 0 | 5124 | 145 | -1.91 | 3.95 | 50.8 |  |
| N07 | Thầm lặng | 85 | 64 | 0 | 142 | 33 | -8.87 | 5.82 | — | delta>5(noisy) |
| N08 | Bài giả | 70 | 77 | 0 | 195 | 36 | -3.18 | 6.47 | — |  |
| N09 | Màn sương | 50 | 188 | 0 | 858 | 64 | 0.84 | 5.44 | — |  |
| K01 | Lá soi | 100 | 20 | 19 | 21 | 11 | 11.4 | 13.69 | — | delta>5(noisy) |
| K10 | Lá soi phép | 60 | 207 | 201 | 224 | 59 | 12.45 | 6.31 | — | DELTA>5 |
| K02 | Ép lộ bài | 110 | 28 | 22 | 32 | 20 | -7.22 | 7.27 | — | delta>5(noisy) |
| K03 | Đổi bài chung | 90 | 72 | 45 | 109 | 33 | 5.64 | 7.65 | — | delta>5(noisy) |
| K04 | Nâng buff | 80 | 663 | 659 | 685 | 69 | -7.42 | 5.06 | — | delta>5(noisy) |
| K05 | Phá bẫy | 45 | 822 | 304 | 5743 | 147 | -3.55 | 3.86 | — |  |
| K06 | Làm mới chợ | 30 | 352 | 272 | 667 | 102 | -0.8 | 4.59 | — |  |
| K07 | Quả cầu soi | 70 | 100 | 99 | 100 | 43 | -3.24 | 6.08 | — |  |
| K08 | Bùa bẫy | 90 | 90 | 89 | 90 | 47 | -10.44 | 5.16 | — | DELTA>5 |
| K09 | Mồi nhử | 40 | 297 | 194 | 452 | 111 | 4.88 | 4.61 | — |  |
| X01 | Bộ Hoàng gia | 110 | 346 | 341 | 436 | 33 | 7.18 | 8.04 | — | delta>5(noisy) |
| X02 | Bộ Muôn sắc | 95 | 711 | 656 | 1421 | 69 | 4.71 | 5.86 | — |  |
| X03 | Bộ Cược mù | 60 | 708 | 442 | 3368 | 135 | 7.93 | 4.28 | — | delta>5(noisy) |
