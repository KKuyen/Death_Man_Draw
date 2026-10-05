// Headless balance / invariant simulation for @saloon/rules (Bài Phép).
// Run: tsx scripts/sim/sim.ts [--games 800] [--seed 1] [--maxHands 200] [--json out.json] [--one SEED] [--blindEvery 16] [--growth 1.5]
// Each game: 4 seats, one buying policy per seat (all / cheap / none / smart), rotated so every policy sits in every seat equally.
import { createGame, chipAudit } from '@saloon/rules';
import { runBots, type BotMemory, type BotPolicy } from '@saloon/bots';
import { MAGIC, DEFAULTS } from '@saloon/content';
import type { Command, GameEvent } from '@saloon/protocol';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const arg = (k: string, d?: string) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const GAMES = Number(arg('games', '800')), SEED = Number(arg('seed', '1')), MAX_HANDS = Number(arg('maxHands', '200'));
const ONE = arg('one'), JSON_OUT = arg('json');
const BLIND_EVERY = Number(arg('blindEvery', String(DEFAULTS.blindEveryHands))), GROWTH = Number(arg('growth', String(DEFAULTS.blindGrowth)));
const config = { measurementVersion: 2, botSourceSha256: createHash('sha256').update(readFileSync(new URL('../../packages/bots/src/index.ts', import.meta.url))).digest('hex'), blindEveryHands: BLIND_EVERY, blindGrowth: GROWTH, priceGrowthPerLevel: DEFAULTS.priceGrowthPerLevel, maxHands: MAX_HANDS };
const catalog = MAGIC.map(m => ({ id: m.id, name: m.name, price: m.price }));
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const POLICIES: BotPolicy[] = ['all', 'cheap', 'none', 'smart'];

const stats = {
  games: 0, finished: 0, stalled: 0, handsPerGame: [] as number[],
  wins: {} as Record<string, number>, seats: {} as Record<string, number>, bankruptByPolicy: {} as Record<string, number>,
  violations: [] as { kind: string; seed: number; detail: string }[],
  usage: {} as Record<string, { bought: number; used: number; heldHands: number }>, publicMagicEvents: 0, bonusKinds: {} as Record<string, number>,
  holders: [] as { policy: string; won: boolean; cards: string[]; first: string[] }[], money: {} as Record<string, number>,
  spentPerHandFrac: { sum: 0, n: 0 }, rescues: 0,
};
const bump = (o: Record<string, number>, k: string, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const violation = (kind: string, seed: number, detail: string) => { if (stats.violations.length < 30) stats.violations.push({ kind, seed, detail }); };

function playGame(seed: number, gameIdx: number) {
  const rnd = rng(seed);
  const game = createGame({ roomId: `sim${seed}`, code: 'SIMXX', random: rnd, now: 0, blindEveryHands: BLIND_EVERY, blindGrowth: GROWTH });
  const pol = new Map<string, BotPolicy>();
  for (let i = 0; i < 4; i++) { const policy = POLICIES[(i + gameIdx) % 4]; pol.set(`p${i}`, policy); game.addPlayer({ id: `p${i}`, name: `P${i}`, bot: true }, 0); bump(stats.seats, policy); }
  const mems = new Map<string, BotMemory>(); let n = 0; const cid = () => `c${++n}`;
  const bought = new Map<string, Set<string>>(); for (let i = 0; i < 4; i++) bought.set(`p${i}`, new Set());
  const first = new Map<string, Set<string>>(); for (let i = 0; i < 4; i++) first.set(`p${i}`, new Set());
  let now = 0; let lastHand = 0; let bonusHand = 0;
  game.applyCommand('p0', { commandId: cid(), type: 'start' } as Command, now);
  let steps = 0;
  while (steps++ < 200000) {
    now += 200; game.tick(now); runBots(game, mems, now, rnd, cid, id => pol.get(id)!);
    const pub = game.publicSnapshot(now);
    const events: GameEvent[] = game.takeEvents();
    for (const e of events) {
      if (e.type === 'magicUsed') stats.publicMagicEvents++;
      if (e.type === 'purchase' && e.magicId) { bought.get(e.playerId!)!.add(e.magicId); if (pub.handId === 0) first.get(e.playerId!)!.add(e.magicId); stats.usage[e.magicId] ??= { bought: 0, used: 0, heldHands: 0 }; stats.usage[e.magicId].bought++; }
      if (e.type === 'use' && e.magicId) { stats.usage[e.magicId] ??= { bought: 0, used: 0, heldHands: 0 }; stats.usage[e.magicId].used++; }
      if (e.type === 'magicUsed' && e.magicId === 'N02') stats.rescues++;
    }
    if ((pub.phase === 'showdown' || pub.phase === 'finished') && pub.handId !== bonusHand) {
      bonusHand = pub.handId;
      for (let i = 0; i < 4; i++) for (const b of game.privateSnapshot(`p${i}`, now).lastBonuses) if (['N01', 'N02', 'N06'].includes(b.kind)) bump(stats.money, b.kind, b.amount);
    }
    const st = game.serialize() as any;
    const audit = chipAudit(st);
    if (!audit.ok) { violation('chips', seed, `total ${audit.total} expected ${audit.expected} phase ${pub.phase}`); return finish(false); }
    if (pub.handId !== lastHand) {
      lastHand = pub.handId;
      for (const p of st.players) for (const slot of p.slots) if (slot) { stats.usage[slot.magicId] ??= { bought: 0, used: 0, heldHands: 0 }; stats.usage[slot.magicId].heldHands++; }
      const ids = [...st.deck, ...st.board, ...st.discard, ...st.players.flatMap((p: any) => p.hand)];
      if (new Set(ids).size !== ids.length || ids.length !== Object.keys(st.cards).length) violation('cards', seed, `hand ${pub.handId} card ids not unique/conserved`);
      for (const p of st.players) if (p.slots.filter(Boolean).length > 5) violation('slots', seed, 'more than 5');
    }
    if (pub.phase === 'playing' || pub.phase === 'market') {
      const text = JSON.stringify({ ...pub, board: undefined, log: undefined, result: undefined });
      if (/"wallet"|"slots"|"offers"|"hand":|"market":/.test(text)) { violation('leak', seed, 'public snapshot has private field'); return finish(false); }
    }
    for (const p of st.players) {
      if (!Number.isInteger(p.wallet) || p.wallet < 0) { violation('wallet', seed, `${p.id} ${p.wallet}`); return finish(false); }
      if (p.eliminated && p.wallet > 0 && !p.disconnectedAt) violation('elim_with_chips', seed, `${p.id} ${p.wallet}`);
    }
    if (pub.phase === 'finished') return finish(true, pub.winnerId);
    if (pub.handId >= MAX_HANDS && pub.phase === 'market') return finish(true, null, true);
  }
  violation('stall', seed, `no finish after ${steps} steps, hand ${lastHand}`); return finish(false);

  function finish(ok: boolean, winner?: string | null, capped = false) {
    for (let i = 0; i < 4; i++) stats.holders.push({ policy: pol.get(`p${i}`)!, won: ok && winner === `p${i}` && !capped, cards: [...bought.get(`p${i}`)!], first: [...first.get(`p${i}`)!] });
    stats.games++; const hands = game.publicSnapshot(now).handId;
    if (ok) {
      stats.finished++; stats.handsPerGame.push(hands);
      if (capped) { stats.stalled++; }
      else if (winner) bump(stats.wins, pol.get(winner)!);
    }
    const st = game.serialize() as any; stats.spentPerHandFrac.sum += st.ledger.burned / Math.max(1, hands) / 4 / 1000; stats.spentPerHandFrac.n++;
    return ok;
  }
}

const t0 = Date.now();
if (ONE) { playGame(Number(ONE), 0); console.log(JSON.stringify(stats, null, 1)); process.exit(stats.violations.length || stats.stalled ? 1 : 0); }
for (let g = 0; g < GAMES; g++) playGame(SEED * 100000 + g, g);
const hp = [...stats.handsPerGame].sort((a, b) => a - b);
const mean = hp.reduce((a, b) => a + b, 0) / Math.max(1, hp.length);
const decided = Object.values(stats.wins).reduce((a, b) => a + b, 0);
const summary = {
  config, seed: SEED, catalog, games: stats.games, finished: stats.finished, capped: stats.stalled, violations: stats.violations.length, seconds: Math.round((Date.now() - t0) / 1000),
  handsMean: +mean.toFixed(1), handsP10: hp[Math.floor(hp.length * .1)], handsMedian: hp[Math.floor(hp.length / 2)], handsP90: hp[Math.floor(hp.length * .9)],
  winRateByPolicy: Object.fromEntries(POLICIES.map(p => [p, +((stats.wins[p] ?? 0) / Math.max(1, decided)).toFixed(3)])),
  winsByPolicy: stats.wins, seatsPerPolicy: stats.seats,
  burnedPerPlayerPerHandAsFractionOfStartWallet: +(stats.spentPerHandFrac.sum / Math.max(1, stats.spentPerHandFrac.n)).toFixed(3),
  rescues: stats.rescues, publicMagicEvents: stats.publicMagicEvents,
  usage: Object.fromEntries(MAGIC.map(m => [m.id, stats.usage[m.id] ?? { bought: 0, used: 0, heldHands: 0 }])),
};
// ---- per-card balance study ----
// First-market buyers vs non-buyers within the SAME policy. Avoids survival bias, but is observational (not a causal effect).
const study = MAGIC.map(m => {
  let n = 0, wins = 0, expect = 0, variance = 0;
  for (const pol of POLICIES) {
    const group = stats.holders.filter(h => h.policy === pol); const base = group.filter(h => !h.first.includes(m.id)); const held = group.filter(h => h.first.includes(m.id));
    if (!held.length || !base.length) continue;
    const heldWins = held.filter(h => h.won).length, ph = heldWins / held.length, pb = base.filter(h => h.won).length / base.length;
    n += held.length; wins += heldWins; expect += held.length * pb;
    variance += held.length * ph * (1 - ph) + held.length ** 2 * pb * (1 - pb) / base.length;
  }
  const u = stats.usage[m.id] ?? { bought: 0, used: 0, heldHands: 0 };
  const money = stats.money[m.id];
  const delta = n ? +(((wins - expect) / n) * 100).toFixed(1) : null;
  const se = n ? Math.sqrt(variance) / n * 100 : null;
  const flags = [u.bought === 0 ? 'NEVER_BOUGHT' : '', delta !== null && Math.abs(delta) > 5 ? (se !== null && Math.abs(delta) > 1.96 * se ? 'DELTA>5' : 'delta>5(noisy)') : ''].filter(Boolean).join(',');
  return { id: m.id, name: m.name, price: m.price, bought: u.bought, used: u.used, heldHands: u.heldHands, usedPerBuy: u.bought ? +(u.used / u.bought).toFixed(2) : null, holders: n, winDeltaPts: delta, seDelta: se === null ? null : +se.toFixed(1), realisedChipsPerBuy: money === undefined ? null : +(money / Math.max(1, u.bought)).toFixed(1), flags };
});
console.log(JSON.stringify(summary, null, 1));
console.log('CARDSTUDY', JSON.stringify(study));
if (JSON_OUT) writeFileSync(JSON_OUT.replace('.json', '.raw.json'), JSON.stringify({ config, catalog, seed: SEED, holders: stats.holders, usage: stats.usage, money: stats.money, handsPerGame: stats.handsPerGame }));
if (stats.violations.length) console.log('VIOLATIONS', JSON.stringify(stats.violations.slice(0, 10), null, 1));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ summary, violations: stats.violations }, null, 1));

if (stats.violations.length || stats.stalled || stats.finished !== stats.games) process.exitCode = 1;
