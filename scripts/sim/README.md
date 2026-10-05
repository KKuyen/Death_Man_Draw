# Mô phỏng Bài Phép

Dùng Node 22:

```sh
export PATH=/Users/quyen.tran5/.nvm/versions/node/v22.23.2/bin:$PATH
node --import tsx scripts/sim/sim.ts --games 200 --seed 31 --json /tmp/bai-phep/s31.json
scripts/sim/run.sh scripts/sim/results/lan-moi 400 31
python3 scripts/sim/merge.py scripts/sim/results/lan-moi
```

Tạo thư mục trước khi chạy một shard riêng. `run.sh` tạo thư mục và chạy 4 shard song song (400 × 4 = 1.600 trận), với seed 31–34. Dùng thư mục mới cho mỗi cấu hình; merger từ chối trộn catalog/cấu hình hoặc seed trùng. `node --import tsx` tránh IPC socket của CLI `tsx`, nên chạy được mô phỏng trong sandbox chặn mở cổng.

Mỗi trận có 4 bot dùng chung brain với server/demo: `all`, `cheap`, `none`, `smart`; xoay ghế đều, đồng hồ ảo bước 200 ms. `all` giữ tối thiểu 100 chip trước khi mua; các chính sách khác giữ tối thiểu max(250, 10 BB). Bot có thể dùng K07 ngoài lượt và tận dụng kết quả soi nhận được.

Các cờ: `--games`, `--seed`, `--maxHands` (200), `--blindEvery`, `--growth`, `--json`, `--one`. Mặc định blind/giá lấy từ `DEFAULTS` (16 ván, ×1,5; giá tăng 10% mỗi mức). Tái hiện một trận: `node --import tsx scripts/sim/sim.ts --one SEED_TRẬN`.

Mỗi shard lưu summary/config/catalog/seed (`s31.json`) và dữ liệu người chơi (`s31.raw.json`); merger tạo `merged.json` và `BALANCE.md`. Lệnh trả exit khác 0 khi có vi phạm, trận kẹt hoặc chạm trần ván; launcher kiểm tra exit của từng PID nó khởi tạo.

Bất biến đang kiểm tra: tiền nguyên không âm; bảo toàn ví + pot + tiền đốt − tiền sinh; id bài duy nhất/bảo toàn tại đầu ván; tối đa 5 ô; trường bí mật không có trong public snapshot. Test engine riêng kiểm tra tráo bí mật, dấu hiệu/Thầm lặng, kết quả soi, xáo lại từng ván.

Bảng từng lá gồm giá, số lượt mua/dùng, số ván giữ, delta tỷ lệ thắng và SE, chip thực nhận trên lượt mua đối với N01/N02/N06. Delta dùng **người mua ở chợ đầu** so với người không mua **cùng chính sách**, tránh thiên lệch do sống lâu mua nhiều. Đây vẫn là khảo sát quan sát, không phải thử nghiệm nhân quả. SE chỉ là xấp xỉ; chưa hiệu chỉnh tương quan giữa ghế hoặc nhiều phép so sánh. Lá nội tại không phát lệnh dùng, nên cột Dùng có thể bằng 0 dù có tác dụng.
