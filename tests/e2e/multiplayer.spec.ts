import {test,expect,type Page,type Browser} from '@playwright/test';
// E2E_SERVER=ws://localhost:2999 points the web client at a non-default server (e.g. when 2567 is taken or CORS differs).
const newCtx=async(b:Browser)=>{const c=await b.newContext();await c.addInitScript(()=>localStorage.setItem('saloon.coach.done','1'));const url=process.env.E2E_SERVER;if(url)await c.addInitScript(u=>localStorage.setItem('saloon.server',u),url);return c;};

// Needs the real server: `npm run dev -w @saloon/server` (port 2567). Skipped when it is not reachable.
const cards=async(p:Page)=>(await p.locator('.private-cards .playing-card').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')))).join(',');
test.setTimeout(240_000);
test('two real clients: create, join, private hands, refresh reconnect', async({browser,request})=>{
  const health=await request.get((process.env.E2E_SERVER||'ws://localhost:2567').replace(/^ws/,'http')+'/health').catch(()=>null);
  test.skip(!health?.ok(),'server not running');
  const a=await (await newCtx(browser)).newPage();
  const ctxB=await newCtx(browser),pb=await ctxB.newPage();
  await a.goto('/');await pb.goto('/');
  await a.locator('#player-name').fill('Alice');await pb.locator('#player-name').fill('Bob');
  await a.locator('.entry-create').click();
  const code=(await a.locator('.room-label strong').innerText({timeout:20_000})).trim();
  expect(code).toMatch(/^[A-Z0-9]{4,8}$/);
  await pb.getByLabel('Mã bàn').fill(code);
  await pb.getByRole('button',{name:'VÀO BÀN'}).click();
  await expect(pb.locator('.lobby-roster > div:not(.empty)')).toHaveCount(2,{timeout:20_000});
  await expect(a.locator('.lobby-roster > div:not(.empty)')).toHaveCount(2);
  for(const p of [a,pb])await p.getByRole('button',{name:'SẴN SÀNG',exact:true}).click();
  await expect(a.locator('.ready-tag')).toHaveCount(2);
  await a.getByRole('button',{name:'BẮT ĐẦU'}).click();
  // Ready -> straight to the (private) market of hand 1
  for(const p of [a,pb])await expect(p.locator('.gx-market .gx-offer')).toHaveCount(4,{timeout:15_000});
  // private: each sees only own wallet; opponents' plates never show money or magic
  await expect(a.locator('.gx-plate')).not.toContainText('$');
  for(const p of [a,pb])await p.getByRole('button',{name:/^XONG/}).click();
  await expect(a.locator('.private-cards .playing-card:not(.card-back)')).toHaveCount(2,{timeout:15_000});
  await expect(pb.locator('.private-cards .playing-card:not(.card-back)')).toHaveCount(2,{timeout:15_000});
  const ca=await cards(a),cb=await cards(pb);
  expect(ca).not.toEqual(cb);
  await a.waitForTimeout(2500);await a.screenshot({path:'reports/screenshots/e2e-mp-alice.png'});await pb.screenshot({path:'reports/screenshots/e2e-mp-bob.png'});
  // Bob refreshes: must resume the same seat and hole cards.
  const handBefore=await pb.locator('.hand-count').innerText();
  pb.on('console',m=>console.log('PB:',m.text().slice(0,200)));
  await pb.reload();
  await expect(pb.locator('.wallet-block')).toBeVisible({timeout:60_000});
  // heads-up with nobody acting, the 20 s turn timer may already have ended the hand; only compare while the same hand is live
  await pb.waitForTimeout(1500);
  // a new hand may have started meanwhile (turn timers); the cards only have to match within the same hand
  if(await pb.locator('.hand-count').innerText()===handBefore&&await pb.locator('.private-cards .playing-card:not(.card-back)').count()===2)expect(await cards(pb)).toEqual(cb);
  await pb.screenshot({path:'reports/screenshots/e2e-mp-bob-reload.png'});
  // Stale Colyseus token: rejoinKey must still reclaim the seat.
  await pb.evaluate(()=>{localStorage.setItem('saloon.reconnect','stale');});
  await pb.goto('about:blank');
  // mid-match the engine eliminates a player absent > 45 s, so stay under that; rejoinKey must work with a dead Colyseus token
  await pb.waitForTimeout(25_000);
  await pb.goto('/');
  await expect(pb.locator('.wallet-block')).toBeVisible({timeout:40_000});
  await expect(pb.locator('.room-label strong')).toHaveText(code);
});
