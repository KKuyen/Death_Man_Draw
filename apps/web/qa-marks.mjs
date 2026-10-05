// Dev harness: fabricates a snapshot with a marked card next to the observer and screenshots it (needs `vite preview` on E2E_PORT, built bundle).
import {chromium} from 'playwright';
import {readdirSync} from 'node:fs';
const port=process.env.E2E_PORT||5199;
const root=process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=root+readdirSync(root).find(d=>d.startsWith('chrome-headless'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:900}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.addInitScript(()=>localStorage.setItem('saloon.coach.done','1'));
await p.goto(`http://localhost:${port}/?debug=1`);await p.waitForTimeout(12000);
await p.click('.demo-link');await p.waitForTimeout(8000);await p.addStyleTag({content:'.table-dialog{display:none!important}'});
for(const [name,gaze,backs] of [['cards','cards',true],['away','away',false],['table','table',false]]){
 await p.evaluate(([gaze,backs])=>{
  const s=window.__saloon;
  const fp=(id,seat,character)=>({id,name:id,seat,character,connected:true,ready:true,bot:false,folded:false,eliminated:false,allIn:false,bet:0,contribution:0,fingers:['thumb','index','middle','ring','pinky'].flatMap(f=>['l','r'].map(x=>({id:`${f}_${x}`,state:'real',pledged:false}))),motion:null,covered:false,pose:{gaze:'table',backsVisible:false,handSize:2}});
  const players=[fp('you',0,'coyote'),fp('p1',1,'lynx'),fp('p2',2,'badger'),fp('p3',3,'rabbit')];
  players[1].pose={gaze,backsVisible:backs,handSize:2};
  const snap={roomId:'x',code:'X',phase:'playing',handId:1,street:'preflop',players,board:[],pots:[],pot:30,turnPlayerId:'p1',dealerSeat:0,smallBlind:10,bigBlind:20,deadline:Date.now()+9e5,serverTime:Date.now(),log:[],result:null,winnerId:null};
  const own={playerId:'you',wallet:900,hand:[],reserve:[],inventory:[],buffs:[],armedBuffs:[],contracts:[],timing:null,legal:{canCheck:true,callAmount:0,minRaiseTo:40,maxRaiseTo:900,canRaise:true,canFold:true},peeks:[],knownMarks:[],observedBacks:[{targetPlayerId:'p1',slot:0,pattern:'slash'},{targetPlayerId:'p1',slot:1,pattern:'cross',card:{id:'AS',rank:14,suit:'S'}}],load:0,lostRealFingers:0};
  s.sync(snap,own,'you');
 },[gaze,backs]);
 await p.waitForTimeout(3000);await p.waitForFunction(()=>{const s=window.__saloon.animationStats();return s.tweens===0},{timeout:90000}).catch(()=>{});await p.waitForTimeout(2000);console.log(await p.evaluate(()=>JSON.stringify(window.__saloon.animationStats())));
 console.log(name,await p.evaluate(()=>JSON.stringify(window.__saloon.actors[1].look)+window.__saloon.actors[1].gaze+' rootY '+window.__saloon.actors[1].root.rotation.y.toFixed(2)+' enabled '+window.__saloon.actors[1].root.isEnabled()+' fps '+window.__saloon.engine.getFps().toFixed(1)));
 await p.screenshot({path:`../../reports/screenshots/marks-${name}.png`});
}
await b.close();
