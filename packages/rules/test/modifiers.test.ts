import { describe, it, expect } from 'vitest';
import type { Card, CardModifier } from '@saloon/protocol';
import { createDeck, evaluateHand, evaluateFive, compareHands } from '../src/index';

const deck = createDeck();
const pick = (...ids: string[]) => ids.map(id => ({ ...deck.find(c => c.id === id)! }));
const mod = (c: Card, m: CardModifier): Card => ({ ...c, modifiers: [m] });
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sample = (r: () => number, n: number, mods: CardModifier[]): Card[] => {
  const d = [...deck]; const out: Card[] = [];
  for (let i = 0; i < n; i++) { const c = d.splice(Math.floor(r() * d.length), 1)[0]; out.push(mods.length && r() < 0.5 ? mod(c, mods[Math.floor(r() * mods.length)]) : c); }
  return out;
};
const strip = (cs: Card[]) => cs.map(c => ({ id: c.id, rank: c.rank, suit: c.suit }));
/** Reference classic evaluator (no modifiers), independent of the engine code. */
function classicBest(cs: Card[]): number {
  const idx = [...cs.keys()]; let best = -1;
  const combos = (arr: number[], k: number): number[][] => k === 0 ? [[]] : arr.flatMap((x, i) => combos(arr.slice(i + 1), k - 1).map(r => [x, ...r]));
  for (const c of combos(idx, 5)) {
    const h = c.map(i => cs[i]); const ranks = h.map(x => x.rank).sort((a, b) => b - a); const cnt = new Map<number, number>(); ranks.forEach(r => cnt.set(r, (cnt.get(r) ?? 0) + 1));
    const g = [...cnt.values()].sort((a, b) => b - a); const u = [...new Set(ranks)];
    const flush = h.every(x => x.suit === h[0].suit); const st = u.length === 5 && (u[0] - u[4] === 4 || u.join() === '14,5,4,3,2');
    const cat = flush && st ? 8 : g[0] === 4 ? 7 : g[0] === 3 && g[1] === 2 ? 6 : flush ? 5 : st ? 4 : g[0] === 3 ? 3 : g[0] === 2 && g[1] === 2 ? 2 : g[0] === 2 ? 1 : 0;
    best = Math.max(best, cat);
  }
  return best;
}

describe('evaluator with modifiers', () => {
  it('matches a reference evaluator on unmodified hands (category)', () => {
    const r = rng(7);
    for (let i = 0; i < 300; i++) { const cs = sample(r, 7, []); expect(evaluateHand(cs).category).toBe(classicBest(cs)); }
  });
  it('trapSuit card cannot be in a flush; trapRank cannot be in a straight', () => {
    const flush = pick('AS', 'JS', '9S', '7S', '4S');
    expect(evaluateFive(flush).category).toBe(5);
    expect(evaluateFive([mod(flush[0], 'trapSuit'), ...flush.slice(1)]).category).toBe(0);
    const st = pick('5S', '6D', '7H', '8C', '9S');
    expect(evaluateFive(st).category).toBe(4);
    expect(evaluateFive([mod(st[0], 'trapRank'), ...st.slice(1)]).category).toBe(0);
  });
  it('traps still count for pairs/trips/quads/full house', () => {
    const quads = pick('9S', '9D', '9H', '9C', '2S').map(c => mod(c, 'trapRank'));
    expect(evaluateFive(quads).category).toBe(7);
    const full = pick('9S', '9D', '9H', '4C', '4S').map(c => mod(c, 'trapSuit'));
    expect(evaluateFive(full).category).toBe(6);
  });
  it('wild suit completes a flush and a straight flush', () => {
    const h = pick('AS', 'JS', '9S', '7S', '4D'); h[4] = mod(h[4], 'wild');
    expect(evaluateFive(h).category).toBe(5);
    const sf = pick('5S', '6S', '7S', '8S', '9D'); sf[4] = mod(sf[4], 'wild');
    expect(evaluateFive(sf).category).toBe(8);
  });
  it('trapSuit beats wild semantics: a trapped card never makes a flush even beside wilds', () => {
    const h = pick('AS', 'JS', '9S', '7S', '4S'); h[0] = mod(h[0], 'trapSuit'); h[1] = mod(h[1], 'wild');
    expect(evaluateFive(h).category).toBe(0);
  });
  it('trap hands drop to the best valid rank (best-of-7 downgrade)', () => {
    const seven = pick('AS', 'KS', 'QS', 'JS', '9S', '2D', '3C');
    expect(evaluateHand(seven).category).toBe(5);
    seven[0] = mod(seven[0], 'trapSuit'); seven[1] = mod(seven[1], 'trapSuit');
    expect(evaluateHand(seven).category).toBeLessThan(5);
  });
  it('property: wild never lowers a hand; trap never raises it; permutation invariant', () => {
    const r = rng(42);
    for (let i = 0; i < 400; i++) {
      const base = sample(r, 7, []); const k = Math.floor(r() * 7);
      const e0 = evaluateHand(base);
      const wild = base.map((c, j) => (j === k ? mod(c, 'wild') : c)); expect(compareHands(evaluateHand(wild), e0)).toBeGreaterThanOrEqual(0);
      const trapR = base.map((c, j) => (j === k ? mod(c, 'trapRank') : c)); expect(compareHands(evaluateHand(trapR), e0)).toBeLessThanOrEqual(0);
      const trapS = base.map((c, j) => (j === k ? mod(c, 'trapSuit') : c)); expect(compareHands(evaluateHand(trapS), e0)).toBeLessThanOrEqual(0);
      const shuffled = [...base].sort(() => r() - 0.5); expect(compareHands(evaluateHand(shuffled), e0)).toBe(0);
      // gold/lucky/cursed are rank-neutral
      expect(compareHands(evaluateHand(base.map(c => mod(c, 'gold'))), e0)).toBe(0);
      expect(compareHands(evaluateHand(base.map(c => mod(c, 'cursed'))), e0)).toBe(0);
    }
  });
  it('property: the returned best five never uses a trap card in a straight/flush', () => {
    const r = rng(99);
    for (let i = 0; i < 400; i++) {
      const cs = sample(r, 7, ['trapRank', 'trapSuit', 'wild']); const e = evaluateHand(cs);
      if (e.category === 4 || e.category === 8) expect(e.cards.some(c => c.modifiers?.includes('trapRank'))).toBe(false);
      if (e.category === 5 || e.category === 8) expect(e.cards.some(c => c.modifiers?.includes('trapSuit'))).toBe(false);
      expect(strip(e.cards).length).toBe(5);
    }
  });
  it('duplicate rank+suit cards (swap deck) evaluate without crashing; 5 of a rank counts as quads', () => {
    const a = pick('9S', '9D', '9H', '9C'); const extra: Card = { id: 's1', rank: 9, suit: 'S' };
    expect(evaluateFive([...a, extra]).category).toBe(7);
    const dup: Card = { id: 's2', rank: 14, suit: 'S' };
    expect(evaluateHand([...pick('AS', 'KD', '3C', '7H', '2D'), dup]).category).toBe(1);
  });
});
