import {useEffect,useRef} from 'react';
import type {PublicPlayer,RoomSnapshot} from '@saloon/protocol';
import type {SaloonScene} from '../scene';
import {fmt,Icon,PlayingCard} from './common';

const PLATE_W=196,MIN_GAP=12,TOP_MIN=186;

export function statusOf(p:PublicPlayer,turn:boolean){
  if(p.eliminated)return {text:'Quan sát',tone:'out'};
  if(!p.connected&&!p.bot)return {text:'Mất kết nối',tone:'out'};
  if(p.folded)return {text:'Đã bỏ bài',tone:'out'};
  if(p.allIn)return {text:'All-in',tone:'hot'};
  if(turn)return {text:'Đến lượt',tone:'turn'};
  if(p.bet)return {text:`Cược $${fmt(p.bet)}`,tone:'bet'};
  return {text:'Chờ lượt',tone:'idle'};
}
/** Opponent nameplate: name, public status/bet and turn timer. Never shows wallet, magic cards or purchases. */
function Plate({player,turn,secondsLeft,micOn,isHost,plateRef}:{player:PublicPlayer;turn:boolean;secondsLeft:number;micOn:boolean;isHost:boolean;plateRef:(el:HTMLDivElement|null)=>void}){
  const st=statusOf(player,turn);
  return <div ref={plateRef} className={`gx-plate tone-${st.tone} ${turn?'is-turn':''}`} style={{width:PLATE_W}}>
    <div className="gx-plate-head"><span className="gx-seat">0{player.seat+1}</span><strong title={player.name}>{player.name}</strong>{isHost&&<em className="host-tag" title="Chủ phòng">CHỦ</em>}{!player.bot&&<span className={`gx-plate-mic ${micOn?'on':''}`} title={micOn?'Mic bật':'Mic tắt'}><Icon name={micOn?'mic':'micOff'} size={12}/></span>}{player.bot&&<small>MÁY</small>}</div>
    <div className="gx-plate-status">{st.text}{turn&&<b>{secondsLeft}s</b>}</div>
    {player.revealedCards.length>0&&<div className="gx-revealed" title="Lá bị ép lật công khai"><span>LỘ</span>{player.revealedCards.map(c=><PlayingCard key={c.id} card={c} small/>)}</div>}
  </div>;
}
export function Nameplates({snapshot,selfId,scene,sceneTick,seconds,microphones={}}:{snapshot:RoomSnapshot;selfId:string;scene:SaloonScene|null;sceneTick:number;seconds:number;microphones?:Record<string,boolean>}){
  const others=snapshot.players.filter(p=>p.id!==selfId&&!p.kicked);
  const refs=useRef(new Map<string,HTMLDivElement|null>());
  useEffect(()=>{
    let raf=0;
    const compact=window.matchMedia('(max-width: 1000px), (max-height: 500px) and (pointer: coarse)');
    const run=()=>{
      // On phones, opponents occupy a DOM grid instead of projected 3D coordinates.
      if(compact.matches){for(const el of refs.current.values()){if(el){el.style.removeProperty('left');el.style.removeProperty('top');}}return;}
      const host=document.querySelector('.app') as HTMLElement|null;const fullW=host?.clientWidth||innerWidth,H=host?.clientHeight||innerHeight;const W=fullW-(fullW>1000?(host?.classList.contains('has-chat')?388:232):0);
      // plates must not hide under the docked dialog / market header on the left
      const dock=document.querySelector('.gx-dialog,.gx-market-head') as HTMLElement|null;const minLeft=dock?dock.getBoundingClientRect().right+12:8;
      const board=document.querySelector('.gx-board') as HTMLElement|null;const topMin=board?Math.max(TOP_MIN,board.getBoundingClientRect().bottom+10):TOP_MIN;
      const plateW=Math.max(120,Math.min(PLATE_W,(W-minLeft-8-MIN_GAP*Math.max(0,others.length-1))/Math.max(1,others.length)));
      const items=others.map(p=>{const pos=scene?scene.seatScreen(p.seat):{x:20+p.seat*20,y:20};return {id:p.id,left:pos.x/100*W-plateW/2,top:Math.max(topMin,Math.min(H*.5,pos.y/100*H))};}).sort((a,b)=>a.left-b.left);
      // keep plates from overlapping each other: sweep left to right, pushing right by the minimum gap
      if(items.length)items[0].left=Math.max(items[0].left,minLeft);
      for(let i=1;i<items.length;i++)items[i].left=Math.max(items[i].left,items[i-1].left+plateW+MIN_GAP);
      const overflow=items.length?items[items.length-1].left+plateW+8-W:0;if(overflow>0)for(const it of items)it.left-=overflow;
      for(const it of items){const el=refs.current.get(it.id);if(!el)continue;const l=`${Math.round(Math.max(minLeft,it.left))}px`,t=`${Math.round(it.top)}px`;el.style.width=`${plateW}px`;if(el.style.left!==l)el.style.left=l;if(el.style.top!==t)el.style.top=t;} // rounded + only on change: no sub-pixel jitter
      raf=requestAnimationFrame(run);
    };
    const resize=()=>{cancelAnimationFrame(raf);run();};
    compact.addEventListener('change',resize);
    run();return()=>{cancelAnimationFrame(raf);compact.removeEventListener('change',resize);};
  },[scene,sceneTick,others.map(p=>p.id+p.seat).join()]);
  return <div className="gx-plates">{others.map(p=><Plate key={p.id} player={p} turn={snapshot.turnPlayerId===p.id&&snapshot.phase==='playing'} secondsLeft={seconds} micOn={!!microphones[p.id]} isHost={p.id===snapshot.hostId} plateRef={el=>{refs.current.set(p.id,el);}}/>)}</div>;
}
