// QA (frontend): offline demo screenshots at two viewports. usage: node qa-ui-bp.mjs [port]
import {chromium} from 'playwright';
const port=process.argv[2]||5291;
const b=await chromium.launch({executablePath:'/Users/quyen.tran5/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
for(const [w,h] of [[1440,900],[1280,720]]){
  const p=await b.newPage({viewport:{width:w,height:h}});
  const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await p.addInitScript(()=>localStorage.setItem('saloon.coach.done','1'));
  const out=`../../reports/screenshots/bp-${w}`;const shot=n=>p.screenshot({path:`${out}-${n}.png`});
  await p.goto(`http://localhost:${port}/`);await p.waitForTimeout(3000);await shot('lobby');
  await p.click('.demo-link');await p.waitForSelector('.gx-offer',{timeout:30000});await p.waitForTimeout(800);
  await shot('market');
  for(let i=0;i<2;i++){const buy=p.locator('.gx-offer .gx-buy:not([disabled])').first();if(await buy.count())await buy.click();await p.waitForTimeout(300);}
  await p.waitForTimeout(5500);await shot('market-bought');
  await p.getByRole('button',{name:/^XONG/}).first().click();
  await p.waitForSelector('.bet-buttons',{timeout:60000});await p.waitForTimeout(1500);await shot('preflop');
  const slot=p.locator('.gx-slot:not(.empty)').first();if(await slot.count()){await slot.click();await p.waitForTimeout(300);await shot('use-popover');await slot.click();}
  const done=new Set();
  for(let i=0;i<70&&!(await p.locator('.result-dialog').count());i++){
    const act=p.locator('.bet-buttons button:not([disabled])',{hasText:/CHECK|THEO/}).first();
    if(await act.count())await act.click({timeout:1500}).catch(()=>{});
    const st=(await p.locator('.gx-stepper li.now').innerText().catch(()=>'')).replace(/\W/g,'');
    if(/Flop|River/.test(st)&&!done.has(st)){done.add(st);await p.waitForTimeout(1200);await shot(st);}
    await p.waitForTimeout(1000);
  }
  await shot('showdown');
  console.log(w,errs.filter(e=>!/GL Driver/.test(e)).slice(0,8).join('\n'));await p.close();
}
await b.close();
