import type { MagicDefinition, CardModifier, Card, GameSetup } from '@saloon/protocol';

/** Bài Phép catalog. Single source of truth; MAGIC_CATALOG.md mirrors it (a test keeps them in sync). Prices are base prices at blind level 0. */
export const MAGIC: MagicDefinition[] = [
  {id:'N01',name:'Túi tiền',kind:'passive_triggered',trigger:'win_pot',visibility:'hidden',consumed:false,description:'Thắng pot: nhận thêm 10% pot từ ngân hàng (tối đa 3 BB).',price:80,weight:2,sound:'coin'},
  {id:'N02',name:'Chống phá sản',kind:'passive_triggered',trigger:'bankrupt',visibility:'public',consumed:true,description:'Hết tiền sau ván: ở lại với +100, lá mất. Một lần.',price:105,weight:1,sound:'rescue'},
  {id:'N03',name:'Kính lúp may',kind:'passive_triggered',trigger:'deal',visibility:'hidden',consumed:false,description:'Bài tay: bẫy/nguyền có 50% bị gỡ; lá thường 10% thành buff.',price:90,weight:2,sound:'lens'},
  {id:'N04',name:'Áo giáp bẫy',kind:'passive_triggered',trigger:'trap_applied',visibility:'public',consumed:false,description:'Chặn bẫy số/chất trên bài tay. Khi chặn: hiện áo giáp cho cả bàn. Giữ lại.',price:75,weight:3,sound:'armor'},
  {id:'N05',name:'Hạt giống vàng',kind:'passive_triggered',trigger:'deal',visibility:'hidden',consumed:false,description:'Lá bài tay đầu tiên có 25% thành Vàng.',price:85,weight:2,sound:'coin'},
  {id:'N06',name:'Áo phao',kind:'passive_triggered',trigger:'lose_showdown',visibility:'hidden',consumed:false,description:'Thua ở showdown: hoàn 10% tiền đã cược (tối đa 2 BB).',price:65,weight:3,sound:'cushion'},
  {id:'N07',name:'Thầm lặng',kind:'passive_continuous',visibility:'hidden',consumed:false,description:'Mọi lá "có dấu hiệu" của bạn trở thành bí mật hoàn toàn. Không che lá công khai.',price:100,weight:2,sound:'silence'},
  {id:'N08',name:'Bài giả',kind:'passive_triggered',trigger:'looked_at',visibility:'hidden',consumed:2,description:'Bị Soi/ép lộ: kẻ đó thấy một lá giả. Dùng được 2 lần rồi mất.',price:80,weight:2,sound:'trick'},
  {id:'N09',name:'Màn sương',kind:'passive_triggered',trigger:'magic_looked_at',visibility:'hidden',consumed:2,description:'Bị Lá soi phép: kẻ đó thấy một lá phép giả. Dùng được 2 lần rồi mất.',price:55,weight:2,sound:'trick'},
  {id:'K01',name:'Lá soi',kind:'active',visibility:'hinted',consumed:true,description:'Xem 1 lá ngẫu nhiên của 1 đối thủ. Họ chỉ nhận dấu hiệu mơ hồ.',price:115,weight:1,timing:'turn',sound:'peek'},
  {id:'K10',name:'Lá soi phép',kind:'active',visibility:'hinted',consumed:true,description:'Xem 1 lá phép ngẫu nhiên đối thủ đang giữ (hoặc "trống"). Họ chỉ nhận dấu hiệu mơ hồ.',price:70,weight:2,timing:'turn',sound:'peek'},
  {id:'K02',name:'Ép lộ bài',kind:'active',visibility:'public',consumed:true,description:'Một đối thủ phải lật 1 lá tay ngẫu nhiên cho cả bàn xem.',price:125,weight:1,timing:'turn',sound:'reveal'},
  {id:'K03',name:'Đổi bài chung',kind:'active',visibility:'public',consumed:true,description:'Thay 1 lá bài chung bằng lá trên đỉnh chồng bài.',price:105,weight:2,timing:'turn',sound:'board'},
  {id:'K04',name:'Nâng buff',kind:'active',visibility:'hidden',consumed:true,description:'Biến 1 lá bài tay thành Vàng hoặc Muôn chất.',price:90,weight:2,timing:'turn',sound:'enhance'},
  {id:'K05',name:'Phá bẫy',kind:'active',visibility:'hidden',consumed:true,description:'Gỡ bẫy/nguyền khỏi 1 lá bài tay.',price:50,weight:3,timing:'turn',sound:'cleanse'},
  {id:'K07',name:'Quả cầu soi',kind:'active',visibility:'hidden',consumed:true,description:'Bất cứ lúc nào trong ván: xem lá trên đỉnh chồng bài (lá sẽ được chia kế tiếp).',price:80,weight:3,timing:'anyTime',sound:'peek'},
  {id:'K08',name:'Bùa bẫy',kind:'active',visibility:'hinted',consumed:true,description:'Một lá tay ngẫu nhiên của đối thủ thành bẫy số hoặc bẫy chất. Họ nhận dấu hiệu mơ hồ.',price:105,weight:2,timing:'turn',sound:'curse'},
  {id:'K09',name:'Mồi nhử',kind:'active',visibility:'public',consumed:true,description:'Cả bàn thấy bạn dùng một lá bất kỳ. Không có tác dụng thật.',price:45,weight:3,timing:'turn',sound:'decoy'},
  {id:'X01',name:'Bộ Hoàng gia',kind:'active',swap:true,visibility:'hidden',consumed:false,description:'Lá dự trữ 10–A (30% Vàng). Đổi với 1 lá tay.',price:125,weight:1,timing:'turn',sound:'swap'},
  {id:'X02',name:'Bộ Muôn sắc',kind:'active',swap:true,visibility:'hidden',consumed:false,description:'Lá dự trữ ngẫu nhiên, luôn Muôn chất. Đổi với 1 lá tay.',price:110,weight:2,timing:'turn',sound:'swap'},
  {id:'X03',name:'Bộ Cược mù',kind:'active',swap:true,visibility:'hidden',consumed:false,description:'Lá dự trữ ngẫu nhiên kèm buff hoặc debuff ngẫu nhiên.',price:70,weight:3,timing:'turn',sound:'swap'},
  {id:'K11',name:'Đạo chích',kind:'active',visibility:'public',consumed:true,description:'Trộm 1 lá phép ngẫu nhiên của đối thủ vào ô này. Không lộ lá trộm cho cả bàn.',price:170,weight:1,timing:'turn',sound:'steal'},
  {id:'K12',name:'Tan biến',kind:'active',visibility:'public',consumed:true,description:'Phá tối đa 2 lá phép ngẫu nhiên của đối thủ. Không lộ tên các lá bị phá.',price:190,weight:1,timing:'turn',sound:'shatter'},
  {id:'K13',name:'Đổi vận',kind:'active',visibility:'public',consumed:true,description:'Bỏ cả 2 lá tay, rút 2 lá mới từ bộ bài. Cả bàn biết bạn đổi, không thấy bài mới.',price:140,weight:2,timing:'turn',sound:'fortune'},
  {id:'K14',name:'Mạ vàng',kind:'active',visibility:'hidden',consumed:true,description:'Biến 1 lá bài tay thành Vàng.',price:60,weight:2,timing:'turn',sound:'gild'},
  {id:'K15',name:'Biến chất',kind:'active',visibility:'hidden',consumed:true,description:'Biến 1 lá bài tay thành Muôn chất.',price:65,weight:2,timing:'turn',sound:'gild'},
];
/** Ordinary reserves share the five-slot tray but are not magic lottery entries. */
export const RESERVE: MagicDefinition = {id:'R01',name:'Bài dự trữ',kind:'active',swap:true,visibility:'hidden',consumed:true,description:'Đổi với 1 lá tay trong lượt của bạn. Lá cũ bị bỏ luôn, không lấy lại được.',price:35,weight:0,timing:'turn',sound:'swap'};
export const getMagic = (id:string):MagicDefinition|undefined => id==='R01'?RESERVE:MAGIC.find(m=>m.id===id);
/** Rank 2..A costs 30..90; beneficial modifiers carry an explicit premium. */
export const reserveBasePrice = (c:Card):number => 45+(c.rank-2)*6+(c.modifiers?.includes('wild')?45:c.modifiers?.includes('gold')?35:c.modifiers?.includes('lucky')?20:0);
export const FAKE_USES = 2;
export const MODIFIER_WEIGHTS:Record<CardModifier,number> = {gold:3,wild:2,lucky:2,trapRank:2,trapSuit:2,cursed:1};
/** Price grows with blind level: base * (1 + priceGrowthPerLevel*level), rounded to 5. */
export const priceFor = (base:number, level:number):number => Math.max(5, Math.round(base*(1+DEFAULTS.priceGrowthPerLevel*level)/5)*5);
export const DEFAULTS = Object.freeze({
  startingWallet:1000,smallBlind:10,bigBlind:20,turnMs:20000,marketMs:25000,showdownMs:8000,
  marketOffers:4,marketRefreshHands:3,marketRefreshPrice:40,magicSlots:5,blindEveryHands:16,blindGrowth:1.5,priceGrowthPerLevel:.1,
  modifierChance:.08,reserveShopModifierChance:.2,rescueAmount:100,
  goldMinCards:2,goldBonusPct:.10,goldBonusMinBB:2,goldBonusMaxBB:6,luckyBonusBB:1,cursedPenaltyBB:1,
  purseBonusPct:.10,purseBonusMaxBB:3,cushionPct:.10,cushionMaxBB:2,
  maxSameCard:2,
});

export const DEFAULT_SETUP:GameSetup={startingWallet:DEFAULTS.startingWallet,smallBlind:DEFAULTS.smallBlind,bigBlind:DEFAULTS.bigBlind,turnSeconds:DEFAULTS.turnMs/1000,marketSeconds:DEFAULTS.marketMs/1000,blindEveryHands:DEFAULTS.blindEveryHands,blindGrowth:DEFAULTS.blindGrowth};
export function validSetup(value:unknown):value is GameSetup {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const s=value as GameSetup;
 const int=(n:number,min:number,max:number)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 return int(s.startingWallet,100,100000)&&int(s.smallBlind,1,10000)&&int(s.bigBlind,2,20000)&&s.smallBlind<s.bigBlind&&s.bigBlind<=s.startingWallet&&int(s.turnSeconds,10,120)&&int(s.marketSeconds,15,180)&&int(s.blindEveryHands,0,50)&&Number.isFinite(s.blindGrowth)&&s.blindGrowth>=1&&s.blindGrowth<=3;
}
