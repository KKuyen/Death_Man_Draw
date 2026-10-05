# Khảo sát cân bằng Bài Phép

800 trận; 24.84 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"blindEveryHands": 14, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[21, 22, 23, 24]`.

Tỷ lệ thắng: all 128/800 (16.0%), cheap 177/800 (22.1%), none 271/800 (33.9%), smart 224/800 (28.0%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 905 | 0 | 0 | 245 | 3.51 | 2.94 | 149.8 |  |
| N02 | Chống phá sản | 90 | 680 | 0 | 0 | 123 | -6.48 | 3.46 | 63.8 | delta>5(noisy) |
| N03 | Kính lúp may | 80 | 959 | 0 | 0 | 260 | -0.36 | 2.79 | — |  |
| N04 | Áo giáp bẫy | 65 | 1754 | 0 | 0 | 538 | -0.26 | 1.99 | — |  |
| N05 | Hạt giống vàng | 75 | 973 | 0 | 0 | 270 | -2.36 | 2.64 | — |  |
| N06 | Áo phao | 55 | 1732 | 0 | 0 | 566 | -0.91 | 1.96 | 52.1 |  |
| N07 | Thầm lặng | 85 | 287 | 0 | 0 | 140 | -2.08 | 3.29 | — |  |
| N08 | Bài giả | 70 | 286 | 0 | 0 | 146 | -1.98 | 3.24 | — |  |
| N09 | Màn sương | 50 | 665 | 0 | 0 | 276 | -1.08 | 2.56 | — |  |
| K01 | Lá soi | 100 | 147 | 145 | 0 | 69 | -3.24 | 4.28 | — |  |
| K10 | Lá soi phép | 60 | 796 | 768 | 0 | 246 | -3.44 | 2.55 | — |  |
| K02 | Ép lộ bài | 110 | 99 | 76 | 0 | 64 | -7.2 | 3.89 | — | delta>5(noisy) |
| K03 | Đổi bài chung | 90 | 281 | 173 | 0 | 129 | 7.73 | 3.92 | — | DELTA>5 |
| K04 | Nâng buff | 80 | 2398 | 2382 | 0 | 287 | -2.63 | 2.58 | — |  |
| K05 | Phá bẫy | 45 | 2909 | 1042 | 0 | 602 | 0.07 | 1.93 | — |  |
| K06 | Làm mới chợ | 30 | 1329 | 948 | 0 | 397 | 1.67 | 2.31 | — |  |
| K07 | Quả cầu soi | 70 | 460 | 455 | 0 | 221 | 2.28 | 2.97 | — |  |
| K08 | Bùa bẫy | 90 | 298 | 297 | 0 | 133 | -2.06 | 3.36 | — |  |
| K09 | Mồi nhử | 40 | 1080 | 754 | 0 | 420 | 0.88 | 2.23 | — |  |
| X01 | Bộ Hoàng gia | 110 | 1236 | 1197 | 0 | 131 | 3.33 | 3.88 | — |  |
| X02 | Bộ Muôn sắc | 95 | 2423 | 2250 | 0 | 250 | 4.63 | 2.94 | — |  |
| X03 | Bộ Cược mù | 60 | 2826 | 1665 | 0 | 615 | 0.08 | 1.91 | — |  |
