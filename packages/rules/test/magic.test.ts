import { describe, it, expect } from 'vitest';
import type { GameEngine, Command } from '@saloon/protocol';
import { createGame, restoreGame, chipAudit } from '../src/index';
import { DEFAULTS } from '@saloon/content';

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let cid = 0; const C = (c: object) => ({ commandId: `c${++cid}`, ...c }) as Command;
function table(seed = 1, n = 3) {
  let g: GameEngine = createGame({ roomId: 'r', code: 'ABCDE', random: rng(seed) });
  const ids = ['a', 'b', 'c', 'd'].slice(0, n);
  ids.forEach(id => g.addPlayer({ id, name: id.toUpperCase() }, 0));
  ids.forEach(id => expect(g.applyCommand(id, C({ type: 'ready', ready: true }), 1).ok).toBe(true));
  expect(g.applyCommand('a', C({ type: 'start' }), 2).ok).toBe(true);
  /** Give a player magic cards by editing the serialized state (test-only). */
  const give = (id: string, cards: string[]) => {
    const st = g.serialize() as any; const p = st.players.find((x: any) => x.id === id); p.slots = [null, null, null, null, null];
    cards.forEach((m, i) => { p.slots[i] = { magicId: m, ...(m.startsWith('X') ? { spare: { id: `s${100 + i + (id.charCodeAt(0) - 97) * 10}`, rank: 14, suit: 'S' } } : {}) }; });
    g = restoreGame(st, { roomId: 'r', code: 'ABCDE', random: rng(seed + 100) });
  };
  const toPlaying = () => { ids.forEach(id => g.applyCommand(id, C({ type: 'ready', ready: true }), 3)); expect(g.publicSnapshot(3).phase).toBe('playing'); };
  return { get g() { return g; }, ids, give, toPlaying };
}
const pub = (g: GameEngine) => JSON.stringify({ ...g.publicSnapshot(5), serverTime: 0 });

describe('market and privacy', () => {
  it('opens a private market before hand 1 with different offers per player; public snapshot reveals none', () => {
    const t = table(3); const g = t.g;
    expect(g.publicSnapshot(3).phase).toBe('market');
    const offers = t.ids.map(id => g.privateSnapshot(id, 3).market);
    offers.forEach(o => { expect(o.length).toBe(DEFAULTS.marketOffers); const magic = o.filter(x => !x.card); expect(new Set(magic.map(x => x.magicId)).size).toBe(magic.length); });
    expect(new Set(offers.map(o => o.map(x => x.magicId).join())).size).toBeGreaterThan(1);
    const text = JSON.stringify(g.publicSnapshot(3));
    expect(text).not.toMatch(/offers|"market":|"wallet"|"magic":|"slots"/);
    for (const o of offers.flat()) expect(text).not.toContain(o.id);
  });
  it('buying burns chips, fills a slot, stays invisible publicly; full tray needs replaceSlot', () => {
    const t = table(4); const g = t.g; const before = pub(g);
    const o = g.privateSnapshot('a', 3).market.find(x => x.kind === 'active')!;
    expect(g.applyCommand('a', C({ type: 'buyMagic', offerId: o.id }), 3).ok).toBe(true);
    const me = g.privateSnapshot('a', 3);
    expect(me.wallet).toBe(1000 - o.price); expect(me.magic.length).toBe(1);
    expect(g.applyCommand('a', C({ type: 'buyMagic', offerId: o.id }), 3).ok).toBe(false);
    expect(JSON.stringify(JSON.parse(pub(g)).players)).toBe(JSON.stringify(JSON.parse(before).players));
    expect(g.takeEvents().every(e => e.to === 'a' || e.type !== 'magicUsed')).toBe(true);
    expect(chipAudit(g.serialize()).ok).toBe(true);
  });
  it('rejects bogus commands', () => {
    const t = table(5); const g = t.g;
    expect(g.applyCommand('a', C({ type: 'trick', trickId: 'T01' }), 3).ok).toBe(false);
    expect(g.applyCommand('a', C({ type: 'buyMagic', offerId: 'nope' }), 3).ok).toBe(false);
    expect(g.applyCommand('a', C({ type: 'bet', action: 'check' }), 3).ok).toBe(false);
  });
});

describe('using cards', () => {
  const turn = (t: ReturnType<typeof table>) => t.g.publicSnapshot(4).turnPlayerId!;
  it.each(['X01', 'X02', 'X03'])('%s swap is HIDDEN: replaces the hole card, nothing public/hint/log/snapshot changes, old card identity stays secret', (magicId) => {
    const t = table(6); ['a', 'b', 'c'].forEach(id => t.give(id, [magicId])); t.toPlaying();
    const who = turn(t); const g = t.g; const me = g.privateSnapshot(who, 4); const slot = me.magic[0].slot;
    const old = me.hand[1].id; expect(me.magic[0].spare).toBeTruthy();
    const h = g.publicSnapshot(4).handId; g.takeEvents(); const before = pub(g); const others = t.ids.filter(i => i !== who).map(i => g.privateSnapshot(i, 4).privateLog.length);
    expect(g.applyCommand(who, C({ type: 'swap', slot, handIndex: 1, handId: h }), 4).ok).toBe(true);
    const after = g.privateSnapshot(who, 4);
    expect(after.hand[1].id).not.toBe(old); expect(after.hand[1].rank).toBe(me.magic[0].spare!.rank);
    expect(after.magic.find(m => m.slot === slot)?.spare?.id).toBe(old);
    const ev = g.takeEvents(); expect(ev.filter(e => e.to !== who)).toHaveLength(0); expect(ev.every(e => e.type === 'use')).toBe(true);
    expect(pub(g)).toBe(before);
    expect(t.ids.filter(i => i !== who).map(i => g.privateSnapshot(i, 4).privateLog.length)).toEqual(others);
    expect(JSON.stringify(g.publicSnapshot(4))).not.toContain(old === '' ? 'zz' : `"id":"${old}"`);
    const st = g.serialize() as any; const ids = [...st.deck, ...st.board, ...st.discard, ...st.players.flatMap((p: any) => p.hand)];
    expect(new Set(ids).size).toBe(ids.length); expect(ids).not.toContain(old); expect(st.players.flatMap((p:any)=>p.slots.flatMap((x:any)=>x?.spare?[x.spare.id]:[]))).toContain(old);
  });
  it('swapping a force-revealed card keeps the public reveal unchanged (swap not detectable)', () => {
    const t = table(15); ['a', 'b', 'c'].forEach(id => t.give(id, ['K02', 'X03'])); t.toPlaying();
    const g = t.g; const h = g.publicSnapshot(4).handId; const first = turn(t);
    const victim = t.ids.find(i => i !== first)!;
    expect(g.applyCommand(first, C({ type: 'useMagic', slot: 0, targetPlayerId: victim, handId: h }), 4).ok).toBe(true);
    let guard = 0; while (turn(t) !== victim && guard++ < 6) { const w = turn(t); g.applyCommand(w, C({ type: 'bet', action: g.privateSnapshot(w, 4).legal.canCheck ? 'check' : 'call', handId: h }), 4); }
    expect(turn(t)).toBe(victim); g.takeEvents(); const before = pub(g);
    const revealedId = g.publicSnapshot(4).players.find(p => p.id === victim)!.revealedCards[0].id;
    const revealedIndex = g.privateSnapshot(victim, 4).hand.findIndex(c => c.id === revealedId);
    expect(revealedIndex).toBeGreaterThanOrEqual(0);
    expect(g.applyCommand(victim, C({ type: 'swap', slot: 1, handIndex: revealedIndex, handId: h }), 4).ok).toBe(true);
    expect(g.privateSnapshot(victim, 4).hand.some(c => c.id === revealedId)).toBe(false);
    expect(g.applyCommand(victim, C({ type: 'swap', slot: 1, handIndex: revealedIndex, handId: h }), 4).ok).toBe(true);
    expect(g.privateSnapshot(victim,4).hand[revealedIndex].id).toBe(revealedId);
    expect(pub(g)).toBe(before);
  });
  it('PUBLIC card (K09/K02): announced to the whole table with actor, card, sound; log line; Silent does NOT mask it', () => {
    for (const silent of [false, true]) {
      const t = table(7); ['a', 'b', 'c'].forEach(id => t.give(id, silent ? ['N07', 'K02'] : ['K02'])); t.toPlaying();
      const g = t.g; g.takeEvents(); const who = turn(t); const tgt = t.ids.find(i => i !== who)!;
      expect(g.applyCommand(who, C({ type: 'useMagic', slot: silent ? 1 : 0, targetPlayerId: tgt, handId: g.publicSnapshot(4).handId }), 4).ok).toBe(true);
      const ev = g.takeEvents().filter(e => e.type === 'magicUsed');
      expect(ev).toHaveLength(1); expect(ev[0]).toMatchObject({ playerId: who, targetPlayerId: tgt, magicId: 'K02', cue: 'reveal' }); expect(ev[0].to).toBeUndefined();
      expect(g.publicSnapshot(4).log.at(-1)!.text).toContain('Ép lộ bài');
      expect(g.publicSnapshot(4).players.find(p => p.id === tgt)!.revealedCards).toHaveLength(1);
    }
  });
  it('HINTED card (K01): no public event/log/snapshot change; only the target gets a vague private hint (no actor, no card id)', () => {
    const t = table(13); ['a', 'b', 'c'].forEach(id => t.give(id, ['K01'])); t.toPlaying();
    const g = t.g; const who = turn(t); const tgt = t.ids.find(i => i !== who)!; g.takeEvents(); const before = pub(g);
    expect(g.applyCommand(who, C({ type: 'useMagic', slot: 0, targetPlayerId: tgt, handId: g.publicSnapshot(4).handId }), 4).ok).toBe(true);
    const ev = g.takeEvents();
    expect(ev.filter(e => !e.to)).toHaveLength(0);
    const hint = ev.filter(e => e.type === 'magicHint'); expect(hint).toHaveLength(1);
    expect(hint[0].to).toBe(tgt); expect(hint[0].playerId).toBeUndefined(); expect(hint[0].magicId).toBeUndefined(); expect(hint[0].targetPlayerId).toBeUndefined();
    expect(ev.filter(e => e.to === who).every(e => e.type === 'use')).toBe(true);
    expect(pub(g)).toBe(before);
    expect(g.privateSnapshot(who, 4).peeks[0]).toMatchObject({ source: 'K01', targetPlayerId: tgt });
    expect(g.privateSnapshot(who, 4).peeks[0].card).toBeTruthy();
  });
  it('SILENT converts hinted->hidden: zero leakage to the table and to the target; hidden cards never appear publicly', () => {
    const t = table(8); ['a', 'b', 'c'].forEach(id => t.give(id, ['N07', 'K01', 'K04', 'K07', 'K08'])); t.toPlaying();
    const g = t.g; const who = turn(t); const tgt = t.ids.find(i => i !== who)!; const h = g.publicSnapshot(4).handId;
    g.takeEvents(); const before = pub(g); const tgtLog = g.privateSnapshot(tgt, 4).privateLog.length;
    for (const cmd of [{ type: 'useMagic', slot: 1, targetPlayerId: tgt }, { type: 'useMagic', slot: 2, handIndex: 0, modifier: 'gold' }, { type: 'useMagic', slot: 3 }, { type: 'useMagic', slot: 4, targetPlayerId: tgt }])
      expect(g.applyCommand(who, C({ ...cmd, handId: h }), 4).ok).toBe(true);
    const ev = g.takeEvents();
    expect(ev.filter(e => !e.to)).toHaveLength(0);                        // nothing public
    expect(ev.filter(e => e.to && e.to !== who)).toHaveLength(0);         // nothing to the target or anyone else
    expect(ev.some(e => e.type === 'magicHint' || e.type === 'magicUsed')).toBe(false);
    expect(pub(g)).toBe(before);
    expect(g.privateSnapshot(tgt, 4).privateLog.length).toBe(tgtLog);
    expect(g.privateSnapshot(who, 4).peeks.length).toBe(2);
    expect(JSON.stringify(g.publicSnapshot(4))).not.toMatch(/K01|K04|K07|K08|N07|Lá soi|Bùa/);
    expect(chipAudit(g.serialize()).ok).toBe(true);
  });
  it('triggered passives run through the trigger system: Túi tiền (win_pot) stays hidden; chips conserved', () => {
    const t = table(14, 2); t.give('a', ['N01']); t.give('b', ['N01']); t.toPlaying(); const g = t.g; g.takeEvents();
    const who = turn(t); const other = t.ids.find(i => i !== who)!;
    expect(g.applyCommand(who, C({ type: 'bet', action: 'fold', handId: 1 }), 4).ok).toBe(true);
    expect(g.publicSnapshot(4).phase).toBe('showdown');
    expect(g.privateSnapshot(other, 4).lastBonuses.some(b => b.kind === 'N01')).toBe(true);
    expect(g.takeEvents().filter(e => !e.to)).toHaveLength(0);
    expect(JSON.stringify(g.publicSnapshot(4))).not.toMatch(/N01|Túi tiền/);
    expect(chipAudit(g.serialize()).ok).toBe(true);
  });
  it('Bài giả (N08): peeker sees a false card, twice, then it is consumed; real card unchanged', () => {
    const t = table(10); ['a', 'b', 'c'].forEach(id => t.give(id, id === 'a' ? ['N08'] : ['K01', 'K01'])); t.toPlaying();
    const g = t.g; const vict = 'a'; let n = 0;
    for (let guard = 0; guard < 20 && n < 3; guard++) {
      const who = turn(t); if (who === vict) { g.applyCommand(who, C({ type: 'bet', action: g.privateSnapshot(who, 4).legal.canCheck ? 'check' : 'call', handId: 1 }), 4); continue; }
      const real = g.privateSnapshot(vict, 4).hand.map(c => c.id);
      const slot = g.privateSnapshot(who, 4).magic.find(m => m.usable)?.slot; if (slot === undefined) break;
      expect(g.applyCommand(who, C({ type: 'useMagic', slot, targetPlayerId: vict, handId: 1 }), 4).ok).toBe(true); n++;
      const seen = g.privateSnapshot(who, 4).peeks.at(-1)!.card!;
      const stillFake = g.privateSnapshot(vict, 4).magic.length > 0 || n <= 2;
      if (n <= 2) { expect(real).not.toContain(seen.id); expect(stillFake).toBe(true); } else expect(real).toContain(seen.id);
      expect(g.privateSnapshot(vict, 4).hand.map(c => c.id)).toEqual(real);
      g.applyCommand(who, C({ type: 'bet', action: g.privateSnapshot(who, 4).legal.canCheck ? 'check' : 'call', handId: 1 }), 4);
    }
    expect(n).toBeGreaterThanOrEqual(3);
  });
  it('Mồi nhử (K09): announces a different card publicly and changes nothing else', () => {
    const t = table(11); ['a', 'b', 'c'].forEach(id => t.give(id, ['K09'])); t.toPlaying();
    const g = t.g; const who = turn(t); g.takeEvents(); const hand = JSON.stringify(g.privateSnapshot(who, 4).hand);
    expect(g.applyCommand(who, C({ type: 'useMagic', slot: 0, handId: 1 }), 4).ok).toBe(true);
    const ev = g.takeEvents().filter(e => e.type === 'magicUsed'); expect(ev).toHaveLength(1);
    expect(ev[0].magicId).not.toBe('K09'); expect(JSON.stringify(g.privateSnapshot(who, 4).hand)).toBe(hand);
  });
  it('K05 removes a debuff; K05 fails on a clean card', () => {
    const t = table(12); ['a', 'b', 'c'].forEach(id => t.give(id, ['K05'])); t.toPlaying();
    const g = t.g; const who = turn(t); const st = g.serialize() as any; const p = st.players.find((x: any) => x.id === who);
    st.cards[p.hand[0]].modifiers = ['trapSuit']; delete st.cards[p.hand[1]].modifiers;
    const g2 = restoreGame(st, { roomId: 'r', code: 'ABCDE', random: rng(1) });
    expect(g2.applyCommand(who, C({ type: 'useMagic', slot: 0, handIndex: 1, handId: 1 }), 4).ok).toBe(false);
    expect(g2.applyCommand(who, C({ type: 'useMagic', slot: 0, handIndex: 0, handId: 1 }), 4).ok).toBe(true);
    expect(g2.privateSnapshot(who, 4).hand[0].modifiers).toBeUndefined();
  });
});

describe('anti-bankruptcy and chips', () => {
  it('N02 rescues once at 0 chips with +100, announces publicly; without it the player is out', () => {
    for (const rescue of [true, false]) {
      const t = table(20, 2); if (rescue) t.give('a', ['N02']); else t.give('a', []);
      const st = t.g.serialize() as any; st.players[0].wallet = 20; st.players[1].wallet = 1000; st.ledger.burned = 980; // keep audit balanced: 20+1000+burned-minted == 2000
      let g = restoreGame(st, { roomId: 'r', code: 'ABCDE', random: rng(5) });
      expect(chipAudit(g.serialize()).ok).toBe(true);
      ['a', 'b'].forEach(id => g.applyCommand(id, C({ type: 'ready', ready: true }), 3));
      // Force a showdown where 'a' is all-in by repeated play until the hand ends; try seeds until a loses.
      let lost = false;
      for (let seed = 1; seed < 60 && !lost; seed++) {
        const s2 = JSON.parse(JSON.stringify(st)); g = restoreGame(s2, { roomId: 'r', code: 'ABCDE', random: rng(seed) });
        ['a', 'b'].forEach(id => g.applyCommand(id, C({ type: 'ready', ready: true }), 3));
        for (let i = 0; i < 12 && g.publicSnapshot(4).phase === 'playing'; i++) {
          const who = g.publicSnapshot(4).turnPlayerId!; if (!who) break;
          g.applyCommand(who, C({ type: 'bet', action: g.privateSnapshot(who, 4).legal.callAmount >= g.privateSnapshot(who, 4).wallet && g.privateSnapshot(who, 4).legal.callAmount > 0 ? 'call' : g.privateSnapshot(who, 4).wallet > 0 ? 'allIn' : 'check', handId: 1 }), 4);
        }
        const ph = g.publicSnapshot(4); const aWon = ph.result?.winners.some(w => w.playerId === 'a');
        if (ph.phase !== 'playing' && !aWon) lost = true;
      }
      expect(lost).toBe(true);
      const ph = g.publicSnapshot(4); expect(chipAudit(g.serialize()).ok).toBe(true);
      if (rescue) { expect(ph.players[0].eliminated).toBe(false); expect(g.privateSnapshot('a', 4).wallet).toBe(100); expect(g.privateSnapshot('a', 4).magic).toHaveLength(0); expect(ph.log.some(l => l.kind === 'magic' && l.text.includes('Chống phá sản'))).toBe(true); expect(ph.phase).toBe('showdown'); }
      else { expect(ph.players[0].eliminated).toBe(true); expect(ph.phase).toBe('finished'); }
    }
  });
});

describe('Lá soi phép (K10) and Màn sương (N09)', () => {
  const turn = (t: ReturnType<typeof table>) => t.g.publicSnapshot(4).turnPlayerId!;
  it('shows the target a held magic card only to the actor; target gets a "sensed" hint; nothing public; spare never exposed', () => {
    const t = table(30); t.give('a', ['K10']); t.give('b', ['X01']); t.give('c', ['X01']); t.toPlaying();
    const g = t.g; const st = g.serialize() as any; for (const p of st.players) p.slots = [null, null, null, null, null];
    const who = turn(t); const tgt = t.ids.find(i => i !== who)!;
    st.players.find((p: any) => p.id === who).slots[0] = { magicId: 'K10' };
    st.players.find((p: any) => p.id === tgt).slots[0] = { magicId: 'X01', spare: { id: 's900', rank: 14, suit: 'S' } };
    const g2 = restoreGame(st, { roomId: 'r', code: 'ABCDE', random: rng(3) }); const h = g2.publicSnapshot(4).handId; g2.takeEvents(); const before = pub(g2);
    expect(g2.applyCommand(who, C({ type: 'useMagic', slot: 0, targetPlayerId: tgt, handId: h }), 4).ok).toBe(true);
    const peek = g2.privateSnapshot(who, 4).peeks[0];
    expect(peek.magic).toMatchObject({ magicId: 'X01', targetPlayerId: tgt, kind: 'active', visibility: 'hidden' }); expect(JSON.stringify(peek)).not.toContain('s900');
    const ev = g2.takeEvents(); expect(ev.filter(e => !e.to)).toHaveLength(0);
    expect(ev.filter(e => e.type === 'magicHint')).toMatchObject([{ to: tgt, cue: 'sensed' }]);
    expect(pub(g2)).toBe(before);
    expect(g2.privateSnapshot(tgt, 4).peeks).toHaveLength(0);
  });
  it('empty target returns trống and is still consumed; Silent makes it hidden (no hint)', () => {
    const t = table(31); ['a', 'b', 'c'].forEach(id => t.give(id, ['N07', 'K10'])); t.toPlaying();
    const g = t.g; const who = turn(t); const tgt = t.ids.find(i => i !== who)!; const st = g.serialize() as any;
    st.players.find((p: any) => p.id === tgt).slots = [null, null, null, null, null];
    const g2 = restoreGame(st, { roomId: 'r', code: 'ABCDE', random: rng(3) }); g2.takeEvents();
    expect(g2.applyCommand(who, C({ type: 'useMagic', slot: 1, targetPlayerId: tgt, handId: 1 }), 4).ok).toBe(true);
    expect(g2.privateSnapshot(who, 4).peeks[0]).toMatchObject({ text: 'trống', magic: { magicId: null } });
    expect(g2.privateSnapshot(who, 4).magic.map(m => m.magicId)).toEqual(['N07']);
    expect(g2.takeEvents().filter(e => e.type === 'magicHint' || !e.to)).toHaveLength(0);
  });
  it('N09 returns a decoy magic id twice, then is consumed and the truth shows', () => {
    const t = table(32); ['a', 'b', 'c'].forEach(id => t.give(id, ['K10'])); t.toPlaying();
    const g = t.g; const who = turn(t); const tgt = t.ids.find(i => i !== who)!; const st = g.serialize() as any;
    st.players.find((p: any) => p.id === who).slots = [{ magicId: 'K10' }, { magicId: 'K10' }, { magicId: 'K10' }, null, null];
    st.players.find((p: any) => p.id === tgt).slots = [{ magicId: 'N09' }, { magicId: 'N04' }, null, null, null];
    const g2 = restoreGame(st, { roomId: 'r', code: 'ABCDE', random: rng(5) });
    const seen: (string | null)[] = [];
    for (let i = 0; i < 3; i++) { expect(g2.applyCommand(who, C({ type: 'useMagic', slot: i, targetPlayerId: tgt, handId: 1 }), 4).ok).toBe(true); seen.push(g2.privateSnapshot(who, 4).peeks.at(-1)!.magic!.magicId); }
    expect(seen[0]).not.toBe('N09'); expect(seen.slice(0, 2).every(x => x !== 'N04' && x !== 'N09')).toBe(true);
    expect(g2.privateSnapshot(tgt, 4).magic.map(m => m.magicId)).toEqual(['N04']);
    expect(['N04', 'N09', null]).toContain(seen[2]);
    expect(JSON.stringify(g2.publicSnapshot(4))).not.toMatch(/N09|N04|K10/);
  });
});

describe('Quả cầu soi (K07, anyTime, hidden)', () => {
  it('usable out of turn while the hand is live, shows the real next card, leaks nothing; not usable in market', () => {
    const t = table(40); ['a', 'b', 'c'].forEach(id => t.give(id, ['K07'])); const g0 = t.g;
    expect(g0.privateSnapshot('a', 3).magic[0].usable).toBe(false);          // market
    expect(g0.applyCommand('a', C({ type: 'useMagic', slot: 0 }), 3).ok).toBe(false);
    t.toPlaying(); const g = t.g; const turnId = g.publicSnapshot(4).turnPlayerId!; const other = t.ids.find(i => i !== turnId)!; const h = g.publicSnapshot(4).handId;
    expect(g.privateSnapshot(other, 4).magic[0].usable).toBe(true);
    g.takeEvents(); const before = pub(g);
    expect(g.applyCommand(other, C({ type: 'useMagic', slot: 0 }), 4).ok).toBe(false);
    expect(g.applyCommand(other, C({ type: 'useMagic', slot: 0, handId: h - 1 }), 4).ok).toBe(false);
    expect(g.applyCommand(other, C({ type: 'useMagic', slot: 0, handId: h }), 4).ok).toBe(true);
    const seen = g.privateSnapshot(other, 4).peeks[0].card!;
    expect(g.privateSnapshot(other, 4).peeks[0]).toMatchObject({ source: 'K07', boardIds: [] });
    expect((g.serialize() as any).deck[0]).toBe(seen.id);
    expect(g.takeEvents().filter(e => e.type !== 'use')).toHaveLength(0);
    expect(pub(g)).toBe(before);
  });
});

describe('shuffle each hand', () => {
  it('announces exactly one public shuffle in each of six successive hands, with a fresh 52-card permutation', () => {
    const t = table(51, 2); t.toPlaying(); const g = t.g;
    let now = 4;
    const orders = new Set<string>();
    for (let handId = 1; handId <= 6; handId++) {
      const st = g.serialize() as any;
      const order = [...st.players.flatMap((p: any) => p.hand), ...st.deck];
      expect(new Set(order).size).toBe(52); expect(Object.keys(st.cards)).toHaveLength(52);
      orders.add(order.join(','));
      const events = g.takeEvents().filter(e => e.type === 'shuffle');
      expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ handId }); expect(events[0].to).toBeUndefined();
      expect(g.applyCommand(st.turnPlayerId, C({ type: 'bet', action: 'fold', handId }), now).ok).toBe(true);
      if (handId === 6) break;
      now += 9000; g.tick(now);
      expect(g.publicSnapshot(now).phase).toBe('market');
      for (const id of t.ids) expect(g.applyCommand(id, C({ type: 'ready', ready: true }), now).ok).toBe(true);
    }
    expect(orders.size).toBe(6);
  });
  it('fresh deck every hand: different order, 52 ids, modifiers re-rolled, previous swaps gone, public shuffle event', () => {
    const t = table(50, 2); t.give('a', ['X01']); t.give('b', ['X01']); t.toPlaying(); const g = t.g;
    const ev1 = g.takeEvents().filter(e => e.type === 'shuffle'); expect(ev1).toHaveLength(1); expect(ev1[0]).toMatchObject({ handId: 1 }); expect(ev1[0].to).toBeUndefined();
    const s1 = g.serialize() as any; const order1 = [...s1.players.flatMap((p: any) => p.hand), ...s1.board, ...s1.deck]; const mods1 = JSON.stringify(Object.values(s1.cards).map((c: any) => c.modifiers ?? null));
    const who = g.publicSnapshot(4).turnPlayerId!; g.applyCommand(who, C({ type: 'swap', slot: 0, handIndex: 0, handId: 1 }), 4);
    const spareId = (g.serialize() as any).players.find((p: any) => p.id === who).hand[0]; expect(spareId.startsWith('s')).toBe(true);
    g.applyCommand(who, C({ type: 'bet', action: 'fold', handId: 1 }), 4);
    g.tick(4 + 9000); expect(g.publicSnapshot(9004).phase).toBe('market');
    ['a', 'b'].forEach(id => g.applyCommand(id, C({ type: 'ready', ready: true }), 9005));
    const s2 = g.serialize() as any; expect(s2.handId).toBe(2);
    const order2 = [...s2.players.flatMap((p: any) => p.hand), ...s2.board, ...s2.deck];
    expect(g.takeEvents().filter(e => e.type === 'shuffle')).toMatchObject([{ handId: 2 }]);
    expect(order2.join()).not.toBe(order1.join());
    const all2 = [...order2, ...s2.discard]; expect(new Set(all2).size).toBe(52); expect(Object.keys(s2.cards)).toHaveLength(52);
    expect(Object.keys(s2.cards).some(id => id.startsWith('s'))).toBe(false);
    expect(JSON.stringify(Object.values(s2.cards).map((c: any) => c.modifiers ?? null))).not.toBe(mods1);
  });
});
