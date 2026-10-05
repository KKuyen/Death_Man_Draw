# Khảo sát cân bằng Bài Phép

200 trận; 23.7 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"blindEveryHands": 14, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[41, 42, 43, 44]`.

Tỷ lệ thắng: all 37/200 (18.5%), cheap 42/200 (21.0%), none 48/200 (24.0%), smart 73/200 (36.5%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 242 | 0 | 3844 | 54 | -9.62 | 5.66 | 158.4 | delta>5(noisy) |
| N02 | Chống phá sản | 90 | 204 | 0 | 2538 | 45 | -10.08 | 6.34 | 59.8 | delta>5(noisy) |
| N03 | Kính lúp may | 80 | 264 | 0 | 3479 | 75 | -10.42 | 5.39 | — | delta>5(noisy) |
| N04 | Áo giáp bẫy | 65 | 445 | 0 | 4012 | 141 | 4.62 | 4.05 | — |  |
| N05 | Hạt giống vàng | 75 | 262 | 0 | 3302 | 61 | 9.44 | 5.98 | — | delta>5(noisy) |
| N06 | Áo phao | 55 | 459 | 0 | 4985 | 145 | -2.44 | 3.95 | 53.4 |  |
| N07 | Thầm lặng | 85 | 66 | 0 | 142 | 33 | -4.01 | 6.94 | — |  |
| N08 | Bài giả | 70 | 77 | 0 | 195 | 36 | -5.62 | 6.54 | — | delta>5(noisy) |
| N09 | Màn sương | 50 | 180 | 0 | 824 | 64 | 6.32 | 5.81 | — | delta>5(noisy) |
| K01 | Lá soi | 100 | 19 | 19 | 19 | 11 | 9.28 | 13.72 | — | delta>5(noisy) |
| K10 | Lá soi phép | 60 | 205 | 196 | 220 | 59 | 8.58 | 6.15 | — | delta>5(noisy) |
| K02 | Ép lộ bài | 110 | 27 | 22 | 31 | 20 | -9.44 | 7.33 | — | delta>5(noisy) |
| K03 | Đổi bài chung | 90 | 71 | 43 | 108 | 33 | 3.25 | 7.71 | — |  |
| K04 | Nâng buff | 80 | 642 | 636 | 666 | 69 | -6.2 | 5.37 | — | delta>5(noisy) |
| K05 | Phá bẫy | 45 | 791 | 291 | 5332 | 147 | -1.03 | 3.97 | — |  |
| K06 | Làm mới chợ | 30 | 339 | 267 | 645 | 102 | -1.93 | 4.54 | — |  |
| K07 | Quả cầu soi | 70 | 99 | 97 | 100 | 43 | 0.13 | 6.69 | — |  |
| K08 | Bùa bẫy | 90 | 89 | 88 | 89 | 47 | -10.28 | 5.57 | — | delta>5(noisy) |
| K09 | Mồi nhử | 40 | 292 | 192 | 456 | 111 | 3.73 | 4.57 | — |  |
| X01 | Bộ Hoàng gia | 110 | 334 | 328 | 422 | 33 | 4.9 | 8.36 | — |  |
| X02 | Bộ Muôn sắc | 95 | 688 | 633 | 1339 | 69 | 4.06 | 5.98 | — |  |
| X03 | Bộ Cược mù | 60 | 700 | 439 | 3289 | 135 | 8.1 | 4.29 | — | delta>5(noisy) |
