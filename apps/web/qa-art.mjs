// Art QA: scene-only harness (qa-scene.html on a private Vite dev port). Screenshots every seat's view of board/hand/showdown.
// usage: E2E_PORT=5290 node qa-art.mjs [outDir] [mode]
import {chromium} from 'playwright';
import {readdirSync,mkdirSync} from 'node:fs';
const port=process.env.E2E_PORT||5290,out=process.argv[2]||'../../reports/screenshots/art',only=process.argv[3]||'';
mkdirSync(out,{recursive:true});
const root=process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=root+readdirSync(root).find(d=>d.startsWith('chrome-headless'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:800}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
await p.goto(`http://127.0.0.1:${port}/qa-scene.html`);
await p.waitForFunction(()=>window.__ready,{timeout:120000});
const C={AS:[14,'S'],KH:[13,'H'],'7D':[7,'D'],QC:[12,'C'],'2S':[2,'S'],'9H':[9,'H'],JD:[11,'D'],'10C':[10,'C'],'10D':[10,'D'],'3S':[3,'S']};
const setup=()=>p.evaluate(C=>{
 window.C=C;const card=id=>({id,rank:window.C[id][0],suit:window.C[id][1]});const ids=['p0','p1','p2','p3'],ch=['coyote','lynx','badger','rabbit'];
 window.QA={forced:null,card,hid:1,seat:0,board:[],hand:['AS','KH'],result:null,phase:'playing',
  push(){const s=window.__saloon,seat=this.seat;
   const players=ids.map((id,i)=>({id,name:id,seat:i,character:ch[i],connected:true,ready:true,bot:false,folded:false,eliminated:false,allIn:false,bet:0,contribution:0,handSize:2,revealedCards:window.QA.forced&&window.QA.forced[i]||[]}));
   const snap={roomId:'x',code:'X',phase:this.phase,handId:this.hid,street:'river',players,board:this.board.map(card),pots:[],pot:60,turnPlayerId:null,hostId:'p0',dealerSeat:0,smallBlind:10,bigBlind:20,deadline:Date.now()+9e5,serverTime:Date.now(),log:[],result:this.result,winnerId:null,nextBlindInHands:null,nextBlinds:null,bonuses:[]};
   const own={playerId:ids[seat],wallet:900,hand:this.hand.map(id=>typeof id==='string'?card(id):id),magic:this.magic||[],market:[],peeks:this.peeks||[],privateLog:[],lastBonuses:[],legal:{canCheck:true,callAmount:0,minRaiseTo:40,maxRaiseTo:900,canRaise:true,canFold:true}};
   s.sync(snap,own,ids[seat]);s.setHoldCards(own.hand.length?own.hand:null);}};
},C);
await setup();
const ensure=async()=>{if(!(await p.evaluate(()=>!!window.QA))){console.log('page reloaded, re-setup');await p.waitForFunction(()=>window.__ready,{timeout:120000});await setup();}};
const idle=async(max=30000)=>{const t0=Date.now();while(Date.now()-t0<max){const n=await p.evaluate(()=>window.__saloon.animationStats().tweens);if(!n)return;await p.waitForTimeout(300);}};
for(let seat=0;seat<4;seat++){
 await ensure();
 await p.evaluate(s=>{QA.seat=s;QA.hid=s+1;QA.board=[];QA.phase='playing';QA.result=null;window.__saloon.setLookDown(false);QA.push();},seat);await p.waitForTimeout(9000);
 await p.evaluate(()=>{QA.board=['7D','QC','JD','10C','2S'];QA.push();});
 await idle();await p.waitForTimeout(2500);
 await p.screenshot({path:`${out}/seat${seat}-board.png`});
 await p.evaluate(()=>window.__saloon.setLookDown(true));await p.waitForTimeout(4500);
 await p.screenshot({path:`${out}/seat${seat}-hand.png`});
 await p.evaluate(()=>window.__saloon.setLookDown(false));await p.waitForTimeout(2500);
 await p.evaluate(()=>{QA.phase='showdown';QA.result={handId:this.hid,pot:60,winners:[],revealed:[{playerId:'p0',cards:[QA.card('AS'),QA.card('KH')],hand:'x'},{playerId:'p1',cards:[QA.card('9H'),QA.card('10D')],hand:'x'},{playerId:'p2',cards:[QA.card('3S'),QA.card('JD')],hand:'x'}],log:[]};QA.push();});
 await idle();await p.waitForTimeout(3500);await p.screenshot({path:`${out}/seat${seat}-showdown.png`});
 console.log('seat',seat,'done');
}
await b.close();
