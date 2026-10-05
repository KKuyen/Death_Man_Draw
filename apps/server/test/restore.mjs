import { Client } from '@colyseus/sdk';
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = 'ws://127.0.0.1:2567';
const room = await new Client(url).create('saloon', { name: 'Demo' });
let pub, own, n = 0;
room.onMessage('public', m => pub = m); room.onMessage('private', m => own = m); room.onMessage('error', m => console.log('ERR', m.message)); let welcome; room.onMessage('welcome', m => welcome = m); room.onMessage('event', () => {});
const send = c => room.send('command', { commandId: 'r' + n++, handId: pub?.handId, ...c });
await sleep(400); send({ type: 'addBot' }); send({ type: 'ready', ready: true });
await sleep(400); send({ type: 'start' }); while (pub?.phase !== 'market') await sleep(100); send({ type: 'nextHand' });
while (pub?.phase !== 'playing') await sleep(100);
await sleep(800);
const before0 = 0; const before = { hand: own.hand.map(c => c.id), wallet: own.wallet, handId: pub.handId, code: pub.code };
console.log('before', JSON.stringify(before));
execSync('pkill -TERM -f dist/index.js'); await sleep(1500);
console.log('files', execSync('ls data/rooms').toString().trim());
spawn('node', ['dist/index.js'], { stdio: 'ignore', detached: true }).unref(); await sleep(2500);
const rooms = (await (await fetch('http://127.0.0.1:2567/api/rooms')).json()).rooms; console.log('rooms after restart', JSON.stringify(rooms));
for (const opts of [{ name: 'Demo' }, { name: 'Demo', rejoinKey: 'x'.repeat(48) }]) {
  try { await new Client(url).joinById(rooms[0].roomId, { ...opts, code: before.code }); console.log('UNEXPECTED join ok'); } catch (e) { console.log('refused:', e.message); }
}
writeFileSync('data/rooms/junk.json', '{not json'); 
const r2 = await new Client(url).joinById(rooms[0].roomId, { name: 'Whatever', code: before.code, rejoinKey: welcome.rejoinKey });
let own2; r2.onMessage('private', m => own2 = m); r2.onMessage('public', () => {}); r2.onMessage('welcome', () => {}); r2.onMessage('event', () => {}); r2.onMessage('error', () => {});
await sleep(1500);
console.log('after', JSON.stringify({ hand: own2?.hand.map(c => c.id), wallet: own2?.wallet, same: JSON.stringify(own2?.hand.map(c => c.id)) === JSON.stringify(before.hand) }));
process.exit(0);
