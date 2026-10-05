import {describe,it,expect} from 'vitest';
import {createGame,restoreGame,chipAudit,evaluateHand} from '../src';
import {reserveBasePrice,priceFor,MAGIC,DEFAULTS} from '@saloon/content';
import type {Command,GameEngine,Card} from '@saloon/protocol';
let sequence=0;const cmd=(c:object)=>({commandId:`new-${++sequence}`,...c}) as Command;
function rng(){let a=23;return ()=>{a=(a*1664525+1013904223)>>>0;return a/2**32;};}
function table(){const g=createGame({roomId:'r',code:'ABCDE',random:rng()});for(const id of ['a','b']){g.addPlayer({id,name:id},0);g.applyCommand(id,cmd({type:'ready',ready:true}),1);}g.applyCommand('a',cmd({type:'start'}),2);return g;}
function play(g:GameEngine,now=3){g.applyCommand('a',cmd({type:'nextHand'}),now);return g.publicSnapshot(now).turnPlayerId!;}
function restore(st:any){return restoreGame(st,{roomId:'r',code:'ABCDE',random:rng()});}
function next(g:GameEngine,now:number){const s=g.publicSnapshot(now);g.applyCommand(s.turnPlayerId!,cmd({type:'bet',action:'fold',handId:s.handId}),now);g.tick(now+8001);expect(g.publicSnapshot(now+8001).phase).toBe('market');}
describe('persistent private market',()=>{
 it('keeps the same offers and exact cards for N hands (N = marketRefreshHands), removes purchases, then refills',()=>{
  let g=table();
  const st=g.serialize() as any;const p=st.players.find((x:any)=>x.id==='a');
  p.offers[0]={...p.offers[0],magicId:'R01',card:{id:'fx-card',rank:9,suit:'H' as const},price:60};
  g=restore(st);
  const offers=g.privateSnapshot('a',2).market,chosen=offers.find(o=>o.card)!;
  expect(chosen).toBeTruthy();
  expect(g.applyCommand('a',cmd({type:'buyMagic',offerId:chosen.id}),2).ok).toBe(true);
  expect(g.privateSnapshot('a',2).magic[0].spare).toEqual(chosen.card);const remaining=g.privateSnapshot('a',2).market;
  expect(remaining).toHaveLength(offers.length-1);expect(remaining.some(o=>o.id===chosen.id)).toBe(false);
  let now=3;for(let i=1;i<=DEFAULTS.marketRefreshHands;i++){play(g,now);next(g,now+1);now+=8003;const own=g.privateSnapshot('a',now);if(i<DEFAULTS.marketRefreshHands)expect(own.market).toEqual(remaining);else expect(own.market.map(o=>o.id)).not.toEqual(remaining.map(o=>o.id));expect(chipAudit(g.serialize()).ok).toBe(true);restore(g.serialize());}
 });
 it('paid refresh is private and atomic, insufficient funds do not change stock or wallet',()=>{
  let g=table();const old=g.privateSnapshot('a',2),before=g.publicSnapshot(2);expect(g.applyCommand('a',cmd({type:'refreshMarket'}),2).ok).toBe(true);const own=g.privateSnapshot('a',2);expect(own.wallet).toBe(old.wallet-old.marketRefreshPrice!);expect(own.market).not.toEqual(old.market);expect(g.publicSnapshot(2)).toEqual(before);expect(chipAudit(g.serialize()).ok).toBe(true);
  const st=g.serialize() as any;st.ledger.burned+=st.players[0].wallet;st.players[0].wallet=0;g=restore(st);const poor=g.privateSnapshot('a',2);expect(g.applyCommand('a',cmd({type:'refreshMarket'}),2).ok).toBe(false);expect(g.privateSnapshot('a',2)).toEqual(poor);
 });
 it('price rises for every rank and adds premiums for gold/wild/lucky',()=>{const card:Card={id:'r',rank:2,suit:'D'};for(let rank=2;rank<14;rank++)expect(reserveBasePrice({...card,rank:rank+1})).toBeGreaterThan(reserveBasePrice({...card,rank}));for(const mod of ['gold','wild','lucky'] as const)expect(reserveBasePrice({...card,modifiers:[mod]})).toBeGreaterThan(reserveBasePrice(card));expect(priceFor(reserveBasePrice(card),3)).toBeGreaterThan(reserveBasePrice(card));expect(MAGIC.some(m=>m.id==='K06')).toBe(false);});
});
describe('physical reserve exchange and offensive cards',()=>{
 it('X01 round-trip exchange preserves physical IDs, modifiers, no discard, and survives fresh decks',()=>{
  let g=table();const who=play(g);const st=g.serialize() as any;const owner=st.players.find((p:any)=>p.id===who);
  owner.slots=[{magicId:'X01',spare:{id:'spareX01',rank:11,suit:'H' as const,modifiers:['gold' as const]}},null,null,null,null];g=restore(st);
  const old=g.privateSnapshot(who,3).hand[0],sp=g.privateSnapshot(who,3).magic[0].spare!;
  for(let i=0;i<20;i++){expect(g.applyCommand(who,cmd({type:'swap',slot:0,handIndex:0,handId:1}),3).ok).toBe(true);g=restore(g.serialize());}
  expect(g.privateSnapshot(who,3).hand[0]).toEqual(old);expect(g.privateSnapshot(who,3).magic[0].spare).toEqual(sp);expect((g.serialize() as any).discard).toEqual([]);
  g.applyCommand(who,cmd({type:'swap',slot:0,handIndex:0,handId:1}),3);next(g,4);play(g,8006);g=restore(g.serialize());expect(g.privateSnapshot(who,8006).magic[0].spare).toEqual(old);expect(g.privateSnapshot(who,8006).hand.some(c=>c.id===old.id)).toBe(false);
 });
 it('R01 (bought reserve) exchange is single-use: discards the outgoing card and empties the slot',()=>{
  let g=table();const who=play(g);const st=g.serialize() as any;const owner=st.players.find((p:any)=>p.id===who);
  owner.slots=[{magicId:'R01',spare:{id:'spareR01',rank:6,suit:'D' as const}},null,null,null,null];g=restore(st);
  const old=g.privateSnapshot(who,3).hand[0],sp=g.privateSnapshot(who,3).magic[0].spare!;
  expect(g.applyCommand(who,cmd({type:'swap',slot:0,handIndex:0,handId:1}),3).ok).toBe(true);
  expect(g.privateSnapshot(who,3).hand[0]).toEqual(sp);expect(g.privateSnapshot(who,3).magic).toHaveLength(0);expect((g.serialize() as any).discard).toEqual([old.id]);
  expect(g.applyCommand(who,cmd({type:'swap',slot:0,handIndex:0,handId:1}),3).ok).toBe(false);
 });
 it.each(['K11','K12','K13'])('%s acts publicly, respects privacy and conserves cards/chips',magicId=>{
  let g=table();const who=play(g),st=g.serialize() as any,victim=st.players.find((p:any)=>p.id!==who),actor=st.players.find((p:any)=>p.id===who);actor.slots=Array(5).fill({magicId:'K07'});actor.slots[0]={magicId};victim.slots=[{magicId:'R01',spare:{id:'s999',rank:2,suit:'D',modifiers:['gold']}},{magicId:'N07'},null,null,null];g=restore(st);g.takeEvents();const oldHand=g.privateSnapshot(who,3).hand,oldDeck=(g.serialize() as any).deck;
  expect(g.applyCommand(who,cmd({type:'useMagic',slot:0,targetPlayerId:victim.id,handId:1}),3).ok).toBe(true);
  const events=g.takeEvents().filter(e=>e.type==='magicUsed');expect(events).toHaveLength(1);expect(events[0].magicId).toBe(magicId);expect(JSON.stringify(events)).not.toContain('s999');expect(chipAudit(g.serialize()).ok).toBe(true);restore(g.serialize());
  if(magicId==='K11'){expect(g.privateSnapshot(who,3).magic).toHaveLength(5);expect(g.privateSnapshot(victim.id,3).magic).toHaveLength(1);expect(['R01','N07']).toContain(g.privateSnapshot(who,3).magic[0].magicId);}
  if(magicId==='K12')expect(g.privateSnapshot(victim.id,3).magic).toHaveLength(0);
  if(magicId==='K13'){expect(g.privateSnapshot(who,3).hand.map(c=>c.id)).toEqual(oldDeck.slice(0,2));expect((g.serialize() as any).discard).toEqual(oldHand.map(c=>c.id));expect(JSON.stringify(g.publicSnapshot(3))).not.toContain(oldDeck[0]);}
 });
 it('armor announces a blocked trap even under Silent, preserves buffs and keeps the shield',()=>{
  let g=table();const who=play(g),st=g.serialize() as any;const actor=st.players.find((p:any)=>p.id===who),target=st.players.find((p:any)=>p.id!==who);actor.slots=[{magicId:'K08'},{magicId:'K08'},null,null,null];target.slots=[{magicId:'N04'},{magicId:'N07'},null,null,null];for(const id of target.hand)st.cards[id].modifiers=['gold'];g=restore(st);g.takeEvents();
  for(let slot=0;slot<2;slot++)expect(g.applyCommand(who,cmd({type:'useMagic',slot,targetPlayerId:target.id,handId:1}),3).ok).toBe(true);
  expect(g.privateSnapshot(target.id,3).hand.every(c=>c.modifiers?.[0]==='gold')).toBe(true);expect(g.privateSnapshot(target.id,3).magic.map(m=>m.magicId)).toContain('N04');expect(g.takeEvents().filter(e=>e.type==='magicUsed')).toMatchObject([{magicId:'N04',playerId:target.id},{magicId:'N04',playerId:target.id}]);
 });
 it('duplicate rank and suit with different IDs count as physical cards, never fabricate a straight',()=>{const cards:Card[]=[2,2,3,4,5].map((rank,i)=>({id:String(i),rank,suit:'D'}));expect(evaluateHand(cards).category).toBe(5);expect(()=>evaluateHand(cards.map(c=>({...c,id:'same'})))).toThrow();const pair=cards.map((c,i)=>({...c,suit:(i%2?'H':'S') as 'H'|'S'}));expect(evaluateHand(pair).category).toBe(1);});
});
