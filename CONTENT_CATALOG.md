# DANH MỤC TRICK, ĐẠO CỤ, BUFF VÀ HỢP ĐỒNG DEALER

**Phiên bản:** 0.1 — ngày 04/10/2026.  
**Căn cứ:** [GAME_RULES.md v0.3](./GAME_RULES.md).  
**Trạng thái:** bộ nội dung do trợ lý thiết kế theo yêu cầu người dùng; cơ chế mới và giá là đề xuất để thử nghiệm. Không khôi phục hệ thống mất máu.

## 1. Nguyên tắc chung

- Trò chơi giữ hai cách thực hiện: **A = thanh chạy qua lại, bấm đúng thời điểm**; **B = chọn lúc bắt đầu động tác, không có minigame**.
- Trick thật có thể bị tố. Nghi binh không áp dụng lợi thế gian lận. Thao tác hợp lệ như che bài không tạo căn cứ tố đúng.
- Có lợi thế thì phải có chi phí, thời gian, dấu hiệu hoặc tình huống đối phương khắc chế được.
- Các hiệu ứng không ép camera đối thủ quay đi và không tự bật thông báo cho biết ai đang gian lận.
- Cách dùng minigame, thời gian tố và ngưỡng ngón theo file luật. Nội dung này không âm thầm thay thế D1–D3 chưa chốt.
- Mỗi lá poker có một danh tính duy nhất trong bộ 52 lá. Tráo bài là chuyển vị trí, không tạo lá giống hệt thứ hai.
- Giá dưới đây là **giá mua ở sảnh**, theo ngân sách đề xuất 1.000/người; giữa ván thử 1,5× và đơn khẩn thử 2×. Đây là đơn vị tiền game, không phải tiền thật.
- P0: bộ nhỏ cho bản chơi thử có đủ vòng lặp. P1: mở rộng sau khi P0 chạy được; DLR03 vẫn thuộc phạm vi alpha, không bỏ dealer hoặc thao tác cắt bài khỏi kế hoạch.

## 2. Trick gian lận

### T01 — Lá trong tay áo · A · P0

**Tác dụng:** đổi một lá đang cầm với một lá đã chuẩn bị trong kho dự trữ. Lá bị thay thế chuyển vào kho, giữ đúng số lượng bài.

**Cần:** I01 bao giấu bài, một I02 bài dự trữ, ngón cái và trỏ hoạt động ở cùng một tay. Ngón giả được xét theo cấu hình đã chọn.

**Thực hiện:** chọn hai lá → đưa tay về tay áo → thanh timing một lần bấm → thu tay. Thành công áp dụng một lần hoán đổi; lỗi giữ nguyên vị trí bài và lộ động tác vụng.

**Dấu hiệu/cách đối phó:** cổ tay rời quạt bài, mép giấy xuất hiện ở tay áo; đối thủ nhìn hoặc tố trong cửa sổ tương ứng. Một lần đổi thành công không tự bảo đảm bộ bài mạnh.

**Giới hạn thử:** một lần bắt đầu mỗi vòng cược; tối đa 2 điểm tráo mỗi ván, T01 dùng 1 điểm. Không dùng sau fold/all-in. Thời gian khoảng 1–3 giây cộng thời gian lấy đồ; bắt đầu rồi lỗi vẫn tiêu hao điểm thao tác.

### T02 — Dấu của kẻ lừa · B · P0

**Tác dụng:** gắn một ký hiệu nhỏ lên lưng lá đang cầm để nhận ra nó khi xuất hiện lại trong trận.

**Cần:** I03 mực đánh dấu; ngón cái + trỏ cùng tay để giữ/chạm lá. Mỗi lần hoàn tất tiêu hao một lượt mực.

**Thực hiện:** chọn lá và một mẫu dấu → chủ động bắt đầu khi thấy thuận lợi → động tác chạm/chà lưng bài khoảng 1 giây. Không có thanh timing và không roll thất bại nếu thao tác hợp lệ đã hoàn tất.

**Dấu hiệu/cách đối phó:** đối thủ thấy chà bài hoặc dụng cụ. Dấu có thể bị tẩy, bị sao chép hoặc bị người khác học ý nghĩa; phải thấy được mặt lưng mới dùng được thông tin.

**Giới hạn thử:** một dấu hoạt động trên một lá; tối đa một hành động marking/vòng cược. Hiệu lực hết trận hoặc khi bị tẩy/ghi đè theo luật dấu.

### T03 — Gương dưới vành mũ · B · P0

**Tác dụng:** liếc được một lá riêng của mục tiêu khi có góc nhìn phản chiếu hợp lệ trong lúc họ xem bài.

**Cần:** I04 gương nhỏ và một tay có thể giữ gương.

**Thực hiện:** đưa gương tới vị trí → chọn mục tiêu đang có cơ hội nhìn → giữ trong khoảng ngắn. Hệ thống kiểm tra khoảng cách (ghế kề), mục tiêu còn bài, không che, không đang làm động tác, và đang nhìn bài: tới lượt, hoặc ở preflop/flop khi chưa hành động trong vòng đó; không có cơ hội thì không cấp thông tin.

**Dấu hiệu/cách đối phó:** động tác đưa đồ, phản sáng nhỏ và hướng nhìn. Mục tiêu dùng H02 che bài hoặc đổi tư thế nhìn. Không phản chiếu bài đã bị che kín, không nhìn xuyên mặt bàn.

**Giới hạn thử:** chỉ một lá trong một lần, tối đa một lần/vòng cược. Cơ hội nhìn là một trạng thái được kiểm tra trên server, không dựa vào camera client tự do.

### T04 — Ám hiệu cho người chia · B · P0

**Tác dụng:** kích hoạt hợp đồng dealer đã mua tại đúng cửa sổ.

**Cần:** hợp đồng DLR tương ứng. Mẫu tín hiệu có thể là gõ nhẹ hai ngón hoặc liếc về dealer; nếu dùng tay thì ghi điều kiện ngón trong hợp đồng.

**Dấu hiệu/cách đối phó:** cử động người mua rồi phản ứng dealer có thể bị đối thủ liên hệ với nhau. Tố người thông đồng, không loại NPC dealer.

**Giới hạn:** mỗi hợp đồng có một lần dùng; tín hiệu giả không kích hoạt hợp đồng và không tự tính là vi phạm. Kết quả có thay đổi bài phải qua cửa sổ phân xử trước khi áp dụng.

### T05 — Lau sạch dấu vết · B · P1

**Tác dụng:** xóa dấu trên một lá hiện đang thuộc tay mình, khiến ký hiệu đó không còn dùng để nhận diện lá này.

**Cần:** I05 khăn tẩy; ngón cái và một ngón đối diện để giữ lá. Hoàn tất tiêu hao một lượt khăn.

**Thực hiện:** chọn lá → lau lưng trong khoảng 1 giây. Không cần minigame.

**Dấu hiệu/cách đối phó:** thao tác lau/chà khác động tác đọc bài bình thường; có thể bị tố. Chỉ xóa dấu vật lý, không xóa hồ sơ trick hoặc một tố cáo đã hợp lệ.

### T06 — Mượn chữ ký · B · P1

**Tác dụng:** chép một mẫu dấu đã nhìn thấy lên một lá khác mình đang cầm, khiến người tin vào mẫu đó có thể nhận nhầm bài.

**Cần:** I06 giấy sao dấu, một mẫu đã quan sát hợp lệ, tay có thể kẹp lá và chạm lưng.

**Thực hiện:** chọn mẫu đã biết → chọn lá → áp mẫu trong khoảng 1–1,5 giây. Tiêu hao một lượt giấy khi hoàn tất.

**Dấu hiệu/cách đối phó:** áp/chà giấy vào bài. Đối thủ có thể nhận ra cùng một dấu xuất hiện ở hai nơi, tẩy dấu hoặc ngừng tin vào nó.

**Quy tắc thông tin:** UI nhớ “tôi từng đánh dấu mẫu này trên A♠”, không xác nhận “lá hiện tại chắc chắn là A♠”. Việc sao dấu không sao danh tính lá bài và không tạo thêm A♠.

### T07 — Hai lá, một nhịp · A · P1

**Tác dụng:** hoán đổi cả hai lá riêng với hai lá dự trữ trong cùng một động tác.

**Cần:** I01, đủ hai I02, ngón cái + trỏ + giữa cùng tay còn dùng được.

**Thực hiện:** một thanh timing, một lần bấm; vùng đạt hẹp hơn T01 và phần chuẩn bị dài hơn. Không biến thành chuỗi nhiều nút. Thành công đổi cả hai, thất bại giữ nguyên cả hai — không có trạng thái đổi dở một lá.

**Dấu hiệu/cách đối phó:** cử động tay lớn hơn, có hai mép giấy; đối thủ có thêm thời gian quan sát. Mỗi lần bắt đầu dùng hết hạn mức tráo của ván trong cấu hình thử.

**Giới hạn thử:** T07 dùng cả 2 điểm tráo của ván, nên chỉ bắt đầu được nếu chưa dùng T01/T07 trong ván đó. Bắt đầu rồi lỗi vẫn dùng hết điểm. T01/T07 dùng chung ngân sách này để tránh đổi tới lui không giới hạn.

## 3. Nghi binh và thao tác chiến thuật hợp lệ

| ID / tên | Cách thực hiện | Giá trị chiến thuật | Đánh đổi và đối phó | Ưu tiên |
| --- | --- | --- | --- | --- |
| F01 — Tay áo trống | B; lặp dấu hiệu công khai của T01 nhưng không đổi bài | Dụ tố sai hoặc làm đối thủ quen với động tác | Tốn thời gian và hạn mức thao tác; không có hiệu ứng bài | P0 |
| F02 — Chạm cho họ thấy | B; động tác giống đánh dấu nhưng không dùng mực | Thử xem ai đang quan sát hoặc dụ tố sai | Tốn thời gian; vẫn không tạo dấu | P0 |
| F03 — Tiếng khớp giả | B; gõ ngón giả, hoặc dùng I07 tạo tiếng cơ khí tương tự | Dụ người nghe nhầm lỗi trick hoặc nhìn sai thời điểm | Phải có nguồn tạo tiếng; cooldown; vị trí âm thanh vẫn đúng người phát | P1 |
| H01 — Đồng xu bay | B; dùng I08 tung đồng xu rồi bắt | Tạo một điểm chuyển động/âm thanh thu hút mắt để chọn thời cơ | Đối thủ có thể bỏ qua; một tay bận, không tự tăng xác suất thành công của trick | P1 |
| H02 — Che bài | B; thao tác cơ bản có sẵn, không cần mua | Chặn góc gương khi xem bài | Giữ tay ở thế che; phải rời thế này trước trick khác; đối thủ thấy chuyển tư thế | P0 |

Các hành động trên tự chúng **không phải gian lận để tố đúng**. Có thể tạo dấu hiệu giả, nhưng không xóa vi phạm thật xảy ra trong cùng cửa sổ. Đánh giá tố dựa trên hành động được nhắm tới theo quy tắc phân xử.

F01/F02 không cần người chơi có lá dự trữ hoặc mực thật. F03 cần ngón giả hoặc đồ tạo tiếng. Giữ cùng cooldown và thời gian chuẩn bị tương ứng để việc spam nghi binh không lấn toàn bộ ván.

## 4. Danh mục đạo cụ

| ID | Tên | Công dụng | Giá sảnh thử | Cồng kềnh thử | Số lần dùng | Ưu tiên |
| --- | --- | --- | ---: | ---: | --- | --- |
| I01 | Bao bài trong tay áo | Mở T01/T07; một bao dùng cho tay đã chọn | 80 | 2 | Dùng lại | P0 |
| I02 | Lá bài dự trữ | Cấp một lá cụ thể hợp lệ trong kho để tráo | 40 cho 2–9; 70 cho 10/J/Q/K; 100 cho A | 1/lá | Lá được hoán đổi, không nhân bản | P0 |
| I03 | Lọ mực dấu kín | Dùng T02 | 70 | 1 | 3 lần hoàn tất | P0 |
| I04 | Gương bỏ túi | Dùng T03 | 110 | 2 | Dùng lại theo cooldown | P0 |
| I05 | Khăn tẩm dung môi | Dùng T05 xóa dấu | 60 | 1 | 2 lần hoàn tất | P1 |
| I06 | Giấy sao chữ ký | Dùng T06 sao một mẫu đã thấy | 90 | 1 | 2 lần hoàn tất | P1 |
| I07 | Bật lửa lỏng khớp | Tạo tiếng cơ khí cho F03 | 45 | 1 | Dùng lại theo cooldown | P1 |
| I08 | Đồng xu diễn trò | Dùng H01 | 30 | 1 | Dùng lại theo cooldown | P1 |
| I09 | Ngón gỗ có khớp | Lắp đúng vị trí ngón đã mất; phục hồi yêu cầu thao tác theo luật | 120 | 1 khi trong túi; 0 khi lắp | Một module ở một vị trí | P0 |
| I10 | Ngón đồng tinh chỉnh | Như I09; đề xuất vùng timing tốt hơn một chút nhưng tiếng lỗi rõ hơn | 180 | 1 khi trong túi; 0 khi lắp | Một module ở một vị trí | P1 |

Ngón cái/trỏ/giữa/áp út/út và trái/phải là các biến thể fit, không phải một module tùy ý gắn ở mọi vị trí. Người chơi chọn đúng vị trí khi mua; không được bán ngón đang thế chấp để lấy chỗ lắp.

**Đề xuất về I10:** tăng tương đối 5% vùng đạt so với I09 khi ngón này tham gia động tác, đồng thời âm thanh lỗi dễ nhận ra hơn. Phải thử trước khi chốt; không cộng 5% cho từng ngón để tạo bộ tay tự động thành công.

**Bán lại:** thử mức 40% giá sảnh của phần còn dùng được, không theo giá khẩn đã trả. Đồ nhiều lượt tính theo lượt còn lại. Với I02, giá dựa trên lá hiện ở kho sau hoán đổi; việc đổi giá trị bài có thể tạo một khoản thu hữu hạn nên cần hạn mức giao dịch theo ván và kiểm tra mô phỏng kinh tế.

**Lấy đồ và tải hành trang:** đạo cụ đã lắp thành ngón không còn chiếm túi; ngón giả dự phòng, bài và vật phẩm chưa dùng vẫn tính tải. Công thức tải chung có trần phạt và được công bố trong UI.

## 5. Hợp đồng dealer

Giá dưới đây là giá hợp đồng ở đợt **giữa ván**, do cơ hội áp dụng gắn với bàn đang chơi. Nếu có phiếu mua trước ở sảnh, giá được cấu hình riêng, không nhân hệ số hai lần.

| ID / tên | Hiệu ứng | Giá giữa ván thử | Giới hạn và dấu hiệu | Ưu tiên |
| --- | --- | ---: | --- | --- |
| DLR01 — Một lời bên tai | Biết chính xác một lá chung sắp mở | 120 | Một lá, một lần; cấp thông tin sau khi thứ tự bài liên quan đã chốt; tín hiệu giữa người mua/dealer có thể bị thấy | P0 |
| DLR02 — Cốc rượu đổ | Dealer làm một động tác/tiếng động để thu hút chú ý | 60 | Không ép camera, không tắt âm thanh ngón giả; người mua vẫn phải tự canh thời cơ | P0 |
| DLR03 — Cắt đúng chất | Chọn chất; dealer chuyển một lá hợp lệ thuộc chất đó trong chồng chưa chia tới vị trí bài chung kế tiếp | 180 | Một suất mỗi lần mở; nếu không có lá hợp lệ thì từ chối/hoàn tiền; động tác cắt có thể bị tố | P1, bắt buộc có ở alpha |
| DLR04 — Sổ đếm bí mật | Biết số lá thuộc một chất còn trong chồng chưa chia tại thời điểm kích hoạt | 80 | Một lần/ván/người; không cho rank hoặc thứ tự; thông tin thay đổi sau khi chia/cắt | P1 |

Mỗi người giữ tối đa một hợp đồng chưa dùng trong cấu hình thử. Dealer có thể phục vụ nhiều người nhưng phải xử lý xung đột DLR03 theo quy tắc đặt chỗ; một hợp đồng không được bán như lợi thế độc quyền cho hai người cùng lúc.

DLR02 là một cơ hội gây xao nhãng; những người đang chú ý vẫn có thể phát hiện và tố. DLR03 có lợi cho chất người mua chọn nhưng bài chung cũng có thể giúp đối thủ. Đây là đánh đổi để poker còn có vai trò sau khi mua lợi thế.

## 6. Bài ma thuật và buff

**Mặc định đề xuất:** passive kéo dài đến hết trận, tối đa 2 passive đang trang bị; tối đa 2 lá dùng một lần trong túi. Mỗi lá chưa dùng có tải 1. Passive đã kích hoạt không là đồ cất trong túi và không bán lại được. Không tích lũy sức mạnh qua tài khoản trong cấu hình này.

| ID / tên | Loại / giá sảnh thử | Hiệu ứng cụ thể | Giới hạn, đánh đổi và tương tác | Ưu tiên |
| --- | --- | --- | --- | --- |
| B01 — Vé trở lại | Một lần / 160 | Khi bị kiểm tra phá sản, cấp 5 big blind theo mức blind hiện tại | Tối đa một lần/người/trận; phải mua trước; không cứu ngưỡng mất ngón | P0 |
| B02 — Bàn tay vững | Passive / 120 | Tăng tương đối 15% bề rộng vùng đạt của loại A | Không bỏ yêu cầu ngón; không rút ngắn dấu hiệu; tổng bonus timing có trần | P0 |
| B03 — Túi áo có ngăn | Passive / 100 | Giảm 2 điểm cồng kềnh hiệu dụng, thấp nhất 0 | Không tăng giới hạn bài dự trữ hoặc cho giấu mọi động tác | P0 |
| B04 — Nhung bọc khớp | Một lần / 60 | Giảm âm lượng tiếng ngón giả trong trick kế tiếp có dùng ngón giả | Vẫn phát tiếng khi lỗi; không cộng nhiều lớp để thành im lặng; dùng xong hết dù thành công hay lỗi | P1 |
| B05 — Nhịp thứ hai | Một lần / 90 | Nếu bấm lệch ở loại A, cho bấm lại một lần trong phiên đó | Tiếng lỗi/dấu hiệu lần đầu giữ nguyên; tổng thời hạn có trần, không restart phiên; trượt tiếp thì thất bại | P1 |
| B06 — Mắt cú đêm | Passive / 100 | Làm dấu đã quan sát hợp lệ dễ đọc hơn trong ánh sáng yếu | Chỉ tăng cách trình bày cùng thông tin; không nhìn xuyên bài, không tự giải nghĩa dấu của người khác | P1 |
| B07 — Khách quen quầy hàng | Passive / 130 | Giảm 15% giá đạo cụ mua giữa ván | Không giảm giá dưới giá sảnh; không áp lên giá bán/ngón thật/dealer hoặc đơn khẩn | P1 |
| B08 — Đổi vận | Một lần / 140 | Sau nhận bài, trước hành động cược đầu tiên, đổi công khai một lá riêng lấy lá hợp lệ ngẫu nhiên từ chồng bài | Cả bàn biết đã dùng phép, không thấy mặt lá; một lần/ván; lá bỏ cách ly tới lần xáo sau; không phải trick để tố đúng | P1 |
| B09 — Đường lui | Một lần / 50 | Hoàn một nửa cọc sau lần tố sai kế tiếp | Vẫn mất lượt tố và phần cọc còn lại; không chuyển kết luận sai thành đúng | P1 |
| B10 — Phiếu hỏa tốc | Một lần / 40 | Giảm phần chờ giao một đơn khẩn hợp lệ trong ván | Không bỏ giá khẩn, không giao bài dự trữ/lắp ngón trước cửa sổ cho phép; vẫn có động tác nhận đồ | P1 |

**Cách dùng để tránh thêm nhiều nút:** lá một lần được chọn “sẵn sàng” tại thời điểm hợp lệ. B01 kích hoạt ở cửa sổ cứu phá sản; B04/B05/B09/B10 kích hoạt khi điều kiện đã đăng ký xảy ra. B08 có cửa sổ riêng trước hành động cược đầu tiên. Chọn sẵn sàng không tạo hiệu ứng nếu chưa gặp điều kiện.

**Giới hạn cộng dồn đề xuất:** một passive mỗi loại; vùng đạt loại A sau buff không vượt 35% độ dài thanh; bonus từ ngón đồng và B02 gộp theo một công thức; B05 tối đa một lần bấm lại, không nối nhiều lá; B01 một lần/trận dù mua thêm bản sao. B04 thử giảm 30% âm lượng của cue, không làm cue biến mất hoặc loại bỏ tín hiệu hỗ trợ tiếp cận tương ứng.

Buff nào thay đổi kết quả công khai (ví dụ B08, cứu phá sản) phải có thông báo hiệu ứng thích hợp; không tiết lộ số dư mới hoặc mọi lá người đó đang có. Không biến buff thành một cách xóa lịch sử tố hoặc hoàn tác kết quả đã thanh toán.

## 7. Một số bộ đồ để chơi thử

Các bộ này minh họa lựa chọn trong ngân sách đề xuất, không khóa class hay nhân vật vào một chiến thuật.

| Hướng chơi | Mua ở sảnh | Tổng giá | Tiền còn lại từ 1.000 | Điều phải chấp nhận |
| --- | --- | ---: | ---: | --- |
| Tay áo nhanh | I01 + I02 lá số + B02 | 240 | 760 | Phụ thuộc thời cơ tráo; đối thủ có thể nhìn tay áo |
| Người ghi nhớ | I03 + I04 | 180 | 820 | Thông tin chỉ có giá trị khi quan sát và nhớ đúng |
| Kẻ nghi binh | I07 + I08 + B09 | 125 | 875 | Đồ không trực tiếp cải thiện bộ bài; phải đọc phản ứng đối thủ |
| Có đường trở lại | I09 dự phòng đúng vị trí + B01 | 280 | 720 | Ít tiền cược đầu; ngón dự phòng có thể chưa đúng ngón sẽ mất |

Hợp đồng dealer mua theo cơ hội của ván từ tiền còn lại; không bắt người chơi phải chọn hẳn một class “dealer”. Người không mua đồ vẫn có quyền chơi poker, nghi binh cơ bản và H02 che bài.

## 8. Bộ P0 nên làm trước

- Trick: T01, T02, T03, T04.
- Nghi binh/phòng vệ: F01, F02, H02.
- Đạo cụ: I01–I04, I09 và lá dự trữ theo stock hợp lệ.
- Dealer: DLR01 + DLR02 ngay trong vòng chơi đầu; DLR03 ở mốc hoàn thiện alpha.
- Buff: B01–B03.

Bộ này đủ thử cược, trao đổi bài, thông tin, fake, tố, ngón giả, cửa hàng và dealer. Nội dung P1 có slot trong kế hoạch, nhưng chưa cần làm hết art/animation trước khi kiểm chứng P0.

## 9. Liên kết với model và code

| Nhóm | Tài nguyên phải có |
| --- | --- |
| T01/T07 | Tay áo, socket kho bài, động tác một lá/hai lá, prepare/hold/finish/fumble |
| T02/T05/T06 | Mực, khăn, giấy sao; mask dấu ở lưng bài; clip chạm/chà; biến thể không tạo dấu |
| T03/H02 | Gương nhỏ, pose xem/che bài, phản sáng; kiểm tra góc server |
| F03/H01 | Ngón giả/bật lửa/đồng xu, cue cùng họ âm thanh với lỗi, clip gõ/tung |
| I09/I10 | Ngón theo 10 vị trí, vật liệu gỗ/đồng, cùng skeleton và socket |
| DLR | Dealer, bộ bài/cốc, tín hiệu, cắt bài, mốc effect và cửa sổ tố |
| Buff | Một mesh bài ma thuật chung, 10 mặt/icon riêng, FX ngắn cho hiệu ứng được công khai |

Mỗi ID có một định nghĩa content gồm giá, tải, điều kiện, số lượt, cooldown, cửa sổ sử dụng, dấu hiệu, trạng thái phạm luật và event/asset liên quan. Client không tự quyết định tiền hoặc rank/suit được nhận.

## 10. Tình huống cần thử để cân bằng

- Người mua nhiều bài có áp đảo người giữ tiền không? Giá lá A có phản ánh được lợi thế mà không làm nó bắt buộc mua không?
- Mực/dấu có ích qua nhiều ván nhưng không biến thành biết mọi lá trên bàn không?
- Sao dấu có tạo suy luận thú vị hay chỉ gây rối? UI có trình bày rõ đây là ký ức, không phải xác nhận bài hiện tại không?
- Gương có cơ hội dùng thực tế từ mọi ghế? H02 có đối phó hiệu quả mà không khiến tất cả luôn ngồi bất động che bài không?
- Fake có thể dụ tố sai, nhưng người tố vẫn có thể học dấu hiệu/thói quen không?
- I10/B02/B05 có tạo tổ hợp gần như chắc chắn thành công không? Lỗi ngón giả vẫn có ý nghĩa sau B04 không?
- DLR01 và DLR03 phối hợp có quá mạnh? Giá, slot hợp đồng và thời gian mua có hạn chế được tổ hợp đó không?
- Mua/bán I02 sau hoán đổi có tạo nguồn tiền quá dễ so với cược poker không?
- B01 kéo dài một cơ hội chơi lại hay làm trận khó kết thúc? B07 có hoàn vốn quá nhanh không?
- Người ít tiền có đủ cơ hội dùng các thao tác miễn phí và quan sát để trở lại không?
