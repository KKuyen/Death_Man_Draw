import {useState,useRef,useEffect} from 'react';
import {createPortal} from 'react-dom';
import type {Card,CardModifier,CharacterId,MagicDefinition,MagicKind,TriggerName,Visibility} from '@saloon/protocol';
import {isDebuff,modifierLabel,rankLabel,suitSymbol} from '@saloon/protocol';

export const characters:{id:CharacterId;name:string;label:string;glyph:string;color:string}[]=[
  {id:'coyote',name:'COYOTE',label:'Chó đồng cỏ',glyph:'♠',color:'#c4814e'},
  {id:'lynx',name:'LYNX',label:'Linh miêu',glyph:'♦',color:'#9b8d70'},
  {id:'badger',name:'BADGER',label:'Lửng',glyph:'♣',color:'#788772'},
  {id:'rabbit',name:'RABBIT',label:'Thỏ',glyph:'♥',color:'#c1a891'}
];
export const fmt=(v:number)=>new Intl.NumberFormat('vi-VN').format(v);
export const streetName={preflop:'PRE-FLOP',flop:'FLOP',turn:'TURN',river:'RIVER'} as const;

const paths:Record<string,string>={mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',micOff:'m3 3 18 18M9 5a3 3 0 0 1 6 0v7M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',chat:'M21 15a3 3 0 0 1-3 3H8l-6 4V5a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v10M6 7h11M6 12h8',crown:'m2 6 5 4 5-7 5 7 5-4-3 14H5L2 6ZM6 17h12',settings:'M9.5 3h5l.6 2.4 2 1.2 2.4-.7 2.5 4.3-1.8 1.8v2.4l1.8 1.8-2.5 4.3-2.4-.7-2 1.2-.6 2.4h-5l-.6-2.4-2-1.2-2.4.7L1.5 16l1.8-1.8v-2.4L1.5 10 4 5.7l2.4.7 2-1.2L9.5 3ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',chevron:'m9 5 7 7-7 7',close:'m6 6 12 12M18 6 6 18',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',bag:'M6 7h12l2 14H4L6 7ZM9 7V5a3 3 0 0 1 6 0v2',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',sound:'m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14',help:'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',exit:'M9 21H3V3h6M13 8l5 4-5 4M7 12h13',coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v12M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9',hand:'M8 13V6a1.5 1.5 0 0 1 3 0v6M11 12V4a1.5 1.5 0 0 1 3 0v8M14 12V5a1.5 1.5 0 0 1 3 0v7M17 12V8a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-12 0l-4-4a2 2 0 0 1 3-2l1 2',down:'M12 5v14m0 0 6-6m-6 6-6-6',cards:'M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',check:'m5 12 5 5 9-10',star:'m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',copy:'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'};
export function Icon({name,size=18}:{name:string;size?:number}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.chevron}/></svg>;
}
export const MOD_GLYPH:Record<CardModifier,string>={gold:'★',wild:'◈',lucky:'✿',trapRank:'⊘',trapSuit:'⊗',cursed:'☠'};
export const MOD_INFO:Record<CardModifier,string>={
  gold:'Vàng: thắng với 2 lá Vàng trong 5 lá tốt nhất thì được thưởng tiền.',
  wild:'Muôn chất: tính là mọi chất khi ghép thùng.',
  lucky:'Hạnh vận: thắng với lá này thì thưởng thêm 1 BB.',
  trapRank:'Bẫy số: lá này không được tính vào sảnh (vẫn tính đôi, ba, tứ).',
  trapSuit:'Bẫy chất: lá này không được tính vào thùng.',
  cursed:'Nguyền: thắng với lá này thì bị trừ 1 BB.'};
/** Playing card face. Modifiers show as a coloured frame + badge (and an optional caption) so buffs/debuffs read at a glance. */
export function PlayingCard({card,selected,onClick,small=false,big=false,caption=false}:{card?:Card;selected?:boolean;onClick?:()=>void;small?:boolean;big?:boolean;caption?:boolean}){
  const [tip,setTip]=useState<{left:number;top:number}|null>(null);const anchor=useRef<HTMLSpanElement>(null);
  const showTip=()=>{if(!card?.modifiers?.length)return;const r=anchor.current?.getBoundingClientRect();if(r)setTip({left:Math.max(8,Math.min(window.innerWidth-288,r.left+r.width/2-140)),top:r.top>140?r.top-110:r.bottom+12});};
  const red=card&&(card.suit==='H'||card.suit==='D');const mod=card?.modifiers?.[0];
  const label=card?`${rankLabel(card.rank)}${suitSymbol(card.suit)}${mod?` · ${modifierLabel(mod)}`:''}`:'Bài úp';
  return <span ref={anchor} className="card-with-tip" onMouseEnter={showTip} onMouseLeave={()=>setTip(null)} onFocus={showTip} onBlur={()=>setTip(null)}><button type="button" tabIndex={onClick||mod?0:-1} onClick={onClick} data-card={card?.id} data-mod={mod||undefined}
    className={`playing-card ${card?'':'card-back'} ${red?'red':''} ${selected?'selected':''} ${small?'small':''} ${big?'big':''} ${mod?`mod mod-${mod} ${isDebuff(mod)?'debuff':'buff'}`:''}`} aria-label={label}>
    {card?<><span className="card-corner">{rankLabel(card.rank)}<small>{suitSymbol(card.suit)}</small></span><span className="card-suit">{suitSymbol(card.suit)}</span><span className="card-corner inverse">{rankLabel(card.rank)}<small>{suitSymbol(card.suit)}</small></span>
      {mod&&<span className="mod-badge" aria-hidden="true">{MOD_GLYPH[mod]}</span>}
      {mod&&caption&&<span className="mod-caption" aria-hidden="true">{modifierLabel(mod)}</span>}</>:<span className="back-suit">♠</span>}
  </button>{tip&&mod&&createPortal(<div className={`modifier-tooltip mod-${mod}`} style={{left:tip.left,top:tip.top}} role="tooltip"><b><span>{MOD_GLYPH[mod]}</span> {modifierLabel(mod)}</b><p>{MOD_INFO[mod]}</p></div>,document.body)}
</span>;
}
/** CSS family of a card: passive (both kinds), active, swap (active that carries a spare card). */
export type Fam='passive'|'active'|'swap';
export const famOf=(kind:MagicKind,swap?:boolean):Fam=>kind==='active'?(swap?'swap':'active'):'passive';
export const kindTag:Record<MagicKind,string>={active:'Kích hoạt',passive_continuous:'Nội tại xuyên suốt',passive_triggered:'Nội tại chờ sự kiện'};
export const kindShort:Record<MagicKind,string>={active:'KH',passive_continuous:'NT',passive_triggered:'NT·CHỜ'};
export const visGlyph:Record<Visibility,string>={public:'◉',hinted:'◐',hidden:'○'};
export const visLabel:Record<Visibility,string>={public:'Công khai',hinted:'Có dấu hiệu',hidden:'Bí mật'};
export const visExplain:Record<Visibility,string>={
  public:'Khi dùng: cả bàn thấy tên lá, nghe âm thanh và đọc trong nhật ký.',
  hinted:'Khi dùng: chỉ người bị ảnh hưởng nhận dấu hiệu mơ hồ (không biết ai).',
  hidden:'Khi dùng: không ai biết.'};
export const triggerLabel:Record<TriggerName,string>={deal:'lúc chia bài',win_pot:'thắng pot',lose_showdown:'thua showdown',bankrupt:'hết tiền',looked_at:'bị soi/ép lộ',magic_looked_at:'bị soi phép',trap_applied:'bị bẫy số/chất'};
export const kindGlyph:Record<Fam,string>={passive:'◈',active:'✦',swap:'♠'};
/** Illustration of a magic card: art from public/cards/<id>.png, falling back to a framed glyph when the file is missing. */
export function MagicArt({magicId,fam,className=''}:{magicId:string;fam:Fam;className?:string}){
  const [failedId,setFailedId]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{setFailedId(null);setLoaded(false);setRetry(0);},[magicId]);
  // Mobile networks can stall an <img> fetch indefinitely (neither load nor error fires, e.g. iOS backgrounding mid-request); force a fresh request rather than leaving the slot blank forever.
  useEffect(()=>{
    if(loaded||failedId===magicId)return;
    const t=setTimeout(()=>setRetry(r=>r+1),5000);
    return ()=>clearTimeout(t);
  },[magicId,retry,loaded,failedId]);
  return <div className={`magic-art kind-${fam} ${className}`} data-magic={magicId}>
    {failedId===magicId?<span className="magic-art-fallback" aria-hidden="true">{kindGlyph[fam]}<small>{magicId}</small></span>:<img key={retry} src={`/cards/${magicId}.png${retry?`?r=${retry}`:''}`} alt="" draggable={false} onLoad={()=>setLoaded(true)} onError={()=>setFailedId(magicId)}/>}
  </div>;
}

/** The current contract has no parameter schema; use catalog action cues and flags, never card IDs. */
export function magicInputs(def?:MagicDefinition){
  return {
    target: !!def && (def.sound==='reveal'||def.sound==='curse'||(def.sound==='peek'&&def.visibility==='hinted')||def.sound==='steal'||def.sound==='shatter'),
    hand: !!def && (!!def.swap||def.sound==='enhance'||def.sound==='cleanse'||def.sound==='gild'),
    board: def?.sound==='board', modifier: def?.sound==='enhance'
  };
}
export function magicTiming(def:MagicDefinition):string{
  if(def.kind==='passive_continuous')return 'Liên tục khi giữ trong khay.';
  if(def.kind==='passive_triggered'){
    const consume=typeof def.consumed==='number'?`Mất sau ${def.consumed} lần.`:def.consumed?'Chạy xong là mất.':'Giữ lại sau khi chạy.';
    return `Chờ ${def.trigger?triggerLabel[def.trigger]:'sự kiện'}. ${consume}`;
  }
  if(def.swap)return def.consumed?'Trong lượt của bạn. Đổi một lần; lá cũ bị bỏ, không đổi lại được.':'Trong lượt của bạn. Đổi qua lại; lá cũ được giữ trong ô dự trữ.';
  return `${def.timing==='market'?'Trong chợ':def.timing==='anyTime'?'Bất cứ lúc nào trong ván':magicInputs(def).board?'Sau flop, trong lượt của bạn':'Trong lượt của bạn'}. Dùng xong là mất.`;
}
/** Everything printed around art is DOM. Visibility metadata belongs only to the owner view. */
export function MagicDetails({def,price=def.price,owner=true,heading=false}:{def:MagicDefinition;price?:number;owner?:boolean;heading?:boolean}){
  const fam=famOf(def.kind,def.swap);
  return <div className="magic-details">
    {heading&&<strong className="magic-name">{def.name}</strong>}
    <div className="magic-meta"><em className={`kind-pill kind-${fam}`}>{kindTag[def.kind]}</em>
      {owner&&<span className={`vis-pill vis-${def.visibility}`}>{visGlyph[def.visibility]} {visLabel[def.visibility]}</span>}
      <span className="magic-price">Giá gốc: ${fmt(price)}</span></div>
    <p className="magic-effect">{def.description}</p>
    <p className="magic-timing">{magicTiming(def)}</p>
    {owner&&<p className="magic-visibility">{visExplain[def.visibility]}</p>}
  </div>;
}

/** Noninteractive card art for an interactive tray slot (avoids nested buttons). */
export function ReserveFace({card}:{card:Card}){const red=card.suit==='H'||card.suit==='D',mod=card.modifiers?.[0];return <span className={`reserve-face ${red?'red':''} ${mod?`mod-${mod}`:''}`} aria-label={`${rankLabel(card.rank)}${suitSymbol(card.suit)}`}><b>{rankLabel(card.rank)}<small>{suitSymbol(card.suit)}</small></b><i>{suitSymbol(card.suit)}</i>{mod&&<em>{MOD_GLYPH[mod]}</em>}</span>;}
