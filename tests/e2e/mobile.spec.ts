import {test,expect,type Page} from '@playwright/test';
test.use({hasTouch:true,isMobile:true});

async function noOverflow(page:Page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
async function insideScreen(page:Page,selector:string){
  const boxes=await page.locator(selector).evaluateAll(elements=>elements.map(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
  }));
  const width=page.viewportSize()!.width;
  for(const r of boxes){expect(r.left).toBeGreaterThanOrEqual(0);expect(r.right).toBeLessThanOrEqual(width);expect(r.width).toBeGreaterThan(0);}
}

test('landscape phone: focused shop, magic sheet, betting and rotation',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    localStorage.setItem('saloon.coach.done','1');
    localStorage.setItem('saloon.settings',JSON.stringify({muted:true,musicOn:false,lowQuality:true}));
  });
  await page.goto('/');
  await expect(page.locator('.entry-panel')).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Chơi ở màn hình ngang'})).toHaveCount(0);
  for(const viewport of [{width:568,height:320},{width:844,height:390}]){
    await page.setViewportSize(viewport);
    await noOverflow(page);
    await insideScreen(page,'.entry-panel,.character-picker,.join-row');
    await page.locator('#player-name').fill('Người chơi trên điện thoại');
    await expect(page.locator('.demo-link')).toBeVisible();
  }
  await page.setViewportSize({width:844,height:390});
  await page.screenshot({path:'reports/screenshots/mobile-lobby.png',fullPage:true});
  const marketTime=Date.now();await page.clock.setFixedTime(marketTime);
  await page.locator('.demo-link').click();
  await expect(page.locator('.gx-market .gx-offer')).toHaveCount(4);
  await noOverflow(page);
  await insideScreen(page,'.gx-market-head,.gx-market-grid,.gx-bottom');
  // The shop itself fits one viewport; extra cards move horizontally.
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  await page.getByRole('button',{name:'Lá tiếp theo',exact:true}).click();
  await expect(page.locator('.mobile-market-nav')).toContainText('Lá 2/4');
  await page.getByRole('button',{name:'Lá trước',exact:true}).click();
  await expect(page.locator('.mobile-market-nav')).toContainText('Lá 1/4');
  await page.screenshot({path:'reports/screenshots/mobile-market.png'});
  const buyBox=await page.locator('.gx-offer').first().locator('.gx-buy').boundingBox();
  const cardBox=await page.locator('.gx-offer').first().boundingBox();
  expect(buyBox!.y).toBeGreaterThanOrEqual(cardBox!.y);
  expect(buyBox!.y+buyBox!.height).toBeLessThanOrEqual(cardBox!.y+cardBox!.height);
  const wallet=async()=>Number((await page.locator('.wallet-block strong').innerText()).replace(/\D/g,''));
  const before=await wallet();
  await page.locator('.gx-buy:not([disabled])').first().click();
  await expect.poll(wallet).toBeLessThan(before);
  await page.locator('.mobile-magic-launch button').click();
  await expect(page.locator('.gx-right')).toBeVisible();
  await insideScreen(page,'.gx-right');
  await page.locator('.gx-slot:not(.empty)').first().click();
  await expect(page.locator('.gx-use')).toBeVisible();
  await insideScreen(page,'.gx-use');
  const useBox=await page.locator('.gx-use').boundingBox();
  const useActionBox=await page.locator('.gx-use-actions .btn').last().boundingBox();
  expect(useActionBox!.y+useActionBox!.height).toBeLessThanOrEqual(useBox!.y+useBox!.height);
  await page.screenshot({path:'reports/screenshots/mobile-magic.png'});
  await page.locator('.mobile-sheet-heading button').click();
  await expect(page.locator('.gx-right')).toBeHidden();
  await expect(page.locator('.mobile-magic-launch button')).toBeFocused();
  await page.clock.setSystemTime(marketTime+1000);
  await page.locator('.mobile-market-ready').click();
  await expect(page.locator('.bet-buttons')).toBeVisible({timeout:40_000});
  for(const viewport of [{width:568,height:320},{width:667,height:375},{width:844,height:390},{width:932,height:430}]){
    await page.setViewportSize(viewport);
    await noOverflow(page);
    await insideScreen(page,'.gx-plate,.gx-board,.gx-bottom,.bet-buttons');
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
    // Scroll the dock into view on short phones / landscape; every action fits.
    await page.locator('.bet-buttons').scrollIntoViewIfNeeded();
    for(const button of await page.locator('.bet-buttons button').all()){
      const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({path:`reports/screenshots/mobile-playing-${viewport.width}.png`});
  }
  await page.setViewportSize({width:844,height:390});
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Cài đặt',exact:true})).toBeVisible();
  await insideScreen(page,'.settings-drawer');
  await page.getByRole('button',{name:'Đóng cài đặt'}).click();
  await page.locator('.mobile-magic-launch button').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.gx-right')).toBeHidden();
  // Resizing back to desktop restores the existing projected HUD and card rack.
  await page.setViewportSize({width:1440,height:900});
  await expect(page.locator('.mobile-magic-launch')).toBeHidden();
  await expect(page.locator('.gx-right')).toBeVisible();
  expect(errors).toEqual([]);
});
