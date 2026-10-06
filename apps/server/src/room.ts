import {cleanChat,cleanSignal} from './social.js';
import { Room, type Client } from '@colyseus/core';
import { PROTOCOL_VERSION, type SocialState, type Command, type GameEngine, type GameEvent, type PrivateSnapshot, type RoomSnapshot } from '@saloon/protocol';
import { createGame, restoreGame } from '@saloon/rules';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { runBots, type BotMemory } from './bot.js';
import { config } from './config.js';
import type { RoomCheckpoint, Store } from './persistence.js';
import { CHARACTERS, TokenBucket, cleanCharacter, cleanName, cryptoRandom, log, newCode, newId, validCode } from './util.js';

const sha = (k: string) => createHash('sha256').update(k).digest('hex');
const eqHex = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Events with `to` are private: only that player's sockets get them. Hidden (Silent) events are never created by the engine, so nothing else needs filtering. */
export const eventAudience = (e: GameEvent): string | null => e.to ?? null;

export const registry = new Map<string, SaloonRoom>();
export const shared: { store: Store | null; shuttingDown: boolean } = { store: null, shuttingDown: false };

const BOT_NAMES = ['Dusty Pete', 'Calamity', 'Old Whiskers', 'Silver Sal'];
interface Seat { playerId: string; bucket: TokenBucket; chatBucket:TokenBucket; voiceBucket:TokenBucket; client: Client }

export class SaloonRoom extends Room {
  // Colyseus counts reconnection reservations and not-yet-closed stale sockets toward maxClients and then LOCKS the room, which blocked refresh/rejoin.
  // The real table size (4) is enforced in onAuth/addBot, so leave headroom here.
  maxClients = config.maxClients * 4;
  code = '';
  private social:SocialState={messages:[],microphones:{},voiceSessions:{}};
  engine!: GameEngine;
  private seats = new Map<string, Seat>();            // sessionId -> seat
  private rejoinHashes = new Map<string, string>();     // playerId -> sha256(rejoinKey) for humans (persisted in checkpoint)
  private names = new Map<string, string>();
  private pendingKeys = new Map<string, string | undefined>(); // rejoinKey shown to the client in welcome (fresh joins only)
  private botMem = new Map<string, BotMemory>();
  private lastPublic = new Map<string, string>(); private lastPrivate = new Map<string, string>();
  private lastHeartbeat = 0; private lastCheckpoint = 0; private cpDirty = false;
  private removalTimers = new Map<string, ReturnType<typeof setTimeout>>(); // lobby/finished seats of dropped (non-consented) sessions, removed after the reconnect window
  private restoredEmptyTimer: ReturnType<typeof setTimeout> | null = null;

  /** Public summary for GET /api/rooms. No cards, wallets or secrets. */
  summary() {
    const pub = this.engine.publicSnapshot(Date.now());
    return { roomId: this.roomId, code: this.code, players: pub.players.length, maxClients: config.maxClients, phase: pub.phase, public: !!this.social.public };
  }

  /** Human whose secret key matches. The key proves ownership, so it may take over a seat whose old socket has not been noticed as dead yet (refresh race). */
  private findClaim(key: unknown): string | null {
    if (typeof key !== 'string' || key.length < 16 || key.length > 128) return null;
    const h = sha(key);
    for (const [pid, hash] of this.rejoinHashes) if (eqHex(hash, h)) return pid;
    return null;
  }

  /** Detach every other session still bound to this player (stale socket); their later onDrop/onLeave become no-ops. */
  private supersede(playerId: string, keepSessionId: string) {
    for (const [sid, seat] of [...this.seats]) {
      if (seat.playerId !== playerId || sid === keepSessionId) continue;
      this.seats.delete(sid); this.pendingKeys.delete(sid); this.lastPublic.delete(sid); this.lastPrivate.delete(sid);
      const old = seat.client; // may already be dropped (not in this.clients) but still holds a reconnection reservation
      // Free the stale session now: end a pending allowReconnection window (else it holds a slot for 45 s) and close the socket.
      try { (this as any)._reconnections?.[old.reconnectionToken as string]?.[1]?.reject(false); } catch { /* internal API shape changed: harmless */ }
      try { old.leave(); } catch { /* already gone */ }
    }
  }

  async onAuth(_client: Client, options: any) {
    const code = options?.code;
    if (code !== undefined && code !== null && code !== '' && String(code).toUpperCase() !== this.code) throw new Error('Mã bàn không khớp.');
    if (this.findClaim(options?.rejoinKey)) return true;
    const pub = this.engine.publicSnapshot(Date.now());
    // Joining after the lobby seats as a spectator (see Engine.addPlayer); still capped at the same 4 seats.
    if (pub.players.length >= config.maxClients) throw new Error('Bàn đã đủ người.');
    return true;
  }

  onCreate(options: any) {
    this.autoDispose = true;
    const requested = typeof options?.code === 'string' ? options.code.trim().toUpperCase() : '';
    const restore = options?.restore as RoomCheckpoint | undefined;
    if (restore) {
      this.code = restore.code;
    } else if (requested) {
      if (!validCode(requested) || [...registry.values()].some(r => r.code === requested)) throw new Error('Mã bàn không hợp lệ hoặc đã dùng.');
      this.code = requested;
    } else {
      do this.code = newCode(); while ([...registry.values()].some(r => r.code === this.code));
    }
    this.social.public = !!options?.public;
    const gameOptions = { roomId: this.roomId, code: this.code, now: Date.now(), random: cryptoRandom };
    if (restore) {
      this.engine = restoreGame(restore.engine, gameOptions);
      for (const h of restore.humans) { this.engine.setConnected(h.id, false); this.rejoinHashes.set(h.id, h.keyHash); this.names.set(h.id, h.name); }
      this.autoDispose = false;
      this.restoredEmptyTimer = setTimeout(() => { if (this.clients.length === 0) void this.disconnect(); }, config.reconnectSeconds * 1000 + 2000);
      log(`room ${this.code} restored (${restore.humans.length} humans pending)`);
    } else {
      this.engine = createGame(gameOptions);
    }
    registry.set(this.roomId, this);
    void this.setMetadata({ code: this.code });
    this.onMessage('chat',(client,payload)=>{
      const seat=this.seats.get(client.sessionId);if(!seat)return;
      const text=cleanChat(payload);if(!text)return client.send('error',{message:'Tin nhắn phải có 1–300 ký tự.'});
      if(!seat.chatBucket.take())return client.send('error',{message:'Bạn gửi tin quá nhanh.'});
      this.social.messages.push({id:randomBytes(8).toString('hex'),playerId:seat.playerId,name:this.names.get(seat.playerId)||'Người chơi',text,at:Date.now()});
      this.social.messages=this.social.messages.slice(-50);this.broadcast('social',this.social);
    });
    this.onMessage('voiceReady',(client)=>{const seat=this.seats.get(client.sessionId);if(!seat||!seat.voiceBucket.take())return;this.social.voiceSessions![seat.playerId]=randomBytes(8).toString('hex');this.broadcast('social',this.social);});
    this.onMessage('microphone',(client,on)=>{const seat=this.seats.get(client.sessionId);if(!seat||typeof on!=='boolean'||!seat.voiceBucket.take())return;this.social.microphones[seat.playerId]=on;this.broadcast('social',this.social);});
    this.onMessage('voiceSignal',(client,payload)=>{
      const seat=this.seats.get(client.sessionId);if(!seat||!seat.voiceBucket.take())return;
      const signal=cleanSignal(payload);if(!signal||signal.toPlayerId===seat.playerId)return;
      const target=[...this.seats.values()].find(x=>x.playerId===signal.toPlayerId);
      if(signal.toSession&&signal.toSession!==this.social.voiceSessions![signal.toPlayerId])return;
      if(target&&this.clients.includes(target.client))target.client.send('voiceSignal',{...signal,fromPlayerId:seat.playerId,fromSession:this.social.voiceSessions![seat.playerId],toSession:this.social.voiceSessions![signal.toPlayerId]});
    });
    this.onMessage('command', (client, payload) => this.handleCommand(client, payload));
    this.clock.setInterval(() => this.step(), config.tickMs);
    this.cpDirty = true;
    log(`room ${this.code} created (${this.roomId})`);
  }

  onJoin(client: Client, options: any) {
    const name = cleanName(options?.name);
    const claimed = this.findClaim(options?.rejoinKey);
    log(`join session=${client.sessionId} claim=${claimed ?? '-'}`);
    let playerId = client.sessionId;
    let rejoinKey: string | undefined;
    if (claimed) { playerId = claimed; this.supersede(claimed, client.sessionId); const t = this.removalTimers.get(claimed); if (t) { clearTimeout(t); this.removalTimers.delete(claimed); } }
    else {
      this.engine.addPlayer({ id: playerId, name, character: cleanCharacter(options?.character) }, Date.now());
      rejoinKey = randomBytes(24).toString('hex');
      this.rejoinHashes.set(playerId, sha(rejoinKey)); this.names.set(playerId, name);
    }
    this.engine.setConnected(playerId, true);this.social.microphones[playerId]=false;delete this.social.voiceSessions![playerId];this.broadcast('social',this.social);
    this.pendingKeys.set(client.sessionId, rejoinKey);
    this.seats.set(client.sessionId, { playerId, client, bucket: new TokenBucket(config.rateLimit.capacity, config.rateLimit.refillPerSec), chatBucket:new TokenBucket(5,1),voiceBucket:new TokenBucket(200,40) });
    if (this.restoredEmptyTimer) { clearTimeout(this.restoredEmptyTimer); this.restoredEmptyTimer = null; this.autoDispose = true; }
    // Clients may attach handlers just after joining: send welcome a few times (idempotent).
    this.greet(client);
    for (const ms of [250, 1000]) this.clock.setTimeout(() => this.greet(client), ms);
    this.flush(true);
  }

  private greet(client: Client) {
    const seat = this.seats.get(client.sessionId); if (!seat) return;
    client.send('welcome', { playerId: seat.playerId, code: this.code, roomId: this.roomId, protocolVersion: PROTOCOL_VERSION, ...(this.pendingKeys.get(client.sessionId) ? { rejoinKey: this.pendingKeys.get(client.sessionId) } : {}) });
    client.send('social',this.social);
    this.sendSnapshots(client, true);
  }

  async onDrop(client: Client, code?: number) {
    log(`drop session=${client.sessionId} code=${code ?? '?'} seat=${this.seats.has(client.sessionId)}`);
    const seat = this.seats.get(client.sessionId); if (!seat) return;
    if ([...this.seats].some(([sid, x]) => sid !== client.sessionId && x.playerId === seat.playerId)) return; // newer session owns the seat
    this.engine.setConnected(seat.playerId, false);this.social.microphones[seat.playerId]=false;this.broadcast('social',this.social);
    this.flush(true);
    try { await this.allowReconnection(client, config.reconnectSeconds); }
    catch { /* timed out: onLeave runs next */ }
  }

  onReconnect(client: Client) {
    log(`reconnect session=${client.sessionId}`);
    const seat = this.seats.get(client.sessionId); if (!seat) return;
    this.engine.setConnected(seat.playerId, true);
    this.greet(client);
    for (const ms of [250, 1000]) this.clock.setTimeout(() => this.greet(client), ms);
    this.flush(true);
  }

  onLeave(client: Client, code?: number) {
    log(`leave session=${client.sessionId} code=${code ?? '?'} seat=${this.seats.has(client.sessionId)}`);
    const seat = this.seats.get(client.sessionId); if (!seat) return;
    this.seats.delete(client.sessionId); this.pendingKeys.delete(client.sessionId); this.lastPublic.delete(client.sessionId); this.lastPrivate.delete(client.sessionId);
    if ([...this.seats.values()].some(x => x.playerId === seat.playerId)) return; // player already re-seated on a newer session
    this.social.microphones[seat.playerId]=false;this.broadcast('social',this.social);
    const phase = this.engine.publicSnapshot(Date.now()).phase;
    if (phase === 'lobby' || phase === 'finished') {
      const dropMs = config.reconnectSeconds * 1000;
      if (code === 4000 /* consented leave */) { this.engine.removePlayer(seat.playerId); this.rejoinHashes.delete(seat.playerId); }
      else {
        // Socket died (e.g. refresh while the browser was still loading, so allowReconnection could not hold the seat): keep the seat for the reconnect window so the rejoinKey still works.
        this.engine.setConnected(seat.playerId, false);
        this.removalTimers.get(seat.playerId) && clearTimeout(this.removalTimers.get(seat.playerId)!);
        this.removalTimers.set(seat.playerId, setTimeout(() => {
          this.removalTimers.delete(seat.playerId);
          if ([...this.seats.values()].some(x => x.playerId === seat.playerId)) return;
          try { this.engine.removePlayer(seat.playerId); } catch { /* already gone */ }
          this.rejoinHashes.delete(seat.playerId); this.flush(true);
        }, dropMs));
      }
    }
    else this.engine.setConnected(seat.playerId, false); // engine eliminates after its own 45s window
    this.flush(true);
  }

  async onDispose() {
    registry.delete(this.roomId);
    if (this.restoredEmptyTimer) clearTimeout(this.restoredEmptyTimer);
    for (const t of this.removalTimers.values()) clearTimeout(t);
    const keep = shared.shuttingDown && this.engine.publicSnapshot(Date.now()).phase !== 'finished';
    try { if (!keep) await shared.store?.remove(this.roomId); } catch (e) { log(`checkpoint error: ${(e as Error).message}`); }
    log(`room ${this.code} disposed${keep ? ' (checkpointed)' : ''}`);
  }

  checkpoint(): RoomCheckpoint {
    const pub = this.engine.publicSnapshot(Date.now());
    return {
      roomId: this.roomId, code: this.code, savedAt: Date.now(), hostId: null,
      humans: pub.players.filter(p => !p.bot && this.rejoinHashes.has(p.id)).map(p => ({ id: p.id, name: p.name, keyHash: this.rejoinHashes.get(p.id)! })),
      engine: this.engine.serialize(),
    };
  }

  // ---- commands ----
  private handleCommand(client: Client, payload: unknown) {
    const seat = this.seats.get(client.sessionId); if (!seat) return;
    const reject = (message: string) => client.send('error', { message });
    if (!seat.bucket.take()) return reject('Quá nhiều thao tác, hãy chậm lại.');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return reject('Lệnh không hợp lệ.');
    const c = payload as Record<string, unknown>;
    if (typeof c.commandId !== 'string' || c.commandId.length < 1 || c.commandId.length > 128) return reject('Lệnh thiếu commandId.');
    if (typeof c.type !== 'string' || JSON.stringify(c).length > 2048) return reject('Lệnh không hợp lệ.');
    const now = Date.now();
    if (c.type === 'addBot') {
      const result = this.addBot(seat.playerId, now);
      if (!result.ok) reject(result.error ?? 'Không thể thêm bot.');
    } else if (c.type === 'disband') {
      const pub = this.engine.publicSnapshot(now);
      if (pub.phase !== 'finished' || pub.hostId !== seat.playerId) return reject('Chỉ chủ phòng giải tán được bàn sau khi trận kết thúc.');
      for (const cl of [...this.clients]) cl.leave(1000);
      return;
    } else if (c.type === 'setVisibility') {
      const pub = this.engine.publicSnapshot(now);
      if (pub.hostId !== seat.playerId) return reject('Chỉ chủ phòng đổi được chế độ công khai.');
      this.social.public = !!(c as { public?: unknown }).public;
      this.broadcast('social', this.social);
    } else if (c.type === 'kick') {
      const result = this.engine.applyCommand(seat.playerId, c as unknown as Command, now);
      if (!result.ok) { reject(result.error ?? 'Không thể đuổi người chơi.'); }
      else {
        const targetId = (c as { targetPlayerId?: unknown }).targetPlayerId;
        if (typeof targetId === 'string') {
          this.rejoinHashes.delete(targetId); this.names.delete(targetId); this.botMem.delete(targetId);
          const timer = this.removalTimers.get(targetId); if (timer) clearTimeout(timer); this.removalTimers.delete(targetId);
          delete this.social.microphones[targetId]; delete this.social.voiceSessions![targetId]; this.broadcast('social', this.social);
        }
        for (const [sid, s] of [...this.seats]) {
          if (s.playerId !== targetId) continue;
          this.seats.delete(sid);
          try { s.client.send('error', { message: 'Chủ phòng đã đuổi bạn khỏi bàn.' }); s.client.leave(1000); } catch { /* already gone */ }
        }
      }
    } else {
      const result = this.engine.applyCommand(seat.playerId, c as unknown as Command, now);
      if (!result.ok) reject(result.error ?? 'Thao tác chưa hợp lệ.');
    }
    this.flush(true);
  }

  private addBot(requesterId: string, now: number) {
    const pub = this.engine.publicSnapshot(now);
    const host = pub.players.find(p => p.id === pub.hostId);
    if (pub.phase !== 'lobby') return { ok: false, error: 'Chỉ thêm bot ở sảnh.' };
    if (!host || host.id !== requesterId) return { ok: false, error: 'Chỉ chủ phòng được thêm bot.' };
    const bots = pub.players.filter(p => p.bot).length;
    if (bots >= 3 || pub.players.length >= config.maxClients) return { ok: false, error: 'Bàn đã đủ chỗ.' };
    const used = new Set(pub.players.map(p => p.character));
    const character = CHARACTERS.find(c => !used.has(c)) ?? CHARACTERS[bots % CHARACTERS.length];
    this.engine.addPlayer({ id: newId('bot'), name: BOT_NAMES[bots % BOT_NAMES.length], character, bot: true }, now);
    return { ok: true };
  }

  // ---- loop ----
  private step() {
    const now = Date.now();
    this.engine.tick(now);
    this.runBots(now);
    this.flush(false, now);
  }

  private runBots(now: number) { runBots(this.engine, this.botMem, now, cryptoRandom, () => newId('b')); }

  /** Broadcast events + snapshots. `force` sends on mutation; otherwise rate-limited diff + 1s heartbeat. */
  private flush(force: boolean, now = Date.now()) {
    const events = this.engine.takeEvents();
    if (events.length) {
      this.cpDirty = true;
      for (const e of events) {
        const to = eventAudience(e);
        if (to === null) this.broadcast('event', e);
        else for (const [sid, seat] of this.seats) if (seat.playerId === to) seat.client.send('event', e);
        // Only public events are persisted in the room log: private ones carry per-player information.
        if (to === null) void shared.store?.logEvent(this.roomId, e.at, e.type, e).catch(() => undefined);
      }
    }
    const heartbeat = now - this.lastHeartbeat >= 1000;
    if (!force && !events.length && !heartbeat && now - this.lastHeartbeatDiff < config.snapshotMs) { this.maybeCheckpoint(now); return; }
    this.lastHeartbeatDiff = now;
    if (heartbeat) this.lastHeartbeat = now;
    for (const client of this.clients) this.sendSnapshots(client, heartbeat, now);
    this.maybeCheckpoint(now);
  }
  private lastHeartbeatDiff = 0;

  private sendSnapshots(client: Client, force: boolean, now = Date.now()) {
    const seat = this.seats.get(client.sessionId); if (!seat) return;
    const pub: RoomSnapshot = this.engine.publicSnapshot(now);
    const pubKey = JSON.stringify({ ...pub, serverTime: 0 });
    if (force || pubKey !== this.lastPublic.get(client.sessionId)) { client.send('public', pub); this.lastPublic.set(client.sessionId, pubKey); }
    const own: PrivateSnapshot = this.engine.privateSnapshot(seat.playerId, now);
    const ownKey = JSON.stringify(own);
    if (force || ownKey !== this.lastPrivate.get(client.sessionId)) { client.send('private', own); this.lastPrivate.set(client.sessionId, ownKey); }
  }

  private maybeCheckpoint(now: number) {
    if (now - this.lastCheckpoint < config.checkpointMs) return;
    this.lastCheckpoint = now;
    if (!this.cpDirty && this.engine.publicSnapshot(now).phase === 'lobby') return;
    this.cpDirty = false;
    void shared.store?.save(this.checkpoint()).catch(e => log(`checkpoint error: ${(e as Error).message}`));
  }
}
