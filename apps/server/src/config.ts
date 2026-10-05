export const config = {
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 2567),
  databaseUrl: process.env.DATABASE_URL || '',
  dataDir: process.env.DATA_DIR ?? './data',
  corsOrigins: ['http://localhost:5180', 'http://127.0.0.1:5180', ...(process.env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean)],
  maxClients: 4,
  tickMs: 50,
  snapshotMs: 150,
  reconnectSeconds: 45,
  // ws ping frames: a CPU-starved browser (heavy 3D load after a refresh) can miss several 5 s pings; 8 s × 5 = 40 s before a socket is declared dead.
  pingIntervalMs: 8000,
  pingMaxRetries: 5,
  rateLimit: { capacity: 20, refillPerSec: 10 },
  checkpointMs: 5000,
};
