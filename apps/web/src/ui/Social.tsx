import {useEffect,useRef,useState} from 'react';
import {connection,type ConnectionState} from '../network';
import {createPortal} from 'react-dom';
import {Icon} from './common';
export function useChatNotifications(state:ConnectionState,open:boolean){
 const [unread,setUnread]=useState(0),[notice,setNotice]=useState<{name:string;text:string;id:string}|null>(null);
 const seen=useRef<{room:string|undefined;ids:Set<string>}>({room:undefined,ids:new Set()});
 useEffect(()=>{
  const room=state.snapshot?.roomId,messages=state.social.messages;
  if(room!==seen.current.room){seen.current={room,ids:new Set(messages.map(m=>m.id))};setUnread(0);setNotice(null);return;}
  const fresh=messages.filter(m=>!seen.current.ids.has(m.id)&&m.playerId!==state.selfId);
  seen.current.ids=new Set(messages.map(m=>m.id));
  if(open){setUnread(0);setNotice(null);}
  else if(fresh.length){setUnread(n=>n+fresh.length);setNotice(fresh[fresh.length-1]);}
 },[state.social.messages,state.snapshot?.roomId,state.selfId,open]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),4500);return()=>clearTimeout(timer);},[notice]);
 return {unread,notice};
}
export function RoomSocial({state,open,setOpen,unread=0,notice}:{state:ConnectionState;open:boolean;setOpen:(v:boolean)=>void;unread?:number;notice?:{name:string;text:string}|null}){
 const [text,setText]=useState('');const input=useRef<HTMLInputElement>(null),messages=useRef<HTMLDivElement>(null);
 const [viewport,setViewport]=useState<{top:number;height:number}|null>(null);
 const openRef=useRef(open);openRef.current=open;
 const textRef=useRef(text);textRef.current=text;
 useEffect(()=>{if(open&&!matchMedia('(max-width:1000px), (pointer:coarse)').matches)input.current?.focus({preventScroll:true});},[open]);
 useEffect(()=>{const el=messages.current;if(open&&el)el.scrollTop=el.scrollHeight;},[state.social.messages.at(-1)?.id,open]);
 useEffect(()=>{
  if(!open||!matchMedia('(max-width:1000px), (pointer:coarse)').matches){setViewport(null);return;}
  const vv=window.visualViewport,body=document.body,app=document.querySelector<HTMLElement>('.app');
  const original={position:body.style.position,overflow:body.style.overflow,width:body.style.width,top:body.style.top,height:app?.style.height||''};
  const scroll=window.scrollY;
  if(app)app.style.height=`${app.getBoundingClientRect().height}px`;
  body.style.position='fixed';body.style.overflow='hidden';body.style.width='100%';body.style.top=`-${scroll}px`;
  const update=()=>setViewport({top:vv?.offsetTop||0,height:vv?.height||innerHeight});update();
  vv?.addEventListener('resize',update);vv?.addEventListener('scroll',update);window.addEventListener('resize',update);
  return()=>{input.current?.blur();vv?.removeEventListener('resize',update);vv?.removeEventListener('scroll',update);window.removeEventListener('resize',update);Object.assign(body.style,{position:original.position,overflow:original.overflow,width:original.width,top:original.top});if(app)app.style.height=original.height;window.scrollTo(0,scroll);};
 },[open]);
 useEffect(()=>{
  const down=(e:KeyboardEvent)=>{
   if(e.key!=='Enter'||e.repeat)return;
   if(e.target===input.current){if(!textRef.current.trim()){e.preventDefault();setOpen(false);}return;}
   const el=e.target as HTMLElement;if(el.closest('input,textarea,select,button,a,[role="dialog"],[contenteditable="true"]'))return;
   e.preventDefault();setOpen(!openRef.current);
  };
  window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down);
 },[setOpen]);
 const send=()=>{if(!text.trim())return;connection.sendChat(text);setText('');input.current?.focus({preventScroll:true});};
 return <>

  {notice&&createPortal(<button className="chat-notice" onClick={()=>setOpen(true)} aria-label={`Tin nhắn mới từ ${notice.name}`}><Icon name="chat" size={18}/><span><b>{notice.name}</b><span>{notice.text}</span></span></button>,document.body)}
  {open&&createPortal(<section className="room-chat" role="dialog" style={viewport?{top:`${viewport.top+8}px`,height:`${Math.min(360,Math.max(120,viewport.height-16))}px`,bottom:'auto'}:undefined} aria-label="Chat bàn chơi"><header><b>Chat</b><button onClick={()=>setOpen(false)} aria-label="Đóng chat">×</button></header><div ref={messages} className="chat-messages" role="log" aria-live="polite">{!state.social.messages.length&&<p className="chat-empty">{connection.isOnlineRoom?'Chưa có tin nhắn.':'Đối thủ máy không chat.'}</p>}{state.social.messages.map(m=><p key={m.id} className={m.playerId===state.selfId?'mine':''}><b>{m.name}</b><span>{m.text}</span></p>)}</div><form onSubmit={e=>{e.preventDefault();send();}}><input ref={input} aria-label="Tin nhắn" name="message" autoComplete="off" maxLength={300} value={text} placeholder="Nhập tin nhắn…" onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);}}}/><button type="submit" disabled={!text.trim()}>Gửi</button></form></section>,document.body)}
 </>;
}
