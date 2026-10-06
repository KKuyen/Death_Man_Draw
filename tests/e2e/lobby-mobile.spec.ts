import {test,expect} from '@playwright/test';
test.use({hasTouch:true,isMobile:true});
test('mobile lobby keeps bot, ready, start and settings accessible',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{localStorage.setItem('saloon.coach.done','1');localStorage.setItem('saloon.settings',JSON.stringify({muted:true,musicOn:false,lowQuality:true}));});
 await page.goto('/');await page.getByRole('button',{name:'MỞ BÀN MỚI'}).click();
 await expect(page.locator('.lobby-dialog')).toBeVisible();
 await expect(page.locator('.gx-bottom,.gx-stepper,.gx-match')).toHaveCount(0);
 for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);
  for(const selector of ['.lobby-add-bot','.lobby-start button:first-child','.lobby-start button:last-child']){
   const el=page.locator(selector);const b=await el.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(0);expect(b!.y+b!.height).toBeLessThanOrEqual(size.height);expect(b!.height).toBeGreaterThanOrEqual(44);
   expect(await el.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));})).toBe(true);
  }
  await page.locator('.setup-toggle').click();await expect(page.getByRole('spinbutton',{name:'Tiền khởi đầu',exact:true})).toBeVisible();
  await expect(page.locator('.lobby-start button:last-child')).toBeVisible();await page.locator('.setup-toggle').click();
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.setup-toggle').click();await page.getByRole('spinbutton',{name:'Tiền khởi đầu',exact:true}).fill('2000');await page.getByRole('button',{name:'ÁP DỤNG CÀI ĐẶT'}).click();
 await expect(page.locator('.setup-toggle')).toContainText('$2000');await page.locator('.setup-toggle').click();
 await page.locator('.lobby-add-bot').click();await expect(page.locator('.gx-roster')).toContainText('máy');
 await page.getByRole('button',{name:'SẴN SÀNG',exact:true}).click();await expect(page.getByRole('button',{name:'BẮT ĐẦU',exact:true})).toBeEnabled();
 await page.screenshot({path:'reports/screenshots/mobile-waiting-room.png'});
 await page.getByRole('button',{name:'BẮT ĐẦU',exact:true}).click();await expect(page.locator('.gx-offer')).toHaveCount(4);
 await page.getByRole('button',{name:'Rời bàn',exact:true}).click();
});
