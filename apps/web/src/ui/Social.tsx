import {useEffect,useRef,useState} from 'react';
import {connection,type ConnectionState} from '../network';
import {Icon} from './common';
export function RoomSocial({state,open,setOpen}:{state:ConnectionState;open:boolean;setOpen:(v:boolean)=>void}){
 const [text,setText]=useState('');const input=useRef<HTMLInputElement>(null),tail=useRef<HTMLDivElement>(null);
 const openRef=useRef(open);openRef.current=open;
 const textRef=useRef(text);textRef.current=text;
 useEffect(()=>{if(open)input.current?.focus();},[open]);
 useEffect(()=>{tail.current?.scrollIntoView({block:'nearest'});},[state.social.messages.length,open]);
 useEffect(()=>{
  const down=(e:KeyboardEvent)=>{
   if(e.key!=='Enter'||e.repeat)return;
   if(e.target===input.current){if(!textRef.current.trim()){e.preventDefault();setOpen(false);}return;}
   const el=e.target as HTMLElement;if(el.closest('input,textarea,select,[contenteditable="true"]'))return;
   e.preventDefault();setOpen(!openRef.current);
  };
  window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down);
 },[setOpen]);
 const send=()=>{if(!text.trim())return;connection.sendChat(text);setText('');input.current?.focus();};
 return <>
  <button className="chat-launch" onClick={()=>setOpen(!open)}><Icon name="chat" size={15}/> CHAT <kbd>Enter</kbd></button>
  {open&&<section className="room-chat" aria-label="Chat bàn chơi"><header><b>TRÒ CHUYỆN</b><button onClick={()=>setOpen(false)} aria-label="Đóng chat">×</button></header><div className="chat-messages" role="log" aria-live="polite">{!state.social.messages.length&&<p className="chat-empty">{connection.isOnlineRoom?'Nói chuyện với cả bàn. Enter gửi, bỏ trống rồi Enter (hoặc Esc) để đóng.':'Chế độ thử: đối thủ máy không chat.'}</p>}{state.social.messages.map(m=><p key={m.id} className={m.playerId===state.selfId?'mine':''}><b>{m.name}</b><span>{m.text}</span></p>)}<div ref={tail}/></div><form onSubmit={e=>{e.preventDefault();send();}}><input ref={input} aria-label="Tin nhắn" maxLength={300} value={text} placeholder="Nhập tin nhắn…" onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);}}}/><button type="submit" disabled={!text.trim()}>Gửi</button></form></section>}
 </>;
}
