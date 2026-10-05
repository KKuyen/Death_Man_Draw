import { describe, it, expect } from 'vitest';
import { createGame, chipAudit } from '@saloon/rules';
import type { Command } from '@saloon/protocol';
import { runBots, newBotMemory, handStrength, type BotMemory, type BotPolicy } from '../src/index';

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

describe('bots', () => {
  it('four bots (all policies) buy, use, finish matches and conserve chips', () => {
    const policies: BotPolicy[] = ['all', 'cheap', 'none', 'smart']; let bought = 0, publicUses = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const r = rng(seed); const g = createGame({ roomId: 'r', code: 'ABCDE', random: r, now: 0 });
      for (let i = 0; i < 4; i++) g.addPlayer({ id: `p${i}`, name: `P${i}`, bot: true }, 0);
      const mems = new Map<string, BotMemory>(); let n = 0, now = 0;
      g.applyCommand('p0', { commandId: 'start', type: 'start' } as Command, 0);
      for (let step = 0; step < 60000 && g.publicSnapshot(now).phase !== 'finished'; step++) {
        now += 200; g.tick(now); runBots(g, mems, now, r, () => `c${++n}`, id => policies[Number(id[1])]);
        for (const e of g.takeEvents()) { if (e.type === 'purchase') bought++; if (e.type === 'magicUsed') publicUses++; }
        expect(chipAudit(g.serialize()).ok).toBe(true);
      }
      expect(g.publicSnapshot(now).phase).toBe('finished');
    }
    expect(bought).toBeGreaterThan(10); expect(publicUses).toBeGreaterThan(0);
  });
  it('policy none never buys', () => {
    const r = rng(9); const g = createGame({ roomId: 'r', code: 'ABCDE', random: r, now: 0 });
    for (let i = 0; i < 2; i++) g.addPlayer({ id: `p${i}`, name: `P${i}`, bot: true }, 0);
    const mems = new Map<string, BotMemory>(); let n = 0, now = 0; g.applyCommand('p0', { commandId: 's', type: 'start' } as Command, 0);
    for (let step = 0; step < 3000; step++) { now += 200; g.tick(now); runBots(g, mems, now, r, () => `c${++n}`, () => 'none'); }
    expect(g.takeEvents().some(e => e.type === 'purchase')).toBe(false);
  });
  it('handStrength understands traps (trap flush is weak)', () => {
    const c = (id: string, rank: number, suit: any, modifiers?: any) => ({ id, rank, suit, ...(modifiers ? { modifiers } : {}) });
    const board = [c('a', 14, 'S'), c('b', 11, 'S'), c('c', 9, 'S')]; const hole = [c('d', 7, 'S'), c('e', 4, 'S')];
    const strong = handStrength(hole, [...board, c('f', 2, 'D'), c('g', 3, 'C')]);
    const trapped = handStrength([c('d', 7, 'S', ['trapSuit']), c('e', 4, 'S', ['trapSuit'])], [...board, c('f', 2, 'D'), c('g', 3, 'C')]);
    expect(strong).toBeGreaterThan(trapped);
  });
});
void newBotMemory;
