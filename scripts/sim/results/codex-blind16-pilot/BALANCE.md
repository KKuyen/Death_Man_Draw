# Khảo sát cân bằng Bài Phép

200 trận; 25.05 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"blindEveryHands": 16, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[41, 42, 43, 44]`.

Tỷ lệ thắng: all 35/200 (17.5%), cheap 41/200 (20.5%), none 55/200 (27.5%), smart 69/200 (34.5%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 244 | 0 | 3993 | 54 | -10.0 | 5.56 | 148.8 | delta>5(noisy) |
| N02 | Chống phá sản | 90 | 204 | 0 | 2616 | 45 | -5.73 | 6.48 | 63.2 | delta>5(noisy) |
| N03 | Kính lúp may | 80 | 261 | 0 | 3549 | 75 | -6.82 | 5.48 | — | delta>5(noisy) |
| N04 | Áo giáp bẫy | 65 | 461 | 0 | 4217 | 141 | 6.12 | 4.07 | — | delta>5(noisy) |
| N05 | Hạt giống vàng | 75 | 264 | 0 | 3411 | 61 | 9.23 | 5.99 | — | delta>5(noisy) |
| N06 | Áo phao | 55 | 461 | 0 | 5216 | 145 | -4.77 | 3.83 | 53.7 |  |
| N07 | Thầm lặng | 85 | 65 | 0 | 139 | 33 | -10.07 | 5.86 | — | delta>5(noisy) |
| N08 | Bài giả | 70 | 76 | 0 | 190 | 36 | -1.02 | 6.89 | — |  |
| N09 | Màn sương | 50 | 183 | 0 | 813 | 64 | 3.51 | 5.57 | — |  |
| K01 | Lá soi | 100 | 20 | 20 | 20 | 11 | 0.72 | 11.95 | — |  |
| K10 | Lá soi phép | 60 | 206 | 199 | 222 | 59 | 11.48 | 6.18 | — | delta>5(noisy) |
| K02 | Ép lộ bài | 110 | 27 | 22 | 31 | 20 | -2.78 | 8.48 | — |  |
| K03 | Đổi bài chung | 90 | 72 | 44 | 111 | 33 | 4.45 | 7.68 | — |  |
| K04 | Nâng buff | 80 | 653 | 649 | 673 | 69 | -8.03 | 5.12 | — | delta>5(noisy) |
| K05 | Phá bẫy | 45 | 805 | 300 | 5650 | 147 | -6.59 | 3.74 | — | delta>5(noisy) |
| K06 | Làm mới chợ | 30 | 333 | 259 | 643 | 102 | -0.73 | 4.5 | — |  |
| K07 | Quả cầu soi | 70 | 101 | 100 | 101 | 43 | -4.52 | 6.12 | — |  |
| K08 | Bùa bẫy | 90 | 89 | 89 | 89 | 47 | -6.19 | 5.81 | — | delta>5(noisy) |
| K09 | Mồi nhử | 40 | 297 | 196 | 454 | 111 | 3.49 | 4.5 | — |  |
| X01 | Bộ Hoàng gia | 110 | 358 | 352 | 446 | 33 | 6.72 | 8.04 | — | delta>5(noisy) |
| X02 | Bộ Muôn sắc | 95 | 708 | 650 | 1421 | 69 | 4.07 | 5.87 | — |  |
| X03 | Bộ Cược mù | 60 | 720 | 446 | 3572 | 135 | 8.52 | 4.27 | — | DELTA>5 |
