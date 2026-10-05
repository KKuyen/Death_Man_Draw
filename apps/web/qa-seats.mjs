// Dev harness: fabricated 4-player snapshot, screenshots the view from each seat (needs `vite preview` on E2E_PORT).
import {chromium} from 'playwright';
import {readdirSync} from 'node:fs';
const port=process.env.E2E_PORT||5199;
const root=process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=root+readdirSync(root).find(d=>d.startsWith('chrome-headless'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:900}});
const t0=Date.now();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto(`http://localhost:${port}/?debug=1`);
await p.waitForFunction(()=>window.__saloon&&window.__saloon.actors.length===5&&window.__saloon.actors[4],{timeout:90000});
console.log('scene ready ms',Date.now()-t0);
await p.click('.demo-link');await p.waitForTimeout(3000);
await p.addStyleTag({content:'.table-dialog{display:none!important}'});
for(let seat=0;seat<4;seat++){
 await p.evaluate(seat=>{
  const s=window.__saloon;const ids=['p0','p1','p2','p3'];const ch=['coyote','lynx','badger','rabbit'];
  const players=ids.map((id,i)=>({id,name:id,seat:i,character:ch[i],connected:true,ready:true,bot:false,folded:false,eliminated:false,allIn:false,bet:0,contribution:0,fingers:[],motion:null,covered:false,pose:{gaze:'table',backsVisible:false,handSize:2}}));
  const snap={roomId:'x',code:'X',phase:'playing',handId:1,street:'preflop',players,board:[],pots:[],pot:30,turnPlayerId:null,hostId:'p0',dealerSeat:0,smallBlind:10,bigBlind:20,deadline:Date.now()+9e5,serverTime:Date.now(),log:[],result:null,winnerId:null};
  window.__fake=()=>s.sync(snap,{playerId:ids[seat],wallet:900,hand:[],reserve:[],inventory:[],buffs:[],armedBuffs:[],contracts:[],timing:null,legal:{canCheck:true,callAmount:0,minRaiseTo:40,maxRaiseTo:900,canRaise:true,canFold:true},peeks:[],knownMarks:[],observedBacks:[],load:0,lostRealFingers:0},ids[seat]);
  window.__fake();clearInterval(window.__t);window.__t=setInterval(window.__fake,300);
 },seat);
 await p.waitForTimeout(9000);
 console.log('seat',seat,'fps',await p.evaluate(()=>window.__saloon.engine.getFps().toFixed(1)));
 await p.screenshot({path:`../../reports/screenshots/seat-${seat}.png`});
}
await b.close();
