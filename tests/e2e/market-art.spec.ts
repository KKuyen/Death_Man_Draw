import {test,expect} from '@playwright/test';
test.use({hasTouch:true,isMobile:true,...(process.env.E2E_WEBKIT==='1'?{browserName:'webkit' as const,launchOptions:{executablePath:undefined,args:[]}}:{})});
test('all four market illustrations survive paging and rotation',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{localStorage.setItem('saloon.coach.done','1');localStorage.setItem('saloon.settings',JSON.stringify({muted:true,musicOn:false,lowQuality:true}));});
 await page.goto('/');await page.clock.setFixedTime(Date.now());await page.locator('.demo-link').click();await expect(page.locator('.gx-offer')).toHaveCount(4);
 for(const size of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);
  while(await page.getByRole('button',{name:'Lá trước',exact:true}).isEnabled())await page.getByRole('button',{name:'Lá trước',exact:true}).click();
  for(const [step,i] of [0,1,2,3,2,1,0,1,2,3].entries()){
   const offer=page.locator('.gx-offer').nth(i),art=offer.locator('.gx-offer-art');
   const label=await page.locator('.mobile-market-nav>span').innerText();
   const current=Number(label.match(/Lá (\d+)/)![1])-1;
   if(i!==current){
    if(step<4)await page.getByRole('button',{name:i>current?'Lá tiếp theo':'Lá trước',exact:true}).click();
    else await page.locator('.gx-market-grid').evaluate((el,index)=>{const card=el.children[index];el.scrollTo({left:el.scrollLeft+card.getBoundingClientRect().left-el.getBoundingClientRect().left,behavior:'smooth'});},i);
   }
   await expect(page.locator('.mobile-market-nav')).toContainText(`Lá ${i+1}/4`);
   await expect.poll(()=>art.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>40&&r.height>50&&r.left>=0&&r.right<=innerWidth;})).toBe(true);
   await expect(art).toHaveCSS('filter','none');
   if(await art.locator('img').count())await expect.poll(()=>art.locator('img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
   else await expect(art.locator('.playing-card')).toBeVisible();
   await page.screenshot({path:`reports/screenshots/market-art-${size.width}-${i+1}.png`});
  }
 }
});
