import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/Users/quyen.tran5/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1440,height:900}});
p.on('console',m=>console.log(m.type(),m.text().slice(0,300)));p.on('pageerror',e=>console.log('PAGEERR',e.message.slice(0,400)));
await p.goto('http://localhost:5291/');await p.waitForTimeout(3000);await p.click('.demo-link');await p.waitForTimeout(4000);
console.log((await p.locator('body').innerText()).slice(0,300));await b.close();
