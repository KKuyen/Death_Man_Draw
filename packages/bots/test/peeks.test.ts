import { describe, expect, it } from 'vitest';
import { createGame, restoreGame } from '@saloon/rules';
import type { Card, Command, PrivateSnapshot, RoomSnapshot } from '@saloon/protocol';
import { bettingStrength, decideBet, decideExtras, decideMagic, newBotMemory, runBots } from '../src/index';

const card = (id: string, rank: number, suit: Card['suit'] = 'S'): Card => ({ id, rank, suit });
function snapshots(): { own: PrivateSnapshot; pub: RoomSnapshot } {
  const g = createGame({ roomId: 'r', code: 'ABCDE', random: () => 0.4, now: 0 });
  for (const id of ['a', 'b', 'c']) {
    g.addPlayer({ id, name: id }, 0);
    g.applyCommand(id, { commandId: id, type: 'ready', ready: true }, 0);
  }
  g.applyCommand('a', { commandId: 'start', type: 'start' }, 0);
  g.applyCommand('a', { commandId: 'hand', type: 'nextHand' }, 1);
  const own = g.privateSnapshot('a', 1), pub = g.publicSnapshot(1);
  own.hand = [card('QS', 12), card('QH', 12, 'H')]; own.wallet = 900;
  own.legal = { canCheck: false, callAmount: 20, minRaiseTo: 40, maxRaiseTo: 900, canRaise: true, canFold: true };
  pub.board = [card('KS', 13), card('KH', 13, 'H'), card('7D', 7, 'D'), card('2C', 2, 'C')];
  pub.street = 'turn'; pub.pot = 80; pub.turnPlayerId = 'a';
  pub.players.forEach(p => { p.bet = p.id === 'b' ? 20 : 0; });
  return { own, pub };
}

describe('bots use only received peek information', () => {
  it('does not shove a deep stack merely because its planned raise is below the minimum; a real short stack can shove', () => {
    const { own, pub } = snapshots(); pub.board = []; pub.street = 'preflop'; pub.pot = 300;
    pub.players.find(p => p.id === 'b')!.bet = 300;
    own.legal.callAmount = 300; own.legal.minRaiseTo = 500;
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('call');
    own.wallet = 350; own.legal.maxRaiseTo = 350;
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('allIn');
  });

  it('K01 warning changes a value raise to a call; old-hand/folded-target peeks are ignored', () => {
    const { own, pub } = snapshots();
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('raise');
    own.peeks = [{ handId: pub.handId, label: 'Tên không dùng để suy luận', source: 'K01', targetPlayerId: 'b', card: card('f123', 13, 'D') }];
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('call');
    const warned = bettingStrength(own, pub);
    own.peeks.push({ handId: pub.handId, label: 'Soi phép', magic: { magicId: 'N08', targetPlayerId: 'b' } });
    expect(bettingStrength(own, pub)).toBeGreaterThan(warned);
    own.peeks[0].handId--;
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('raise');
    own.peeks[0].handId = pub.handId;
    pub.players.find(p => p.id === 'b')!.folded = true;
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('raise');
  });

  it('K07 prediction changes betting; a drawn/replaced board invalidates it', () => {
    const { own, pub } = snapshots();
    pub.board = [card('JS', 11), card('9D', 9, 'D'), card('3C', 3, 'C')]; pub.street = 'flop';
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('call');
    own.peeks = [{ handId: pub.handId, label: 'Quả cầu soi', source: 'K07', boardIds: pub.board.map(c => c.id), card: card('QD', 12, 'D') }];
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('raise');
    pub.board[0] = card('JH', 11, 'H');
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('call');
    own.peeks[0].boardIds = pub.board.map(c => c.id);
    own.peeks[0].handId--;
    expect(decideBet(own, pub, () => 0.5)[0].action).toBe('call');
  });

  it.each([['K08', 'N04'], ['K01', 'N08'], ['K02', 'N08']])('K10 helps %s avoid a target observed holding %s', (spell, protection) => {
    const { own, pub } = snapshots();
    own.magic = [{ slot: 0, magicId: spell, usable: true }];
    expect(decideMagic(own, pub, () => 0.1)).toMatchObject({ targetPlayerId: 'b' });
    own.peeks = [{ handId: pub.handId, label: 'Soi phép', magic: { magicId: protection, targetPlayerId: 'b' } }];
    expect(decideMagic(own, pub, () => 0.1)).toMatchObject({ targetPlayerId: 'c' });
    own.peeks[0].handId--;
    expect(decideMagic(own, pub, () => 0.1)).toMatchObject({ targetPlayerId: 'b' });
  });

  it('the shipped smart bot buys and uses K10 when an affordable offer is available', () => {
    const { own, pub } = snapshots();
    pub.phase = 'market';
    own.magic = [];
    own.market = [{ id: 'offer', slot: 0, magicId: 'K10', name: 'Lá soi phép', kind: 'active', visibility: 'hinted', swap: false, description: 'Soi phép', price: 60, purchased: false, owned: false }];
    expect(decideExtras('a', own, pub, newBotMemory(0), () => 0.1)?.commands).toEqual([{ type: 'buyMagic', offerId: 'offer', replaceSlot: 0 }]);
    pub.phase = 'playing'; own.magic = [{ slot: 0, magicId: 'K10', usable: true }];
    expect(decideMagic(own, pub, () => 0.1)).toMatchObject({ type: 'useMagic', slot: 0, targetPlayerId: 'b' });
  });

  it('runBots uses hidden K07 outside its betting turn through ordinary commands', () => {
    const g = createGame({ roomId: 'r', code: 'ABCDE', random: () => 0.4, now: 0 });
    for (const id of ['a', 'b', 'c']) { g.addPlayer({ id, name: id }, 0); g.applyCommand(id, { commandId: id, type: 'ready', ready: true }, 0); }
    g.applyCommand('a', { commandId: 'start', type: 'start' }, 0);
    g.applyCommand('a', { commandId: 'hand', type: 'nextHand' }, 1);
    const st = g.serialize() as any;
    const bot = st.players.find((p: any) => p.id !== st.turnPlayerId);
    bot.bot = true; bot.slots[0] = { magicId: 'K07' };
    const game = restoreGame(st, { roomId: 'r', code: 'ABCDE', random: () => 0.4 });
    game.takeEvents();
    const mems = new Map([[bot.id, newBotMemory(0)]]);
    let n = 0;
    runBots(game, mems, 2000, () => 0.4, () => `b${++n}`);
    expect(game.privateSnapshot(bot.id, 2000).peeks).toMatchObject([{ source: 'K07', boardIds: [] }]);
    expect(game.publicSnapshot(2000).turnPlayerId).toBe(st.turnPlayerId);
    expect(game.takeEvents()).toMatchObject([{ type: 'use', to: bot.id, magicId: 'K07' }]);
  });
});
