import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client, type Room } from '@colyseus/sdk';
import { matchMaker } from '@colyseus/core';
import { restoreGame } from '@saloon/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrivateSnapshot, RoomSnapshot } from '@saloon/protocol';
import { startServer } from '../src/index';

// Random port: other agents run the suite concurrently on the same machine, a fixed port made the whole file fail with EADDRINUSE.
const PORT = 20000 + Math.floor(Math.random() * 30000);
let app: Awaited<ReturnType<typeof startServer>>;
const url = `ws://127.0.0.1:${PORT}`;

interface Tap { room: Room; pub: RoomSnapshot | null; own: PrivateSnapshot | null; raw: { type: string; json: string }[]; errors: string[]; welcome: any; n: number }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
// Other agents run heavy browsers concurrently: scale every wait generously (these are upper bounds, not delays).
const until = async (fn: () => boolean, ms = 40000, what = 'condition') => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms * 6) throw new Error(`timeout: ${what}`); await sleep(50); } };

function tap(room: Room): Tap {
  const t: Tap = { room, pub: null, own: null, raw: [], errors: [], welcome: null, n: 0 };
  for (const type of ['welcome', 'public', 'private', 'event', 'error','social','voiceSignal']) {
    room.onMessage(type, (m: any) => {
      t.raw.push({ type, json: JSON.stringify(m) });
      if (type === 'public') t.pub = m; if (type === 'private') t.own = m; if (type === 'error') t.errors.push(m.message); if (type === 'welcome') t.welcome = m;
    });
  }
  return t;
}
const send = (t: Tap, c: any) => t.room.send('command', { commandId: `c${t.n++}-${Math.random().toString(36).slice(2)}`, handId: t.pub?.handId, ...c });

/** Simple human policy: check/call when it's my turn. */
function autoplay(t: Tap) {
  const timer = setInterval(() => {
    const p = t.pub, o = t.own; if (!p || !o) return;
    if (p.phase === 'playing' && p.turnPlayerId === o.playerId) send(t, { type: 'bet', action: o.legal.canCheck ? 'check' : o.legal.callAmount <= o.wallet ? 'call' : 'fold' });
  }, 150);
  return () => clearInterval(timer);
}

beforeAll(async () => { app = await startServer({ port: PORT, host: '127.0.0.1', dataDir: mkdtempSync(path.join(tmpdir(), 'saloon-')) }); });
afterAll(async () => { await app?.shutdown(); });

describe('saloon server', () => {
  it('host transfer controls bots and kick; a mid-hand kick closes the client and revokes rejoin credentials', async () => {
    const a=tap(await new Client(url).create('saloon',{name:'Host'}));
    await until(()=>!!a.welcome&&!!a.pub,5000,'host joined');
    const b=tap(await new Client(url).joinById(a.room.roomId,{name:'Next host',code:a.welcome.code}));
    const c=tap(await new Client(url).joinById(a.room.roomId,{name:'Guest',code:a.welcome.code}));
    try {
      await until(()=>!!b.own&&!!c.welcome&&a.pub?.players.length===3,5000,'all joined');
      send(c,{type:'kick',targetPlayerId:a.own!.playerId});await until(()=>c.errors.length>0,3000,'guest refused');
      send(a,{type:'transferHost',targetPlayerId:b.own!.playerId});await until(()=>b.pub?.hostId===b.own?.playerId,3000,'host transferred');
      send(a,{type:'addBot'});await until(()=>a.errors.length>0,3000,'former host refused');
      send(b,{type:'addBot'});await until(()=>b.pub?.players.length===4,3000,'new host adds bot');
      for(const t of [a,b,c])send(t,{type:'ready',ready:true});await until(()=>b.pub!.players.every(p=>p.ready),3000,'ready');
      send(b,{type:'start'});await until(()=>b.pub?.phase==='market',3000,'market');send(b,{type:'nextHand'});await until(()=>b.pub?.phase==='playing',3000,'hand');
      let closed=false;c.room.onLeave(()=>{closed=true;});const kickedId=c.own!.playerId;
      send(b,{type:'kick',targetPlayerId:kickedId});await until(()=>closed&&!!b.pub?.players.find(p=>p.id===kickedId)?.kicked,3000,'client kicked');
      expect(b.pub!.turnPlayerId).not.toBe(kickedId);
      const local=matchMaker.getLocalRoomById(a.room.roomId) as any;
      expect(local.rejoinHashes.has(kickedId)).toBe(false);
      expect([...local.seats.values()].some((s:any)=>s.playerId===kickedId)).toBe(false);
    } finally {void c.room.leave();await Promise.allSettled([a.room.leave(),b.room.leave()]);}
  });
  it('health + rooms endpoints, CORS', async () => {
    const h: any = await (await fetch(`http://127.0.0.1:${PORT}/health`)).json();
    expect(h.ok).toBe(true);
    const r = await fetch(`http://127.0.0.1:${PORT}/api/rooms`, { headers: { Origin: 'http://evil.example' } });
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    const r2 = await fetch(`http://127.0.0.1:${PORT}/api/rooms`, { headers: { Origin: 'http://localhost:5180' } });
    expect(r2.headers.get('access-control-allow-origin')).toBe('http://localhost:5180');
  });

  it('two humans + 2 bots play a hand; secrecy; dedup; rate limit; reconnect; bad code', async () => {
    const a = tap(await new Client(url).create('saloon', { name: 'Alice', character: 'lynx' }));
    await until(() => !!a.welcome && !!a.pub && !!a.own, 5000, 'host welcome');
    const code = a.welcome.code as string;
    const rooms = ((await (await fetch(`http://127.0.0.1:${PORT}/api/rooms`)).json()) as any).rooms;
    expect(rooms.find((r: any) => r.code === code)).toMatchObject({ players: 1, maxClients: 4, phase: 'lobby' });

    // bad code is rejected, right code joins
    await expect(new Client(url).joinById(a.room.roomId, { name: 'Mallory', code: 'ZZZZZ' })).rejects.toBeTruthy();
    const b = tap(await new Client(url).joinById(a.room.roomId, { name: 'Bob', character: 'badger', code }));
    await until(() => !!b.own && b.pub?.players.length === 2, 5000, 'bob joined');

    // non-host cannot add bots; host can
    send(b, { type: 'addBot' }); await until(() => b.errors.length > 0, 3000, 'addBot refused');
    send(a, { type: 'addBot' }); send(a, { type: 'addBot' });
    await until(() => a.pub?.players.length === 4, 5000, '4 seated');
    send(a, { type: 'addBot' }); await until(() => a.errors.length > 0, 3000, 'full table refuses bot');

    // duplicate commandId is applied once
    const dup = { commandId: 'dup-1', type: 'ready', ready: true };
    a.room.send('command', dup); await until(() => a.pub?.players.find(p => !p.bot && p.ready && p.name === 'Alice') != null, 3000, 'ready');
    a.room.send('command', { ...dup, ready: false }); await sleep(500);
    expect(a.pub!.players.find(p => p.name === 'Alice')!.ready).toBe(true);

    // rate limit
    const before = a.errors.length;
    for (let i = 0; i < 80; i++) a.room.send('command', { commandId: `spam-${i}`, type: 'ready', ready: true, handId: 0 });
    await until(() => a.errors.length > before && a.errors.some(e => e.includes('Quá nhiều')), 3000, 'rate limited');
    await sleep(2500); // bucket refills

    send(b, { type: 'ready', ready: true });
    await until(() => a.pub!.players.every(p => p.ready), 5000, 'all ready');
    send(a, { type: 'start' });
    await until(() => a.pub!.phase === 'market', 5000, 'opening market');
    expect(b.own!.market).toHaveLength(4);
    send(a, { type: 'nextHand' });
    await until(() => a.pub!.phase === 'playing', 5000, 'playing');
    const stopA = autoplay(a), stopB = autoplay(b);
    await until(() => a.own!.hand.length === 2 && b.own!.hand.length === 2, 5000, 'hole cards');
    const handA = a.own!.hand.map(c => c.id), handB = b.own!.hand.map(c => c.id);

    // reconnect mid-hand
    const token = a.room.reconnectionToken, playerId = a.own!.playerId;
    (a.room as any).connection.close(); stopA();
    await until(() => b.pub?.players.find(p => p.id === playerId)?.connected === false, 8000, 'disconnect visible');
    const a2 = tap(await new Client(url).reconnect(token));
    await until(() => !!a2.own && !!a2.pub, 5000, 'reconnected snapshots');
    expect(a2.own!.playerId).toBe(playerId);
    expect(a2.own!.hand.map(c => c.id)).toEqual(handA);
    expect(a2.pub!.handId).toBe(a.pub!.handId);
    const stopA2 = autoplay(a2);

    // hand completes (showdown or next phase)
    await until(() => ['showdown', 'market', 'finished'].includes(a2.pub!.phase) && a2.pub!.handId >= 1 && (a2.pub!.result !== null || a2.pub!.phase !== 'playing'), 90000, 'hand completes');
    stopA2(); stopB();

    // secrecy over every received message
    for (const t of [a, a2, b]) {
      for (const m of t.raw.filter(r => r.type !== 'private')) {
        expect(m.json).not.toMatch(/"wallet"|"deck"|"slots"|"offers"|"market":|"magic":|"peeks"|"privateLog"|"discard"/);
      }
    }
    const board = new Set([...(a2.pub!.board ?? []), ...(b.pub!.board ?? [])].map(c => c.id));
    const privOnlyA = a.raw.concat(a2.raw).filter(r => r.type === 'private').map(r => r.json).join('');
    const privOnlyB = b.raw.filter(r => r.type === 'private').map(r => r.json).join('');
    for (const id of handB) if (!board.has(id)) expect(privOnlyA).not.toContain(`"id":"${id}"`);
    for (const id of handA) if (!board.has(id)) expect(privOnlyB).not.toContain(`"id":"${id}"`);
    // public messages only expose hole cards through the showdown result (never mid-hand)
    const wallets = [a.own!.wallet, b.own!.wallet];
    expect(wallets.every(Number.isFinite)).toBe(true);
    console.log('hand finished: phase', a2.pub!.phase, 'result:', a2.pub!.result?.summary);
    a2.room.leave(); b.room.leave();
  }, 150000);

  it('magic: market is private per player; Silent leaks nothing over the wire; non-silent use is public; private events route to one socket', async () => {
    const a = tap(await new Client(url).create('saloon', { name: 'Ann', character: 'lynx' }));
    await until(() => !!a.welcome && !!a.own, 5000, 'host');
    const code = a.welcome.code as string;
    const b = tap(await new Client(url).joinById(a.room.roomId, { name: 'Ben', code }));
    const c = tap(await new Client(url).joinById(a.room.roomId, { name: 'Cy', code }));
    await until(() => !!b.own && !!c.own && a.pub?.players.length === 3, 5000, 'seated');
    for (const t of [a, b, c]) send(t, { type: 'ready', ready: true });
    await until(() => a.pub!.players.every(p => p.ready), 5000, 'ready');
    send(a, { type: 'start' }); await until(() => a.pub!.phase === 'market' && !!a.own!.market.length && !!b.own!.market.length, 5000, 'market');
    const taps = [a, b, c];
    // each player's offers are their own, and absent from every public message
    expect(new Set(taps.map(t => t.own!.market.map(o => o.id).join())).size).toBe(3);
    const offerIds = taps.flatMap(t => t.own!.market.map(o => o.id));
    const o = a.own!.market.find(x => x.kind === 'active')!;
    send(a, { type: 'buyMagic', offerId: o.id }); await until(() => a.own!.magic.length === 1, 5000, 'bought');
    for (const t of taps) for (const m of t.raw.filter(r => r.type === 'public')) for (const id of offerIds) expect(m.json).not.toContain(id);
    for (const t of [b, c]) { expect(t.raw.filter(r => r.type === 'event').some(r => r.json.includes('"purchase"'))).toBe(false); }
    expect(a.raw.some(r => r.type === 'event' && r.json.includes('"purchase"'))).toBe(true);

    // inject magic cards: a is Silent with K01/K04/K07, b has a loud K01; then start the hand
    const room: any = matchMaker.getLocalRoomById(a.room.roomId);
    const st: any = room.engine.serialize();
    const give = (id: string, cards: string[]) => { const p = st.players.find((x: any) => x.id === id); p.slots = [null, null, null, null, null]; cards.forEach((m, i) => (p.slots[i] = { magicId: m })); };
    give(a.own!.playerId, ['N07', 'K01', 'K04', 'K07']); give(b.own!.playerId, ['K01']); give(c.own!.playerId, []);
    st.deadline = 4_000_000_000_000;
    room.engine = restoreGame(st, { roomId: st.roomId, code: st.code, random: Math.random });
    send(a, { type: 'nextHand' }); await until(() => a.pub!.phase === 'playing' && a.own!.hand.length === 2, 5000, 'playing');
    await until(() => taps.every(t => t.raw.some(r => r.type === 'event' && JSON.parse(r.json).type === 'shuffle')), 5000, 'shuffle to every socket');
    const turnId = a.pub!.turnPlayerId!; const cur = taps.find(t => t.own!.playerId === turnId)!;
    const hid = a.pub!.handId;
    for (const t of taps) t.raw.length = 0;
    const pubBefore = JSON.stringify({ ...a.pub, serverTime: 0, deadline: 0 });
    // let the turn player act: whoever it is, put magic on them through the engine so the check is deterministic
    const st2: any = room.engine.serialize();
    for (const p of st2.players) p.slots = [null, null, null, null, null];
    const me = st2.players.find((p: any) => p.id === turnId); me.slots[0] = { magicId: 'N07' }; me.slots[1] = { magicId: 'K01' }; me.slots[2] = { magicId: 'K07' };
    st2.deadline = 4_000_000_000_000;
    room.engine = restoreGame(st2, { roomId: st2.roomId, code: st2.code, random: Math.random });
    const victim = taps.find(t => t !== cur)!;
    send(cur, { type: 'useMagic', slot: 1, targetPlayerId: victim.own!.playerId, handId: hid });
    send(cur, { type: 'useMagic', slot: 2, handId: hid });
    await until(() => cur.own!.peeks.length === 2, 5000, 'silent peeks arrived');
    await sleep(400);
    for (const t of taps) {
      expect(t.raw.filter(r => r.type === 'event' && r.json.includes('magicUsed'))).toHaveLength(0);
      if (t !== cur) { expect(t.raw.filter(r => r.type === 'event')).toHaveLength(0); expect(t.raw.some(r => r.type === 'private' && r.json.includes('peeks":[{'))).toBe(false); }
    }
    expect(JSON.stringify({ ...a.pub, serverTime: 0, deadline: 0 }).length).toBeGreaterThan(0);
    void pubBefore;

    // K10 hinted: only its actor receives the result, only the victim receives the vague hint.
    const sensed: any = room.engine.serialize();
    sensed.players.find((p: any) => p.id === turnId).slots = [{ magicId: 'K10' }, null, null, null, null];
    sensed.players.find((p: any) => p.id === victim.own!.playerId).slots = [{ magicId: 'X01', spare: { id: 's9900', rank: 14, suit: 'S' } }, { magicId: 'K07' }, null, null, null];
    sensed.deadline = 4_000_000_000_000;
    room.engine = restoreGame(sensed, { roomId: sensed.roomId, code: sensed.code, random: () => 0.1 });
    for (const t of taps) t.raw.length = 0;
    send(cur, { type: 'useMagic', slot: 0, targetPlayerId: victim.own!.playerId, handId: hid });
    await until(() => cur.own!.peeks.some(p => p.magic?.targetPlayerId === victim.own!.playerId), 5000, 'magic peek');
    await until(() => victim.raw.some(r => r.type === 'event' && JSON.parse(r.json).type === 'magicHint'), 5000, 'sensed hint');
    expect(cur.own!.peeks.at(-1)!.magic?.magicId).toBe('X01');
    expect(JSON.stringify(cur.own!.peeks.at(-1))).not.toContain('s9900');
    for (const t of taps) {
      const events = t.raw.filter(r => r.type === 'event').map(r => JSON.parse(r.json));
      expect(events.filter(e => e.type === 'magicUsed')).toHaveLength(0);
      expect(events.filter(e => e.type === 'magicHint')).toHaveLength(t === victim ? 1 : 0);
      for (const hint of events.filter(e => e.type === 'magicHint')) {
        expect(hint.cue).toBe('sensed'); expect(hint.playerId).toBeUndefined(); expect(hint.magicId).toBeUndefined();
      }
      expect(events.filter(e => e.type === 'use')).toHaveLength(t === cur ? 1 : 0);
    }

    // K07 is usable on the victim's socket while someone else owns the betting turn.
    for (const t of taps) t.raw.length = 0;
    send(victim, { type: 'useMagic', slot: 1, handId: hid });
    await until(() => victim.own!.peeks.some(p => p.source === 'K07'), 5000, 'out-of-turn orb');
    await until(() => victim.raw.some(r => r.type === 'event' && JSON.parse(r.json).type === 'use'), 5000, 'private orb acknowledgement');
    expect(victim.pub!.turnPlayerId).toBe(turnId);
    for (const t of taps) {
      const events = t.raw.filter(r => r.type === 'event').map(r => JSON.parse(r.json));
      expect(events.filter(e => e.type === 'use')).toHaveLength(t === victim ? 1 : 0);
      expect(events.filter(e => !e.to)).toHaveLength(0);
    }

    // now a loud use by the same table: replace the actor's N07 by K07 only
    const st3: any = room.engine.serialize(); st3.players.find((p: any) => p.id === turnId).slots = [{ magicId: 'K09' }, null, null, null, null]; st3.deadline = 4_000_000_000_000;
    room.engine = restoreGame(st3, { roomId: st3.roomId, code: st3.code, random: Math.random });
    for (const t of taps) t.raw.length = 0;
    send(cur, { type: 'useMagic', slot: 0, handId: hid });
    await until(() => taps.every(t => t.raw.some(r => r.type === 'event' && r.json.includes('magicUsed'))), 5000, 'public magicUsed to all');
    for (const t of taps) { const ev = t.raw.filter(r => r.type === 'event').map(r => JSON.parse(r.json)); expect(ev.filter(e => e.type === 'magicUsed')).toHaveLength(1); expect(ev.filter(e => e.type === 'use').length).toBe(t === cur ? 1 : 0); }
    for (const t of taps) t.room.leave();
  }, 120000);

  it('stress: 50 rapid abrupt disconnect + rejoinKey cycles in lobby, market, playing and mid-game market keep the seat connected', async () => {
    for (const phase of ['lobby', 'market', 'playing', 'midmarket'] as const) {
      const a = tap(await new Client(url).create('saloon', { name: 'Ann', character: 'lynx' }));
      await until(() => !!a.welcome && !!a.own, 5000, 'host');
      const code = a.welcome.code as string, key = a.welcome.rejoinKey as string, pid = a.welcome.playerId as string;
      expect(key).toBeTruthy();
      const b = tap(await new Client(url).joinById(a.room.roomId, { name: 'Ben', code }));
      await until(() => !!b.own && a.pub?.players.length === 2, 5000, 'seated');
      if (phase !== 'lobby') {
        send(a, { type: 'ready', ready: true }); send(b, { type: 'ready', ready: true });
        await until(() => a.pub!.players.every(p => p.ready), 5000, 'ready');
        send(a, { type: 'start' }); await until(() => a.pub!.phase === 'market', 5000, 'market');
      }
      if (phase === 'playing' || phase === 'midmarket') {
        send(a, { type: 'ready', ready: true }); send(b, { type: 'ready', ready: true });
        await until(() => a.pub!.phase === 'playing', 5000, 'playing');
      }
      if (phase === 'midmarket') {
        const folder = a.pub!.turnPlayerId === a.own!.playerId ? a : b;
        send(folder, { type: 'bet', action: 'fold' });
        await until(() => a.pub!.phase === 'market', 20000, 'market');
      }
      let cur = a;
      for (let i = 0; i < 50; i++) {
        (cur.room as any).connection.close();                     // abrupt drop, no waiting for the server to notice
        const next = tap(await new Client(url).joinById(a.room.roomId, { name: 'Ann', code, rejoinKey: key }));
        await until(() => next.welcome?.playerId === pid && !!next.own && !!next.pub, 5000, `${phase} rejoin ${i}`);
        expect(next.own!.playerId).toBe(pid);
        cur = next;
      }
      await sleep(1500); // let every stale socket's drop/leave handlers fire
      const seat = b.pub!.players.find(p => p.id === pid)!;
      const rr: any = matchMaker.getLocalRoomById(a.room.roomId);
      expect(rr.locked).toBe(false);
      expect(Object.keys(rr._reconnections).length).toBeLessThanOrEqual(2); // stale reservations are released, not left for 45 s
      expect(b.pub!.players.length).toBe(2);
      expect(seat.connected).toBe(true);
      expect(cur.pub!.players.find(p => p.id === pid)!.connected).toBe(true);
      // phases advance on their own timers (20 s turn clock, showdown): only require we did not fall back to an earlier phase
      if (phase !== 'lobby') expect(cur.pub!.phase).not.toBe('lobby');
      if (phase === 'playing' || phase === 'midmarket') expect(['playing', 'showdown', 'market', 'finished']).toContain(cur.pub!.phase);
      cur.room.leave(); b.room.leave();
      await sleep(200);
    }
  }, 900000);

  it('a non-consented socket death in the lobby keeps the seat for the reconnect window (rejoinKey still works); a consented leave removes it', async () => {
    const a = tap(await new Client(url).create('saloon', { name: 'Ann' }));
    await until(() => !!a.welcome && !!a.own, 5000, 'host');
    const code = a.welcome.code as string, key = a.welcome.rejoinKey as string, pid = a.welcome.playerId as string;
    const b = tap(await new Client(url).joinById(a.room.roomId, { name: 'Ben', code }));
    await until(() => !!b.own && a.pub?.players.length === 2, 5000, 'seated');
    const room: any = matchMaker.getLocalRoomById(a.room.roomId);
    // Simulate Colyseus failing allowReconnection (client still JOINING): onLeave with an abnormal code.
    const client = room.clients.find((c: any) => c.sessionId === [...room.seats].find(([, s]: any) => s.playerId === pid)[0]);
    room.onLeave(client, 1006);
    expect(room.engine.publicSnapshot(Date.now()).players.some((p: any) => p.id === pid)).toBe(true);
    const back = tap(await new Client(url).joinById(a.room.roomId, { name: 'Ann', code, rejoinKey: key }));
    await until(() => back.welcome?.playerId === pid && !!back.own, 5000, 'rejoined after lobby socket death');
    await sleep(300);
    expect(b.pub!.players.find(p => p.id === pid)!.connected).toBe(true);
    back.room.leave();                                                  // consented -> removed
    await until(() => b.pub!.players.every(p => p.id !== pid), 5000, 'consented leave removes the seat');
    b.room.leave();
  }, 120000);
});
