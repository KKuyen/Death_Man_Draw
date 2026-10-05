import {useEffect,useRef} from 'react';
import type {PublicPlayer,RoomSnapshot} from '@saloon/protocol';
import type {SaloonScene} from '../scene';
import {fmt,Icon,PlayingCard} from './common';

const PLATE_W=196,MIN_GAP=12,TOP_MIN=186;

function statusOf(p:PublicPlayer,turn:boolean){
  if(p.eliminated)return {text:'ĐÃ BỊ LOẠI',tone:'out'};
  if(!p.connected&&!p.bot)return {text:'MẤT KẾT NỐI',tone:'out'};
  if(p.folded)return {text:'ĐÃ BỎ BÀI',tone:'out'};
  if(p.allIn)return {text:'ALL-IN',tone:'hot'};
  if(turn)return {text:p.bet?`ĐANG NGHĨ · cược $${fmt(p.bet)}`:'ĐANG NGHĨ…',tone:'turn'};
  if(p.bet)return {text:`ĐÃ CƯỢC $${fmt(p.bet)}`,tone:'bet'};
  return {text:'ĐANG QUAN SÁT',tone:'idle'};
}
/** Opponent nameplate: name, public status/bet and turn timer. Never shows wallet, magic cards or purchases. */
function Plate({player,turn,secondsLeft,micOn,isHost,plateRef}:{player:PublicPlayer;turn:boolean;secondsLeft:number;micOn:boolean;isHost:boolean;plateRef:(el:HTMLDivElement|null)=>void}){
  const st=statusOf(player,turn);
  return <div ref={plateRef} className={`gx-plate tone-${st.tone} ${turn?'is-turn':''}`} style={{width:PLATE_W}}>
    <div className="gx-plate-head"><span className="gx-seat">0{player.seat+1}</span><strong>{player.name}</strong>{isHost&&<em className="host-tag" title="Chủ phòng">CHỦ</em>}{!player.bot&&<span className={`gx-plate-mic ${micOn?'on':''}`} title={micOn?'Mic bật':'Mic tắt'}><Icon name={micOn?'mic':'micOff'} size={12}/></span>}{player.bot&&<small>MÁY</small>}</div>
    <div className="gx-plate-status">{st.text}{turn&&<b>{secondsLeft}s</b>}</div>
    {player.revealedCards.length>0&&<div className="gx-revealed" title="Lá bị ép lật công khai"><span>LỘ</span>{player.revealedCards.map(c=><PlayingCard key={c.id} card={c} small/>)}</div>}
  </div>;
}
export function Nameplates({snapshot,selfId,scene,sceneTick,seconds,microphones={}}:{snapshot:RoomSnapshot;selfId:string;scene:SaloonScene|null;sceneTick:number;seconds:number;microphones?:Record<string,boolean>}){
  const others=snapshot.players.filter(p=>p.id!==selfId);
  const refs=useRef(new Map<string,HTMLDivElement|null>());
  useEffect(()=>{
    let raf=0;
    const run=()=>{
      const host=document.querySelector('.app') as HTMLElement|null;const W=host?.clientWidth||innerWidth,H=host?.clientHeight||innerHeight;
      // plates must not hide under the docked dialog / market header on the left
      const dock=document.querySelector('.gx-dialog,.gx-market-head') as HTMLElement|null;const minLeft=dock?dock.getBoundingClientRect().right+12:8;
      const board=document.querySelector('.gx-board') as HTMLElement|null;const topMin=board?Math.max(TOP_MIN,board.getBoundingClientRect().bottom+10):TOP_MIN;
      const items=others.map(p=>{const pos=scene?scene.seatScreen(p.seat):{x:20+p.seat*20,y:20};return {id:p.id,left:pos.x/100*W-PLATE_W/2,top:Math.max(topMin,Math.min(H*.5,pos.y/100*H))};}).sort((a,b)=>a.left-b.left);
      // keep plates from overlapping each other: sweep left to right, pushing right by the minimum gap
      if(items.length)items[0].left=Math.max(items[0].left,minLeft);
      for(let i=1;i<items.length;i++)items[i].left=Math.max(items[i].left,items[i-1].left+PLATE_W+MIN_GAP);
      const overflow=items.length?items[items.length-1].left+PLATE_W+8-W:0;if(overflow>0)for(const it of items)it.left-=overflow;
      for(const it of items){const el=refs.current.get(it.id);if(!el)continue;const l=`${Math.round(Math.max(minLeft,it.left))}px`,t=`${Math.round(it.top)}px`;if(el.style.left!==l)el.style.left=l;if(el.style.top!==t)el.style.top=t;} // rounded + only on change: no sub-pixel jitter
      raf=requestAnimationFrame(run);
    };
    run();return()=>cancelAnimationFrame(raf);
  },[scene,sceneTick,others.map(p=>p.id+p.seat).join()]);
  return <div className="gx-plates">{others.map(p=><Plate key={p.id} player={p} turn={snapshot.turnPlayerId===p.id&&snapshot.phase==='playing'} secondsLeft={seconds} micOn={!!microphones[p.id]} isHost={p.id===snapshot.hostId} plateRef={el=>{refs.current.set(p.id,el);}}/>)}</div>;
}
