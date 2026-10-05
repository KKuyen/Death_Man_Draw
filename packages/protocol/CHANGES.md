# Protocol changes

> Mọi mục cũ (marks/observation/market công khai/ngón/trick/dealer) đã bị **xóa**: không còn hiệu lực. Đọc mục "Bài Phép contract" bên dưới. `PROTOCOL_VERSION = 2`.

## Bài Phép contract (authoritative; types trong `packages/protocol/src/index.ts`)

Nguồn luật: `REDESIGN_BAI_PHEP.md`, `GAME_DESIGN_BAI_PHEP.md`. Danh mục lá: `MAGIC_CATALOG.md` (+ `@saloon/content`: `MAGIC`, `getMagic`, `priceFor`, `DEFAULTS`).

### Phase flow
`lobby -> market (25 s) -> playing -> showdown (8 s) -> market -> playing -> ... -> finished`. Không còn phase `shopping`. Chợ mở **trước mọi ván kể cả ván 1**: tất cả Ready ở lobby (host `start`) -> `market` ngay. Trong `market`, `ready:true` = "Xong"; hết khi mọi người (còn sống, đang kết nối hoặc bot) Xong hoặc tới `RoomSnapshot.deadline`. `PublicPlayer.ready` reset về false lúc chợ mở. `nextHand` = host ép bắt đầu ván.

### Thẻ bài là thực thể
```ts
type CardModifier = 'gold'|'wild'|'lucky'|'trapRank'|'trapSuit'|'cursed';
interface Card { id: string; rank: number; suit: Suit; modifiers?: CardModifier[] }   // modifiers: [] hoặc 1 phần tử; vắng = không có
```
`id` duy nhất; lá thường id kiểu `"AS"`, `"10H"`; lá chèn thêm (dự trữ tráo đổi) id kiểu `"s12"`. rank/suit có thể trùng nhau. Tên hiển thị: `modifierLabel(m)`.

### Công khai vs riêng tư
| Dữ liệu | Kênh |
|---|---|
| bet, pot, board (**kèm modifiers**), blind, folded/allIn, `handSize`, `revealedCards` | `RoomSnapshot` (mọi người) |
| `log` công khai: info/bet/win và `magic` ("X dùng <lá>") | `RoomSnapshot.log` |
| `HandResult.revealed` (bài showdown **kèm modifiers**), `HandResult.bonuses` (gold/lucky/cursed — suy được từ bài lật) | `RoomSnapshot.result` |
| ví, hand (kèm modifiers), `magic` (5 ô), `market` (4 offer), `peeks`, `privateLog`, `lastBonuses`, `legal` | `PrivateSnapshot` của chủ |
| mua gì / giữ lá nào | **không bao giờ** public. Dùng lá: chỉ lá `public` hiện cho cả bàn (`magicUsed`); `hinted` chỉ gửi hint mơ hồ cho nạn nhân; `hidden` không ai biết |

Public snapshot không có `offers`, không có wallet, không có magic. **Không có `pose`, `fingers`, `motion`, `covered` nữa.**

### Chợ riêng
`PrivateSnapshot.market: MarketOffer[]` (4 trong phase `market`, `[]` ngoài chợ):
```ts
interface MarketOffer { id; slot:0..3; magicId; name; kind:'active'|'passive_continuous'|'passive_triggered'; visibility:'public'|'hinted'|'hidden'; swap:boolean; trigger?; description; price; purchased:boolean; owned:boolean }
```
Mỗi người một bộ offer riêng (RNG server). `price` đã là giá cuối (tăng theo blind level). Mua:
`{type:'buyMagic', offerId, replaceSlot?}` — chỉ trong `market`. Đủ 5 ô thì bắt buộc `replaceSlot` (lá bị thay mất, không hoàn tiền). Lá nội tại (continuous/triggered) đang giữ không mua lại được. `{type:'discardMagic', slot}` bỏ lá trong chợ. Lỗi trả `CommandResult.error` (tiếng Việt).

### Khay 5 ô
`PrivateSnapshot.magic: MagicSlot[]` (chỉ các ô có lá): `{slot:0..4, magicId, spare?: Card, usable:boolean}`. `spare` có ở lá `swap` (catalog `swap:true`, X01–X03): lá dự trữ nhìn thấy được với chủ. `usable` = dùng được ngay lúc này (đúng phase/lượt, kind active/swap).

### Dùng lá
- Kích hoạt: `{type:'useMagic', slot, handId, targetPlayerId?, handIndex?:0|1, boardIndex?:number, modifier?:'gold'|'wild'}` trong `playing`, **đúng lượt của mình**, trừ K07 có `timing:anyTime` được dùng ngoài lượt. Tham số theo lá: K01/K02/K08/K10 `targetPlayerId` (đối thủ còn trong ván); K04 `handIndex`+`modifier`; K05 `handIndex`; K03 `boardIndex` (sau flop); K07 không tham số; K06 chỉ trong `market` (không cần handId). Lá dùng xong mất; dùng không kết thúc lượt cược.
- Tráo đổi: `{type:'swap', slot, handId, handIndex:0|1}` (lượt mình, `playing`): spare vào tay, lá tay cũ bị loại, lá phép mất.
- `bet` không còn `pledge`. Đã xóa các lệnh: `buy, buyOffer, sell, sellFinger, fitFinger, trick, tap, accuse, dealerBuy, dealerSignal, armBuff, cover, lookDown`.

### Kết quả dùng lá (riêng tư)
K10 Lá soi phép trả `PeekEntry.magic: {magicId: string|null, kind?, visibility?, targetPlayerId}` (null = 'trống'; có thể là lá giả nếu mục tiêu có N09; không bao giờ lộ lá dự trữ). K07 Quả cầu soi có `timing:'anyTime'` (`MagicSlot.usable` true cả ngoài lượt khi phase `playing`; `useMagic` cần handId, hidden). Trigger mới `magic_looked_at`. Sau khi dùng, thông tin hiện ở `PrivateSnapshot.peeks` (`{handId,label,card?,magic?,text?,source?,targetPlayerId?,boardIds?}`; xóa khi sang ván) và `privateLog`, kèm event riêng. Lá soi (K01): `peeks` có `card` (kèm modifiers). Quả cầu soi (K07): `card` lá đỉnh chồng. Mục tiêu của K01 nhận event riêng `magicHint` với cue `looked` "Ai đó vừa nhìn bài của bạn." (mơ hồ, không nói ai). Bùa bẫy/Ép lộ: nạn nhân thấy qua `hand` / event notice riêng.

### Events và mức hiển thị (FINAL: public / hinted / hidden)
Catalog mỗi lá: `kind: 'active'|'passive_continuous'|'passive_triggered'`, `trigger?`, `visibility: 'public'|'hinted'|'hidden'`, `consumed`, `swap?`, `sound` (xem MAGIC_CATALOG.md). `MarketOffer` mang `kind, visibility, swap, trigger?` (không còn `revealOnUse`).
`GameEvent { id, at, type:'shuffle'|'magicUsed'|'magicHint'|'sound'|'notice'|'purchase'|'use', playerId?, targetPlayerId?, magicId?, cue?, text?, handId?, to? }`
- **`shuffle`** (công khai): `{handId}` phát ở đầu mỗi ván khi bộ 52 lá mới được dựng và xáo (modifier roll lại, mọi lá tráo/bị loại của ván trước biến mất). Scene dùng để animate xáo bài.
- `to` có giá trị => sự kiện RIÊNG (server chỉ gửi socket của người đó). Không `to` => cả phòng.
- **`magicUsed`** (công khai, CHỈ lá `public`): `{playerId: người dùng, magicId, targetPlayerId?, cue}`. Client: âm thanh to theo `cue` + thẻ `magicId` phóng to trên đầu `playerId` ~3 s; log công khai kind `'magic'`. Lá public: N02, K02, K03, K09 (id giả). Bộ tráo đổi X01-X03 là hidden. Thầm lặng KHÔNG che các lá này.
- **`magicHint`** (riêng, `to` = người bị tác động, chỉ lá `hinted`: K01, K08, K10; cue `looked` | `hexed` | `sensed`): `{cue:'looked'|'hexed'|'sensed', text mơ hồ}`; KHÔNG có `playerId`/`magicId`. Rung nhẹ/biểu tượng mơ hồ. Nếu người dùng giữ Thầm lặng (N07) thì không có hint.
- **hidden** (X01–X03, K04, K05, K06, K07 và N01/N03/N04/N05/N06/N07/N08/N09): không event, không log. Client không bao giờ nhận event ẩn (engine không tạo).
- **`use` / `purchase`** (riêng, `to` = chính chủ): phản hồi kết quả cho người dùng/mua, kể cả hidden.
- Bài giả (N08, trigger `looked_at`, hidden): người Soi/Ép lộ nhìn thấy lá giả (id `f..`) trong `peeks[].card` hoặc `revealedCards`; N08 tiêu sau 2 lần. Showdown luôn lộ lá thật.
- Hiệu ứng thị giác modifier: dựa vào `Card.modifiers`.
- Triggered passive chạy qua hệ trigger của engine (`deal`, `win_pot`, `lose_showdown`, `bankrupt`, `looked_at`, `magic_looked_at`); không có API client nào cho chúng ngoài `magicUsed` (nếu public) và kết quả riêng (`lastBonuses`, `privateLog`).

### Bonus / tiền
Bonus gold/lucky/cursed ở showdown nằm trong `result.bonuses` (công khai). Bonus Túi tiền/Áo phao/Chống phá sản chỉ ở `lastBonuses`/`privateLog`. `result.winners[].amount` là phần pot thuần (chưa gồm bonus).

### Khác
- Phá sản = ví 0 sau ván (không còn "ví < BB bị loại"); blind ngắn thì all-in blind. N02 cứu một lần (+100).
- Blind: 10/20, ×1,5 mỗi 16 ván (`nextBlindInHands`, `nextBlinds` giữ nguyên).
- `PROTOCOL_VERSION` 2; `welcome.protocolVersion` đổi theo.

## BREAKING (web/offline demo/e2e phải sửa)
1. Types xóa: `FingerId, FINGER_IDS, FingerState, Motion, PublicPose, InventoryEntry, TimingSession, ObservedBack, ItemDefinition, TrickDefinition, DealerDefinition`; `Phase` mất `'shopping'`; `PublicPlayer` mất `fingers/motion/covered/pose`, thêm `handSize, revealedCards`; `RoomSnapshot` mất `offers`; `LogEntry.kind` mất `trick|verdict|shop`, thêm `magic`; `HandResult` thêm `bonuses`.
2. `PrivateSnapshot` đổi hoàn toàn (xem file types). Mất `reserve, inventory, buffs, armedBuffs, contracts, timing, knownMarks, purchasedOffers, observedBacks, load, lostRealFingers`.
3. `Command` đổi (xem trên); `GameOptions.maxFingerSales` bỏ. `GameEvent` đổi (type/field mới, `to`).
4. `@saloon/content` không còn `ITEMS/TRICKS/DEALER_CONTRACTS/PASSIVE_BUFFS/findItem/...`; thay bằng `MAGIC/getMagic/priceFor/MODIFIER_WEIGHTS/DEFAULTS` (đã bỏ `openingShopMs`, `fingerValue`...).
5. `@saloon/bots`: bỏ `decideExtras`/accuse/trick; `runBots(engine, mems, now, rnd, commandId)` giữ nguyên chữ ký (bot tự mua/dùng/ready trong chợ). Offline demo vẫn phải gọi `runBots` mỗi tick và tự lọc event có `to`.
6. `@saloon/rules` thêm export: `evaluateHand/evaluateFive` hiểu modifier (trap/wild), `chipAudit(serialized)`.
7. Server: `sanitizeEvent`/CUE_MAP bị xóa; checkpoint cũ (protocol v1) không restore được (bị quarantine).

## Bổ sung Codex: kết quả soi riêng cho bot (04/10/2026)

`PeekEntry.source` (`K01`/`K07`), `targetPlayerId` (K01) và `boardIds` (K07) là trường tùy chọn, chỉ trong snapshot riêng. Client cũ bỏ qua được; không đổi version. Bot chỉ dùng dữ liệu đã nhận: K10 chọn mục tiêu, K01 đánh giá rủi ro, K07 dự đoán lá mở tiếp. Khi board đổi, bot bỏ dự đoán K07; kết quả K01/K10 có thể sai hoặc lỗi thời do Bài giả/Màn sương/tráo bí mật. Không có cờ tiết lộ thật/giả.
