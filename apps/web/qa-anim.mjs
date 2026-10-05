// Frame-sequence QA for deal / flip / look-down / tricks. Needs `vite preview` on E2E_PORT (built bundle). Offline demo, software GL.
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
await p.click('.demo-link');await p.waitForTimeout(6000);
await p.addStyleTag({content:'.table-dialog,.table-feed{opacity:.0!important}'});
const shot=async(n)=>p.screenshot({path:`${out}/${n}.png`});
const stats=()=>p.evaluate(()=>JSON.stringify(window.__saloon.animationStats()));
console.log('before deal',await stats());
// start hand: shop -> deal
await p.getByText('Bắt đầu ngay').first().click({force:true});
for(let i=0;i<14;i++){await shot(`deal-${String(i).padStart(2,'0')}`);await p.waitForTimeout(350);}
console.log('after deal',await stats());
await p.waitForTimeout(2500);await shot('hand-rest');
await p.evaluate(()=>window.__saloon.setLookDown(true));
for(let i=0;i<4;i++){await p.waitForTimeout(250);await shot(`lookdown-${i}`);}
await p.waitForTimeout(1200);await shot('lookdown-full');
await p.evaluate(()=>window.__saloon.setLookDown(false));await p.waitForTimeout(1500);await shot('lookup');
console.log('errors',errs.slice(0,8));await b.close();
