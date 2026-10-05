import {test,expect,type Page} from '@playwright/test';

const shot=(p:Page,n:string)=>p.screenshot({path:`reports/screenshots/e2e-${n}.png`});
test.setTimeout(420_000);
test('offline demo (Bài Phép): market first, board strip, own hand, tray, showdown, next market', async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/GL Driver|ReadPixels/.test(m.text()))errors.push(m.text());});
  await page.goto('/');
  await expect(page.getByText('SALOON N° 04 · OPEN').or(page.getByText('SALOO N° 04 · OPEN'))).toBeVisible({timeout:60_000});
  await shot(page,'lobby');
  await page.locator('.demo-link').click();

  // coach (first game): 4 steps
  await expect(page.locator('.gx-coach')).toBeVisible({timeout:15_000});
  await shot(page,'coach');
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'TIẾP',exact:true}).click();
  await page.getByRole('button',{name:/ĐÃ HIỂU/}).click();
  await expect(page.locator('.gx-coach')).toHaveCount(0);

  // Ready in lobby goes straight to hand 1, which starts with the private market
  await expect(page.locator('.gx-stepper li.now')).toContainText('Chợ',{timeout:15_000});
  await expect(page.locator('.gx-market .gx-offer')).toHaveCount(4);
  await expect(page.locator('.gx-countdown')).toBeVisible();
  await expect(page.locator('.gx-plate')).toHaveCount(3);
  await expect(page.locator('.gx-tray .gx-slot')).toHaveCount(5);
  // each offer: art, name, kind tag, visibility, price, effect text
  const first=page.locator('.gx-offer').first();
  await expect(first.locator('.magic-art')).toBeVisible();
  await expect(first.locator('h3')).not.toBeEmpty();
  await expect(first.locator('.kind-pill')).toBeVisible();
  await expect(first.locator('.gx-offer-text')).not.toBeEmpty();
  await expect(first.locator('.vis-pill')).toBeVisible();
  await expect(first.locator('.gx-offer-vis')).toContainText('Khi dùng:');
  await expect(first.locator('.magic-art img')).toHaveCSS('image-rendering','pixelated');
  await expect(first.locator('.price-button')).toContainText('$');
  await shot(page,'market');
  const wallet=async()=>Number((await page.locator('.wallet-block strong').innerText()).replace(/\D/g,''));
  const before=await wallet();
  const buy=page.locator('.gx-offer .gx-buy:not([disabled])').first();
  if(await buy.count()){await buy.click();await expect.poll(wallet).toBeLessThan(before);await expect(page.locator('.gx-tray .gx-slot:not(.empty)')).toHaveCount(1);await expect(page.locator('.gx-offer.sold .gx-offer-price').first()).toBeVisible();await shot(page,'market-bought');}
  await page.getByRole('button',{name:/^XONG/}).click();

  // hand: board strip + own readable hand, no finger/trick/dealer UI
  await expect(page.locator('.bet-buttons')).toBeVisible({timeout:40_000});
  await expect(page.locator('.gx-stepper li.now')).toContainText('Preflop');
  await expect(page.locator('.gx-board')).toBeVisible();
  await expect(page.locator('.gx-board .gx-board-slot')).toHaveCount(5);
  await expect(page.locator('.private-cards .playing-card:not(.card-back)')).toHaveCount(2);
  for(const t of ['MÁNH','DEALER','NGÓN','TỐ GIAN LẬN','QUẦY'])await expect(page.getByText(t,{exact:false})).toHaveCount(0);
  await expect(page.locator('.gx-match')).toContainText('BLIND');
  await shot(page,'hand');
  await page.keyboard.down('KeyS');await page.waitForTimeout(800);await shot(page,'look-down');await page.keyboard.up('KeyS');

  // play to showdown; board fills up
  for(let i=0;i<500&&!(await page.locator('.result-dialog').count());i++){
    const act=page.locator('.bet-buttons button:has-text("CHECK"):not([disabled]), .bet-buttons button:has-text("THEO"):not([disabled])').first();
    if(await act.count())await act.click({timeout:1000}).catch(()=>{});
    await page.waitForTimeout(300);
  }
  await expect(page.locator('.result-dialog')).toBeVisible();
  await expect(page.locator('.gx-stepper li.now')).toContainText('Showdown');
  await shot(page,'showdown');

  // next hand starts with a market again
  await expect(page.locator('.gx-market .gx-offer')).toHaveCount(4,{timeout:30_000});
  await expect(page.locator('.gx-stepper li.now')).toContainText('Chợ');
  await page.getByRole('button',{name:/^XONG/}).click();
  await expect(page.locator('.bet-buttons')).toBeVisible({timeout:40_000});
  expect(errors).toEqual([]);
});
