import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

/** Private server-side record: contains engine.serialize() (all secrets). Never expose over HTTP/WS/logs. */
export interface RoomCheckpoint {
  roomId: string; code: string; savedAt: number; hostId: string | null;
  humans: { id: string; name: string; keyHash: string }[]; engine: unknown;
}
export interface Store {
  readonly kind: 'postgres' | 'json';
  init(): Promise<void>;
  save(cp: RoomCheckpoint): Promise<void>;
  remove(roomId: string): Promise<void>;
  loadAll(): Promise<RoomCheckpoint[]>;
  /** Move an unreadable/invalid checkpoint aside so it is never retried or served. */
  quarantine(roomId: string): Promise<void>;
  logEvent(roomId: string, at: number, type: string, payload: unknown): Promise<void>;
  close(): Promise<void>;
}

const safe = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_');

export class JsonStore implements Store {
  readonly kind = 'json' as const;
  private dir = path.resolve(config.dataDir, 'rooms');
  private queue = new Map<string, Promise<void>>();
  async init() { await mkdir(this.dir, { recursive: true, mode: 0o700 }); }
  private chain(id: string, fn: () => Promise<void>) {
    const next = (this.queue.get(id) ?? Promise.resolve()).then(fn, fn);
    this.queue.set(id, next.catch(() => undefined));
    return next;
  }
  save(cp: RoomCheckpoint) {
    return this.chain(cp.roomId, async () => {
      const file = path.join(this.dir, `${safe(cp.roomId)}.json`);
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(cp), { mode: 0o600 });
      await rename(tmp, file); // atomic replace
    });
  }
  remove(roomId: string) { return this.chain(roomId, () => rm(path.join(this.dir, `${safe(roomId)}.json`), { force: true })); }
  async loadAll() {
    const out: RoomCheckpoint[] = [];
    for (const f of await readdir(this.dir).catch(() => [] as string[])) {
      if (!f.endsWith('.json')) { if (f.endsWith('.tmp')) await rm(path.join(this.dir, f), { force: true }); continue; }
      try { out.push(JSON.parse(await readFile(path.join(this.dir, f), 'utf8')) as RoomCheckpoint); }
      catch { await rename(path.join(this.dir, f), path.join(this.dir, `${f}.corrupt`)).catch(() => undefined); }
    }
    return out;
  }
  async quarantine(roomId: string) {
    const f = path.join(this.dir, `${safe(roomId)}.json`);
    await rename(f, `${f}.corrupt`).catch(() => undefined);
  }
  async logEvent() { /* events are not persisted in JSON mode */ }
  async close() { await Promise.allSettled([...this.queue.values()]); }
}

export class PgStore implements Store {
  readonly kind = 'postgres' as const;
  private pool: import('pg').Pool | null = null;
  async init() {
    const pg = await import('pg');
    this.pool = new pg.default.Pool({ connectionString: config.databaseUrl, max: 4 });
    const p = this.pool;
    await p.query('CREATE TABLE IF NOT EXISTS schema_migrations (version int PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await p.query('SELECT version FROM schema_migrations')).rows.map(r => r.version as number));
    const migrations: [number, string][] = [
      [1, `CREATE TABLE room_checkpoints (room_id text PRIMARY KEY, code text NOT NULL, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
           CREATE TABLE room_events (id bigserial PRIMARY KEY, room_id text NOT NULL, at bigint NOT NULL, type text NOT NULL, payload jsonb NOT NULL);
           CREATE INDEX room_events_room_idx ON room_events (room_id, id);`],
    ];
    for (const [v, sql] of migrations) {
      if (done.has(v)) continue;
      const c = await p.connect();
      try { await c.query('BEGIN'); await c.query(sql); await c.query('INSERT INTO schema_migrations(version) VALUES ($1)', [v]); await c.query('COMMIT'); }
      catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    }
  }
  async save(cp: RoomCheckpoint) {
    await this.pool!.query(
      'INSERT INTO room_checkpoints(room_id, code, state, updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (room_id) DO UPDATE SET code=$2, state=$3, updated_at=now()',
      [cp.roomId, cp.code, JSON.stringify(cp)]);
  }
  async remove(roomId: string) {
    await this.pool!.query('DELETE FROM room_checkpoints WHERE room_id=$1', [roomId]);
    await this.pool!.query('DELETE FROM room_events WHERE room_id=$1', [roomId]);
  }
  async quarantine(roomId: string) {
    await this.pool!.query('UPDATE room_checkpoints SET room_id = room_id || $2 WHERE room_id=$1', [roomId, `.corrupt-${Date.now()}`]);
  }
  async loadAll() { return (await this.pool!.query("SELECT state FROM room_checkpoints WHERE room_id NOT LIKE '%.corrupt-%'")).rows.map(r => r.state as RoomCheckpoint); }
  async logEvent(roomId: string, at: number, type: string, payload: unknown) {
    await this.pool!.query('INSERT INTO room_events(room_id, at, type, payload) VALUES ($1,$2,$3,$4)', [roomId, at, type, JSON.stringify(payload)]);
  }
  async close() { await this.pool?.end(); }
}

export async function createStore(log: (m: string) => void): Promise<Store> {
  if (config.databaseUrl) {
    try { const s = new PgStore(); await s.init(); log('persistence: postgres'); return s; }
    catch (e) { log(`postgres unavailable (${(e as Error).message}); falling back to local JSON`); }
  }
  const s = new JsonStore(); await s.init(); log(`persistence: json files in ${config.dataDir}/rooms`); return s;
}
