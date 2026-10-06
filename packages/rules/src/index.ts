import { CARD_MODIFIERS, MAGIC_SLOTS, isDebuff, rankLabel, type Bonus, type Card, type CardModifier, type Command, type CommandResult, type GameEngine, type GameEvent, type GameSetup, type GameOptions, type HandResult, type LegalActions, type LogEntry, type MagicSlot, type MarketOffer, type PeekEntry, type PlayerInput, type PrivateSnapshot, type PublicPlayer, type RoomSnapshot, type Street, type Suit, type TriggerName } from '@saloon/protocol';
import { DEFAULTS as D, FAKE_USES, MAGIC, MODIFIER_WEIGHTS, getMagic, priceFor, reserveBasePrice,DEFAULT_SETUP,validSetup } from '@saloon/content';
import { buildPotBands, compareHands, evaluateHand } from './poker';
export * from './poker';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const BUFFS: CardModifier[] = ['gold', 'wild', 'lucky'];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function fail(message: string): never { throw new Error(message); }
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const isText = (value: unknown, max = 64): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const optional = (value: unknown, test: (v: unknown) => boolean) => value === undefined || test(value);
const MAX_COMMANDS = 1024;
const label = (c: Card) => `${rankLabel(c.rank)}${({ S: '♠', H: '♥', D: '♦', C: '♣' })[c.suit]}`;

/** Runtime shape validation: the protocol types are not trusted on the wire. */
function validateCommand(c: Record<string, unknown>): void {
  const bad = () => fail('Lệnh không hợp lệ.');
  if (!optional(c.handId, v => Number.isSafeInteger(v) && Number(v) >= 0)) bad();
  const hand01 = (v: unknown) => v === 0 || v === 1;
  switch (c.type) {
    case 'configureGame':if(!validSetup(c.setup))bad();break;
    case 'ready': if (typeof c.ready !== 'boolean') bad(); break;
    case 'character': if (!isText(c.character, 16)) bad(); break;
    case 'start': case 'nextHand': case 'refreshMarket': case 'addBot': case 'rematch': case 'disband': case 'endMatch': break;
    case 'bet':
      if (!['check', 'call', 'raise', 'fold', 'allIn'].includes(c.action as string)) bad();
      if (!optional(c.amount, integer)) bad(); if (c.action === 'raise' && c.amount === undefined) bad(); break;
    case 'buyMagic': if (!isText(c.offerId, 64) || !optional(c.replaceSlot, v => integer(v) && Number(v) < MAGIC_SLOTS)) bad(); break;
    case 'discardMagic': if (!integer(c.slot) || c.slot >= MAGIC_SLOTS) bad(); break;
    case 'useMagic':
      if (!integer(c.slot) || c.slot >= MAGIC_SLOTS || !optional(c.targetPlayerId, v => isText(v, 128)) || !optional(c.handIndex, hand01) || !optional(c.boardIndex, v => integer(v) && Number(v) < 5) || !optional(c.modifier, v => v === 'gold' || v === 'wild')) bad(); break;
    case 'swap': if (!integer(c.slot) || c.slot >= MAGIC_SLOTS || !hand01(c.handIndex)) bad(); break;
    case 'kick': if (!isText(c.targetPlayerId, 128)) bad(); break;
    case 'transferHost': if (!isText(c.targetPlayerId, 128)) bad(); break;
    default: bad();
  }
}

interface TriggerCtx { gross?: number; contribution?: number; cardId?: string; realMagic?: string; shown?: Card; shownMagic?: string }
const HINTS: Record<string, { cue: string; text: string }> = {
  K01: { cue: 'looked', text: 'Ai đó vừa nhìn bài của bạn.' },
  K10: { cue: 'sensed', text: 'Bạn cảm thấy ai đó dò xét các lá phép của mình.' },
  K08: { cue: 'hexed', text: 'Có gì đó bất thường với bài của bạn.' },
};
interface SlotRec { magicId: string; spare?: Card; uses?: number }
interface OfferRec { id: string; slot: number; magicId: string; price: number; purchased: boolean; card?: Card }
interface Player extends Omit<PublicPlayer, 'handSize' | 'revealedCards'> {
  wallet: number; hand: string[]; revealed: { id: string; shown: Card }[]; slots: (SlotRec | null)[]; offers: OfferRec[]; marketStartHand?:number;
  peeks: PeekEntry[]; privateLog: LogEntry[]; lastBonuses: { kind: string; amount: number }[];
  actedBet: number | null; disconnectedAt: number | null;
}
interface State {
  setup:GameSetup;version: 2; roomId: string; code: string; phase: RoomSnapshot['phase']; handId: number; street: Street;
  players: Player[]; smallBlind: number; bigBlind: number; hostId: string | null;
  /** Registry of every card entity of the current hand (deck, hands, board, discard). Persists through showdown/market. */
  cards: Record<string, Card>; deck: string[]; board: string[]; discard: string[]; spareSeq: number;
  turnPlayerId: string | null; dealerSeat: number; deadline: number; time: number; currentBet: number; lastRaise: number;
  log: LogEntry[]; events: GameEvent[]; sequence: number;
  result: HandResult | null; winnerId: string | null; commands: Record<string, CommandResult>;
  ledger: { burned: number; minted: number };
}

/** Chip conservation audit on a serialized engine state: wallets (+ chips in the pot while a hand is live) + burned - minted must equal the starting stacks. */
export function chipAudit(serialized: unknown): { total: number; expected: number; ok: boolean } {
  const s = serialized as State;
  const total = s.players.reduce((n, p) => n + p.wallet + (s.phase === 'playing' ? p.contribution : 0), 0) + s.ledger.burned - s.ledger.minted;
  const expected = (s.setup?.startingWallet??D.startingWallet) * s.players.length;
  return { total, expected, ok: total === expected };
}

class Engine implements GameEngine {
  private s: State;
  private random: () => number;
  private commandCount = 0;
  private blindEvery: number;
  private blindGrowth: number;
  constructor(options: GameOptions, snapshot?: State) {
    this.random = options.random ?? Math.random; this.blindEvery = options.blindEveryHands ?? D.blindEveryHands; this.blindGrowth = options.blindGrowth ?? D.blindGrowth;
    this.s = snapshot ? clone(snapshot) : {
      setup:{...DEFAULT_SETUP,blindEveryHands:this.blindEvery,blindGrowth:this.blindGrowth},version: 2, roomId: options.roomId, code: options.code, phase: 'lobby', handId: 0, street: 'preflop', players: [], smallBlind: D.smallBlind, bigBlind: D.bigBlind, hostId: null,
      cards: {}, deck: [], board: [], discard: [], spareSeq: 0, turnPlayerId: null, dealerSeat: -1, deadline: 0, time: options.now ?? 0, currentBet: 0, lastRaise: D.bigBlind,
      log: [], events: [], sequence: 0, result: null, winnerId: null, commands: {}, ledger: { burned: 0, minted: 0 },
    };
    if (snapshot) {
      this.s.setup??={...DEFAULT_SETUP};this.blindEvery=options.blindEveryHands??this.s.setup.blindEveryHands;this.blindGrowth=options.blindGrowth??this.s.setup.blindGrowth;
      // Retire K06 from trusted v2 saves while preserving the chip audit.
      for(const p of this.s.players){for(let i=0;i<p.slots.length;i++)if(p.slots[i]?.magicId==='K06'){const refund=Math.min(35,this.s.ledger.burned);p.wallet+=refund;this.s.ledger.burned-=refund;p.slots[i]=null;}p.offers=p.offers.filter(o=>!!getMagic(o.magicId));}
      this.validateSnapshot(); this.commandCount = Object.keys(this.s.commands).length; this.s.roomId = options.roomId; this.s.code = options.code; }
  }

  // ---------- helpers ----------
  private id() { return `e${++this.s.sequence}`; }
  private player(id: string): Player { return this.s.players.find(p => p.id === id) ?? fail('Không tìm thấy người chơi.'); }
  private log(text: string, kind: LogEntry['kind'] = 'info', magicId?: string) { this.s.log.push({ id: this.id(), at: this.s.time, text, kind, ...(magicId ? { magicId } : {}) }); if (this.s.log.length > 100) this.s.log.shift(); }
  private plog(p: Player, text: string) { p.privateLog.push({ id: this.id(), at: this.s.time, text, kind: 'info' }); if (p.privateLog.length > 40) p.privateLog.shift(); }
  private event(e: Omit<GameEvent, 'id' | 'at'>) { this.s.events.push({ id: this.id(), at: this.s.time, ...e }); }
  private card(id: string): Card { const c = this.s.cards[id] ?? fail('Lá bài không tồn tại.'); return clone(c); }
  private draw(): string { return this.s.deck.shift() ?? fail('Chồng bài đã hết.'); }
  private rnd(): number { const x = this.random(); if (!Number.isFinite(x) || x < 0 || x >= 1) fail('Nguồn ngẫu nhiên không hợp lệ.'); return x; }
  private shuffle(ids: string[]): string[] {
    const r = [...ids]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r;
  }
  private pickWeighted<T>(items: T[], weight: (t: T) => number): T {
    const total = items.reduce((n, t) => n + weight(t), 0); let x = this.rnd() * total;
    for (const t of items) { x -= weight(t); if (x < 0) return t; } return items[items.length - 1];
  }
  private rollModifier(): CardModifier { return this.pickWeighted(CARD_MODIFIERS as CardModifier[], m => MODIFIER_WEIGHTS[m]); }
  private active(): Player[] { return this.s.players.filter(p => !p.eliminated); }
  private contenders(): Player[] { return this.active().filter(p => !p.folded && p.hand.length === 2); }
  private clockwise(players: Player[], seat: number): Player[] { return [...players].sort((a, b) => ((a.seat - seat + 4) % 4 || 4) - ((b.seat - seat + 4) % 4 || 4)); }
  private holds(p: Player, id: string) { return p.slots.some(x => x?.magicId === id); }
  private level(handNo: number) { return this.blindEvery > 0 ? Math.floor(handNo / this.blindEvery) : 0; }
  private requirePlaying(p: Player) { if (this.s.phase !== 'playing' || p.folded || p.eliminated) fail('Không thể hành động trong ván này.'); }
  private isSilent(p: Player) { return this.holds(p, 'N07'); }
  /**
   * Single place where a card use becomes visible. public: event+log for the whole table. hinted: only `target` gets a vague private hint (nobody if the user is Silent).
   * hidden: nothing. Silent never masks public cards.
   */
  private disclose(p: Player, magicId: string, target?: Player, shownId = magicId) {
    const m = getMagic(magicId)!; let vis = m.visibility;
    if (vis === 'hinted' && this.isSilent(p)) vis = 'hidden';
    if (vis === 'public') {
      const shown = getMagic(shownId)!;
      this.log(`${p.name} dùng ${shown.name}${target ? ` lên ${target.name}` : ''}.`, 'magic', shown.id);
      this.event({ type: 'magicUsed', playerId: p.id, magicId: shown.id, cue: shown.sound, ...(target ? { targetPlayerId: target.id } : {}) });
    } else if (vis === 'hinted' && target) {
      const hint = HINTS[magicId] ?? { cue: 'looked', text: 'Có điều gì đó bất thường quanh bài của bạn.' };
      this.event({ type: 'magicHint', cue: hint.cue, text: hint.text, to: target.id }); this.plog(target, hint.text);
    }
  }
  /** Triggered passives: every held card whose `trigger` matches runs its handler; consumption follows the catalog. */
  private runTriggers(name: TriggerName, p: Player, ctx: TriggerCtx = {}): boolean {
    let any = false;
    p.slots.forEach((rec, i) => {
      if (!rec) return; const def = getMagic(rec.magicId)!;
      if (def.kind !== 'passive_triggered' || def.trigger !== name || !this.handle(def.id, p, ctx)) return;
      any = true; this.disclose(p, def.id);
      if (def.consumed === true) p.slots[i] = null;
      else if (typeof def.consumed === 'number') { rec.uses = (rec.uses ?? def.consumed) - 1; if (rec.uses <= 0) p.slots[i] = null; }
    });
    return any;
  }
  private handle(id: string, p: Player, ctx: TriggerCtx): boolean {
    const bb = this.s.bigBlind;
    switch (id) {
      case 'N04': { let blocked=false;for(const hid of p.hand){const c=this.s.cards[hid];if(c.modifiers?.some(m=>m==='trapRank'||m==='trapSuit')){delete c.modifiers;blocked=true;}}if(blocked)this.plog(p,'Áo giáp chặn bẫy trên bài tay.');return blocked; }
      case 'N01': { const amount = Math.min(Math.floor((ctx.gross ?? 0) * D.purseBonusPct), D.purseBonusMaxBB * bb); if (amount <= 0) return false; this.mint(p, amount); p.lastBonuses.push({ kind: 'N01', amount }); this.plog(p, `Túi tiền: +${amount}.`); return true; }
      case 'N06': { const amount = Math.min(Math.floor((ctx.contribution ?? 0) * D.cushionPct), D.cushionMaxBB * bb); if (amount <= 0) return false; this.mint(p, amount); p.lastBonuses.push({ kind: 'N06', amount }); this.plog(p, `Áo phao: +${amount}.`); return true; }
      case 'N02': if (p.wallet > 0) return false; this.mint(p, D.rescueAmount); p.lastBonuses.push({ kind: 'N02', amount: D.rescueAmount }); this.plog(p, `Chống phá sản: +${D.rescueAmount}.`); return true;
      case 'N03': for (const hid of p.hand) {
        const c = this.s.cards[hid];
        if (c.modifiers?.some(isDebuff)) { if (this.rnd() < .5) delete c.modifiers; }
        else if (!c.modifiers?.length && this.rnd() < .1) c.modifiers = [this.pickWeighted(BUFFS, m => MODIFIER_WEIGHTS[m])];
      } return true;
      case 'N05': if (this.rnd() < .25) this.s.cards[p.hand[0]].modifiers = ['gold']; return true;
      case 'N08': {
        const real = this.s.cards[ctx.cardId!]; let rank = real.rank, suit = real.suit;
        while (rank === real.rank && suit === real.suit) { rank = 2 + Math.floor(this.rnd() * 13); suit = SUITS[Math.floor(this.rnd() * 4)]; }
        ctx.shown = { id: `f${++this.s.spareSeq}`, rank, suit, ...(this.rnd() < D.modifierChance ? { modifiers: [this.rollModifier()] } : {}) }; return true;
      }
      case 'N09': {
        const others = MAGIC.filter(x => x.id !== ctx.realMagic); ctx.shownMagic = others[Math.floor(this.rnd() * others.length)].id; return true;
      }
      default: return false;
    }
  }
  /** What a viewer sees when `t`'s card is peeked/forced: the 'looked_at' trigger (N08 Bài giả) may substitute a false card. */
  private shownCard(t: Player, id: string): Card { const ctx: TriggerCtx = { cardId: id }; this.runTriggers('looked_at', t, ctx); return ctx.shown ?? this.card(id); }
  private mint(p: Player, amount: number) { p.wallet += amount; this.s.ledger.minted += amount; }

  // ---------- lobby ----------
  addPlayer(input: PlayerInput, now: number): void {
    if (this.s.players.length >= 4) fail('Phòng đã đủ người.');
    if (!isText(input?.id, 128) || typeof input.name !== 'string' || this.s.players.some(p => p.id === input.id)) fail('Danh tính người chơi không hợp lệ.');
    if (input.character !== undefined && !['coyote', 'lynx', 'badger', 'rabbit'].includes(input.character)) fail('Nhân vật không hợp lệ.');
    this.s.time = Math.max(this.s.time, now);
    const seat = [0, 1, 2, 3].find(n => !this.s.players.some(p => p.seat === n))!;
    // Joining mid-match (not the lobby): seated as a spectator (no chips, no hand) until the next rematch.
    const spectator = this.s.phase !== 'lobby';
    this.s.players.push({
      id: input.id, name: input.name.slice(0, 32), character: input.character ?? 'coyote', seat, bot: input.bot ?? false, connected: true, ready: input.bot ?? false,
      folded: spectator, eliminated: spectator, allIn: false, bet: 0, contribution: 0, wallet: spectator ? 0 : this.s.setup.startingWallet, hand: [], revealed: [], slots: Array(MAGIC_SLOTS).fill(null), offers: [],
      peeks: [], privateLog: [], lastBonuses: [], actedBet: null, disconnectedAt: null,
    });
    this.s.hostId ??= input.id; this.log(`${input.name.slice(0, 32)} ${spectator ? 'vào xem' : 'vào bàn'}.`);
  }
  setConnected(playerId: string, connected: boolean): void { const p = this.player(playerId); p.connected = connected; p.disconnectedAt = connected ? null : this.s.time; }
  removePlayer(playerId: string): void {
    const p = this.player(playerId);
    if (this.s.phase === 'lobby') { this.s.players = this.s.players.filter(q => q !== p); if (this.s.hostId === p.id) this.s.hostId = this.s.players[0]?.id ?? null; }
    else { p.connected = false; p.disconnectedAt = this.s.time; }
  }

  // ---------- commands ----------
  applyCommand(playerId: string, command: Command, now: number): CommandResult {
    if (typeof playerId !== 'string' || !command || typeof command !== 'object' || typeof command.commandId !== 'string' || !command.commandId || command.commandId.length > 128 || typeof now !== 'number' || !Number.isFinite(now)) return { ok: false, error: 'Lệnh không hợp lệ.' };
    const key = JSON.stringify([playerId, command.commandId]); const previous = this.s.commands[key]; if (previous) return clone(previous);
    this.tick(now);
    const saved = clone(this.s);
    let result: CommandResult;
    try {
      validateCommand(command as unknown as Record<string, unknown>);
      const p = this.player(playerId);
      if (p.eliminated) fail('Người chơi đã bị loại.');
      if (command.handId !== undefined && command.handId !== this.s.handId) fail('Lệnh thuộc ván cũ.');
      const needsHand = command.type === 'bet' || command.type === 'swap' || (command.type === 'useMagic' && this.s.phase === 'playing');
      if (needsHand && command.handId === undefined) fail('Thiếu mã ván.');
      this.command(p, command); result = { ok: true };
    } catch (error) { this.s = saved; result = { ok: false, error: error instanceof Error ? error.message : 'Lệnh không hợp lệ.' }; }
    this.s.commands[key] = result;
    if (++this.commandCount > MAX_COMMANDS) { for (const old in this.s.commands) { delete this.s.commands[old]; this.commandCount--; break; } }
    return clone(result);
  }
  private command(p: Player, c: Command) {
    switch (c.type) {
      case 'configureGame':{if(p.id!==this.s.hostId||this.s.phase!=='lobby')fail('Chỉ chủ phòng chỉnh setup trước trận.');this.s.setup={...c.setup};this.blindEvery=c.setup.blindEveryHands;this.blindGrowth=c.setup.blindGrowth;this.s.smallBlind=c.setup.smallBlind;this.s.bigBlind=c.setup.bigBlind;this.s.lastRaise=c.setup.bigBlind;for(const q of this.s.players){q.wallet=c.setup.startingWallet;q.ready=q.bot;}this.log('Chủ phòng đổi setup. Mọi người cần sẵn sàng lại.');break;}
      case 'ready': if (!['lobby', 'market'].includes(this.s.phase)) fail('Không thể sẵn sàng lúc này.'); p.ready = c.ready; if (this.s.phase === 'market') this.checkAllReady(); break;
      case 'character': if (this.s.phase !== 'lobby' || !['coyote', 'lynx', 'badger', 'rabbit'].includes(c.character)) fail('Nhân vật không hợp lệ.'); p.character = c.character; break;
      case 'start': if (p.id !== this.s.hostId || this.s.phase !== 'lobby' || this.active().length < 2 || this.active().some(q => !q.ready)) fail('Cần chủ phòng và 2–4 người sẵn sàng.'); this.openMarket(); break;
      case 'nextHand': if (p.id !== this.s.hostId || this.s.phase !== 'market') fail('Chủ phòng bắt đầu ván từ chợ.'); this.beginHand(); break;
      case 'bet': this.bet(p, c); break;
      case 'buyMagic': this.buyMagic(p, c); break;
      case 'refreshMarket': {if(this.s.phase!=='market')fail('Chỉ làm mới trong chợ.');const price=priceFor(D.marketRefreshPrice,this.level(this.s.handId+1));if(p.wallet<price)fail('Không đủ tiền làm mới chợ.');p.wallet-=price;this.s.ledger.burned+=price;p.offers=this.makeOffers(p);p.marketStartHand=this.s.handId+1;this.plog(p,`Làm mới chợ (${price}).`);break;}
      case 'discardMagic': if (this.s.phase !== 'market') fail('Chỉ bỏ lá trong chợ.'); this.takeSlot(p, c.slot); this.plog(p, 'Bạn bỏ một lá phép.'); break;
      case 'useMagic': this.useMagic(p, c); break;
      case 'swap': this.swap(p, c); break;
      case 'kick': this.kick(p, c); break;
      case 'transferHost': this.transferHost(p, c); break;
      case 'addBot': fail('Máy chủ quản lý người chơi máy.');
      case 'rematch': this.rematch(p); break;
      case 'disband': fail('Máy chủ xử lý giải tán.');
      case 'endMatch': this.endMatch(p); break;
      default: fail('Loại lệnh không hợp lệ.');
    }
  }

  // ---------- market ----------
  private openMarket() {
    this.s.phase = 'market'; this.s.deadline = this.s.time + this.s.setup.marketSeconds*1000; this.s.turnPlayerId = null;
    for (const p of this.s.players) p.ready=false;
    for (const p of this.active()) if(!p.marketStartHand||this.s.handId+1>=p.marketStartHand+D.marketRefreshHands){p.offers=this.makeOffers(p);p.marketStartHand=this.s.handId+1;}
    this.log('Chợ bài phép mở.');
    this.checkFinished();
  }
  private offerId(p: Player, slot: number) { return `m${this.s.handId + 1}-${p.seat}-${slot}-${Math.floor(this.rnd() * 1e6)}`; }
  private makeOffers(p: Player): OfferRec[] {
    const lvl = this.level(this.s.handId + 1); const pool = [...MAGIC]; const offers: OfferRec[] = [];
    const reserveChance = 0.25 + this.rnd() * 0.25;
    for (let slot = 0; slot < D.marketOffers; slot++) {
      if (pool.length && this.rnd() >= reserveChance) {
        const m = this.pickWeighted(pool, x => x.weight); pool.splice(pool.indexOf(m), 1);
        offers.push({ id: this.offerId(p, slot), slot, magicId: m.id, price: priceFor(m.price, lvl), purchased: false });
      } else {
        const card = this.newSpare('R01', D.reserveShopModifierChance);
        offers.push({ id: this.offerId(p, slot), slot, magicId: 'R01', card, price: priceFor(reserveBasePrice(card), lvl), purchased: false });
      }
    }
    return offers;
  }
  private checkAllReady() {
    if (this.s.phase !== 'market') return;
    if (!this.active().some(p => !p.ready && (p.connected || p.bot))) this.beginHand();
  }
  private takeSlot(p: Player, slot: number): SlotRec { const rec = p.slots[slot] ?? fail('Ô phép trống.'); p.slots[slot] = null; return rec; }
  private newSpare(magicId: string, modifierChance: number = D.modifierChance): Card {
    const mk = (): Card => {
      const id = `s${++this.s.spareSeq}`; const suit = SUITS[Math.floor(this.rnd() * 4)];
      if (magicId === 'X01') return { id, rank: 10 + Math.floor(this.rnd() * 5), suit, ...(this.rnd() < .3 ? { modifiers: ['gold' as CardModifier] } : {}) };
      if (magicId === 'X02') return { id, rank: 2 + Math.floor(this.rnd() * 13), suit, modifiers: ['wild'] };
      const rank=2+Math.floor(this.rnd()*13);
      return {id,rank,suit,...(magicId!=='R01'||this.rnd()<modifierChance?{modifiers:[this.rollModifier()]}:{})};
    };
    return mk();
  }
  private buyMagic(p: Player, c: Extract<Command, { type: 'buyMagic' }>) {
    if (this.s.phase !== 'market') fail('Chợ đang đóng.');
    const offer = p.offers.find(o => o.id === c.offerId) ?? fail('Offer không tồn tại.');
    if (offer.purchased) fail('Đã mua offer này.');
    const m = getMagic(offer.magicId)!;
    if (m.kind !== 'active' && this.holds(p, m.id)) fail('Đã có lá nội tại này.');
    let slot = p.slots.findIndex(x => x === null);
    if (slot < 0) { if (c.replaceSlot === undefined) fail('Khay đầy: chọn lá để thay.'); slot = c.replaceSlot; }
    if (p.wallet < offer.price) fail('Không đủ tiền.');
    p.wallet -= offer.price; this.s.ledger.burned += offer.price; offer.purchased = true;
    p.slots[slot] = { magicId: m.id, ...(m.swap ? { spare: offer.card ? clone(offer.card) : this.newSpare(m.id) } : {}) };
    this.plog(p, `Mua ${m.name} (${offer.price}).`);
    this.event({ type: 'purchase', playerId: p.id, magicId: m.id, to: p.id });
  }

  // ---------- using magic ----------
  private target(p: Player, id: unknown): Player {
    const t = this.player(typeof id === 'string' ? id : fail('Chọn mục tiêu.'));
    if (t.id === p.id || t.folded || t.eliminated || t.hand.length !== 2) fail('Mục tiêu không hợp lệ.');
    return t;
  }
  private useMagic(p: Player, c: Extract<Command, { type: 'useMagic' }>) {
    const rec = p.slots[c.slot] ?? fail('Ô phép trống.'); const m = getMagic(rec.magicId)!;
    if (m.kind !== 'active') fail('Lá nội tại tự có hiệu lực.');
    if (m.swap) fail('Dùng lệnh swap cho lá tráo đổi.');
    if (m.timing === 'anyTime') { if (this.s.phase !== 'playing') fail('Chỉ dùng khi ván đang diễn ra.'); }
    else { this.requirePlaying(p); if (this.s.turnPlayerId !== p.id) fail('Chỉ dùng trong lượt của bạn.'); }
    const handCard = (): Card => { const id = p.hand[c.handIndex ?? fail('Chọn lá bài tay.')]; return this.s.cards[id] ?? fail('Lá bài không hợp lệ.'); };
    switch (m.id) {
      case 'K01': {
        const t = this.target(p, c.targetPlayerId); const id = t.hand[Math.floor(this.rnd() * t.hand.length)];
        const shown = this.shownCard(t, id);
        p.peeks.push({ handId: this.s.handId, label: `Soi ${t.name}`, card: shown, source: 'K01', targetPlayerId: t.id }); this.plog(p, `Soi ${t.name}: ${label(shown)}.`);
        this.disclose(p, 'K01', t); break;
      }
      case 'K02': {
        const t = this.target(p, c.targetPlayerId); const hidden = t.hand.filter(id => !t.revealed.some(r => r.id === id)); if (!hidden.length) fail('Đối thủ không còn lá nào để ép lộ.');
        const id = hidden[Math.floor(this.rnd() * hidden.length)]; t.revealed.push({ id, shown: this.shownCard(t, id) });
        this.disclose(p, 'K02', t); this.plog(t, `${p.name} ép bạn lật ${label(this.s.cards[id])}.`); break;
      }
      case 'K03': {
        if (c.boardIndex === undefined || c.boardIndex >= this.s.board.length) fail('Chọn một lá bài chung đã mở.');
        const drawn = this.draw(); this.s.discard.push(this.s.board[c.boardIndex]); this.s.board[c.boardIndex] = drawn;
        this.disclose(p, 'K03'); this.plog(p, `Đổi bài chung thành ${label(this.s.cards[drawn])}.`); break;
      }
      case 'K04': { const card = handCard(); if (c.modifier !== 'gold' && c.modifier !== 'wild') fail('Chọn Vàng hoặc Muôn chất.'); card.modifiers = [c.modifier]; this.plog(p, `Nâng ${label(card)} thành ${c.modifier === 'gold' ? 'Vàng' : 'Muôn chất'}.`); break; }
      case 'K14': { const card = handCard(); card.modifiers = ['gold']; this.plog(p, `Mạ vàng ${label(card)}.`); break; }
      case 'K15': { const card = handCard(); card.modifiers = ['wild']; this.plog(p, `Biến chất ${label(card)} thành Muôn chất.`); break; }
      case 'K05': { const card = handCard(); if (!card.modifiers?.some(isDebuff)) fail('Lá này không có bẫy hay nguyền.'); delete card.modifiers; this.plog(p, `Gỡ bẫy khỏi ${label(card)}.`); break; }
      case 'K10': {
        const t = this.target(p, c.targetPlayerId); const held = t.slots.filter(x => x).map(x => x!.magicId);
        let entry: PeekEntry;
        if (!held.length) entry = { handId: this.s.handId, label: `Soi phép ${t.name}`, magic: { magicId: null, targetPlayerId: t.id }, text: 'trống' };
        else {
          const real = held[Math.floor(this.rnd() * held.length)]; const ctx: TriggerCtx = { realMagic: real }; this.runTriggers('magic_looked_at', t, ctx);
          const def = getMagic(ctx.shownMagic ?? real)!;
          entry = { handId: this.s.handId, label: `Soi phép ${t.name}`, magic: { magicId: def.id, kind: def.kind, visibility: def.visibility, targetPlayerId: t.id }, text: def.name };
        }
        p.peeks.push(entry); this.plog(p, `Soi phép ${t.name}: ${entry.text}.`); this.disclose(p, 'K10', t); break;
      }
      case 'K07': { const id = this.s.deck[0] ?? fail('Chồng bài đã hết.'); p.peeks.push({ handId: this.s.handId, label: 'Quả cầu soi', card: this.card(id), source: 'K07', boardIds: [...this.s.board] }); this.plog(p, `Quả cầu soi: lá kế tiếp là ${label(this.s.cards[id])}.`); break; }
      case 'K08': {
        const t = this.target(p, c.targetPlayerId); const id = t.hand[Math.floor(this.rnd() * t.hand.length)]; const card = this.s.cards[id];
        const trap=this.rnd()<.5?'trapRank':'trapSuit';
        if(this.holds(t,'N04')){this.disclose(t,'N04');this.plog(t,'Áo giáp đã chặn bẫy mới.');}else card.modifiers=[trap];
        this.disclose(p, 'K08', t); this.plog(p, `Bùa bẫy trúng ${t.name}.`); break;
      }
      case 'K11': case 'K12': {
        const t=this.target(p,c.targetPlayerId);
        const held=t.slots.map((rec,slot)=>({rec,slot})).filter(x=>x.rec);
        const eligible=m.id==='K11'?held.filter(x=>{const d=getMagic(x.rec!.magicId)!;return d.kind==='active'||!this.holds(p,d.id);}):held;
        if(!eligible.length)fail('Đối thủ không có lá phép phù hợp.');
        const selected=this.shuffle(eligible.map(x=>String(x.slot))).slice(0,m.id==='K11'?1:2).map(Number);
        for(const index of selected){const taken=t.slots[index]!;t.slots[index]=null;if(m.id==='K11')p.slots[c.slot]=taken;this.plog(t,`${p.name} ${m.id==='K11'?'trộm':'phá'} ${getMagic(taken.magicId)!.name}.`);this.plog(p,`${m.id==='K11'?'Trộm':'Phá'} ${getMagic(taken.magicId)!.name} của ${t.name}.`);}
        this.disclose(p,m.id,t);break;
      }
      case 'K13': {
        if(this.s.deck.length<2)fail('Không đủ bài để đổi vận.');
        this.s.discard.push(...p.hand);p.hand=[this.draw(),this.draw()];
        this.runTriggers('deal',p);this.runTriggers('trap_applied',p);
        this.disclose(p,m.id);this.plog(p,'Đổi vận: nhận hai lá bài tay mới.');break;
      }
      case 'K09': {
        const others = MAGIC.filter(x => x.id !== 'K09'); const fake = others[Math.floor(this.rnd() * others.length)];
        this.disclose(p, 'K09', undefined, fake.id); break;
      }
      default: fail('Lá phép không dùng được.');
    }
    if (['K04', 'K05', 'K07', 'K14', 'K15'].includes(m.id)) this.disclose(p, m.id);
    if(m.id!=='K11')p.slots[c.slot] = null; this.event({ type: 'use', playerId: p.id, magicId: m.id, to: p.id });
  }
  private swap(p: Player, c: Extract<Command, { type: 'swap' }>) {
    this.requirePlaying(p); if (this.s.turnPlayerId !== p.id) fail('Chỉ dùng trong lượt của bạn.');
    const rec = p.slots[c.slot] ?? fail('Ô phép trống.'); const def = getMagic(rec.magicId); if (!def?.swap || !rec.spare) fail('Không phải lá tráo đổi.');
    const old = p.hand[c.handIndex]; const spare = rec.spare;
    const outgoing=this.card(old);
    this.s.cards[spare.id]=clone(spare);p.hand[c.handIndex]=spare.id;
    const consumed=!!def.consumed;
    if (consumed) { p.slots[c.slot] = null; this.s.discard.push(old); } else { delete this.s.cards[old]; rec.spare=outgoing; }
    this.disclose(p,rec.magicId);this.runTriggers('trap_applied',p);
    this.plog(p,consumed?`Đổi ${label(outgoing)} lấy ${label(spare)}; lá cũ bị bỏ, dùng hết lá dự trữ.`:`Đổi ${label(outgoing)} lấy ${label(spare)}; lá cũ trở về ô dự trữ.`);
    this.event({ type: 'use', playerId: p.id, magicId: rec.magicId, to: p.id });
  }

  // ---------- hand flow ----------
  private checkFinished() {
    if (this.s.phase === 'lobby') return;
    const active = this.active(); if (active.length > 1) return;
    this.s.phase = 'finished'; this.s.deadline = 0; this.s.turnPlayerId = null;
    this.s.winnerId = active.length === 1 ? active[0].id : null;
    this.log(this.s.winnerId ? `${this.player(this.s.winnerId).name} thắng trận.` : 'Trận đấu hòa.', 'win');
  }
  /** Keep live-hand contributions available to side-pot settlement after removing a client. */
  private kick(p: Player, c: Extract<Command, { type: 'kick' }>) {
    if (p.id !== this.s.hostId) fail('Chỉ chủ phòng được đuổi người chơi.');
    if (c.targetPlayerId === p.id) fail('Không thể tự đuổi chính mình.');
    const target = this.s.players.find(q => q.id === c.targetPlayerId) ?? fail('Không tìm thấy người chơi.');
    if (target.kicked) fail('Người chơi đã rời bàn.');
    if (['lobby', 'finished'].includes(this.s.phase)) this.s.players = this.s.players.filter(q => q.id !== target.id);
    else {
      target.kicked = true; target.connected = false; target.folded = true; target.eliminated = true;
      target.ready = false; target.slots = Array(MAGIC_SLOTS).fill(null);
      if (this.s.turnPlayerId === target.id) {
        const next = this.clockwise(this.contenders().filter(q => !q.allIn && (q.actedBet === null || q.bet < this.s.currentBet)), target.seat)[0];
        this.setTurn(next?.id ?? null);
      }
      this.advance(); this.checkFinished();
      if (this.s.phase === 'market') this.checkAllReady();
    }
    this.log(`Chủ phòng đuổi ${target.name} khỏi bàn.`);
  }
  /** Host-only, any phase: hands host control to another connected human player. */
  private transferHost(p: Player, c: Extract<Command, { type: 'transferHost' }>) {
    if (p.id !== this.s.hostId) fail('Chỉ chủ phòng chuyển được quyền.');
    if (c.targetPlayerId === p.id) fail('Bạn đã là chủ phòng.');
    const target = this.s.players.find(q => q.id === c.targetPlayerId) ?? fail('Không tìm thấy người chơi.');
    if (target.bot) fail('Không thể trao quyền cho máy.');
    if (!target.connected || target.eliminated || target.kicked) fail('Chỉ trao quyền cho người đang chơi và có kết nối.');
    this.s.hostId = target.id;
    this.log(`${p.name} trao quyền chủ phòng cho ${target.name}.`);
  }
  /** Host-only, mid-match: aborts early. Whoever has the most chips among non-eliminated players wins; ties/empty table have no winner. */
  private endMatch(p: Player) {
    if (p.id !== this.s.hostId || ['lobby', 'finished'].includes(this.s.phase)) fail('Chỉ chủ phòng kết thúc được trận đang diễn ra.');
    const active = this.active();
    const top = active.length ? active.reduce((a, b) => (b.wallet > a.wallet ? b : a)) : null;
    const winner = top && active.every(q => q.id === top.id || q.wallet < top.wallet) ? top : null;
    this.s.phase = 'finished'; this.s.deadline = 0; this.s.turnPlayerId = null; this.s.winnerId = winner?.id ?? null;
    this.log(winner ? `Chủ phòng kết thúc trận sớm. ${winner.name} đang dẫn đầu.` : 'Chủ phòng kết thúc trận sớm.', 'win');
  }
  /** Host-only, phase 'finished' only: fresh match, same seats/names/characters/host, everyone back to the lobby. */
  private rematch(p: Player) {
    if (p.id !== this.s.hostId || this.s.phase !== 'finished') fail('Chỉ chủ phòng bắt đầu ván mới sau khi trận kết thúc.');
    this.s.players = this.s.players.filter(q => !q.kicked);
    for (const q of this.s.players) {
      q.wallet = this.s.setup.startingWallet; q.eliminated = false; q.folded = false; q.allIn = false; q.bet = 0; q.contribution = 0;
      q.hand = []; q.revealed = []; q.slots = Array(MAGIC_SLOTS).fill(null); q.offers = []; q.marketStartHand = undefined;
      q.peeks = []; q.privateLog = []; q.lastBonuses = []; q.actedBet = null; q.ready = q.bot;
    }
    this.s.handId = 0; this.s.street = 'preflop'; this.s.board = []; this.s.deck = []; this.s.discard = [];
    this.s.cards = {}; this.s.spareSeq = 0; this.s.dealerSeat = -1; this.s.turnPlayerId = null; this.s.currentBet = 0;
    this.s.smallBlind = this.s.setup.smallBlind; this.s.bigBlind = this.s.setup.bigBlind; this.s.lastRaise = this.s.setup.bigBlind;
    this.s.winnerId = null; this.s.result = null; this.s.deadline = 0; this.s.ledger = { burned: 0, minted: 0 }; this.s.phase = 'lobby';
    this.log('Chủ phòng bắt đầu ván mới. Mọi người cần sẵn sàng lại.');
  }
  private levelBlinds(level: number) {const base=this.s.setup,factor=Math.pow(this.blindGrowth,level);const bb=level===0?base.bigBlind:Math.max(base.bigBlind,Math.round(base.bigBlind*factor/10)*10);const sb=level===0?base.smallBlind:Math.min(bb-1,Math.max(base.smallBlind,Math.round(base.smallBlind*factor/5)*5));return {smallBlind:sb,bigBlind:bb};}
  private setBlinds() {
    const level = this.level(this.s.handId); const b = this.levelBlinds(level); this.s.bigBlind = b.bigBlind; this.s.smallBlind = b.smallBlind;
    if (level > 0 && this.s.handId % this.blindEvery === 0) this.log(`Blind tăng lên ${b.smallBlind}/${b.bigBlind}.`);
  }
  private ensureHost() {
    const ok = (p: Player) => !p.eliminated; const h = this.s.players.find(p => p.id === this.s.hostId);
    if (h && ok(h) && (h.connected || h.bot)) return;
    const cand = this.s.players.filter(ok); const next = cand.find(p => p.connected && !p.bot) ?? cand.find(p => !p.bot) ?? cand[0];
    if (next && next !== h && (!h || !ok(h) || (next.connected && !next.bot))) this.s.hostId = next.id;
  }
  private buildDeck() {
    const cards: Record<string, Card> = {};
    for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) {
      const c: Card = { id: `h${this.s.handId+1}-${rankLabel(rank)}${suit}`, rank, suit }; if (this.rnd() < D.modifierChance) c.modifiers = [this.rollModifier()]; cards[c.id] = c;
    }
    this.s.cards = cards; this.s.deck = this.shuffle(Object.keys(cards)); this.s.board = []; this.s.discard = [];
  }
  private beginHand() {
    this.checkFinished(); if (this.s.phase === 'finished') return;
    this.buildDeck(); this.s.handId++; this.event({ type: 'shuffle', handId: this.s.handId }); this.s.phase = 'playing'; this.s.street = 'preflop'; this.s.result = null; this.setBlinds();
    this.s.currentBet = this.s.bigBlind; this.s.lastRaise = this.s.bigBlind;
    const active = this.active(); const dealer = this.clockwise(active, this.s.dealerSeat)[0]; this.s.dealerSeat = dealer.seat;
    for (const p of this.s.players) { p.folded = p.eliminated; p.allIn = false; p.bet = 0; p.contribution = 0; p.actedBet = null; p.hand = []; p.revealed = []; p.peeks = []; p.lastBonuses = []; }
    for (let round = 0; round < 2; round++) for (const p of this.clockwise(active, dealer.seat)) p.hand.push(this.draw());
    for (const p of active) {this.runTriggers('deal', p);this.runTriggers('trap_applied',p);}
    const after = this.clockwise(active, dealer.seat); const sb = active.length === 2 ? dealer : after[0]; const bb = active.length === 2 ? after[0] : after[1];
    this.commit(sb, Math.min(sb.wallet, this.s.smallBlind)); this.commit(bb, Math.min(bb.wallet, this.s.bigBlind));
    this.setTurn(this.clockwise(active, bb.seat).find(p => !p.allIn)?.id ?? null); this.log(`Ván ${this.s.handId} bắt đầu.`);
    this.advance();
  }
  private setTurn(id: string | null) { this.s.turnPlayerId = id; this.s.deadline = id ? this.s.time + this.s.setup.turnSeconds*1000 : 0; }
  private legal(p: Player): LegalActions {
    const playing = this.s.phase === 'playing' && this.s.turnPlayerId === p.id && !p.folded && !p.eliminated && !p.allIn;
    const due = Math.max(0, this.s.currentBet - p.bet); const max = p.bet + p.wallet;
    const reopened = p.actedBet === null || this.s.currentBet - p.actedBet >= this.s.lastRaise;
    return { canCheck: playing && due === 0, callAmount: playing ? Math.min(due, p.wallet) : 0, minRaiseTo: this.s.currentBet + this.s.lastRaise, maxRaiseTo: playing ? max : 0, canRaise: playing && reopened && max > this.s.currentBet && this.contenders().some(q => q.id !== p.id && !q.allIn), canFold: playing };
  }
  private commit(p: Player, amount: number) {
    if (amount > p.wallet) fail('Không đủ tiền.');
    p.wallet -= amount; p.bet += amount; p.contribution += amount; p.allIn = p.wallet === 0;
  }
  private bet(p: Player, c: Extract<Command, { type: 'bet' }>) {
    this.requirePlaying(p); if (this.s.turnPlayerId !== p.id || p.allIn) fail('Chưa đến lượt cược.');
    const due = Math.max(0, this.s.currentBet - p.bet), capacity = p.wallet;
    const reopened = p.actedBet === null || this.s.currentBet - p.actedBet >= this.s.lastRaise;
    let target = p.bet;
    if (c.action === 'fold') { p.folded = true; this.log(`${p.name} bỏ bài.`, 'bet'); }
    else {
      switch (c.action) {
        case 'check': if (due) fail('Không thể check khi còn tiền cần theo.'); break;
        case 'call': if (!due || !capacity) fail('Không có cược để theo.'); target = p.bet + Math.min(due, capacity); break;
        case 'raise': if (!integer(c.amount) || c.amount <= this.s.currentBet) fail('Mức raise không hợp lệ.'); target = c.amount; break;
        case 'allIn': if (!p.wallet) fail('Không còn tiền cược.'); target = p.bet + p.wallet; if (!this.contenders().some(q => q.id !== p.id && !q.allIn)) target = Math.min(target, this.s.currentBet); break;
        default: fail('Hành động cược không hợp lệ.');
      }
      if (target - p.bet > capacity) fail('Không đủ tiền cược.');
      if (target > this.s.currentBet) {
        if (!reopened || !this.contenders().some(q => q.id !== p.id && !q.allIn)) fail('Quyền raise chưa mở lại.');
        const increase = target - this.s.currentBet;
        if (increase < this.s.lastRaise && target - p.bet !== capacity) fail('Raise thấp hơn tối thiểu.');
        if (increase >= this.s.lastRaise) this.s.lastRaise = increase;
        this.s.currentBet = target;
      }
      if (target > p.bet) this.commit(p, target - p.bet);
      this.log(`${p.name} ${c.action === 'check' ? 'check' : c.action === 'allIn' ? 'all-in' : c.action === 'call' ? 'theo cược' : 'tăng cược'}${target > 0 ? ` (${target})` : ''}.`, 'bet');
    }
    p.actedBet = this.s.currentBet;
    const next = this.clockwise(this.contenders().filter(q => !q.allIn && (q.actedBet === null || q.bet < this.s.currentBet)), p.seat)[0]; this.setTurn(next?.id ?? null); this.advance();
  }
  private advance() {
    if (this.s.phase !== 'playing') return;
    const contenders = this.contenders();
    if (contenders.length <= 1) { this.settle(); return; }
    const needs = contenders.filter(p => !p.allIn && (p.actedBet === null || p.bet < this.s.currentBet));
    const canAct = contenders.filter(p => !p.allIn);
    if (needs.length && (canAct.length >= 2 || needs.some(p => p.bet < this.s.currentBet))) { if (!this.s.turnPlayerId) this.setTurn(this.clockwise(needs, this.s.dealerSeat)[0].id); return; }
    this.s.turnPlayerId = null;
    if (this.s.street === 'river') { this.settle(); return; }
    const next: Record<Street, Street> = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'river' };
    this.s.street = next[this.s.street]; const count = this.s.street === 'flop' ? 3 : 1; for (let i = 0; i < count; i++) this.s.board.push(this.draw());
    this.s.currentBet = 0; this.s.lastRaise = this.s.bigBlind;
    for (const p of this.s.players) { p.bet = 0; p.actedBet = null; }
    this.log(`Mở ${this.s.street}.`);
    if (canAct.length >= 2) this.setTurn(this.clockwise(canAct, this.s.dealerSeat)[0].id); else this.advance();
  }
  /** Hole cards as the evaluator sees them: N04 (Áo giáp bẫy) strips trap modifiers from the owner's hole cards. */
  private evalCards(p: Player): Card[] {
    const armor = this.holds(p, 'N04');
    const hole = p.hand.map(id => { const c = this.card(id); if (armor && c.modifiers) { c.modifiers = c.modifiers.filter(m => m !== 'trapRank' && m !== 'trapSuit'); if (!c.modifiers.length) delete c.modifiers; } return c; });
    return [...hole, ...this.s.board.map(id => this.card(id))];
  }
  private settle() {
    const contenders = this.contenders(); const showdown = contenders.length > 1 && this.s.board.length === 5;
    const awards = new Map<string, number>(); const ranks = new Map(contenders.filter(() => this.s.board.length === 5).map(p => [p.id, evaluateHand(this.evalCards(p))]));
    for (const band of buildPotBands(this.s.players)) {
      let eligible = band.eligibleIds.map(id => this.player(id)); let winners: Player[];
      if (band.contributorIds.length === 1) winners = [this.player(band.contributorIds[0])];
      else {
        if (!eligible.length) eligible = contenders;
        if (eligible.length <= 1) winners = eligible;
        else { let best = eligible[0]; for (const p of eligible) if (compareHands(ranks.get(p.id)!, ranks.get(best.id)!) > 0) best = p; winners = eligible.filter(p => compareHands(ranks.get(p.id)!, ranks.get(best.id)!) === 0); }
      }
      if (!winners.length) winners = this.s.players.filter(p => band.contributorIds.includes(p.id));
      winners = this.clockwise(winners, this.s.dealerSeat); const share = Math.floor(band.amount / winners.length), odd = band.amount % winners.length;
      winners.forEach((p, i) => { const amount = share + (i < odd ? 1 : 0); p.wallet += amount; if (amount) awards.set(p.id, (awards.get(p.id) ?? 0) + amount); });
    }
    const bb = this.s.bigBlind; const bonuses: Bonus[] = [];
    for (const [id, gross] of awards) {
      const p = this.player(id);
      this.runTriggers('win_pot', p, { gross });
      const best = ranks.get(id);
      if (showdown && best) {
        const used = best.cards;
        if (used.filter(c => c.modifiers?.includes('gold')).length >= D.goldMinCards) {
          const amount = Math.min(D.goldBonusMaxBB * bb, Math.max(D.goldBonusMinBB * bb, Math.floor(gross * D.goldBonusPct)));
          this.mint(p, amount); p.lastBonuses.push({ kind: 'gold', amount }); bonuses.push({ playerId: p.id, kind: 'gold', amount }); this.plog(p, `Thưởng Vàng: +${amount}.`);
        }
        if (used.some(c => c.modifiers?.includes('lucky'))) {
          const amount = D.luckyBonusBB * bb; this.mint(p, amount); p.lastBonuses.push({ kind: 'lucky', amount }); bonuses.push({ playerId: p.id, kind: 'lucky', amount }); this.plog(p, `Hạnh vận: +${amount}.`);
        }
        if (used.some(c => c.modifiers?.includes('cursed'))) {
          const amount = Math.min(D.cursedPenaltyBB * bb, gross, p.wallet);
          if (amount > 0) { p.wallet -= amount; this.s.ledger.burned += amount; bonuses.push({ playerId: p.id, kind: 'cursed', amount: -amount }); p.lastBonuses.push({ kind: 'cursed', amount: -amount }); this.plog(p, `Nguyền: -${amount}.`); }
        }
      }
    }
    if (showdown) for (const p of contenders) if (!awards.has(p.id)) this.runTriggers('lose_showdown', p, { contribution: p.contribution });
    const winners = [...awards].map(([playerId, amount]) => ({ playerId, amount, ...(ranks.has(playerId) && showdown ? { handName: ranks.get(playerId)!.name } : {}) }));
    const revealed = showdown ? contenders.map(p => ({ playerId: p.id, cards: p.hand.map(id => this.card(id)) })) : [];
    this.s.result = { winners, revealed, bonuses, summary: winners.map(w => `${this.player(w.playerId).name} nhận ${w.amount}`).join('; ') };
    this.s.phase = 'showdown'; this.s.turnPlayerId = null; this.s.deadline = this.s.time + D.showdownMs; this.log(this.s.result.summary, 'win');
    for (const p of this.active()) {
      if (p.wallet > 0) continue;
      if (!this.runTriggers('bankrupt', p)) { p.eliminated = true; p.folded = true; p.slots = Array(MAGIC_SLOTS).fill(null); }
    }
    this.checkFinished();
  }

  // ---------- time ----------
  tick(now: number): void {
    if (!Number.isFinite(now) || now < this.s.time) return; this.s.time = now; if (this.s.phase !== 'lobby') this.ensureHost();
    if (this.s.phase === 'finished' || this.s.phase === 'lobby') return;
    if (this.s.phase === 'market') { if (now >= this.s.deadline) this.beginHand(); else this.checkAllReady(); return; }
    if (this.s.phase === 'showdown') { if (now >= this.s.deadline) this.openMarket(); return; }
    for (const p of this.active()) if (!p.connected && p.disconnectedAt !== null && now - p.disconnectedAt >= 45000) { p.eliminated = true; p.folded = true; }
    if (this.s.turnPlayerId && this.s.deadline && now >= this.s.deadline) {
      const p = this.player(this.s.turnPlayerId);
      if (!p.folded && !p.allIn) this.bet(p, { type: 'bet', commandId: this.id(), handId: this.s.handId, action: p.bet === this.s.currentBet ? 'check' : 'fold' });
      else this.setTurn(null);
    }
    this.advance();
  }

  // ---------- snapshots ----------
  publicSnapshot(now: number): RoomSnapshot {
    const s = this.s;
    const players: PublicPlayer[] = s.players.map(p => ({
      id: p.id, name: p.name, seat: p.seat, character: p.character, connected: p.connected, ready: p.ready, bot: p.bot, folded: p.folded, eliminated: p.eliminated, allIn: p.allIn,
      bet: p.bet, contribution: p.contribution, handSize: p.hand.length, revealedCards: p.revealed.map(r => clone(r.shown)), ...(p.kicked ? {kicked:true} : {}),
    }));
    const paid = s.phase === 'showdown' || s.phase === 'finished' || s.phase === 'market';
    return {
      setup:clone(s.setup),roomId: s.roomId, code: s.code, phase: s.phase, handId: s.handId, street: s.street, players, board: s.board.map(id => this.card(id)),
      pots: paid ? [] : buildPotBands(s.players).map(({ amount, eligibleIds }) => ({ amount, eligibleIds })), pot: paid ? 0 : s.players.reduce((sum, p) => sum + p.contribution, 0),
      turnPlayerId: s.turnPlayerId, hostId: s.hostId, dealerSeat: s.dealerSeat, smallBlind: s.smallBlind, bigBlind: s.bigBlind, deadline: s.deadline, serverTime: now, log: clone(s.log),
      result: s.result ? clone(s.result) : null, winnerId: s.winnerId,
      nextBlindInHands: this.blindEvery > 0 ? this.blindEvery - (s.handId % this.blindEvery) : null,
      nextBlinds: this.blindEvery > 0 ? this.levelBlinds(Math.floor(s.handId / this.blindEvery) + 1) : null,
    };
  }
  privateSnapshot(playerId: string, _now: number): PrivateSnapshot {
    const p = this.player(playerId);
    const myTurn = this.s.phase === 'playing' && this.s.turnPlayerId === p.id && !p.folded;
    const magic: MagicSlot[] = []; p.slots.forEach((rec, slot) => {
      if (!rec) return; const m = getMagic(rec.magicId)!;
      const usable = m.kind === 'active' && (m.timing === 'market' ? this.s.phase === 'market' : m.timing === 'anyTime' ? this.s.phase === 'playing' : myTurn);
      magic.push({ slot, magicId: rec.magicId, usable, ...(rec.spare ? { spare: clone(rec.spare) } : {}) });
    });
    const market: MarketOffer[] = this.s.phase !== 'market' ? [] : p.offers.filter(o=>!o.purchased).map(o => {
      const m = getMagic(o.magicId)!;
      return { id: o.id, slot: o.slot, magicId: m.id, name: m.name, kind: m.kind, visibility: m.visibility, swap: !!m.swap, ...(m.trigger ? { trigger: m.trigger } : {}), description: m.description, ...(o.card?{card:clone(o.card),name:`${m.name} · ${label(o.card)}`}:{}), price: o.price, purchased: o.purchased, owned: m.kind !== 'active' && this.holds(p, m.id) };
    });
    return { playerId: p.id, wallet: p.wallet, hand: p.hand.map(id => this.card(id)), magic, market, marketRefreshPrice:priceFor(D.marketRefreshPrice,this.level(this.s.handId+1)),marketHandsLeft:Math.max(0,(p.marketStartHand??1)+D.marketRefreshHands-(this.s.handId+1)), peeks: clone(p.peeks), privateLog: clone(p.privateLog), lastBonuses: clone(p.lastBonuses), legal: this.legal(p) };
  }
  takeEvents(): GameEvent[] { const events = clone(this.s.events); this.s.events = []; return events; }
  serialize(): unknown { return clone(this.s); }
  private validateSnapshot() {
    const s = this.s;
    if(!validSetup(s.setup))fail('Setup không hợp lệ.');
    if (s.version !== 2 || s.players.length > 4 || new Set(s.players.map(p => p.id)).size !== s.players.length) fail('Snapshot không hợp lệ.');
    if (!['lobby', 'market', 'playing', 'showdown', 'finished'].includes(s.phase) || !integer(s.handId)) fail('Snapshot không hợp lệ.');
    const ids = [...s.deck, ...s.board, ...s.discard, ...s.players.flatMap(p => p.hand)];
    const keys = Object.keys(s.cards);
    if (ids.length !== keys.length || new Set(ids).size !== ids.length || ids.some(id => !s.cards[id])) fail('Snapshot vi phạm bảo toàn lá bài.');
    for (const c of Object.values(s.cards)) if (!Number.isInteger(c.rank) || c.rank < 2 || c.rank > 14 || !SUITS.includes(c.suit) || (c.modifiers ?? []).some(m => !(CARD_MODIFIERS as readonly string[]).includes(m)) || (c.modifiers?.length ?? 0) > 1) fail('Snapshot lá bài không hợp lệ.');
    const reserves=s.players.flatMap(p=>[...p.slots.flatMap(x=>x?.spare?[x.spare]:[]),...p.offers.flatMap(o=>!o.purchased&&o.card?[o.card]:[])]);
    for(const c of reserves)if(typeof c.id!=='string'||!c.id||!Number.isInteger(c.rank)||c.rank<2||c.rank>14||!SUITS.includes(c.suit)||(c.modifiers??[]).some(m=>!(CARD_MODIFIERS as readonly string[]).includes(m))||(c.modifiers?.length??0)>1)fail('Lá dự trữ không hợp lệ.');
    const spareIds=reserves.map(c=>c.id);
    this.s.spareSeq=Math.max(this.s.spareSeq,...spareIds.map(id=>/^s\d+$/.test(id)?Number(id.slice(1)):0));
    if (new Set([...spareIds, ...keys]).size !== spareIds.length + keys.length) fail('Id lá dự trữ trùng.');
    for (const p of s.players) {
      if (!integer(p.wallet) || !integer(p.contribution) || !integer(p.bet) || p.slots.length !== MAGIC_SLOTS) fail('Snapshot tài sản không hợp lệ.');
      if (p.slots.some(x => x && !getMagic(x.magicId))) fail('Lá phép không hợp lệ.');
      if (p.hand.length > 2) fail('Snapshot bài tay không hợp lệ.');
    }
    if (!integer(s.ledger?.burned) || !integer(s.ledger?.minted)) fail('Snapshot sổ cái không hợp lệ.');
  }
}

export const createGame = (options: GameOptions): GameEngine => new Engine(options);
/** Server-only trusted persistence snapshot. Never send serialize() to clients. */
export const restoreGame = (snapshot: unknown, options: GameOptions): GameEngine => new Engine(options, snapshot as State);
