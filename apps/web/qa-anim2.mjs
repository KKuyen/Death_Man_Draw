// Deterministic animation QA: fabricates snapshots through window.__saloon.sync (build + `vite preview` on E2E_PORT, ?debug=1).
// Frames go to reports/screenshots/anim/<name>-NN.png. Software GL is slow, so tweens are slowed with fx.timeScale.
import {chromium} from 'playwright';
import {readdirSync,mkdirSync} from 'node:fs';
const port=process.env.E2E_PORT||5197;
const root=process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=root+readdirSync(root).find(d=>d.startsWith('chrome-headless'))+'/chrome-headless-shell';
const out='../../reports/screenshots/anim';mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(`http://localhost:${port}/?debug=1`);await p.waitForTimeout(14000);
await p.click('.demo-link');await p.waitForTimeout(5000);
await p.addStyleTag({content:'.app *:not(canvas){visibility:hidden!important}canvas{visibility:visible!important}'});
const shot=n=>p.screenshot({path:`${out}/${n}.png`});
const C={AS:[14,'S'],KH:[13,'H'],'7D':[7,'D'],QC:[12,'C'],'2S':[2,'S'],'9H':[9,'H'],JD:[11,'D'],'10C':[10,'C'],'10D':[10,'D'],'3S':[3,'S'],'4S':[4,'S']};
await p.evaluate(C=>{
  const card=id=>({id,rank:C[id][0],suit:C[id][1]});
  const fp=(id,seat,character)=>({id,name:id,seat,character,connected:true,ready:true,bot:false,folded:false,eliminated:false,allIn:false,bet:0,contribution:0,fingers:['thumb','index','middle','ring','pinky'].flatMap(f=>['l','r'].map(x=>({id:`${f}_${x}`,state:'real',pledged:false}))),motion:null,covered:false,pose:{gaze:'table',backsVisible:false,handSize:2}});
  window.QA={card,players:[fp('you',0,'coyote'),fp('p1',1,'lynx'),fp('p2',2,'badger'),fp('p3',3,'rabbit')],hand:[],board:[],phase:'shopping',street:'preflop',handId:1,result:null,
   push(){const s=window.__saloon;const snap={roomId:'x',code:'X',phase:this.phase,handId:this.handId,street:this.street,players:this.players,board:this.board.map(card),pots:[],pot:60,turnPlayerId:'p1',hostId:'you',dealerSeat:0,smallBlind:10,bigBlind:20,deadline:Date.now()+9e5,serverTime:Date.now(),log:[],result:this.result,winnerId:null};
    const own={playerId:'you',wallet:900,hand:this.hand.map(card),reserve:[],inventory:[],buffs:[],armedBuffs:[],contracts:[],timing:null,legal:{canCheck:true,callAmount:0,minRaiseTo:40,maxRaiseTo:900,canRaise:true,canFold:true},peeks:[],knownMarks:[],observedBacks:this.observed||[],load:0,lostRealFingers:0};
    this.orig(snap,own,'you');}};
  const s0=window.__saloon,orig=s0.sync.bind(s0);window.QA.orig=orig;s0.sync=()=>{};window.QA.origHold=s0.setHoldCards.bind(s0);s0.setHoldCards=()=>{}; // freeze the live offline game; only QA snapshots reach the scene
  window.QA.push();
},C);
const frames=async(name,n,gap=200)=>{for(let i=0;i<n;i++){await shot(`${name}-${String(i).padStart(2,'0')}`);await p.waitForTimeout(gap);}};
const idle=async(max=40000)=>{const t0=Date.now();while(Date.now()-t0<max){const n=await p.evaluate(()=>window.__saloon.animationStats().tweens);if(!n)return;await p.waitForTimeout(300);}console.log('idle timeout');};
const st=()=>p.evaluate(()=>JSON.stringify(window.__saloon.animationStats()));
await p.evaluate(()=>{window.__saloon.fx.timeScale=.25;});
// 1. deal
await p.evaluate(()=>{QA.phase='playing';QA.hand=['AS','KH'];QA.push();QA.origHold(QA.hand.map(QA.card));}); // like App.tsx: setHoldCards(own.hand) while playing
await frames('f1-deal',10,260);console.log('deal',await st());
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await idle();await p.waitForTimeout(500);await shot('f1-dealt');console.log('dealt',await st());
// 2. look down / up
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;window.__saloon.setLookDown(true);});
console.log('rigdbg',await p.evaluate(()=>{const s=window.__saloon,f=s.fx;return JSON.stringify({cam:s.camera.position.asArray().map(v=>+v.toFixed(2)),fw:s.camera.getForwardRay(1).direction.asArray().map(v=>+v.toFixed(2)),rigOn:f.rigRoot.isEnabled(),rigAbs:f.rigRoot.getAbsolutePosition().asArray().map(v=>+v.toFixed(2)),rigLocal:f.rigRoot.position.asArray().map(v=>+v.toFixed(2)),card0:f.rig[0].root.getAbsolutePosition().asArray().map(v=>+v.toFixed(2)),state:f.rig.map(c=>c.state+':'+c.root.isEnabled())})}));await p.waitForTimeout(500);await shot('f2-lookdown-mid');await p.waitForTimeout(3500);await shot('f2-lookdown');
await p.evaluate(()=>window.__saloon.setLookDown(false));await p.waitForTimeout(3500);await shot('f2-lookup');
// 2a. setHoldCards null / array toggle (while looking up)
await p.evaluate(()=>window.QA.origHold(null));await p.waitForTimeout(1500);await shot('f7-hold-null');
await p.evaluate(()=>window.QA.origHold(['AS','KH'].map(QA.card)));await p.waitForTimeout(1500);await shot('f7-hold-array');
// 2b. tricks: opponent seat 1 (lynx) and own first-person
const kinds=['sleeve','mark','mirror','signal','cover','tap','coin','erase','copy'];
let n=0;
for(const kind of kinds){
  await p.evaluate(k=>{const now=Date.now();QA.players[1].motion={kind:k,actionId:'a-'+k,startedAt:now,endsAt:now+1800};QA.push();},kind);
  await p.waitForTimeout(700);await shot(`f5-trick-${kind}-opp-a`);await p.waitForTimeout(500);await shot(`f5-trick-${kind}-opp-b`);
  await p.evaluate(k=>{QA.players[1].motion=null;QA.push();},kind);await p.waitForTimeout(1500);
}
await p.evaluate(()=>window.__saloon.setLookDown(true));await p.waitForTimeout(1200);
for(const kind of kinds){
  await p.evaluate(k=>{const now=Date.now();QA.players[0].motion={kind:k,actionId:'o-'+k,startedAt:now,endsAt:now+1800};QA.push();},kind);
  await p.waitForTimeout(700);await shot(`f5-trick-${kind}-own`);await p.waitForTimeout(1500);
}
await p.evaluate(()=>{QA.players[0].motion=null;QA.push();window.__saloon.setLookDown(false);});await p.waitForTimeout(1200);
// 2c. opponent holds cards up (backsVisible) then folds
await p.evaluate(()=>{QA.players[1].pose={gaze:'cards',backsVisible:true,handSize:2};QA.observed=[{targetPlayerId:'p1',slot:0,pattern:'slash'},{targetPlayerId:'p1',slot:1,pattern:'cross',card:QA.card('AS')}];QA.push();});await idle();await p.waitForTimeout(800);await shot('f6-held-up');console.log('held',await p.evaluate(()=>JSON.stringify(window.__saloon.fx.hole[1].map(c=>[c.state,c.back.material.name,c.root.position.asArray().map(v=>+v.toFixed(2)),c.cardId]))));
await p.evaluate(()=>{QA.players[1].pose={gaze:'table',backsVisible:false,handSize:2};QA.push();});await idle();await p.waitForTimeout(500);await shot('f6-held-down');
await p.evaluate(()=>{window.__saloon.fx.timeScale=.3;QA.players[2].folded=true;QA.push();});for(let i=0;i<4;i++){await shot('f6-fold-0'+i);await p.waitForTimeout(250);}
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await idle();
// 3. flop, turn, river
await p.evaluate(()=>{window.__saloon.fx.timeScale=.25;QA.street='flop';QA.board=['7D','QC','2S'];QA.push();});
await frames('f3-flop',10,260);
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await p.waitForTimeout(3000);await shot('f3-flop-done');
await p.evaluate(()=>{window.__saloon.fx.timeScale=.25;QA.street='turn';QA.board=['7D','QC','2S','9H'];QA.push();});
await frames('f3-turn',5,260);
// 4. showdown reveal
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await p.waitForTimeout(2500);
await p.evaluate(()=>{window.__saloon.fx.timeScale=.25;QA.street='river';QA.board=['7D','QC','2S','9H','JD'];QA.push();});await p.waitForTimeout(3000);
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;QA.phase='showdown';QA.result={winners:[],summary:'',revealed:[{playerId:'you',cards:['AS','KH'].map(QA.card)},{playerId:'p1',cards:['10C','10D'].map(QA.card)},{playerId:'p2',cards:['3S','4S'].map(QA.card)}]};window.__saloon.fx.timeScale=.3;QA.push();});
await frames('f4-showdown',10,300);
await p.evaluate(()=>{window.__saloon.fx.timeScale=1;});await p.waitForTimeout(3000);await shot('f4-showdown-done');
console.log('showdown',await st());
console.log('errors',errs.slice(0,8));await b.close();
