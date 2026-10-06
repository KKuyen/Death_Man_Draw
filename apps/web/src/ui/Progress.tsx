import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import type {LogEntry,PrivateSnapshot,PublicPlayer,RoomSnapshot} from '@saloon/protocol';
import {DEFAULTS,getMagic} from '@saloon/content';
import {Icon,MagicDetails,fmt} from './common';
import {PlayersList} from './Players';
import {useDialog} from './useDialog';
import type {CommandInput} from '../network';

/** Where are we? Chợ -> Preflop -> Flop -> Turn -> River -> Showdown (current highlighted, done ticked, next named). */
const STEPS=['Chợ','Preflop','Flop','Turn','River','Showdown'] as const;
export function stepIndex(s:RoomSnapshot):number{
  switch(s.phase){
    case 'lobby':return -1;
    case 'market':return 0;
    case 'playing':return 1+['preflop','flop','turn','river'].indexOf(s.street);
    default:return 5;
  }
}
export function PhaseStepper({snapshot}:{snapshot:RoomSnapshot}){
  const cur=stepIndex(snapshot);const next=STEPS[cur+1];
  return <nav className="gx-stepper" aria-label="Tiến trình ván">
    <ol>{STEPS.map((label,i)=><li key={label} className={i<cur?'done':i===cur?'now':'todo'} aria-current={i===cur?'step':undefined}><span className="gx-step-dot">{i<cur?'✓':i+1}</span><span className="gx-step-name">{label}</span></li>)}</ol>
    <div className="gx-step-next">{snapshot.phase==='lobby'?'Chờ mọi người sẵn sàng':next?`Tiếp theo: ${next}`:'Cuối ván — rồi sang chợ ván sau'}</div>
  </nav>;
}

/** Match-level info: hand number, blinds (and the next raise), players alive, pot. */
export function MatchStrip({snapshot}:{snapshot:RoomSnapshot}){
  const alive=snapshot.players.filter(p=>!p.eliminated).length;
  const nb=snapshot.nextBlinds,n=snapshot.nextBlindInHands;
  return <div className="gx-pot gx-match" aria-label="Thông tin trận">
    <span className="gx-m"><i>Pot</i><strong><small>$</small>{fmt(snapshot.pot)}</strong></span>
    <span className="gx-m"><i>Ván</i><b>{snapshot.handId}</b></span>
    <span className="gx-m"><i>Blind</i><b>{fmt(snapshot.smallBlind)}/{fmt(snapshot.bigBlind)}</b>{nb&&n!=null&&<em title="Blind tăng theo số ván">tăng sau {n} ván → {fmt(nb.smallBlind)}/{fmt(nb.bigBlind)}</em>}</span>
    <span className="gx-m"><i>Còn chơi</i><b>{alive}/{snapshot.players.filter(p=>!p.kicked).length}</b></span>
  </div>;
}

/** Whose turn is it: avatar-less banner with a countdown ring and a plain-language instruction. */
export function TurnBanner({snapshot,own,selfId,seconds}:{snapshot:RoomSnapshot;own:PrivateSnapshot|null;selfId:string;seconds:number}){
  const me=snapshot.players.find(p=>p.id===selfId);
  let who='',line='',total=0,mine=false;
  if(snapshot.phase==='playing'){
    total=DEFAULTS.turnMs/1000;
    const t=snapshot.players.find(p=>p.id===snapshot.turnPlayerId);mine=t?.id===selfId;
    if(me?.folded){who='Bạn đã bỏ bài';line='';total=0;}
    else if(mine&&own){who='Đến lượt bạn';line='';}
    else if(t){who=`Lượt của ${t.name}`;line='';}
    else{who='Đang chia bài';line='';total=0;}
  }else if(snapshot.phase==='market'){who='Chợ bài phép';line='';total=DEFAULTS.marketMs/1000;}
  else if(snapshot.phase==='showdown'){who='Lật bài';line='';total=DEFAULTS.showdownMs/1000;}
  else return null;
  const R=19,C=2*Math.PI*R,frac=total?Math.max(0,Math.min(1,seconds/total)):0;
  return <div className={`gx-turn ${mine?'mine':''}`} role="status">
    {total>0&&<svg className="gx-ring" width="46" height="46" viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r={R} className="bg"/><circle cx="23" cy="23" r={R} className="fg" style={{strokeDasharray:C,strokeDashoffset:C*(1-frac),stroke:frac<.25?'#e0916b':undefined}}/><text x="23" y="27" textAnchor="middle">{seconds}</text></svg>}
    <div><b>{who}</b>{line&&<span>{line}</span>}</div>
  </div>;
}

/** Humanise engine log lines: "you" for own name, $ amounts, own events highlighted. */
export function humanize(text:string,myName:string){
  let t=text.replace(/\((\d[\d.]*)\)/g,'$$$1');
  if(myName)t=t.split(myName).join('Bạn');
  return t;
}
/** A log line that names a public magic card: hover to recall what it does, without digging back through the catalog. */
function LogRow({l,className,children}:{l:LogEntry;className:string;children:ReactNode}){
  const def=l.magicId?getMagic(l.magicId):undefined;
  const [tip,setTip]=useState<{left:number;top:number;above:boolean}|null>(null);const anchor=useRef<HTMLDivElement>(null);
  const show=()=>{if(!def)return;const r=anchor.current?.getBoundingClientRect();if(!r)return;const above=r.top>160;setTip({left:Math.max(8,Math.min(window.innerWidth-328,r.left)),top:above?r.top-8:r.bottom+8,above});};
  return <div ref={anchor} className={className} onMouseEnter={show} onMouseLeave={()=>setTip(null)} tabIndex={def?0:undefined} onFocus={show} onBlur={()=>setTip(null)}>
    {children}
    {tip&&def&&createPortal(<div className="log-magic-tooltip" style={{left:tip.left,top:tip.top,transform:tip.above?'translateY(-100%)':'none'}} role="tooltip"><MagicDetails def={def} owner={false} heading/></div>,document.body)}
  </div>;
}
export function EventLog({log,priv=[],me,max=8}:{log:LogEntry[];priv?:LogEntry[];me?:PublicPlayer;max?:number}){
  const mine=(text:string)=>!!me&&text.includes(me.name);
  const rows=[...log.map(l=>({l,own:false})),...priv.map(l=>({l,own:true}))].sort((a,b)=>a.l.at-b.l.at).slice(-max);
  return <div className="table-feed gx-log" aria-label="Diễn biến gần đây">{rows.map(({l,own})=><LogRow key={(own?'p':'')+l.id} l={l} className={`feed-${l.kind} ${own||mine(l.text)?'own':''} ${l.magicId?'has-tip':''}`}><span>{own?'🔒':l.kind==='bet'?'●':l.kind==='win'?'★':l.kind==='magic'?'✦':'·'}</span>{humanize(l.text,me?.name||'')}</LogRow>)}</div>;
}

/** Short banner at phase / street changes. */
export function usePhaseBanner(snapshot:RoomSnapshot|null,seconds:number){
  const [text,setText]=useState('');const prev=useRef('');const timer=useRef(0);
  const key=snapshot?`${snapshot.phase}|${snapshot.handId}|${snapshot.phase==='playing'?snapshot.street:''}`:'';
  useEffect(()=>{
    if(!snapshot||key===prev.current){return;}
    const before=prev.current;prev.current=key;if(!before)return;
    const [ph,hand,street]=key.split('|'),[bph,bhand]=before.split('|');
    let t='';
    if(ph==='playing'&&hand!==bhand)t=`Bắt đầu ván ${hand}`;
    else if(ph==='playing'&&street==='flop')t='FLOP — ba lá chung';
    else if(ph==='playing'&&street==='turn')t='TURN — lá thứ tư';
    else if(ph==='playing'&&street==='river')t='RIVER — lá cuối';
    else if(ph==='showdown')t='LẬT BÀI';
    else if(ph==='market')t=`Chợ bài phép — ${DEFAULTS.marketMs/1000}s`;
    else if(ph==='finished')t='Hạ màn';
    if(!t||bph===ph&&ph!=='playing')return;
    setText(t);clearTimeout(timer.current);timer.current=window.setTimeout(()=>setText(''),2400);
  },[key]);
  return text;
}

const COACH=[
  {icon:'cards',title:'Mục tiêu',body:'Texas Hold’em tại saloon: ghép bộ năm lá mạnh nhất từ 2 lá riêng và 5 lá chung để thắng pot. Thanh tiến trình trên cùng cho biết đang ở bước nào: Chợ, Preflop, Flop, Turn, River, Showdown.'},
  {icon:'coin',title:'Cách hành động',body:'Đến lượt bạn, khung hành động chuyển xanh. Chọn Bỏ bài, Check/Theo, Tố hoặc All-in ở dưới bàn.'},
  {icon:'bag',title:'Chợ bài phép',body:`Chợ riêng có 4 ô, gồm bài phép và bài tây dự trữ. Lô hàng giữ ${DEFAULTS.marketRefreshHands} ván; lá đã mua không bù lại. Khay giữ tối đa 5 lá. Chọn một lá để đọc hiệu ứng và cách dùng. Đối thủ không thấy bạn mua gì.`},
  {icon:'eye',title:'Xem bài',body:'Bài chung nằm ở thanh trên bàn, bài của bạn ở khay phía dưới. Lá bài có thể mang dấu: Vàng, Muôn chất, Hạnh vận (buff) hoặc Bẫy, Nguyền (debuff). Phím S chỉ để cúi xuống nhìn 3D cho vui.'}
] as const;
/** Toggleable player list with host management, also accessible on mobile. */
export function RosterPeek({snapshot,selfId,send,onClose,mutedPlayers,onMute}:{snapshot:RoomSnapshot;selfId:string;send:(c:CommandInput)=>void;onClose:()=>void;mutedPlayers:string[];onMute:(id:string,muted:boolean)=>void}){
  const root=useRef<HTMLDivElement>(null);useDialog(root,onClose);
  return createPortal(<div className="gx-roster-peek"><button type="button" className="surface-backdrop" onClick={onClose} aria-label="Đóng danh sách người chơi" tabIndex={-1}/><div ref={root} className="gx-roster-peek-card" role="dialog" aria-modal="true" aria-label="Người chơi" tabIndex={-1}>
    <header className="surface-heading"><h2>Người chơi</h2><button type="button" onClick={onClose} aria-label="Đóng danh sách"><Icon name="close"/></button></header>
    <PlayersList snapshot={snapshot} selfId={selfId} send={send} mutedPlayers={mutedPlayers} onMute={onMute}/>
  </div></div>,document.body);
}
export function Coach({onClose}:{onClose:()=>void}){
  const [i,setI]=useState(0);const step=COACH[i];const last=i===COACH.length-1;
  const root=useRef<HTMLDivElement>(null);useDialog(root,onClose);
  return <div className="gx-coach"><div ref={root} className="gx-coach-card" role="dialog" aria-modal="true" aria-label="Hướng dẫn nhanh" tabIndex={-1}>
    <span className="eyebrow">HƯỚNG DẪN NHANH · {i+1}/{COACH.length}</span>
    <h2><Icon name={step.icon} size={26}/> {step.title}</h2><p>{step.body}</p>
    <div className="gx-coach-dots">{COACH.map((_,k)=><i key={k} className={k===i?'on':''}/>)}</div>
    <div className="dialog-actions"><button className="btn outline" onClick={onClose}>Bỏ qua</button>{i>0&&<button className="btn outline" onClick={()=>setI(i-1)}>Quay lại</button>}<button className="btn gold" onClick={()=>last?onClose():setI(i+1)}>{last?'Bắt đầu':'Tiếp'}</button></div>
  </div></div>;
}
