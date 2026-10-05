/**
 * Shared bot brain. Used by apps/server (real rooms) and the web offline demo.
 * Bots only see what a human seat sees: their own PrivateSnapshot + the public RoomSnapshot. They act through ordinary engine commands.
 */
import { compareHands, evaluateHand, evaluateHoldem } from '@saloon/rules';
import { getMagic } from '@saloon/content';
import { MAGIC_SLOTS, isDebuff, type Card, type Command, type GameEngine, type PrivateSnapshot, type RoomSnapshot } from '@saloon/protocol';

type Strip<T> = T extends unknown ? Omit<T, 'commandId' | 'handId'> : never;
export type BotCmd = Strip<Command>;
type Bet = Extract<BotCmd, { type: 'bet' }>;

// ---------- hand strength ----------
const CAT = [0.25, 0.5, 0.7, 0.8, 0.85, 0.88, 0.93, 0.98, 1, 1];
/** Strength in [0,1]: heuristic preflop, made-hand category postflop (a pair on the board alone is worth little). */
export function handStrength(hand: Card[], board: Card[]): number {
  if (hand.length < 2) return 0.3;
  if (board.length < 3) {
    const hi = Math.max(hand[0].rank, hand[1].rank), lo = Math.min(hand[0].rank, hand[1].rank);
    if (hi === lo) return 0.55 + (hi - 2) / 12 * 0.4;
    return Math.min(0.62, (hi + lo - 4) / 24 * 0.6 + (hand[0].suit === hand[1].suit ? 0.05 : 0) + (hi - lo <= 2 ? 0.04 : 0));
  }
  const e = evaluateHoldem(hand, board);
  const usesHole = e.cards.some(c => hand.some(h => h.id === c.id));
  let v = CAT[e.category];
  if (e.category <= 1 && !usesHole) v = 0.3;
  return Math.min(1, v + (e.category <= 1 ? (e.tiebreak[0] - 2) / 12 * 0.15 : 0));
}

// ---------- betting ----------
function protectedHand(own: PrivateSnapshot): Card[] {
  if (!own.magic.some(m => m.magicId === 'N04')) return own.hand;
  return own.hand.map(c => ({ ...c, modifiers: c.modifiers?.filter(m => m !== 'trapRank' && m !== 'trapSuit') }));
}

/** Latest information actually received by this seat. It may be fake or become stale after a hidden swap. */
function seenMagic(own: PrivateSnapshot, pub: RoomSnapshot, target: string): string | null | undefined {
  return own.peeks.filter(p => p.handId === pub.handId && p.magic?.targetPlayerId === target).at(-1)?.magic?.magicId;
}

/** Small adjustments from private peeks, rather than treating incomplete/fake information as certainty. */
export function bettingStrength(own: PrivateSnapshot, pub: RoomSnapshot): number {
  const hand = protectedHand(own);
  const base = handStrength(hand, pub.board);
  let adjustment = 0;
  const prediction = own.peeks.filter(p => p.handId === pub.handId && p.source === 'K07' && p.card &&
    p.boardIds?.join(',') === pub.board.map(c => c.id).join(',')).at(-1)?.card;
  if (prediction && pub.board.length < 5 && ![...hand, ...pub.board].some(c => c.id === prediction.id)) {
    if (pub.board.length >= 3) adjustment += (handStrength(hand, [...pub.board, prediction]) - base) * 0.5;
    else if (hand.some(c => c.rank === prediction.rank)) adjustment += 0.08;
  }
  if (pub.board.length >= 4) {
    const mine = evaluateHoldem(hand, pub.board);
    for (const foe of pub.players.filter(p => p.id !== own.playerId && !p.folded && !p.eliminated)) {
      const peek = own.peeks.filter(p => p.handId === pub.handId && p.source === 'K01' && p.targetPlayerId === foe.id && p.card).at(-1)?.card;
      if (!peek || [...hand, ...pub.board].some(c => c.id === peek.id)) continue;
      const magic = seenMagic(own, pub, foe.id);
      // Known deception/swaps lower confidence; don't inspect card ids to recognise a fake.
      const confidence = magic === 'N08' || magic?.startsWith('X') ? 0.5 : 1;
      if (compareHands(evaluateHand([...pub.board, peek]), mine) > 0) adjustment -= 0.12 * confidence;
    }
  }
  return Math.max(0, Math.min(1, base + Math.max(-0.2, Math.min(0.15, adjustment))));
}

/** Ordered list of bet commands to try until the engine accepts one. Raises and re-raises sized off the pot; folds only when facing a bet with a weak hand. */
export function decideBet(own: PrivateSnapshot, pub: RoomSnapshot, rnd: () => number): Bet[] {
  const l = own.legal;
  const me = pub.players.find(p => p.id === own.playerId);
  const myBet = me?.bet ?? 0;
  const curBet = Math.max(0, ...pub.players.map(p => p.bet));
  const s = bettingStrength(own, pub) + (rnd() - 0.5) * 0.14;
  const facing = l.callAmount > 0;
  const pot = Math.max(pub.pot, pub.bigBlind * 2);
  const need = l.callAmount / (pot + l.callAmount);                 // pot odds
  const bluff = rnd() < (facing ? 0.04 : 0.05);
  const wantRaise = l.canRaise && own.wallet > l.callAmount && ((s > (facing ? 0.68 : 0.62) && rnd() < 0.8) || bluff);
  const out: Bet[] = [];
  if (wantRaise) {
    const frac = s > 0.88 ? 0.8 : s > 0.7 ? 0.6 : 0.4;              // value bets bigger; bluffs/medium smaller
    const stackCap = myBet + own.wallet * (s > 0.92 ? 1 : 0.5);      // don't shove a big chunk of the stack without a monster
    const target = Math.round(curBet + (pot + l.callAmount) * frac * 0.95 * (0.85 + rnd() * 0.3));
    const amount = Math.floor(Math.min(l.maxRaiseTo, myBet + own.wallet, stackCap, target));   // protocol wants an integer
    if (amount >= l.minRaiseTo) out.push({ type: 'bet', action: 'raise', amount });
    else if (s > 0.75 && l.maxRaiseTo > 0 && l.maxRaiseTo < l.minRaiseTo) out.push({ type: 'bet', action: 'allIn' });   // short stack cannot make a legal min-raise: shove or just call
  }
  if (l.canCheck) { out.push({ type: 'bet', action: 'check' }); }
  else {
    const tiny = l.callAmount <= pub.bigBlind && s > 0.15;          // never fold playable hands to a min bet
    const weak = s < need * 1.15 + 0.05 - (s > 0.5 ? 0.2 : 0);
    if (!tiny && weak && l.canFold && rnd() < 0.92) out.push({ type: 'bet', action: 'fold' });
    if (l.callAmount >= own.wallet) out.push({ type: 'bet', action: 'allIn' });
    else out.push({ type: 'bet', action: 'call' });
  }
  out.push({ type: 'bet', action: 'check' }, { type: 'bet', action: 'call' }, { type: 'bet', action: 'allIn' }, { type: 'bet', action: 'fold' });
  return out;
}

// ---------- magic: buying and using ----------
/** Buying style: smart (default shipped bot), all (buy everything affordable), cheap (only base price <= 65), none. Used by the sim to compare policies. */
export type BotPolicy = 'smart' | 'all' | 'cheap' | 'none';
export interface BotMemory { key: string; actAt: number; extraAt: number; phaseKey: string; queue: BotCmd[]; policy: BotPolicy; usedThisTurn: number }
export const newBotMemory = (now: number, policy: BotPolicy = 'smart'): BotMemory => ({ key: '', actAt: 0, extraAt: now + 1500, phaseKey: '', queue: [], policy, usedThisTurn: 0 });

/** How much a bot values holding a card (0..10). */
const VALUE: Record<string, number> = { N01: 6, N02: 8, N03: 5, N04: 4, N05: 5, N06: 4, K01: 3, K02: 2, K03: 3, K04: 6, K05: 4, K06: 2, K07: 3, K08: 3, X01: 8, X02: 7, X03: 4, N07: 3, N08: 3, K09: 1, K10: 4, N09: 2, R01: 5, K11: 7, K12: 7, K13: 5 };
const valueOf = (id: string) => VALUE[id] ?? 1;

function marketPlan(own: PrivateSnapshot, pub: RoomSnapshot, mem: BotMemory): BotCmd[] {
  const plan: BotCmd[] = [];
  if (mem.policy === 'none') return plan;
  const keep = mem.policy === 'all' ? 100 : Math.max(250, pub.bigBlind * 10);          // chips a bot refuses to spend below
  let money = own.wallet - keep;
  const slots: (string | null)[] = Array.from({ length: MAGIC_SLOTS }, (_, i) => own.magic.find(m => m.slot === i)?.magicId ?? null);
  const offers = [...own.market].filter(o => !o.purchased && !o.owned).sort((a, b) => valueOf(b.magicId) - valueOf(a.magicId));
  const budget = mem.policy === 'smart' ? Math.min(money, Math.max(120, own.wallet * 0.2)) : money;
  let left = budget;
  for (const o of offers) {
    if (o.price > left) continue;
    if (mem.policy === 'cheap' && (getMagic(o.magicId)?.price ?? 999) > 65) continue;
    if (mem.policy === 'smart' && valueOf(o.magicId) < 4) continue;
    if (o.kind !== 'active' && slots.includes(o.magicId)) continue;
    let slot = slots.indexOf(null);
    if (slot < 0) {
      // Replace the least valuable held card, only if the new one is clearly better (all/cheap replace anything of lower value).
      let worst = 0; slots.forEach((id, i) => { if (valueOf(id!) < valueOf(slots[worst]!)) worst = i; });
      if (valueOf(o.magicId) <= valueOf(slots[worst]!)) continue;
      slot = worst;
    }
    slots[slot] = o.magicId; left -= o.price;
    plan.push({ type: 'buyMagic', offerId: o.id, replaceSlot: slot });
  }
  return plan;
}

/** One magic use (or null) for a bot that is on turn. Called repeatedly until it returns null (max 2 per turn). */
export function decideMagic(own: PrivateSnapshot, pub: RoomSnapshot, rnd: () => number): BotCmd | null {
  const me = pub.players.find(p => p.id === own.playerId);
  if (!me || own.hand.length < 2) return null;
  const foes = pub.players.filter(p => p.id !== own.playerId && !p.folded && !p.eliminated && p.handSize === 2);
  const strength = bettingStrength(own, pub);
  const targetFor = (avoid: string) => {
    const candidates = foes.filter(p => seenMagic(own, pub, p.id) !== avoid);
    const pool = candidates.length ? candidates : foes;
    return pool[Math.floor(rnd() * pool.length)]?.id;
  };
  for (const m of own.magic) {
    if (!m.usable) continue;
    switch (m.magicId) {
      case 'R01': case 'X01': case 'X02': case 'X03': {
        const sp = m.spare; if (!sp) break;
        const val = (c: Card) => c.rank + (c.modifiers?.includes('gold') ? 3 : 0) + (c.modifiers?.includes('wild') ? 3 : 0) - (c.modifiers?.some(isDebuff) ? 8 : 0) - (c.modifiers?.includes('lucky') ? -1 : 0);
        const idx: 0 | 1 = val(own.hand[0]) <= val(own.hand[1]) ? 0 : 1;
        if (val(sp) >= val(own.hand[idx]) + 3 && pub.street !== 'river') return { type: 'swap', slot: m.slot, handIndex: idx };
        break;
      }
      case 'K11': case 'K12': if(foes.length && rnd()<.6)return {type:'useMagic',slot:m.slot,targetPlayerId:foes[Math.floor(rnd()*foes.length)].id};break;
      case 'K13': if(strength<.4)return {type:'useMagic',slot:m.slot};break;
      case 'K05': { const idx = own.hand.findIndex(c => c.modifiers?.some(isDebuff)); if (idx >= 0) return { type: 'useMagic', slot: m.slot, handIndex: idx as 0 | 1 }; break; }
      case 'K04': { if (pub.street === 'river') break; const idx: 0 | 1 = own.hand[0].rank >= own.hand[1].rank ? 0 : 1; const same = own.hand[0].suit === own.hand[1].suit; return { type: 'useMagic', slot: m.slot, handIndex: idx, modifier: same ? 'wild' : 'gold' }; }
      case 'K01': if (foes.length && (pub.street !== 'preflop' || rnd() < 0.5)) return { type: 'useMagic', slot: m.slot, targetPlayerId: targetFor('N08') }; break;
      case 'K10': if (foes.length && rnd() < 0.5) return { type: 'useMagic', slot: m.slot, targetPlayerId: foes[Math.floor(rnd() * foes.length)].id }; break;
      case 'K02': if (foes.length && pub.street !== 'preflop' && rnd() < 0.5) return { type: 'useMagic', slot: m.slot, targetPlayerId: targetFor('N08') }; break;
      case 'K08': if (foes.length && pub.street !== 'river') return { type: 'useMagic', slot: m.slot, targetPlayerId: targetFor('N04') }; break;
      case 'K09': if (rnd() < 0.15) return { type: 'useMagic', slot: m.slot }; break;
      case 'K07': if (pub.street !== 'river' && !own.peeks.some(p => p.handId === pub.handId && p.source === 'K07' && p.boardIds?.join(',') === pub.board.map(c => c.id).join(',')) && rnd() < 0.6) return { type: 'useMagic', slot: m.slot }; break;
      case 'K03': {
        if (!pub.board.length || strength > 0.55 || rnd() > 0.5) break;
        const bad = pub.board.findIndex(c => c.modifiers?.some(isDebuff));
        return { type: 'useMagic', slot: m.slot, boardIndex: bad >= 0 ? bad : Math.floor(rnd() * pub.board.length) };
      }
    }
  }
  return null;
}

export function decideExtras(botId: string, own: PrivateSnapshot, pub: RoomSnapshot, mem: BotMemory, rnd: () => number): { commands: BotCmd[]; cooldownMs: number } | null {
  const idle = { commands: [], cooldownMs: 800 };
  if (pub.phase === 'market') {
    const key = `market:${pub.handId}`;
    if (mem.phaseKey !== key) {
      mem.phaseKey = key; mem.queue = marketPlan(own, pub, mem);

    }
    // After a refresh the plan must be recomputed from the new offers.
    const next = mem.queue.shift();
    if (next) return { commands: [next], cooldownMs: 350 };
    const me = pub.players.find(p => p.id === botId);
    if (me && !me.ready) return { commands: [{ type: 'ready', ready: true }], cooldownMs: 500 };
    return idle;
  }
  return null;
}

/**
 * One pass over every bot seat of `engine` (call each tick). `commandId()` supplies fresh ids.
 * Works with any GameEngine (server room or the web's local offline engine).
 */
export function runBots(engine: GameEngine, mems: Map<string, BotMemory>, now: number, rnd: () => number, commandId: () => string, policyOf?: (botId: string) => BotPolicy) {
  const pub = engine.publicSnapshot(now);
  const wrap = (cmd: BotCmd, withHand: boolean) => ({ ...cmd, commandId: commandId(), ...(withHand ? { handId: pub.handId } : {}) }) as Command;
  for (const bot of pub.players) {
    if (!bot.bot || bot.eliminated) continue;
    let mem = mems.get(bot.id);
    if (!mem) { mem = newBotMemory(now, policyOf?.(bot.id) ?? 'smart'); mems.set(bot.id, mem); }
    const own = engine.privateSnapshot(bot.id, now);
    if (pub.phase === 'market' && now >= mem.extraAt) {
      const extra = decideExtras(bot.id, own, pub, mem, rnd);
      if (extra) { mem.extraAt = now + extra.cooldownMs; for (const cmd of extra.commands) engine.applyCommand(bot.id, wrap(cmd, false), now); }
      continue;
    }
    if (pub.phase !== 'playing') continue;
    if (pub.turnPlayerId !== bot.id) {
      const live = engine.publicSnapshot(now);
      if (live.phase === 'playing' && !bot.folded && !bot.allIn && now >= mem.extraAt) {
        mem.extraAt = now + 1500;
        const use = decideMagic({ ...own, magic: own.magic.filter(m => m.magicId === 'K07') }, live, rnd);
        if (use) engine.applyCommand(bot.id, wrap(use, true), now);
      }
      continue;
    }
    if (engine.publicSnapshot(now).turnPlayerId !== bot.id) continue;      // an earlier bot in this pass already moved the turn
    const key = `${pub.handId}:${pub.street}:${bot.id}:${pub.players.map(p => p.bet).join(',')}`;
    if (mem.key !== key) { mem.key = key; mem.actAt = now + 700 + Math.floor(rnd() * 1300); mem.usedThisTurn = 0; continue; }
    if (now < mem.actAt) continue;
    let cur = own;
    if (mem.policy !== 'none') {
      while (mem.usedThisTurn < 2) {
        const use = decideMagic(cur, pub, rnd); if (!use) break;
        mem.usedThisTurn++;
        if (!engine.applyCommand(bot.id, wrap(use, true), now).ok) break;
        cur = engine.privateSnapshot(bot.id, now);
      }
    }
    const pubNow = engine.publicSnapshot(now);
    for (const bet of decideBet(cur, pubNow, rnd)) {
      if (engine.applyCommand(bot.id, wrap(bet, true), now).ok) break;
    }
    mem.actAt = now + 5000;
  }
}
