import {test,expect,type Page} from '@playwright/test';

const initialize=()=>{
 localStorage.setItem('saloon.coach.done','1');
 localStorage.setItem('saloon.settings',JSON.stringify({muted:true,musicOn:false,lowQuality:true}));
};
async function fits(page:Page,selector:string){
 const viewport=page.viewportSize()!;
 for(const r of await page.locator(selector).evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}))){
  expect(r.left).toBeGreaterThanOrEqual(-1);expect(r.right).toBeLessThanOrEqual(viewport.width+1);
  expect(r.top).toBeGreaterThanOrEqual(-1);expect(r.bottom).toBeLessThanOrEqual(viewport.height+1);
 }
}

test('mobile game: buy, open magic details, play, chat, settings and rotate',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.addInitScript(initialize);await page.goto('/');
 await page.locator('.boot-screen').waitFor({state:'hidden',timeout:60000});
 await page.getByRole('button',{name:/^Chơi thử với/}).click();await expect(page.locator('.gx-buy').first()).toBeVisible();
 await fits(page,'.gx-market-head,.gx-offer:first-child footer,.gx-bottom');
 const before=Number((await page.locator('.wallet-block strong').innerText()).replace(/\D/g,''));
 await page.locator('.gx-buy:not([disabled])').first().click();
 await expect.poll(async()=>Number((await page.locator('.wallet-block strong').innerText()).replace(/\D/g,''))).toBeLessThan(before);
 await page.locator('.mobile-magic-launch button').click();await page.locator('.gx-slot:not(.empty)').first().click();
 await expect(page.locator('.gx-use')).toBeVisible();await fits(page,'.gx-right,.gx-use,.gx-use-actions');
 await page.getByRole('button',{name:'Đóng khay bài phép',exact:true}).click();
 await page.getByRole('button',{name:'Xong',exact:true}).filter({visible:true}).click();
 await expect(page.locator('.bet-buttons')).toBeVisible({timeout:40000});
 await expect(page.locator('.bet-buttons small')).toHaveCount(0);
 for(const size of [{width:320,height:568},{width:390,height:844},{width:568,height:320},{width:844,height:390}]){
  await page.setViewportSize(size);await fits(page,'.room-label,.gx-board,.gx-bottom,.bet-buttons');
  for(const el of await page.locator('.bet-buttons button').all()){const r=await el.boundingBox();expect(r!.height).toBeGreaterThanOrEqual(44);}
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Mở chat',exact:true}).click();await fits(page,'.room-chat');
 await page.getByRole('textbox',{name:'Tin nhắn'}).fill('Một tin nhắn dài '.repeat(15));await page.getByRole('button',{name:'Gửi',exact:true}).click();
 await expect(page.locator('.chat-messages .mine')).toHaveCount(1);await fits(page,'.room-chat form');
 await page.getByRole('button',{name:'Đóng chat',exact:true}).click();
 await page.getByRole('button',{name:'Cài đặt',exact:true}).click();
 for(const tab of ['Âm thanh','Thiết bị','Người chơi','Phòng']){await page.getByRole('tab',{name:tab,exact:true}).click();await fits(page,'.settings-drawer');}
 await expect(page.getByRole('button',{name:'Kết thúc trận',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.settings-drawer')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('real room: Tab management, transfer in settings, new host kick during play',async({browser})=>{
 const contexts=await Promise.all([browser.newContext({viewport:{width:1440,height:900}}),browser.newContext({viewport:{width:390,height:844}}),browser.newContext({viewport:{width:1280,height:720}})]);
 const [a,b,c]=await Promise.all(contexts.map(ctx=>ctx.newPage()));
 try{
  for(const p of [a,b,c]){await p.addInitScript(initialize);await p.goto('/');}
  await a.locator('#player-name').fill('Chủ phòng');await a.locator('.entry-create').click();
  const code=await a.locator('.room-label strong').innerText();
  for(const [p,name] of [[b,'Người nhận quyền'],[c,'Người bị kick']] as const){await p.locator('#player-name').fill(name);await p.getByRole('textbox',{name:'Mã bàn',exact:true}).fill(code);await p.getByRole('button',{name:'VÀO BÀN',exact:true}).click();}
  await expect(a.locator('.gx-roster>div:not(.empty)')).toHaveCount(3);
  await a.keyboard.press('Tab');await expect(a.getByRole('dialog',{name:'Người chơi',exact:true})).toBeVisible();
  await expect(a.getByRole('button',{name:'Đuổi Người bị kick',exact:true})).toBeVisible();
  await a.keyboard.press('Escape');
  await a.getByRole('button',{name:'Cài đặt',exact:true}).click();await a.getByRole('tab',{name:'Người chơi',exact:true}).click();
  a.once('dialog',d=>d.accept());await a.getByRole('button',{name:'Trao quyền chủ phòng cho Người nhận quyền',exact:true}).click();
  await expect(a.getByRole('button',{name:'Đuổi Người bị kick',exact:true})).toHaveCount(0);
  await a.keyboard.press('Escape');
  for(const p of [a,b,c])await p.getByRole('button',{name:'SẴN SÀNG',exact:true}).click();
  await expect(b.getByRole('button',{name:'BẮT ĐẦU',exact:true})).toBeEnabled();await b.getByRole('button',{name:'BẮT ĐẦU',exact:true}).click();
  for(const p of [a,b,c])await p.getByRole('button',{name:'Xong',exact:true}).filter({visible:true}).click();
  await expect(b.locator('.gx-board')).toBeVisible();
  await b.getByRole('button',{name:'Người chơi',exact:true}).click();
  b.once('dialog',d=>d.accept());await b.getByRole('button',{name:'Đuổi Người bị kick',exact:true}).click();
  await expect(c.locator('.entry-panel')).toBeVisible();
  await expect(b.getByRole('button',{name:'Đuổi Người bị kick',exact:true})).toHaveCount(0);
  await b.keyboard.press('Escape');
  await b.getByRole('button',{name:'Cài đặt',exact:true}).click();await b.getByRole('tab',{name:'Phòng',exact:true}).click();
  await expect(b.getByRole('button',{name:'Kết thúc trận',exact:true})).toBeVisible();
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
