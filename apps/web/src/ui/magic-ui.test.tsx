import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {DEFAULTS,MAGIC} from '@saloon/content';
import {createGame} from '@saloon/rules';
import {MagicArt,MagicDetails,magicInputs,magicTiming} from './common';
import {PrivateMarket} from './Market';
import {MagicTray,timingText} from './MagicTray';
import {peekIsCrystal,peekNote,toastFor} from './Toasts';

function room(){
 const engine=createGame({roomId:'ui-test',code:'UITEST',now:0,random:()=>.37});
 engine.addPlayer({id:'me',name:'Bạn'},0);engine.addPlayer({id:'them',name:'Đối thủ'},0);
 for(const id of ['me','them'])engine.applyCommand(id,{type:'ready',ready:true,commandId:id},0);
 engine.applyCommand('me',{type:'start',commandId:'start'},0);
 return {snapshot:engine.publicSnapshot(0),own:engine.privateSnapshot('me',0)};
}
describe('Bài Phép DOM and privacy contract',()=>{
 it('renders complete metadata from every catalog definition around text-free art',()=>{
  for(const def of MAGIC){
   const owner=renderToStaticMarkup(<MagicDetails def={def} heading/>);
   expect(owner).toContain(def.name);expect(owner).toContain('kind-pill');expect(owner).toContain('vis-pill');
   expect(owner).toContain('Giá gốc: $');expect(owner).toContain('Khi dùng:');
   expect(owner).toContain(magicTiming(def));
   const publicView=renderToStaticMarkup(<MagicDetails def={def} owner={false} heading/>);
   expect(publicView).not.toContain('vis-pill');expect(publicView).not.toContain('magic-visibility');
   const art=renderToStaticMarkup(<MagicArt magicId={def.id} fam={def.swap?'swap':def.kind==='active'?'active':'passive'}/>);
   expect(art).toContain(`/cards/${def.id}.png`);expect(art).toContain('alt=""');expect(art).not.toContain(def.name);
  }
 });
 it('retains the engine offer price after purchase and describes all tray kinds',()=>{
  const {snapshot,own}=room();
  own.market[0]={...own.market[0],price:135,purchased:true};
  const market=renderToStaticMarkup(<PrivateMarket snapshot={snapshot} own={own} send={()=>{}}/>);
  expect(market).toContain('Giá chợ: $135');expect(market).toContain('ĐÃ MUA');
  own.magic=MAGIC.slice(0,DEFAULTS.magicSlots).map((def,slot)=>({slot,magicId:def.id,usable:false}));
  const tray=renderToStaticMarkup(<MagicTray snapshot={snapshot} own={own} others={snapshot.players.filter(p=>p.id!=='me')} send={()=>{}} mine={false}/>);
  expect(tray.match(/role="tooltip"/g)).toHaveLength(DEFAULTS.magicSlots);
  expect(tray).toContain('Nội tại chờ sự kiện');expect(tray).toContain('Khi dùng:');
 });
 it('anyTime remains usable outside the owner turn, and multi-use passives do not claim single-use',()=>{
  const {snapshot}=room();snapshot.phase='playing';snapshot.turnPlayerId='them';
  const ball=MAGIC.find(d=>d.timing==='anyTime')!;
  expect(timingText({slot:0,magicId:ball.id,usable:true},snapshot,false)).toContain('kể cả ngoài lượt');
  for(const def of MAGIC.filter(d=>typeof d.consumed==='number'))expect(magicTiming(def)).toContain(`Mất sau ${def.consumed} lần`);
 });
 it('uses peek provenance and marks a top-deck result stale after the board changes',()=>{
  const {snapshot}=room();const ball=MAGIC.find(d=>d.timing==='anyTime')!;
  // Source is an engine-provided ID; the heading follows catalog timing, not translated label matching.
  const peek={handId:snapshot.handId,label:'Kết quả',source:ball.id as 'K07',boardIds:[],card:{id:'top',rank:14,suit:'S' as const}};
  expect(peekIsCrystal(peek)).toBe(true);expect(peekNote(peek,snapshot)).toContain('tại lúc soi');
  snapshot.board=[{id:'changed',rank:10,suit:'H'}];expect(peekNote(peek,snapshot)).toContain('Bài chung đã đổi');
 });
 it('derives parameter controls from catalog flags and semantic action cues',()=>{
  for(const def of MAGIC){
   const inputs=magicInputs(def);
   if(def.swap)expect(inputs.hand).toBe(true);
   if(def.sound==='peek')expect(inputs.target).toBe(def.visibility==='hinted');
   if(def.sound==='board')expect(inputs.board).toBe(true);
   if(def.sound==='enhance')expect(inputs.modifier&&inputs.hand).toBe(true);
  }
 });
 it('keeps private events private and trusts a public decoy event ID',()=>{
  const {snapshot}=room();const hinted=MAGIC.find(d=>d.visibility==='hinted')!;
  const base={id:'evt',at:0};
  expect(toastFor({...base,type:'purchase',to:'them',magicId:hinted.id},snapshot,'me')).toBeNull();
  expect(toastFor({...base,type:'magicHint',to:'them',cue:'looked'},snapshot,'me')).toBeNull();
  const hint=toastFor({...base,type:'magicHint',to:'me',cue:'sensed'},snapshot,'me');
  expect(hint?.text).toContain('dò xét phép');expect(hint?.magicId).toBeUndefined();
  const decoy=toastFor({...base,type:'magicUsed',playerId:'them',magicId:hinted.id},snapshot,'me');
  expect(decoy?.tone).toBe('public');expect(decoy?.magicId).toBe(hinted.id);
 });
});
