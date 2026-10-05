// Animation QA for the magic-card visuals (scene-only harness, see qa-vite.config.mjs). usage: E2E_PORT=5290 node qa-magic.mjs [outDir]
import {chromium} from 'playwright';
import {readdirSync,mkdirSync} from 'node:fs';
const port=process.env.E2E_PORT||5290,out=process.argv[2]||'../../reports/screenshots/magic';
mkdirSync(out,{recursive:true});
const root=process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=root+readdirSync(root).find(d=>d.startsWith('chrome-headless'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:800}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
await p.goto(`http://127.0.0.1:${port}/qa-scene.html`);await p.waitForFunction(()=>window.__ready,{timeout:120000});
await p.evaluate(()=>{
 const C={AS:[14,'S'],KH:[13,'H'],'7D':[7,'D'],QC:[12,'C'],'2S':[2,'S'],'9H':[9,'H'],JD:[11,'D'],'10C':[10,'C'],'3S':[3,'S'],s1:[14,'H']};
 const card=(id,mods)=>({id,rank:C[id][0],suit:C[id][1],...(mods?{modifiers:mods}:{})});const ids=['p0','p1','p2','p3'],ch=['coyote','lynx','badger','rabbit'];
 window.Q={card,phase:'playing',board:['7D','QC','JD'].map(i=>card(i)),hand:[card('AS'),card('KH')],magic:[],peeks:[],forced:{},
  push(){const s=window.__saloon;const players=ids.map((id,i)=>({id,name:['Bạn','Linh','Minh','Tú'][i],seat:i,character:ch[i],connected:true,ready:true,bot:false,folded:false,eliminated:false,allIn:false,bet:0,contribution:0,handSize:2,revealedCards:this.forced[i]||[]}));
   const snap={roomId:'x',code:'X',phase:this.phase,handId:this.hid||1,street:this.board.length?'flop':'preflop',players,board:this.board,pots:[],pot:60,turnPlayerId:null,hostId:'p0',dealerSeat:0,smallBlind:10,bigBlind:20,deadline:Date.now()+9e5,serverTime:Date.now(),log:[],result:null,winnerId:null,nextBlindInHands:null,nextBlinds:null};
   const own={playerId:'p0',wallet:900,hand:this.hand,magic:this.magic,market:[],peeks:this.peeks,privateLog:[],lastBonuses:[],legal:{canCheck:true,callAmount:0,minRaiseTo:40,maxRaiseTo:900,canRaise:true,canFold:true}};
   s.sync(snap,own,'p0');s.setHoldCards(this.hand);}};
 window.Q.push();
});
const shot=n=>p.screenshot({path:`${out}/${n}.png`});
const idle=async(max=30000)=>{const t0=Date.now();while(Date.now()-t0<max){const n=await p.evaluate(()=>window.__saloon.animationStats().tweens);if(!n)return;await p.waitForTimeout(300);}};
await p.waitForTimeout(12000);await idle();
const frames=async(n,c,gap)=>{for(let i=0;i<c;i++){await shot(`${n}-${i}`);await p.waitForTimeout(gap);}};
// 1. buy
await p.evaluate(()=>{Q.magic=[{slot:0,magicId:'K01',usable:true}];Q.push();window.__saloon.fx.timeScale=.3;});
await frames('buy',5,500);await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await idle();await p.waitForTimeout(500);
await p.evaluate(()=>{Q.magic=[{slot:0,magicId:'K01',usable:true},{slot:1,magicId:'N02',usable:false},{slot:2,magicId:'X01',usable:true,spare:Q.card('s1',['gold'])},{slot:3,magicId:'N01',usable:false}];Q.push();});await idle();await p.waitForTimeout(500);
await p.evaluate(()=>window.__saloon.showTray(30));await p.waitForTimeout(1500);await shot('tray');
// 2. popup (other seat + own)
await p.evaluate(()=>{window.__saloon.showMagicUse(2,'K02',3);});await p.waitForTimeout(1800);await shot('popup-seat2');
await p.evaluate(()=>{window.__saloon.showMagicUse(1,'N02');window.__saloon.showMagicUse(0,'K09');});await p.waitForTimeout(1800);await shot('popup-seat1-own');
await p.waitForTimeout(5000);
// 3. swap: spare s1 goes into hand 0, slot 2 consumed
await p.evaluate(()=>{window.__saloon.fx.timeScale=.35;Q.hand=[Q.card('s1',['gold']),Q.card('KH')];Q.magic=Q.magic.filter(m=>m.slot!==2);Q.push();window.__saloon.setLookDown(true);});
await frames('swap',6,450);await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await idle();await p.waitForTimeout(800);await shot('swap-done');
// 4. peek flash, hint, pulse
await p.evaluate(()=>{window.__saloon.setLookDown(false);Q.peeks=[{handId:1,label:'Lá soi',card:Q.card('9H',['trapSuit'])}];Q.push();});await p.waitForTimeout(1500);await shot('peek');
await p.waitForTimeout(3500);
await p.evaluate(()=>{window.__saloon.onGameEvent({id:'h1',at:1,type:'magicHint',cue:'looked',to:'p0'},0);});await p.waitForTimeout(1300);await shot('hint');
await p.waitForTimeout(2500);
await p.evaluate(()=>{window.__saloon.showTray(20);window.__saloon.pulseSlot('N01');});await p.waitForTimeout(500);await shot('pulse');
// 5. use (consume) a tray card
await p.evaluate(()=>{window.__saloon.fx.timeScale=.4;Q.magic=Q.magic.filter(m=>m.slot!==0);Q.push();});await frames('use',5,450);
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await idle();
// 6. forced reveal on seat 2, K03 replace board card 1
await p.evaluate(()=>{Q.forced={2:[Q.card('3S')]};Q.push();});await p.waitForTimeout(4000);await idle();await shot('forced-reveal');
await p.evaluate(()=>{Q.board=[Q.board[0],Q.card('2S',['gold']),Q.board[2]];Q.push();});await p.waitForTimeout(3500);await idle();await shot('board-replaced');
// 7. crystal ball peek + shuffle at hand start
await p.evaluate(()=>{Q.peeks=[{handId:1,label:'Quả cầu soi',card:Q.card('AS',['lucky'])}];Q.push();});await p.waitForTimeout(1600);await shot('ball');await p.waitForTimeout(4000);
await p.evaluate(()=>{window.__saloon.fx.timeScale=.3;Q.hid=2;Q.board=[];Q.peeks=[];Q.hand=[Q.card('2S'),Q.card('9H')];Q.push();});
await frames('shuffle',6,500);await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});
console.log(await p.evaluate(()=>JSON.stringify(window.__saloon.animationStats())));
await b.close();
