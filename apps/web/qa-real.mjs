// Real-server visual run: create room, add 3 bots, play one full hand (deal -> flop -> showdown -> market), screenshots + console errors.
// usage: E2E_SERVER=ws://localhost:2999 node qa-real.mjs   (needs `vite preview` on E2E_PORT and a server whose CORS allows it)
import {chromium} from 'playwright';
import {readdirSync} from 'node:fs';
const port=process.env.E2E_PORT||5199,server=process.env.E2E_SERVER||'ws://localhost:2999';
const root=process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=root+readdirSync(root).find(d=>d.startsWith('chrome-headless'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[];p.on('crash',()=>console.log('PAGE CRASHED'));p.on('close',()=>console.log('PAGE CLOSED'));p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/GL Driver|ReadPixels/.test(m.text()))errs.push(m.text());});
await p.addInitScript(([s])=>{localStorage.setItem('saloon.coach.done','1');localStorage.setItem('saloon.server',s);},[server]);
const shot=n=>p.screenshot({path:`../../reports/screenshots/real-${n}.png`});
await p.goto(`http://localhost:${port}/`);
await p.locator('#player-name').fill('Solo');await p.locator('.entry-create').click();
await p.locator('.gx-roster').waitFor({timeout:30000});
for(let i=0;i<3;i++){await p.getByRole('button',{name:/Thêm đối thủ máy/}).click();await p.waitForTimeout(600);}
await shot('1-lobby');
await p.getByRole('button',{name:'SẴN SÀNG',exact:true}).click();await p.getByRole('button',{name:'BẮT ĐẦU'}).click();
await p.getByText('Chuẩn bị trước khi chơi').waitFor({timeout:20000});await p.waitForTimeout(1500);await shot('2-opening-shop');
await p.getByRole('button',{name:'SẴN SÀNG',exact:true}).click();
await p.locator('.bet-buttons').waitFor({timeout:40000});
for(const [i,ms] of [[1,300],[2,900],[3,1500],[4,2500]])await p.waitForTimeout(ms).then(()=>shot(`3-deal-${i}`));
let street='',got={};
for(let i=0;i<200&&!got.market;i++){
  const act=p.locator('.bet-buttons button:has-text("CHECK"):not([disabled]), .bet-buttons button:has-text("THEO"):not([disabled])').first();
  if(await act.count())await act.click({timeout:1500}).catch(()=>{});
  const s=await p.locator('.gx-stepper li.now').innerText().catch(()=>'');
  if(s&&s!==street){street=s;await p.waitForTimeout(2200);await shot(`4-${s.replace(/\W+/g,'').toLowerCase()}`);}
  if(!got.showdown&&await p.locator('.result-dialog').count()){got.showdown=1;await p.waitForTimeout(2500);await shot('5-showdown');}
  if(await p.locator('.gx-market .gx-offer').count()){got.market=1;await p.waitForTimeout(1200);await shot('6-market');}
  await p.waitForTimeout(700);
}
console.log('reached',got,'errors',errs.slice(0,6));
await b.close();
