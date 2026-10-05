// Isolated Postgres/server container checkpoint and restore check. Never touches existing containers.
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {Client} from '@colyseus/sdk';
const id=randomBytes(4).toString('hex'),network='lairgame-qa-'+id,pg=network+'-pg',server=network+'-server',web=network+'-web';
const password=randomBytes(24).toString('hex');
const run=(args,check=true)=>{const r=spawnSync('docker',args,{encoding:'utf8'});if(check&&r.status!==0)throw new Error(r.stderr.replaceAll(password,'[redacted]'));return r.stdout.trim();};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,label)=>{for(let i=0;i<120;i++){if(await fn())return;await sleep(500);}throw new Error('timeout '+label);};
let room,back,success=false;
try{
 run(['network','create',network]);
 run(['run','-d','--name',pg,'--network',network,'-e','POSTGRES_USER=saloon','-e','POSTGRES_DB=saloon','-e','POSTGRES_PASSWORD='+password,'postgres:17-alpine']);
 await until(()=>run(['exec',pg,'pg_isready','-U','saloon','-d','saloon'],false).includes('accepting'),'postgres');
 run(['run','-d','--name',server,'--network',network,'--network-alias','server','-p','127.0.0.1::2567','-e',`DATABASE_URL=postgres://saloon:${password}@${pg}:5432/saloon`,'lairgame-final-server']);
 let url='http://127.0.0.1:'+run(['port',server,'2567/tcp']).split(':').at(-1);
 await until(()=>fetch(url+'/health').then(r=>r.ok).catch(()=>false),'server');
 const logs=run(['logs',server]);if(!logs.includes('persistence: postgres'))throw new Error('server fell back to JSON');
 const tap=r=>{const t={room:r,welcome:null,own:null,public:null};r.onMessage('welcome',m=>t.welcome=m);r.onMessage('private',m=>t.own=m);r.onMessage('public',m=>t.public=m);r.onMessage('event',()=>{});r.onMessage('error',()=>{});return t;};
 run(['run','-d','--name',web,'--network',network,'-p','127.0.0.1::80','-e','SITE_ADDRESS=:80','lairgame-final-web']);
 const proxy='http://127.0.0.1:'+run(['port',web,'80/tcp']).split(':').at(-1);
 await until(()=>fetch(proxy+'/health').then(r=>r.ok).catch(()=>false),'Caddy health proxy');
 const card=await fetch(proxy+'/cards/K10.png');
 if(!card.ok||!card.headers.get('content-type')?.includes('image/png'))throw new Error('Caddy art file unavailable');
 const html=await fetch(proxy).then(r=>r.text());if(!html.includes('id="root"'))throw new Error('Caddy web bundle unavailable');
 const c=new Client(proxy),t=tap(await c.create('saloon',{name:'Persistence QA'}));room=t.room;
 await until(()=>t.welcome&&t.own,'welcome');
 const {code,rejoinKey,playerId}=t.welcome;
 const send=cmd=>room.send('command',{commandId:randomBytes(6).toString('hex'),handId:t.public?.handId,...cmd});
 send({type:'addBot'});await until(()=>t.public?.players.length===2,'bot');
 send({type:'ready',ready:true});await until(()=>t.public.players.every(p=>p.ready),'ready');
 send({type:'start'});await until(()=>t.public.phase==='market','market');
 const wallet=t.own.wallet,offers=t.own.market.map(o=>o.id);
 await until(()=>Number(run(['exec',pg,'psql','-U','saloon','-d','saloon','-Atc','SELECT count(*) FROM room_checkpoints;']))===1,'checkpoint');
 run(['stop','--time','10',server]);
 // Flush the old socket before restart; the persisted secret key must reclaim the player.
 await room.leave().catch(()=>{});room=null;
 run(['start',server]);
 // Docker may choose a new host port after restarting an ephemeral port binding.
 url='http://127.0.0.1:'+run(['port',server,'2567/tcp']).split(':').at(-1);
 await until(()=>fetch(url+'/api/rooms').then(r=>r.json()).then(d=>d.rooms.some(r=>r.code===code)).catch(()=>false),'restored room');
 const rooms=await fetch(url+'/api/rooms').then(r=>r.json()),restored=rooms.rooms.find(r=>r.code===code);
 const resumed=tap(await new Client(url).joinById(restored.roomId,{code,rejoinKey,name:'Persistence QA'}));back=resumed.room;
 await until(()=>resumed.own,'resumed private state');
 if(resumed.own.playerId!==playerId||resumed.own.wallet!==wallet||JSON.stringify(resumed.own.market.map(o=>o.id))!==JSON.stringify(offers))throw new Error('checkpoint state changed');
 const receipt={passed:true,postgres:true,containerImage:'lairgame-final-server',imageId:run(['image','inspect','lairgame-final-server','--format','{{.Id}}']),checkpointAndRestore:true,caddyStaticAndHttp:true,caddyWebsocket:true,samePlayerWalletAndOffers:true,health:await fetch(url+'/health').then(r=>r.json())};
 await writeFile('reports/docker-qa.json',JSON.stringify(receipt,null,2));console.log(receipt);success=true;
}finally{
 await room?.leave().catch(()=>{});await back?.leave().catch(()=>{});
 if(!success)await writeFile('reports/docker-qa-server.log',run(['logs',server],false).replaceAll(password,'[redacted]'));
 run(['rm','-f',web,server,pg],false);run(['network','rm',network],false);
 if(!success)console.error('Docker QA failed; isolated test containers cleaned up.');
}
