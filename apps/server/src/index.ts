import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { config } from './config.js';
import { createStore } from './persistence.js';
import { SaloonRoom, registry, shared } from './room.js';
import { log } from './util.js';
import { validateCheckpoint } from './validate.js';

export async function startServer(overrides: Partial<typeof config> = {}) {
  Object.assign(config, overrides);
  const store = await createStore(log);
  shared.store = store; shared.shuttingDown = false;
  const transport = new WebSocketTransport({ pingInterval: config.pingIntervalMs, pingMaxRetries: config.pingMaxRetries });
  const server = new Server({
    transport, greet: false,
    express: (app: any) => {
      app.use((req: any, res: any, next: any) => {
        if (process.env.HTTP_LOG) log(`http ${req.method} ${req.url} origin=${req.headers.origin ?? '-'}`);
        const origin = req.headers.origin;
        for (const h of ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Methods']) res.removeHeader(h);
        if (origin && config.corsOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
          res.setHeader('Access-Control-Allow-Headers', 'content-type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        }
        if (req.method === 'OPTIONS') { res.status(204).end(); return; }
        next();
      });
      app.get('/health', (_req: any, res: any) => { res.json({ ok: true, rooms: registry.size, persistence: store.kind, uptime: Math.round(process.uptime()) }); });
      app.get('/api/rooms', (_req: any, res: any) => { res.json({ rooms: [...registry.values()].map(r => r.summary()) }); });
      app.get('/api/public-rooms', (_req: any, res: any) => { res.json({ rooms: [...registry.values()].map(r => r.summary()).filter(r => r.public) }); });
    },
  });
  matchMaker.controller.getCorsHeaders = (headers: Headers): Record<string, string> => {
    const origin = headers.get('origin');
    return origin && config.corsOrigins.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  };
  matchMaker.controller.DEFAULT_CORS_HEADERS = { 'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } as any;
  server.define('saloon', SaloonRoom);
  await server.listen(config.port, config.host);
  if (process.env.HTTP_LOG) (transport as any).server?.on('request', (req: any, res: any) => { const t = Date.now(); log(`req ${req.method} ${req.url}`); res.on('finish', () => log(`res ${req.method} ${req.url} ${res.statusCode} ${Date.now() - t}ms`)); });
  log(`listening on ${config.host}:${config.port}`);

  for (const cp of await store.loadAll()) {
    const bad = validateCheckpoint(cp);
    if (bad) { log(`checkpoint ${cp?.roomId} rejected (${bad}); quarantined`); if (cp?.roomId) await store.quarantine(cp.roomId); continue; }
    try { await matchMaker.createRoom('saloon', { restore: cp }); await store.remove(cp.roomId); }
    catch (e) { log(`restore of room ${cp.code} failed: ${(e as Error).message}`); await store.quarantine(cp.roomId); }
  }

  // Colyseus installs its own SIGINT/SIGTERM handlers and runs these hooks before disposing rooms.
  server.onBeforeShutdown(async () => {
    shared.shuttingDown = true;
    await Promise.allSettled([...registry.values()].map(r => store.save(r.checkpoint())));
  });
  server.onShutdown(async () => { await store.close(); });
  const shutdown = () => server.gracefullyShutdown(false);
  return { server, store, shutdown };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/src/index.ts') || process.argv[1]?.endsWith('/dist/index.js')) {
  startServer().catch(e => { console.error(e); process.exit(1); });
}
