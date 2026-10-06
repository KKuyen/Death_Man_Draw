import {useEffect,useState,useRef} from 'react';
import type {MagicSlot,PrivateSnapshot,PublicPlayer,RoomSnapshot} from '@saloon/protocol';
import {DEFAULTS,getMagic} from '@saloon/content';
import type {CommandInput} from '../network';
import {MagicArt,MagicDetails,PlayingCard,ReserveFace,famOf,kindTag,magicInputs,magicTiming,visGlyph,visLabel} from './common';

/** Plain-language timing for a slot: when it works / why it can't be used right now. */
export function timingText(slot:MagicSlot,snapshot:RoomSnapshot,mine:boolean):string{
  const def=getMagic(slot.magicId);if(!def)return '';
  if(def.kind!=='active')return magicTiming(def);
  if(def.swap&&slot.usable)return def.consumed?'Đổi được ngay. Lá tay cũ bị bỏ luôn, không lấy lại được.':'Đổi được ngay. Lá tay cũ trở về ô dự trữ; không mất lá.';
  if(slot.usable)return def.timing==='anyTime'?'Dùng được bất cứ lúc nào trong ván, kể cả ngoài lượt. Dùng xong là mất.':def.timing==='market'?'Dùng được ngay trong chợ. Dùng xong là mất.':'Dùng được ngay (lượt của bạn). Dùng xong là mất.';
  if(def.timing==='market')return snapshot.phase==='market'?'Dùng trong chợ.':'Chỉ dùng được trong chợ (đầu ván sau).';
  if(snapshot.phase!=='playing')return def.timing==='anyTime'?'Dùng trong ván, bất cứ lúc nào.':'Dùng trong ván, ở lượt của bạn.';
  if(magicInputs(def).board&&snapshot.street==='preflop')return 'Dùng sau flop, ở lượt của bạn.';
  return mine||def.timing==='anyTime'?'Chưa dùng được lúc này.':'Chờ đến lượt của bạn.';
}

/** Five-slot magic tray (own cards only) with a small "use" panel. */
export function MagicTray({snapshot,own,others,send,mine,flash}:{flash?:{magicId:string;n:string}|null;snapshot:RoomSnapshot;own:PrivateSnapshot;others:PublicPlayer[];send:(c:CommandInput)=>void;mine:boolean}){
  const [sel,setSel]=useState<number|null>(null),[pinned,setPinned]=useState(false);const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const close=()=>{setSel(null);setPinned(false);};
  const cancelClose=()=>{if(closeTimer.current)clearTimeout(closeTimer.current);};
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);cancelClose();};},[]);
  const [target,setTarget]=useState('');const [hi,setHi]=useState<0|1>(0);const [bi,setBi]=useState(0);const [mod,setMod]=useState<'gold'|'wild'>('gold');
  const bySlot=new Map(own.magic.map(m=>[m.slot,m]));
  const slot=sel!=null?bySlot.get(sel):undefined;const def=slot?getMagic(slot.magicId):undefined;
  const targets=others.filter(p=>!p.folded&&!p.eliminated&&p.handSize>0);
  useEffect(()=>{if(sel!=null&&!bySlot.get(sel))setSel(null);},[own.magic.map(m=>m.slot+m.magicId).join()]);
  useEffect(()=>{if(!targets.some(p=>p.id===target))setTarget(targets[0]?.id||'');},[targets.map(p=>p.id).join()]);
  const open=slot&&def;
  const use=()=>{
    if(!slot||!def)return;
    if(def.swap){send({type:'swap',slot:slot.slot,handIndex:hi});}
    else send({type:'useMagic',slot:slot.slot,targetPlayerId:magicInputs(def).target?target:undefined,handIndex:magicInputs(def).hand?hi:undefined,boardIndex:magicInputs(def).board?bi:undefined,modifier:magicInputs(def).modifier?mod:undefined});
    close();
  };
  const needsTarget=!!slot&&magicInputs(def).target,needsHand=!!slot&&(magicInputs(def).hand||def?.swap),needsBoard=magicInputs(def).board;
  const canUseNow=!!slot?.usable&&(!needsTarget||!!target)&&(!needsBoard||snapshot.board.length>0);
  const discardable=snapshot.phase==='market';
  return <div className="gx-tray" onMouseEnter={cancelClose} onMouseLeave={()=>{cancelClose();if(!pinned)closeTimer.current=setTimeout(close,220);}} aria-label="Khay bài phép (chỉ bạn thấy)">
    <div className="gx-tray-head"><span className="gx-hud-label">BÀI PHÉP · {own.magic.length}/{DEFAULTS.magicSlots}</span></div>
    <div className="gx-tray-slots">{Array.from({length:DEFAULTS.magicSlots},(_,i)=>{const m=bySlot.get(i);const d=m?getMagic(m.magicId):undefined;
      if(!m||!d)return <div key={i} className="gx-slot empty" aria-label={`Ô ${i+1} trống`}><span>{i+1}</span></div>;
      const ready=m.usable&&d.kind==='active';const fam=famOf(d.kind,d.swap);const glow=flash?.magicId===m.magicId;
      return <div key={i} className="gx-slot-wrap">
        <button type="button" className={`gx-slot kind-${fam} ${ready?'ready':''} ${glow?'fired':''} ${sel===i?'sel':''}`} data-slot={i} data-magic={m.magicId} onMouseEnter={()=>{cancelClose();if(!pinned)setSel(i);}} onFocus={()=>{if(!pinned)setSel(i);}} onClick={()=>{if(pinned&&sel===i)close();else{setSel(i);setPinned(true);}}} aria-expanded={sel===i} aria-label={`${d.name}, ${kindTag[d.kind]}${ready?', dùng được':''}`}>
          {m.spare?<div className="tray-reserve"><ReserveFace card={m.spare}/></div>:<MagicArt magicId={m.magicId} fam={fam}/>}<span className="gx-slot-name">{d.name}</span>
          <em className={`gx-slot-kind kind-pill kind-${fam}`}>{kindTag[d.kind]}</em><span className="gx-slot-visibility">{visGlyph[d.visibility]} {visLabel[d.visibility]}</span><span className="gx-slot-state">{ready?'Dùng được':d.kind==='active'?'Chờ thời điểm':d.kind==='passive_continuous'?'Đang hiệu lực':'Chờ sự kiện'}</span>
        </button>
        <div className="gx-slot-tooltip" role="tooltip"><MagicDetails def={d} heading/></div>
      </div>;})}</div>
    {open&&<div className={`gx-use kind-${famOf(def.kind,def.swap)}`} role="dialog" aria-label={`Lá ${def.name}`}>
      <div className="gx-use-head"><MagicArt magicId={slot.magicId} fam={famOf(def.kind,def.swap)} className="gx-use-art"/><MagicDetails def={def} heading/><button type="button" className="gx-x" onClick={close} aria-label="Đóng">×</button></div>
      <div className="gx-use-content"><p className="magic-effect">{def.description}</p><p className={`gx-use-timing ${slot.usable?'ok':''}`}>{timingText(slot,snapshot,mine)}</p>
      {def.swap&&slot.spare&&<div className="gx-use-row"><span>Lá dự trữ</span><PlayingCard card={slot.spare} small caption/></div>}
      {slot.usable&&needsTarget&&<div className="gx-use-row"><span>Đối thủ</span>{targets.map(p=><button key={p.id} type="button" className={`chip ${target===p.id?'on':''}`} onClick={()=>setTarget(p.id)}>{p.name}</button>)}</div>}
      {slot.usable&&needsHand&&<div className="gx-use-row"><span>{def.swap?'Thay lá':'Lá tay'}</span>{own.hand.map((c,i)=><PlayingCard key={c.id} card={c} small caption selected={hi===i} onClick={()=>setHi(i as 0|1)}/>)}</div>}
      {slot.usable&&magicInputs(def).modifier&&<div className="gx-use-row"><span>Thành</span>{(['gold','wild'] as const).map(m=><button key={m} type="button" className={`chip ${mod===m?'on':''}`} onClick={()=>setMod(m)}>{m==='gold'?'Vàng':'Muôn chất'}</button>)}</div>}
      {slot.usable&&needsBoard&&<div className="gx-use-row"><span>Lá chung</span>{snapshot.board.map((c,i)=><PlayingCard key={c.id} card={c} small selected={bi===i} onClick={()=>setBi(i)}/>)}</div>}
      </div>
      <div className="gx-use-actions">
        {def.kind==='active'&&<button type="button" className="btn gold gx-use-go" disabled={!canUseNow} onClick={use}>{def.swap?'Đổi lá':'Dùng phép'}</button>}
        {discardable&&<button type="button" className="btn outline" onClick={()=>{send({type:'discardMagic',slot:slot.slot});close();}} title="Bỏ lá (không hoàn tiền)">BỎ LÁ</button>}
      </div>
    </div>}
  </div>;
}
