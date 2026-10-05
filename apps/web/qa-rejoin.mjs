import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/Users/quyen.tran5/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const mk=async()=>{const c=await b.newContext();await c.addInitScript(()=>{localStorage.setItem('saloon.coach.done','1');localStorage.setItem('saloon.server','ws://localhost:2991');});return c.newPage();};
const a=await mk(),p=await mk();
p.on('console',m=>{const t=m.text();if(!/GL Driver|Babylon|vite/.test(t))console.log('PB',t.slice(0,200));});
await a.goto('http://localhost:5291/');await p.goto('http://localhost:5291/');
await a.locator('#player-name').fill('A');await p.locator('#player-name').fill('B');await a.locator('.entry-create').click();
const code=(await a.locator('.room-label strong').innerText()).trim();
await p.getByLabel('Mã bàn').fill(code);await p.getByRole('button',{name:'VÀO BÀN'}).click();
await p.locator('.wallet-block,.lobby-roster').first().waitFor();
for(const x of [a,p])await x.getByRole('button',{name:'SẴN SÀNG',exact:true}).click();
await a.getByRole('button',{name:'BẮT ĐẦU'}).click();await p.waitForTimeout(3000);
await p.evaluate(()=>localStorage.setItem('saloon.reconnect','stale'));await p.goto('about:blank');await p.waitForTimeout(50000);
await p.goto('http://localhost:5291/');
for(let i=0;i<12;i++){await p.waitForTimeout(5000);console.log(i,await p.locator('.wallet-block').count(),await p.locator('.reconnect-banner,.error-toast').allInnerTexts());}
await b.close();
