import {useEffect,useRef,useState} from 'react';
import type {GameEvent,PeekEntry,RoomSnapshot} from '@saloon/protocol';
import {getMagic} from '@saloon/content';
import {MagicArt,MagicDetails,PlayingCard,famOf} from './common';

interface T{id:string;text:string;tone:'public'|'private';magicId?:string}
/** Turns game events into short toasts. Public banners follow authoritative magicUsed events, including decoy IDs. Visibility metadata is never shown here. */
export function toastFor(e:GameEvent,snapshot:RoomSnapshot|null,selfId:string):T|null{
  const name=(id?:string)=>snapshot?.players.find(p=>p.id===id)?.name||'Ai đó';
  const card=e.magicId?getMagic(e.magicId)?.name:undefined;
  if(e.type==='magicUsed'&&!e.to){
    // Only the server decides which use is public.
    const who=e.playerId===selfId?'Bạn':name(e.playerId);const tgt=e.targetPlayerId?(e.targetPlayerId===selfId?'bạn':name(e.targetPlayerId)):'';
    return {id:e.id,tone:'public',magicId:e.magicId,text:tgt?`${who} dùng ${card||'một lá phép'} lên ${tgt}`:`${who} dùng ${card||'một lá phép'}`};
  }
  if(e.to&&e.to!==selfId)return null;
  if(e.type==='magicHint')return {id:e.id,tone:'private',text:e.text||(e.cue==='hexed'?'Bạn cảm thấy có thứ gì đó vừa động vào bài của bạn…':e.cue==='sensed'?'Bạn cảm thấy có ai đó vừa dò xét phép của bạn…':'Bạn cảm thấy có ai đó đang nhìn bài của bạn…')};
  if(e.type==='purchase')return {id:e.id,tone:'private',text:e.text||`Đã mua ${card||'một lá phép'}`};
  if(e.type==='use')return {id:e.id,tone:'private',text:e.text||`Đã dùng ${card||'một lá phép'}`};
  if(e.type==='notice'&&e.text)return {id:e.id,tone:'private',text:e.text};
  return null;
}
export function Toasts({event,snapshot,selfId,publicOnly=false}:{event:GameEvent|null;snapshot:RoomSnapshot|null;selfId:string;publicOnly?:boolean}){
  const [list,setList]=useState<T[]>([]);const timers=useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(()=>()=>{timers.current.forEach(clearTimeout);},[]);
  useEffect(()=>{if(!event)return;const t=toastFor(event,snapshot,selfId);if(!t||publicOnly&&t.tone!=='public')return;setList(l=>[...l.filter(x=>x.id!==t.id),t].slice(-3));const h=setTimeout(()=>{setList(l=>l.filter(x=>x.id!==t.id));timers.current.delete(h);},5000);timers.current.add(h);},[event?.id,publicOnly]);
  return <div className="gx-toasts" aria-live="polite">{list.filter(t=>!publicOnly||t.tone==='public').map(t=>t.tone==='public'
    ?<div key={t.id} className="gx-toast public gx-magic-banner" role="alert">{t.magicId&&<MagicArt magicId={t.magicId} fam={famOf(getMagic(t.magicId)?.kind||'active',getMagic(t.magicId)?.swap)} className="gx-banner-art"/>}<div><b>{t.text}</b>{t.magicId&&getMagic(t.magicId)&&<MagicDetails def={getMagic(t.magicId)!} owner={false}/>}</div></div>
    :<div key={t.id} className="gx-toast private"><span>🔒</span>{t.text}</div>)}</div>;
}

export function peekIsCrystal(peek:PeekEntry){
  return peek.source?getMagic(peek.source)?.timing==='anyTime':/cầu|crystal|ball/i.test(peek.label);
}
export function peekNote(peek:PeekEntry,snapshot?:RoomSnapshot){
  if(peekIsCrystal(peek)){
    const changed=!!snapshot&&(peek.handId!==snapshot.handId||!!peek.boardIds&&(peek.boardIds.length!==snapshot.board.length||peek.boardIds.some((id,i)=>id!==snapshot.board[i]?.id)));
    return changed?'Bài chung đã đổi từ lúc soi; lá kế tiếp có thể đã thay đổi.':'Lá trên đỉnh bộ bài tại lúc soi; thông tin có thể đổi khi bài được chia hoặc thay.';
  }
  return 'Thông tin tại lúc soi, chưa chắc là bài thật — đối thủ có thể có phép đánh lừa hoặc đã đổi bài.';
}

/** Clear modal for what the actor learned from a peek / force-reveal. Result comes from the server only and may be false (deception), so it is never labelled verified. */
export function PeekModal({peeks,snapshot}:{peeks:PeekEntry[];snapshot?:RoomSnapshot}){
  const [shown,setShown]=useState<typeof peeks[number]|null>(null);const seen=useRef<Set<string>|null>(null);
  useEffect(()=>{
    const keys=peeks.map((p,i)=>JSON.stringify([p.handId,i,p.label,p.card,p.magic,p.text]));
    if(!peeks.length){seen.current=new Set();setShown(null);return;}
    if(seen.current===null){seen.current=new Set(keys);return;}
    const fresh=keys.findIndex(k=>!seen.current!.has(k));keys.forEach(k=>seen.current!.add(k));
    if(fresh>=0)setShown(peeks[fresh]);
  },[JSON.stringify(peeks)]);
  if(!shown)return null;
  const crystal=peekIsCrystal(shown);
  const magic=shown.magic?.magicId?getMagic(shown.magic.magicId):undefined;
  return <div className="gx-peek-modal" role="dialog" aria-modal="true" aria-label="Kết quả phép"><div className="gx-peek-card">
    <span className="eyebrow">KẾT QUẢ PHÉP</span><h3>{crystal?'Lá trên cùng bộ bài:':'Bạn thấy:'}</h3><p className="gx-peek-label">{shown.label}</p>
    {shown.card&&<div className="gx-peek-cards"><PlayingCard card={shown.card} big caption/></div>}
    {shown.magic&&(magic?<><div className="gx-peek-cards"><MagicArt magicId={magic.id} fam={famOf(magic.kind,magic.swap)} className="gx-peek-art"/></div><MagicDetails def={magic} owner={false} heading/></>:<p className="gx-peek-text">Họ không giữ lá phép nào.</p>)}
    {shown.text&&!shown.magic&&<p className="gx-peek-text">{shown.text}</p>}
    <p className="gx-peek-note">{peekNote(shown,snapshot)}</p>
    <button type="button" className="btn gold" onClick={()=>setShown(null)}>ĐÃ XEM</button></div></div>;
}
