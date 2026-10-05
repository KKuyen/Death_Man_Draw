import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/Users/quyen.tran5/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[];p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(m.type()+': '+m.text());});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.goto('http://localhost:5180/');await p.waitForTimeout(15000);
await p.screenshot({path:'../../reports/screenshots/lobby.png'});
await p.click('.demo-link');await p.waitForTimeout(6000);
await p.screenshot({path:'../../reports/screenshots/table1.png'});
await p.waitForTimeout(8000);
await p.screenshot({path:'../../reports/screenshots/table2.png'});
await p.click('text=CHIA BÀI');await p.waitForTimeout(3000);
await p.screenshot({path:'../../reports/screenshots/hand-start.png'});
for(let i=0;i<8;i++){const call=p.locator('button:has-text("CHECK"),button:has-text("THEO")').first();if(await call.isEnabled().catch(()=>false))await call.click();await p.waitForTimeout(2500);}
await p.screenshot({path:'../../reports/screenshots/hand-mid.png'});
console.log(await p.locator('.table-feed').innerText());
console.log(errs.slice(0,15).join('\n'));await b.close();
