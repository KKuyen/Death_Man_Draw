// Verify an owned desktop server and a complete hand in the unpacked macOS app.
import { _electron as electron } from 'playwright';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'lairgame-desktop-qa-'));
const app=await electron.launch({
 executablePath:resolve("release/mac-arm64/Dead Man's Draw.app/Contents/MacOS/Dead Man's Draw"),
 args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist'],
 env:{...process.env,SALOON_HEADLESS:'1',SALOON_QA:'1',SALOON_DATA_DIR:dir},timeout:90000
});
const errors=[];
try{
 const page=await app.firstWindow();
 const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:90000,polling:100});
 page.on('pageerror',e=>errors.push(e.message));
 await wait(()=>!!window.__conn);
 const endpoint=await page.evaluate(()=>window.saloonDesktop.endpoint);
 if(endpoint=== 'ws://127.0.0.1:2567')throw new Error('desktop reused the default server');
 const health=await fetch(endpoint.replace(/^ws/,'http')+'/health').then(r=>r.json());
 await page.evaluate(async()=>{
  localStorage.setItem('saloon.coach.done','1');
  const conn=window.__conn;await conn.create('Desktop QA','lynx');
 });
 await wait(()=>window.__conn.state.snapshot?.phase==='lobby');
 for(let i=0;i<3;i++){
  await page.evaluate(()=>window.__conn.send({type:'addBot'}));
  await wait(n=>window.__conn.state.snapshot?.players.length===n,i+2);
 }
 await page.evaluate(()=>window.__conn.send({type:'ready',ready:true}));
 await wait(()=>window.__conn.state.snapshot.players.every(p=>p.ready));
 await page.evaluate(()=>window.__conn.send({type:'start'}));
 await wait(()=>window.__conn.state.snapshot.phase==='market');
 await page.evaluate(()=>window.__conn.send({type:'ready',ready:true}));
 await wait(()=>window.__conn.state.snapshot.phase==='playing'&&window.__conn.state.own.hand.length===2);
 await page.screenshot({path:'reports/screenshots/desktop-final-hand.png'});
 await page.evaluate(()=>{
  window.__qaAuto=setInterval(()=>{
   const c=window.__conn,s=c.state.snapshot,o=c.state.own;
   if(s?.phase==='playing'&&s.turnPlayerId===c.state.selfId){
    const me=s.players.find(p=>p.id===c.state.selfId);
    c.send({type:'bet',action:Math.min(o.wallet,Math.max(0,s.currentBet-me.bet))?'call':'check'});
   }
  },400);
 });
 await wait(()=>window.__conn.state.snapshot.result!==null);
 await page.evaluate(()=>clearInterval(window.__qaAuto));
 await page.screenshot({path:'reports/screenshots/desktop-final-showdown.png'});
 const fps=[];for(let i=0;i<6;i++){await page.waitForTimeout(500);fps.push(await page.evaluate(()=>window.__saloon.engine.getFps()));}
 const gl=await page.evaluate(()=>window.__saloon.engine.getGlInfo());
 const state=await page.evaluate(()=>({endpoint:window.__conn.endpoint,phase:window.__conn.state.snapshot.phase,handId:window.__conn.state.snapshot.handId,result:window.__conn.state.snapshot.result?.summary}));
 const receipt={passed:errors.length===0,health,state,errors,gl,fps,isolatedData:dir};
 await writeFile('reports/desktop-qa.json',JSON.stringify(receipt,null,2));
 if(errors.length)throw new Error(JSON.stringify(errors));
 console.log(receipt);
}catch(error){
 const page=await app.firstWindow().catch(()=>null);
 if(page)await writeFile('reports/desktop-qa-failure.json',JSON.stringify(await page.evaluate(()=>({state:window.__conn?.state.status,phase:window.__conn?.state.snapshot?.phase,error:window.__conn?.state.error,handId:window.__conn?.state.snapshot?.handId})).catch(()=>({closed:true})),null,2));
 throw error;
}finally{await app.close();}
