import {test,expect,type Page} from '@playwright/test';
test.use({hasTouch:true,isMobile:true});

const sizes=[{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:430,height:932}];
async function fits(page:Page,selector:string){
  const viewport=page.viewportSize()!;
  for(const box of await page.locator(selector).evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}))){
    expect(box.left).toBeGreaterThanOrEqual(-1);expect(box.right).toBeLessThanOrEqual(viewport.width+1);
    expect(box.top).toBeGreaterThanOrEqual(-1);expect(box.bottom).toBeLessThanOrEqual(viewport.height+1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
}
async function receivesTouch(page:Page,selector:string){
  const hit=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));});
  expect(hit).toBe(true);
}

test('portrait phone: enter, browse and buy, use sheet, bet and rotate without a page scroll',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    localStorage.setItem('saloon.coach.done','1');
    localStorage.setItem('saloon.settings',JSON.stringify({muted:true,musicOn:false,lowQuality:true}));
  });
  await page.goto('/');
  await expect(page.getByRole('dialog',{name:'Chơi ở màn hình ngang'})).toHaveCount(0);
  for(const size of sizes){
    await page.setViewportSize(size);
    await page.locator('#player-name').fill('Người chơi điện thoại');
    await fits(page,'.entry-panel,.character-picker,.demo-link');
    await receivesTouch(page,'.demo-link');
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'reports/screenshots/portrait-lobby.png'});
  const marketTime=Date.now();await page.clock.setFixedTime(marketTime);
  await page.locator('.demo-link').click();
  await expect(page.locator('.gx-offer')).toHaveCount(4);
  for(const size of sizes){
    await page.setViewportSize(size);
    await fits(page,'.gx-market-head,.gx-market-grid,.gx-offer:first-child .gx-buy,.gx-bottom');
    await receivesTouch(page,'.gx-offer:first-child .gx-buy');
    await receivesTouch(page,'.mobile-market-ready');
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Lá tiếp theo',exact:true}).click();
  await expect(page.locator('.mobile-market-nav')).toContainText('Lá 2/4');
  await page.getByRole('button',{name:'Lá trước',exact:true}).click();
  await expect(page.locator('.mobile-market-nav')).toContainText('Lá 1/4');
  await expect.poll(()=>page.locator('.gx-offer').first().evaluate(el=>Math.abs(el.getBoundingClientRect().left-el.parentElement!.getBoundingClientRect().left))).toBeLessThan(1);
  await receivesTouch(page,'.mobile-market-refresh');
  await page.screenshot({path:'reports/screenshots/portrait-market.png'});
  const wallet=async()=>Number((await page.locator('.wallet-block strong').innerText()).replace(/\D/g,''));
  const before=await wallet();
  await page.locator('.gx-buy').first().click();
  await expect.poll(wallet).toBeLessThan(before);
  await expect(page.locator('.gx-offer')).toHaveCount(3);
  await page.locator('.mobile-magic-launch button').click();
  await page.locator('.gx-slot:not(.empty)').first().click();
  await expect(page.locator('.gx-use')).toBeVisible();
  for(const size of [sizes[0],sizes[2]]){
    await page.setViewportSize(size);
    await fits(page,'.gx-right,.gx-use,.gx-use-actions');
    await receivesTouch(page,'.gx-use-actions .btn:last-child');
  }
  await page.screenshot({path:'reports/screenshots/portrait-magic.png'});
  await page.locator('.mobile-sheet-heading button').click();
  await expect(page.locator('.mobile-magic-launch button')).toBeFocused();
  await page.clock.setSystemTime(marketTime+1000);
  await page.locator('.mobile-market-ready').click();
  await expect(page.locator('.bet-buttons')).toBeVisible({timeout:40_000});
  for(const size of sizes){
    await page.setViewportSize(size);
    await fits(page,'.gx-plates,.gx-board,.gx-bottom,.gx-hand,.bet-buttons');
    const board=await page.locator('.gx-board').boundingBox(),dock=await page.locator('.gx-bottom').boundingBox();
    expect(board!.y+board!.height).toBeLessThanOrEqual(dock!.y+1);
    for(const button of await page.locator('.bet-buttons button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await receivesTouch(page,'.mobile-magic-launch button');
    await page.screenshot({path:`reports/screenshots/portrait-playing-${size.width}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.mobile-raise-toggle:not([disabled])')).toBeVisible({timeout:40_000});
  await page.locator('.mobile-raise-toggle').click();
  await expect(page.locator('.gx-raise')).toBeVisible();
  await fits(page,'.gx-raise.raise-open');
  await page.getByRole('button',{name:'Tối thiểu',exact:true}).click();
  await page.screenshot({path:'reports/screenshots/portrait-raise.png'});
  await page.locator('.mobile-raise-toggle').click();
  await expect(page.locator('.gx-raise')).toBeHidden();
  const action=page.locator('.bet-buttons button:not([disabled])').nth(1);
  await receivesTouch(page,'.bet-buttons button:not([disabled]):nth-child(2)');
  await action.click();
  await page.getByRole('button',{name:'Mở chat',exact:true}).click();
  await fits(page,'.room-chat');
  await page.getByRole('button',{name:'Đóng chat',exact:true}).click();
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click();
  await fits(page,'.settings-drawer');
  await page.getByRole('button',{name:'Đóng cài đặt',exact:true}).click();
  await page.setViewportSize({width:844,height:390});
  await fits(page,'.gx-board,.gx-bottom,.bet-buttons');
  await page.setViewportSize({width:390,height:844});
  await fits(page,'.gx-board,.gx-bottom,.bet-buttons');
  expect(errors).toEqual([]);
});
