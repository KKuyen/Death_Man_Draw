# ĐÁNH GIÁ THIẾT KẾ HIỆN TẠI

**Cập nhật:** 04/10/2026, theo [GAME_RULES.md v0.3](./GAME_RULES.md) và [CONTENT_CATALOG.md](./CONTENT_CATALOG.md).  
**Trạng thái:** nhận định và hướng kiểm chứng, chưa có dữ liệu chơi thử.

## 1. Thay đổi đã tiếp nhận

- Bỏ hệ thống mất máu và toàn bộ đề xuất thuốc/cầm máu, giảm một lớp áp lực lên người đang thua.
- Giữ dealer và lợi thế mua được trong phạm vi bản chơi thử, gồm thông tin và xao nhãng; cắt bài có lợi có trong kế hoạch alpha.
- Trick thao tác chỉ dùng thanh chạy qua lại và bấm đúng thời điểm.
- Trick như đánh dấu bài không có minigame: động tác có thể bị thấy, kỹ năng nằm ở chọn thời điểm.
- Mỹ thuật saloon miền Viễn Tây, đồ họa hoạt hình theo hướng Liar’s Bar.
- Bổ sung bộ nội dung cụ thể theo yêu cầu người dùng, có giá/tải/dấu hiệu/cách đối phó và ưu tiên P0/P1.

Các khuyến nghị cũ về mất máu hoặc đẩy dealer ra sau bản thử không còn áp dụng.

## 2. Đánh giá

Hướng v0.3 tập trung hơn: poker tạo quyết định cược, trick và nghi binh tạo quyết định quan sát, ngón tay tạo hậu quả qua nhiều ván. Ngón giả vừa mở lại thao tác vừa cung cấp tín hiệu âm thanh. Đây là những hệ thống có quan hệ trực tiếp với nhau.

Tách loại A/B giúp không phải chơi minigame cho mọi món. Tuy vậy, thanh timing vẫn có thể chiếm sự chú ý; cần kiểm tra nó ở góc nhìn bàn thật khi nhiều người cùng hành động.

Bộ nội dung có một số tương tác nên thử sớm:

- Đánh dấu bài → đối thủ học dấu → sao dấu lên lá khác → thông tin từng đáng tin trở thành bẫy.
- Ngón giả lỗi tạo tiếng → đối thủ bắt đầu nghe → người chơi dùng tiếng khớp giả để dụ tố sai.
- Dealer tạo tiếng động → người mua tự chọn thời điểm tráo → đối thủ có thể bỏ qua tiếng động và tiếp tục nhìn tay.
- Che bài chặn gương → người dùng gương phải đợi mục tiêu đổi tư thế để thao tác.

## 3. Rủi ro vẫn cần kiểm chứng

| Rủi ro | Điều cần thử |
| --- | --- |
| Thua tiền rồi mất ngón khiến khó trở lại | Ngón giả và lựa chọn miễn phí có đủ hữu ích; mức giảm thao tác có trần |
| Tố quá rẻ hoặc quá đắt | Tần suất tố, tỷ lệ tố không dựa vào quan sát, trải nghiệm người thiếu tiền cọc |
| Dealer/đổi bài lấn át poker | Người ít dùng trick có đường thắng; mua lá/hợp đồng có trở thành lựa chọn bắt buộc |
| Mạng làm timing bất công | Jitter/độ trễ và giới hạn bù thời gian; không cho client tự khai thành công |
| Dấu và dấu giả gây khó hiểu | UI phân biệt ký ức về dấu với xác nhận mặt bài hiện tại |
| Mua đồ và cửa sổ tố làm ván quá lâu | Đo thời gian hành động, mua, chờ và thời gian người bị loại phải xem |
| Buff cộng dồn phá đánh đổi | B02/I10/B05 không tạo thành công chắc chắn; B04 vẫn giữ tiếng lỗi |
| Tiền bí mật chỉ là ẩn nhãn | Kiểm tra payload riêng và lượng thông tin suy ra từ giao dịch/cược |

## 4. Cách kiểm chứng

Chơi bộ P0 với 4 người thật trước khi sản xuất toàn bộ nội dung P1. Dealer vẫn có mặt ở P0. Khi mở rộng, thêm từng nhóm tương tác để biết nhóm nào cải thiện trải nghiệm và nhóm nào làm chậm/rối luật.

Ghi nhận:

- Người chơi có hiểu vì sao mình thắng/thua không?
- Họ có nhìn đối thủ và tận dụng thời cơ, hay chỉ chăm chú vào thanh timing?
- Sau mất ngón, họ còn muốn thử một chiến thuật khác không?
- Nghi binh có tạo lựa chọn đáng cân nhắc cho người tố không?
- Một kiểu mua đồ/trick có thắng áp đảo qua nhiều ván không?
- Người chơi có tự nguyện muốn chơi lại và kể lại được một quyết định đáng nhớ không?

Đây là cách đánh giá khả năng giữ hứng thú. Chưa có cơ sở để khẳng định tỷ lệ giữ chân hoặc mức độ “gây nghiện” trước khi có bản chơi được và dữ liệu.
