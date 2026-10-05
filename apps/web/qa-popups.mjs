// Run from repo root: node apps/web/qa-popups.mjs <own web port> [seat|all]
// Synthetic events/snapshots over a real four-player offline room; never sends them to a server.
import {chromium} from 'playwright';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {existsSync as exists} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tsImport} from 'tsx/esm/api';
const {MAGIC,DEFAULTS}=await tsImport('../../packages/content/src/index.ts',import.meta.url);
const out=fileURLToPath(new URL('../../reports/screenshots/',import.meta.url));
await mkdir(out,{recursive:true});
const cache=join(homedir(),'Library/Caches/ms-playwright');
let executablePath=process.env.CHROMIUM_PATH;
if(!executablePath)for(const dir of (await readdir(cache)).filter(d=>d.startsWith('chromium_headless_shell')).sort().reverse()){
  for(const arch of await readdir(join(cache,dir))){const candidate=join(cache,dir,arch,'chrome-headless-shell');if(exists(candidate)){executablePath=candidate;break;}}
  if(executablePath)break;
}
const port=process.argv[2]||5394;
const seats=process.argv[3]&&process.argv[3]!=='all'?[Number(process.argv[3])]:[0,1,2,3];
const receipt=[];
const browser=await chromium.launch({executablePath,args:process.env.E2E_GPU==='1'?['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const [w,h] of [[1440,900],[1280,720]]){
  const p=await browser.newPage({viewport:{width:w,height:h}});const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/GL Driver|ReadPixels/.test(m.text()))errs.push(m.text());});
  await p.addInitScript(()=>localStorage.setItem('saloon.coach.done','1'));
  await p.goto(`http://localhost:${port}/?debug`);
  await p.waitForSelector('.welcome-footer:has-text("OPEN")',{timeout:90000});
  await p.locator('.demo-link').click();await p.waitForSelector('.gx-offer');
  // Freeze time for reproducible captures, while keeping the actual engine-generated offers.
  await p.evaluate(()=>window.__conn.offline.dispose());
  const base=await p.evaluate(()=>window.__conn.state);
  await p.clock.install();
  const select=(predicate)=>{const def=MAGIC.find(predicate);if(!def)throw new Error('Catalog action missing');return def;};
  const publicCard=select(d=>d.sound==='reveal'&&d.visibility==='public');
  const ball=select(d=>d.timing==='anyTime');
  const passive=select(d=>d.kind==='passive_triggered'&&!d.consumed);
  const handPeek=select(d=>d.sound==='peek'&&d.visibility==='hinted'&&/1 lá ngẫu nhiên/.test(d.description));
  const magicPeek=select(d=>d.sound==='peek'&&d.visibility==='hinted'&&/lá phép/.test(d.description));
  const continuous=select(d=>d.kind==='passive_continuous');
  const swap=select(d=>d.swap);
  for(const seat of seats){
   const self=base.snapshot.players.find(x=>x.seat===seat).id;
   const shot=async(n,checks=[])=>{
    await p.clock.pauseAt(await p.evaluate(()=>Date.now()+50));
    const geometry=await p.evaluate(selectors=>selectors.map(selector=>{
      const el=document.querySelector(selector);if(!el)return {selector,missing:true};const r=el.getBoundingClientRect();
      return {selector,x:r.x,y:r.y,width:r.width,height:r.height,inViewport:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};
    }),checks);
    await p.screenshot({path:join(out,`pop-${w}-seat${seat}-${n}.png`)});
    const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
    const dock=geometry.find(g=>g.selector==='.gx-bottom');
    if(dock&&geometry.some(g=>g.selector!=='.gx-bottom'&&g.selector!=='.gx-slot.fired'&&!g.missing&&overlap(g,dock)))throw new Error(`${w}/seat${seat}/${n}: overlay overlaps bottom controls`);
    if(geometry.some(g=>g.missing||!g.inViewport))throw new Error(`${w}/seat${seat}/${n}: ${JSON.stringify(geometry)}`);
    receipt.push({w,h,seat,state:n,geometry});
    await p.clock.resume();
   };
   const update=patch=>p.evaluate(patch=>window.__conn.update(patch),patch);
   const ev=e=>update({event:{id:`qa-${Math.random()}`,at:Date.now(),...e}});
   const snap={...base.snapshot,phase:'market',deadline:Date.now()+3600000,serverTime:Date.now()};
   const own={...base.own,playerId:self,peeks:[],magic:[]};
   await update({selfId:self,snapshot:snap,own,event:null});
   await p.mouse.move(0,0);await p.waitForTimeout(700);await shot('market',['.gx-market','.gx-bottom',...Array.from({length:4},(_,i)=>`.gx-offer:nth-child(${i+1}) footer`)]);
   // All five slots populated, with all kinds and visibility levels represented.
   const defs=[ball,handPeek,passive,continuous,swap];
   const magic=defs.map((d,slot)=>({slot,magicId:d.id,usable:d.kind==='active',...(d.swap?{spare:{id:'qa-spare',rank:14,suit:'S',modifiers:['wild']}}:{})}));
   const play={...snap,phase:'playing',handId:1,street:'flop',turnPlayerId:self,board:[{id:'AS',rank:14,suit:'S'},{id:'KH',rank:13,suit:'H'},{id:'9C',rank:9,suit:'C'}],players:snap.players.map(x=>({...x,folded:false,eliminated:false,handSize:2}))};
   const hand=[{id:'QH',rank:12,suit:'H'},{id:'JD',rank:11,suit:'D',modifiers:['gold']}];
   await update({snapshot:play,own:{...own,market:[],hand,magic}});
   await p.waitForTimeout(1000);
   if(await p.locator('.gx-plate').count()!==3||await p.locator('.gx-tray .gx-slot').count()!==DEFAULTS.magicSlots)throw new Error('Four-seat table / tray missing');
   await ev({type:'magicUsed',playerId:play.players.find(x=>x.id!==self).id,magicId:publicCard.id,targetPlayerId:self,cue:publicCard.sound});
   await p.waitForSelector('.gx-magic-banner');await p.waitForTimeout(450);
   if(await p.locator('.gx-magic-banner .vis-pill').count())throw new Error('Public banner leaks owner visibility');
   await shot('public-use',['.gx-magic-banner','.gx-bottom']);
   await p.clock.fastForward(5500);
   await ev({type:'magicHint',to:self,cue:'looked',text:'Bạn cảm thấy có ai đó đang nhìn bài của bạn…'});
   await p.waitForTimeout(450);await shot('hint',['.gx-toast.private','.gx-board','.gx-bottom']);
   await p.clock.fastForward(5500);
   const peeks=[];
   for(const [name,peek] of [
    ['K01',{handId:1,label:`${handPeek.name} · Mad Maggie`,card:{id:'qa-peek',rank:12,suit:'H',modifiers:['wild']}}],
    ['K10',{handId:1,label:magicPeek.name,magic:{magicId:publicCard.id,targetPlayerId:play.players.find(x=>x.id!==self).id}}],
    ['K10-empty',{handId:1,label:magicPeek.name,magic:{magicId:null,targetPlayerId:play.players.find(x=>x.id!==self).id}}],
    ['K07',{handId:1,label:ball.name,source:ball.id,boardIds:play.board.map(c=>c.id),card:{id:'qa-top',rank:14,suit:'C',modifiers:['gold']}}]
   ]){
    peeks.push(peek);await update({own:{...own,market:[],hand,magic,peeks:[...peeks]}});
    await p.waitForSelector('.gx-peek-modal');await p.waitForTimeout(500);
    await shot(name,['.gx-peek-card']);await p.getByRole('button',{name:'ĐÃ XEM'}).click();
   }
   // Clear remembered peek summaries before panel / pulse captures.
   await update({own:{...own,market:[],hand,magic,peeks:[]}});
   await p.locator('.gx-slot[data-slot="1"]').hover();await p.waitForTimeout(250);
   await shot('tooltip',['.gx-slot-tooltip#magic-tip-1']);
   await p.locator('.gx-slot[data-slot="0"]').click();await p.waitForSelector('.gx-use');
   await shot('use-panel',['.gx-use']);await p.locator('.gx-use .gx-x').click();await p.mouse.move(0,0);
   await ev({type:'use',to:self,playerId:self,magicId:passive.id,text:`${passive.name} vừa có hiệu lực.`});
   await p.waitForSelector('.gx-slot.fired');await p.waitForTimeout(300);
   await shot('tray-pulse',['.gx-slot.fired','.gx-bottom']);
   await p.clock.fastForward(5500);
  }
  if(errs.length)throw new Error(`Browser errors: ${JSON.stringify(errs)}`);
  console.log(`${w}×${h}: ${seats.length} ghế, mọi trạng thái đã chụp; không lỗi console.`);
  await p.close();
 }
 await writeFile(join(out,seats.length===4?'pop-qa-receipt.json':`pop-qa-receipt-seat${seats.join('-')}.json`),JSON.stringify(receipt,null,2));
}finally{await browser.close();}
