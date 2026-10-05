# Khảo sát cân bằng Bài Phép

1600 trận; 24.2 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"measurementVersion": 2, "blindEveryHands": 16, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[31, 32, 33, 34]`.

Tỷ lệ thắng: all 273/1600 (17.1%), cheap 383/1600 (23.9%), none 505/1600 (31.6%), smart 439/1600 (27.4%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 1790 | 0 | 27834 | 539 | 1.29 | 1.98 | 142.3 |  |
| N02 | Chống phá sản | 90 | 1360 | 0 | 18617 | 303 | -4.94 | 2.29 | 61.6 |  |
| N03 | Kính lúp may | 80 | 1913 | 0 | 24169 | 557 | -4.41 | 1.82 | — |  |
| N04 | Áo giáp bẫy | 65 | 3413 | 0 | 32020 | 1113 | 0.65 | 1.43 | — |  |
| N05 | Hạt giống vàng | 75 | 1887 | 0 | 24739 | 514 | -4.1 | 1.9 | — |  |
| N06 | Áo phao | 55 | 3507 | 0 | 37802 | 1129 | 2.05 | 1.44 | 49.5 |  |
| N07 | Thầm lặng | 85 | 574 | 0 | 1580 | 281 | 0.02 | 2.47 | — |  |
| N08 | Bài giả | 70 | 551 | 0 | 1447 | 248 | 2.24 | 2.69 | — |  |
| N09 | Màn sương | 50 | 1367 | 0 | 7273 | 530 | 2.94 | 1.98 | — |  |
| K01 | Lá soi | 100 | 335 | 319 | 348 | 150 | -1.91 | 3.1 | — |  |
| K10 | Lá soi phép | 60 | 1720 | 1664 | 1915 | 531 | 2.75 | 1.97 | — |  |
| K02 | Ép lộ bài | 110 | 195 | 160 | 216 | 125 | -0.28 | 3.48 | — |  |
| K03 | Đổi bài chung | 90 | 618 | 395 | 980 | 305 | 0.79 | 2.42 | — |  |
| K04 | Nâng buff | 80 | 4532 | 4494 | 4684 | 520 | 1.77 | 2.0 | — |  |
| K05 | Phá bẫy | 45 | 5851 | 2212 | 40193 | 1147 | -1.23 | 1.39 | — |  |
| K06 | Làm mới chợ | 30 | 2730 | 1991 | 5253 | 801 | -3.08 | 1.59 | — |  |
| K07 | Quả cầu soi | 70 | 861 | 849 | 877 | 389 | -0.13 | 2.19 | — |  |
| K08 | Bùa bẫy | 90 | 572 | 566 | 575 | 281 | -2.13 | 2.39 | — |  |
| K09 | Mồi nhử | 40 | 2270 | 1614 | 3533 | 819 | -2.38 | 1.59 | — |  |
| X01 | Bộ Hoàng gia | 110 | 2470 | 2414 | 3007 | 300 | 0.01 | 2.51 | — |  |
| X02 | Bộ Muôn sắc | 95 | 4638 | 4299 | 9239 | 520 | 5.28 | 2.07 | — | DELTA>5 |
| X03 | Bộ Cược mù | 60 | 5753 | 3375 | 29275 | 1135 | 2.66 | 1.44 | — |  |
