// Manual demo: 1 human + 3 bots via real colyseus.js client; plays 2 hands, prints public log.
import { Client } from '@colyseus/sdk';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const room = await new Client(process.env.URL ?? 'ws://127.0.0.1:2567').create('saloon', { name: 'Demo', character: 'coyote' });
let pub, own, n = 0; const hands = new Set();
room.onMessage('public', m => pub = m); room.onMessage('private', m => own = m); room.onMessage('error', m => console.log('ERR', m.message)); room.onMessage('welcome', () => {}); room.onMessage('event', () => {});
const send = c => room.send('command', { commandId: 'd' + n++, handId: pub?.handId, ...c });
await sleep(500);
for (let i = 0; i < 3; i++) send({ type: 'addBot' });
send({ type: 'ready', ready: true });
while ((pub?.players.length ?? 0) < 4) await sleep(100);
send({ type: 'start' });
let lastLog = 0;
const t0 = Date.now();
while (Date.now() - t0 < 200000) {
  await sleep(150);
  if (!pub || !own) continue;
  for (const l of pub.log.slice(lastLog)) console.log(`[${pub.phase}] ${l.text}`); lastLog = pub.log.length;
  if (pub.phase === 'market') send({ type: 'ready', ready: true });
  if (pub.phase === 'playing' && pub.turnPlayerId === own.playerId) send({ type: 'bet', action: own.legal.canCheck ? 'check' : own.legal.callAmount <= own.wallet ? 'call' : 'fold' });
  if (pub.phase === 'showdown') hands.add(pub.handId);
  if (hands.size >= 6 && pub.phase === 'market') break;
}
console.log('hands played', [...hands], 'wallet', own?.wallet, 'result', JSON.stringify(pub?.result?.winners));
process.exit(0);
