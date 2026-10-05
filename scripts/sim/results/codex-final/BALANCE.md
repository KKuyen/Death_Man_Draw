# Khảo sát cân bằng Bài Phép

1600 trận; 23.72 ván/trận; 0 vi phạm; 0 trận chạm trần.

Cấu hình: `{"blindEveryHands": 14, "blindGrowth": 1.5, "priceGrowthPerLevel": 0.1, "maxHands": 200}`. Seed shard: `[31, 32, 33, 34]`.

Tỷ lệ thắng: all 277/1600 (17.3%), cheap 388/1600 (24.2%), none 505/1600 (31.6%), smart 430/1600 (26.9%).

Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.

Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.

| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| N01 | Túi tiền | 70 | 1793 | 0 | 27009 | 539 | 1.24 | 1.97 | 133.6 |  |
| N02 | Chống phá sản | 90 | 1348 | 0 | 18053 | 303 | -3.34 | 2.35 | 61.9 |  |
| N03 | Kính lúp may | 80 | 1898 | 0 | 23530 | 557 | -3.81 | 1.83 | — |  |
| N04 | Áo giáp bẫy | 65 | 3403 | 0 | 31723 | 1113 | -0.24 | 1.42 | — |  |
| N05 | Hạt giống vàng | 75 | 1881 | 0 | 24331 | 514 | -3.21 | 1.92 | — |  |
| N06 | Áo phao | 55 | 3438 | 0 | 37175 | 1129 | 1.84 | 1.44 | 51.3 |  |
| N07 | Thầm lặng | 85 | 586 | 0 | 1597 | 281 | 0.15 | 2.49 | — |  |
| N08 | Bài giả | 70 | 547 | 0 | 1432 | 248 | 4.33 | 2.78 | — |  |
| N09 | Màn sương | 50 | 1355 | 0 | 7096 | 530 | 2.6 | 1.98 | — |  |
| K01 | Lá soi | 100 | 337 | 322 | 350 | 150 | -3.66 | 3.0 | — |  |
| K10 | Lá soi phép | 60 | 1708 | 1654 | 1897 | 531 | 3.32 | 1.99 | — |  |
| K02 | Ép lộ bài | 110 | 194 | 160 | 214 | 125 | -0.56 | 3.49 | — |  |
| K03 | Đổi bài chung | 90 | 617 | 396 | 977 | 305 | 1.3 | 2.45 | — |  |
| K04 | Nâng buff | 80 | 4479 | 4443 | 4649 | 520 | 1.03 | 1.99 | — |  |
| K05 | Phá bẫy | 45 | 5798 | 2166 | 39634 | 1147 | -0.96 | 1.39 | — |  |
| K06 | Làm mới chợ | 30 | 2713 | 1975 | 5196 | 801 | -2.29 | 1.61 | — |  |
| K07 | Quả cầu soi | 70 | 859 | 850 | 873 | 389 | -0.46 | 2.19 | — |  |
| K08 | Bùa bẫy | 90 | 568 | 560 | 571 | 281 | -1.14 | 2.44 | — |  |
| K09 | Mồi nhử | 40 | 2275 | 1627 | 3541 | 819 | -0.96 | 1.62 | — |  |
| X01 | Bộ Hoàng gia | 110 | 2406 | 2351 | 2949 | 300 | -2.38 | 2.43 | — |  |
| X02 | Bộ Muôn sắc | 95 | 4535 | 4188 | 9102 | 520 | 5.0 | 2.07 | — | DELTA>5 |
| X03 | Bộ Cược mù | 60 | 5637 | 3315 | 27717 | 1135 | 2.82 | 1.45 | — |  |
