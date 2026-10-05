import { describe, expect, it } from 'vitest';
import { createGame } from '@saloon/rules';
import { eventAudience } from '../src/room';
import { validateCheckpoint } from '../src/validate';

const mk = () => {
  const g = createGame({ roomId: 'r1', code: 'ABCDE', random: () => 0.3 });
  g.addPlayer({ id: 'p1', name: 'A' }, 1); g.addPlayer({ id: 'p2', name: 'B', bot: true }, 1);
  return { roomId: 'r1', code: 'ABCDE', savedAt: 0, hostId: null, humans: [{ id: 'p1', name: 'A', keyHash: 'a'.repeat(64) }], engine: g.serialize() as any };
};

describe('validateCheckpoint', () => {
  it('accepts a real checkpoint', () => expect(validateCheckpoint(mk())).toBeNull());
  it('rejects inflated chips', () => { const c = mk(); c.engine.players[0].wallet = 999999; expect(validateCheckpoint(c)).toMatch(/chip total/); });
  it('rejects negative/non-integer chips', () => { const c = mk(); c.engine.players[0].wallet = -5; expect(validateCheckpoint(c)).toMatch(/chip/); const d = mk(); d.engine.players[0].wallet = 1.5; expect(validateCheckpoint(d)).toMatch(/chip/); });
  it('rejects duplicate cards (engine restore check)', () => { const c = mk(); c.engine.deck.push('AS'); expect(validateCheckpoint(c)).toMatch(/engine rejected/); });
  it('rejects garbage', () => { expect(validateCheckpoint(null)).toBeTruthy(); expect(validateCheckpoint({})).toBeTruthy(); const c = mk(); c.humans[0].keyHash = 'zz'; expect(validateCheckpoint(c)).toBeTruthy(); });
});

describe('eventAudience', () => {
  const ev = (to?: string) => ({ id: 'e', at: 0, type: 'use' as const, playerId: 'p', ...(to ? { to } : {}) });
  it('private events go to one player only, public events to everyone', () => {
    expect(eventAudience(ev('p1'))).toBe('p1');
    expect(eventAudience(ev())).toBeNull();
  });
});
