import {test,expect,type Browser,type Page} from '@playwright/test';

// Real server + 3 server bots (they buy and use magic cards): play several hands, watch console errors and page freezes.
const newCtx=async(b:Browser)=>{const c=await b.newContext();await c.addInitScript(()=>localStorage.setItem('saloon.coach.done','1'));const url=process.env.E2E_SERVER;if(url)await c.addInitScript(u=>localStorage.setItem('saloon.server',u),url);return c;};
test.setTimeout(420_000);
const alive=async(p:Page)=>(await Promise.race([p.evaluate(()=>1),new Promise(r=>setTimeout(()=>r(0),20_000))]))===1;
test('real server with bots: several hands, no console errors or freezes', async({browser,request})=>{
  const health=await request.get((process.env.E2E_SERVER||'ws://localhost:2567').replace(/^ws/,'http')+'/health').catch(()=>null);
  test.skip(!health?.ok(),'server not running');
  const page=await (await newCtx(browser)).newPage();
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/GL Driver|ReadPixels/.test(m.text()))errors.push(m.text());});
  await page.goto('/');
  await page.locator('#player-name').fill('Solo');
  await page.locator('.entry-create').click();
  await expect(page.locator('.lobby-roster')).toBeVisible({timeout:30_000});
  for(let i=0;i<3;i++){await page.getByRole('button',{name:/Thêm đối thủ máy/}).click();await expect(page.locator('.lobby-roster > div:not(.empty)')).toHaveCount(i+2);}
  await page.getByRole('button',{name:'SẴN SÀNG',exact:true}).click();
  await page.getByRole('button',{name:'BẮT ĐẦU'}).click();
  const hands=new Set<string>();let magicToasts=0;
  const t0=Date.now();
  while(Date.now()-t0<330_000&&hands.size<5){
    const next=page.getByRole('button',{name:/^XONG/});
    if(await next.count())await next.first().click({timeout:2000}).catch(()=>{});
    const act=page.locator('.bet-buttons button:has-text("CHECK"):not([disabled]), .bet-buttons button:has-text("THEO"):not([disabled])').first();
    if(await act.count())await act.click({timeout:2000}).catch(()=>{});
    const h=(await page.locator('.hand-count').innerText().catch(()=>''));if(h)hands.add(h);
    magicToasts=Math.max(magicToasts,await page.locator('.gx-magic-banner').count());
    if(await page.locator('.gx-market .gx-offer .gx-buy:not([disabled])').count())await page.locator('.gx-market .gx-offer .gx-buy:not([disabled])').first().click({timeout:1500}).catch(()=>{});
    if(!(await alive(page)))throw new Error('page frozen');
    await page.waitForTimeout(700);
  }
  console.log({hands:[...hands],magicToasts,errors:errors.slice(0,5)});
  await page.screenshot({path:'reports/screenshots/e2e-bots.png'});
  expect(hands.size).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});
