// Deterministic scene frame capture: no wall-clock sleeps for card animations.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const port=process.env.E2E_PORT||5317,out='reports/screenshots/pixel-scene';mkdirSync(out,{recursive:true});
const cache=homedir()+'/Library/Caches/ms-playwright/chromium_headless_shell-1223/';
const exe=cache+readdirSync(cache).find(n=>n.startsWith('chrome-headless'))+'/chrome-headless-shell';
const browser=await chromium.launch({executablePath:exe,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/qa-scene.html`);await page.waitForFunction(()=>window.__ready,{timeout:180000});
await page.evaluate(()=>{
  const s=window.__saloon;s.setSoundEnabled(false);s.setQuality(true);s.engine.stopRenderLoop();
  const specs={AS:[14,'S'],KH:[13,'H'],'7D':[7,'D'],QC:[12,'C'],JD:[11,'D'],'2S':[2,'S'],'3S':[3,'S'],'9H':[9,'H']};
  window.Q={viewer:0,board:['7D','QC','JD'].map(id=>({id,rank:specs[id][0],suit:specs[id][1]})),forced:{},magic:[{slot:0,magicId:'N01',usable:false}],
    card(id,mod){return {id,rank:specs[id][0],suit:specs[id][1],modifiers:mod?[mod]:[]};},
    push(){const ids=['p0','p1','p2','p3'],ownId=ids[this.viewer];
      const players=ids.map((id,seat)=>({id,seat,name:['Bạn','Linh','Minh','Tú'][seat],character:['coyote','lynx','badger','rabbit'][seat],connected:true,ready:true,bot:false,folded:false,eliminated:false,allIn:false,bet:0,contribution:0,handSize:2,revealedCards:this.forced[seat]||[]}));
      const snap={roomId:'qa',code:'PIXEL',phase:'playing',handId:1,street:'flop',players,board:this.board,pots:[],pot:60,turnPlayerId:ownId,hostId:'p0',dealerSeat:0,smallBlind:10,bigBlind:20,deadline:Date.now()+9e5,serverTime:Date.now(),log:[],result:null,winnerId:null,nextBlindInHands:14,nextBlinds:null};
      const own={playerId:ownId,wallet:900,hand:[this.card('AS'),this.card('KH')],magic:this.magic,market:[],peeks:[],privateLog:[],lastBonuses:[],legal:{canCheck:true,callAmount:0,minRaiseTo:40,maxRaiseTo:900,canRaise:true,canFold:true}};
      s.sync(snap,own,ownId);s.setHoldCards(own.hand);
    },step(sec){for(let t=0;t<sec-1e-8;t+=.025)s.fx.update(Math.min(.025,sec-t));s.scene.render();},settle(){for(let i=0;i<180;i++)s.animate();this.step(12);}
  };Q.push();Q.settle();
});
const step=sec=>page.evaluate(t=>Q.step(t),sec);
async function shot(name){await page.waitForFunction(()=>window.__saloon.scene.materials.every(m=>!m.emissiveTexture||m.emissiveTexture.isReady()),{},{timeout:60000});await page.evaluate(()=>window.__saloon.scene.render());await page.screenshot({path:`${out}/${name}.png`});console.log('Ảnh:',name);}
await shot('16x10-board-seat0');
for(let seat=0;seat<4;seat++){
  await page.evaluate(i=>{Q.viewer=i;Q.push();Q.settle();},seat);await shot(`16x10-board-seat${seat}`);
  await page.evaluate(()=>window.__saloon.setLookDown(true));await page.evaluate(()=>Q.settle());await shot(`16x10-hand-seat${seat}`);
  await page.evaluate(()=>window.__saloon.setLookDown(false));await page.evaluate(()=>Q.settle());
}
await page.evaluate(()=>{Q.viewer=0;Q.push();Q.settle();});
await page.evaluate(()=>{Q.board[1]=Q.card('2S','gold');Q.push();});
await step(.18);await shot('K03-turning-down');await step(.22);await shot('K03-back');await step(.42);await shot('K03-turning-up');await step(.3);await shot('K03-replaced');
const replaced=await page.evaluate(()=>({id:window.__saloon.fx.board[1].cardId,rank:window.__saloon.fx.board[1].face.material.name}));assert.equal(replaced.id,'2S');checks.push({name:'K03 replacement',...replaced});
await page.evaluate(()=>{Q.forced[2]=[Q.card('3S')];Q.push();});await step(.25);await shot('force-reveal-flight');await step(.4);await shot('force-reveal-flip');await step(.6);await shot('force-reveal-done');
await page.evaluate(()=>window.__saloon.showMagicPeek(3,'K10'));await step(.25);await shot('K10-peek-back');await step(.5);await shot('K10-peek-edge');await step(.3);await shot('K10-peek-face');await step(3);
await page.evaluate(()=>{window.__saloon.showTray(10);window.__saloon.pulseSlot('N01');});await step(.3);await shot('pulse-slot-flip');await step(.3);await shot('pulse-slot-return');await step(.5);await shot('pulse-slot-done');
await page.evaluate(()=>{window.__saloon.showMagicUse(0,'K09');window.__saloon.showMagicUse(3,'K02');});await step(.45);await shot('popup-seats0-3');await step(3);
await page.evaluate(()=>{for(const [seat,id] of [[0,'K09'],[1,'N02'],[2,'K03'],[3,'K02'],[3,'N02'],[0,'K03']])window.__saloon.showMagicUse(seat,id);});await step(.45);await shot('multiple-popups-16x10');
const popCheck=await page.evaluate(()=>{const f=window.__saloon.fx;return {popIds:f.pops.map(p=>p.card.id),slots:f.pops.map(p=>p.screenSlot),nearest:[...f.magicMats.values()].every(m=>m.emissiveTexture.samplingMode===1),labels:window.__saloon.scene.meshes.filter(m=>m.name==='poptag'||m.name==='hinttag').length};});assert.equal(new Set(popCheck.slots).size,6);assert.equal(popCheck.labels,0);assert.equal(popCheck.nearest,true);checks.push({name:'Six popups, unique lanes, NEAREST, no texture labels',...popCheck});await step(3);
await page.evaluate(()=>window.__saloon.shuffleDeck());await step(.25);await shot('shuffle-lift');await step(.35);await shot('shuffle-split');await step(.45);await shot('shuffle-interleave');await step(.55);await shot('shuffle-square');await step(.5);await shot('shuffle-done');
await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>window.__saloon.engine.resize());await shot('16x10-final');
await page.setViewportSize({width:1440,height:810});await page.evaluate(()=>window.__saloon.engine.resize());await page.evaluate(()=>{window.__saloon.showMagicUse(0,'K09');window.__saloon.showMagicUse(3,'K02');});await step(.45);await shot('16x9-popup-seats0-3');await step(3);
await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>{const s=window.__saloon;s.engine.resize();Q.viewer=3;Q.push();Q.settle();s.showMagicUse(0,'K02');s.showMagicUse(3,'K09');});await step(.45);await shot('viewer-seat3-popups0-3');await step(3);
assert.deepEqual(errors,[]);checks.push({name:'Browser page errors',errors});
writeFileSync('assets/previews/pixel-scene-checks.json',JSON.stringify({passed:true,port,frameCapture:'Manual fx.update steps 25 ms; SwiftShader; scene-only fabricated snapshots',checks,stats:await page.evaluate(()=>window.__saloon.animationStats())},null,2)+'\n');await browser.close();
