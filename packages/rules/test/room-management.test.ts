import {describe,expect,it} from 'vitest';
import {createGame,chipAudit,restoreGame} from '../src';
import type {Command,GameEngine} from '@saloon/protocol';
let seq=0;
const command=(g:GameEngine,id:string,c:object,now=3)=>g.applyCommand(id,{...c,commandId:`room-${++seq}`,handId:g.publicSnapshot(now).handId} as Command,now);
function table(){
 const g=createGame({roomId:'management',code:'ROOM1',random:()=>.37});
 for(const id of ['a','b','c','d'])g.addPlayer({id,name:id},0);
 return g;
}
function start(g:GameEngine){for(const id of ['a','b','c','d'])command(g,id,{type:'ready',ready:true},1);command(g,'a',{type:'start'},2);command(g,'a',{type:'nextHand'},3);}

describe('host room management',()=>{
 it('rejects guest kicks and self kicks, and transfers authority immediately',()=>{
  const g=table();expect(command(g,'b',{type:'kick',targetPlayerId:'c'}).ok).toBe(false);
  expect(command(g,'a',{type:'kick',targetPlayerId:'a'}).ok).toBe(false);
  expect(command(g,'a',{type:'transferHost',targetPlayerId:'b'}).ok).toBe(true);
  expect(command(g,'a',{type:'kick',targetPlayerId:'c'}).ok).toBe(false);
  expect(command(g,'b',{type:'kick',targetPlayerId:'c'}).ok).toBe(true);
  expect(g.publicSnapshot(3).players.map(p=>p.id)).toEqual(['a','b','d']);
 });
 it('does not transfer to bots, disconnected players or eliminated spectators',()=>{
  const g=table();g.setConnected('b',false);expect(command(g,'a',{type:'transferHost',targetPlayerId:'b'}).ok).toBe(false);
  g.setConnected('b',true);start(g);expect(command(g,'a',{type:'kick',targetPlayerId:'b'}).ok).toBe(true);
  expect(command(g,'a',{type:'transferHost',targetPlayerId:'b'}).ok).toBe(false);
  const bots=createGame({roomId:'bots',code:'BOTS1'});bots.addPlayer({id:'a',name:'a'},0);bots.addPlayer({id:'bot',name:'bot',bot:true},0);
  expect(command(bots,'a',{type:'transferHost',targetPlayerId:'bot'}).ok).toBe(false);
 });
 it('kicking the current player immediately advances the turn and preserves committed pot chips',()=>{
  const g=table();start(g);const before=g.publicSnapshot(3),target=before.turnPlayerId!;expect(target).not.toBe('a');
  expect(command(g,'a',{type:'kick',targetPlayerId:target}).ok).toBe(true);
  const after=g.publicSnapshot(3);expect(after.turnPlayerId).not.toBe(target);
  expect(after.players.find(p=>p.id===target)).toMatchObject({kicked:true,eliminated:true,folded:true,connected:false});
  expect(after.pot).toBe(before.pot);expect(chipAudit(g.serialize()).ok).toBe(true);
  expect(command(g,target,{type:'bet',action:'check'}).ok).toBe(false);
  expect(()=>restoreGame(g.serialize(),{roomId:'management',code:'ROOM1',random:()=>.37})).not.toThrow();
 });
 it('settles all-in side pots after a kick, then frees kicked seats on rematch',()=>{
  const g=table();start(g);const target=g.publicSnapshot(3).turnPlayerId!;
  expect(command(g,target,{type:'bet',action:'allIn'}).ok).toBe(true);
  const committed=g.publicSnapshot(3).players.find(p=>p.id===target)!.contribution;
  expect(committed).toBeGreaterThan(0);expect(command(g,'a',{type:'kick',targetPlayerId:target}).ok).toBe(true);
  expect(g.publicSnapshot(3).players.find(p=>p.id===target)!.contribution).toBe(committed);
  for(let i=0;i<50&&g.publicSnapshot(3).phase==='playing';i++){
   const s=g.publicSnapshot(3),own=g.privateSnapshot(s.turnPlayerId!,3);
   expect(command(g,s.turnPlayerId!,{type:'bet',action:own.legal.canCheck?'check':'call'}).ok).toBe(true);
  }
  expect(['showdown','finished']).toContain(g.publicSnapshot(3).phase);expect(chipAudit(g.serialize()).ok).toBe(true);
  g.tick(3);const host=g.publicSnapshot(3).hostId!;if(g.publicSnapshot(3).phase!=='finished')command(g,host,{type:'endMatch'});expect(command(g,host,{type:'rematch'}).ok).toBe(true);
  expect(g.publicSnapshot(3).players.some(p=>p.id===target)).toBe(false);
  expect(()=>g.addPlayer({id:'new',name:'new'},4)).not.toThrow();
 });
 it('a market kick does not leave readiness waiting for a removed player',()=>{
  const g=table();for(const id of ['a','b','c','d'])command(g,id,{type:'ready',ready:true},1);command(g,'a',{type:'start'},2);
  for(const id of ['a','b','c'])command(g,id,{type:'ready',ready:true});
  expect(g.publicSnapshot(3).phase).toBe('market');expect(command(g,'a',{type:'kick',targetPlayerId:'d'}).ok).toBe(true);
  expect(g.publicSnapshot(3).phase).toBe('playing');expect(g.publicSnapshot(3).turnPlayerId).not.toBe('d');
 });
});
