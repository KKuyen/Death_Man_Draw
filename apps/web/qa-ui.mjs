// Visual QA of the in-game UI states through the offline demo. usage: node qa-ui.mjs 1440x900  (needs `vite preview` on E2E_PORT)
import {chromium} from 'playwright';
import {readdirSync} from 'node:fs';
const [W,H]=(process.argv[2]||'1440x900').split('x').map(Number);
const port=process.env.E2E_PORT||5199;
const root=process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=root+readdirSync(root).find(d=>d.startsWith('chrome-headless'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/GL Driver|ReadPixels/.test(m.text()))errs.push(m.text());});
const shot=n=>p.screenshot({path:`../../reports/screenshots/ui-${W}-${n}.png`});
await p.goto(`http://localhost:${port}/?debug=1`);await p.waitForFunction(()=>window.__saloon&&window.__saloon.actors.length===5,{timeout:90000});
await p.click('.demo-link');await p.waitForTimeout(2500);await shot('0-coach');await p.getByRole('button',{name:'BỎ QUA'}).click();await p.waitForTimeout(500);
await shot('1-shopping');
await p.getByRole('button',{name:'MỞ QUẦY'}).click();await p.waitForTimeout(600);await shot('2-shop-drawer');
await p.getByRole('button',{name:'Đóng'}).click();
await p.getByRole('button',{name:/^SẴN SÀNG$/}).first().click();
await p.waitForSelector('.bet-buttons',{timeout:30000});await p.waitForTimeout(2500);
await shot('3-playing');
await p.keyboard.down('KeyS');await p.waitForTimeout(900);await shot('4-lookdown');await p.keyboard.up('KeyS');
await p.locator('.gx-tools button',{hasText:'MÁNH'}).click();await p.waitForTimeout(500);await shot('5-tricks');await p.getByRole('button',{name:'Đóng'}).click();
await p.locator('.finger-summary').click();await p.waitForTimeout(400);await shot('6-fingers');await p.getByRole('button',{name:'Đóng'}).click();
await p.locator('.gx-tools button',{hasText:'DEALER'}).click();await p.waitForTimeout(400);await shot('7-dealer');await p.getByRole('button',{name:'Đóng'}).click();
await p.getByRole('button',{name:'Cách chơi'}).click();await p.waitForTimeout(400);await shot('8-help');await p.getByRole('button',{name:'Đóng'}).click();
// play until showdown/market
let got={};
for(let i=0;i<150&&!got.market;i++){
  const act=p.locator('.bet-buttons button:has-text("CHECK"):not([disabled]), .bet-buttons button:has-text("THEO"):not([disabled])').first();
  if(await act.count())await act.click({timeout:1500}).catch(()=>{});
  if(!got.showdown&&await p.locator('.result-dialog').count()){got.showdown=1;await p.waitForTimeout(800);await shot('9-showdown');}
  if(await p.locator('.gx-market').count()){got.market=1;await p.waitForTimeout(1200);await shot('10-market');}
  await p.waitForTimeout(800);
}
console.log('reached',got,'errors',errs.slice(0,5));
await b.close();
