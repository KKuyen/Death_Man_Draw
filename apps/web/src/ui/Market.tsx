import {useEffect,useRef,useState} from 'react';
import type {MarketOffer,PrivateSnapshot,RoomSnapshot} from '@saloon/protocol';
import {DEFAULTS,getMagic} from '@saloon/content';
import type {CommandInput} from '../network';
import {PlayingCard,MagicArt,famOf,fmt,kindTag,magicTiming,visExplain,visGlyph,visLabel} from './common';

/** Ready slots for up to 4 seats; used by lobby and market. Kick (host, lobby only) removes a seat outright. */
export function ReadyRoster({snapshot,selfId,doneLabel='SẴN SÀNG',host=false,send}:{snapshot:RoomSnapshot;selfId:string;doneLabel?:string;host?:boolean;send?:(c:CommandInput)=>void}){
  const slots=Array.from({length:4},(_,i)=>snapshot.players.find(p=>p.seat===i&&!p.kicked));
  return <div className="lobby-roster gx-roster">{slots.map((p,i)=>p
    ?<div key={p.id} className={p.id===selfId?'me':''}><span>{p.name}{p.id===selfId?' (bạn)':''}{p.bot?' · máy':''}{p.id===snapshot.hostId&&<em className="host-tag" title="Chủ phòng">CHỦ PHÒNG</em>}{!p.connected&&!p.bot&&<em className="offline-tag" title="Mất kết nối">MẤT KẾT NỐI</em>}</span><span className={p.ready?'ready-tag':'waiting-tag'}>{p.eliminated?'BỊ LOẠI':p.ready?doneLabel:(snapshot.phase==='lobby'?'Chưa sẵn sàng':'Đang chọn')}</span></div>
    :<div key={`empty${i}`} className="empty"><span>Ghế trống</span><span className="waiting-tag">—</span></div>)}</div>;
}
export function Countdown({seconds,label}:{seconds:number;label:string}){
  const m=Math.floor(seconds/60),s=seconds%60;
  return <div className="gx-countdown" role="timer" aria-label={label}><span>{label}</span><b>{m}:{String(s).padStart(2,'0')}</b></div>;
}

function Offer({offer,wallet,full,pick,send}:{offer:MarketOffer;wallet:number;full:boolean;pick:number|null;send:(c:CommandInput)=>void}){
  const afford=wallet>=offer.price;const need=full&&!offer.purchased&&!offer.owned&&pick==null;
  const blocked=offer.purchased||offer.owned;
  const buy=()=>send({type:'buyMagic',offerId:offer.id,replaceSlot:full?pick??undefined:undefined});
  const def=getMagic(offer.magicId);
  if(!def)return null;
  const fam=famOf(def.kind,def.swap);
  const timing=magicTiming(def);
  return <article className={`gx-offer kind-${fam} ${blocked?'sold':''}`} data-kind={def.kind} data-magic={offer.magicId}>
    <div className="gx-offer-top"><em className={`kind-pill kind-${fam}`}>{kindTag[def.kind]}</em><span className={`vis-pill vis-${def.visibility}`} title={visExplain[def.visibility]}>{visGlyph[def.visibility]} {visLabel[def.visibility]}</span></div>
    {offer.card?<div className="gx-offer-art reserve-art"><PlayingCard card={offer.card} big caption/></div>:<MagicArt magicId={offer.magicId} fam={fam} className="gx-offer-art"/>}
    <h3>{offer.name}</h3>
    <p className="gx-offer-text">{def.description}</p>
    <p className="gx-offer-timing">{timing}</p>
    <p className="gx-offer-vis">{visExplain[def.visibility]}</p>
    <details className="mobile-offer-details"><summary>Chi tiết</summary><p>{timing}</p><p>{visExplain[def.visibility]}</p></details>
    <footer>{blocked&&<span className="gx-offer-price">Giá chợ: ${fmt(offer.price)}</span>}{offer.purchased?<span className="gx-owned">✓ ĐÃ MUA</span>:offer.owned?<span className="gx-owned">ĐANG GIỮ</span>
      :<button className="price-button gx-buy" disabled={!afford||need} onClick={buy} title={!afford?'Không đủ tiền':need?'Khay đầy: chọn ô muốn thay ở dưới':`Mua với giá $${fmt(offer.price)}`}>${fmt(offer.price)}<span>{need?'Chọn lá thay':'Mua'}</span></button>}</footer>
  </article>;
}
/** Start of every hand: this player's own four offers (nobody else sees them). */
export function PrivateMarket({snapshot,own,send}:{snapshot:RoomSnapshot;own:PrivateSnapshot;send:(c:CommandInput)=>void}){
  const [pick,setPick]=useState<number|null>(null);const full=own.magic.length>=DEFAULTS.magicSlots;
  const [offerIndex,setOfferIndex]=useState(0);const cards=useRef<HTMLDivElement>(null);
  const offers=[...own.market].sort((a,b)=>a.slot-b.slot);
  // Safari can defer/skip network fetches for <img> tags sitting off-screen in a horizontally-scrolled strip (offers 2-4 start out of view); force every offer's art to load via a detached Image() so it's cached before the real <img> ever mounts.
  useEffect(()=>{for(const o of offers)if(!o.card)new Image().src=`/cards/${o.magicId}.png`;},[offers.map(o=>o.magicId).join(',')]);
  const current=Math.min(offerIndex,Math.max(0,offers.length-1));
  const move=(index:number)=>{const el=cards.current?.children[index] as HTMLElement|undefined;const grid=cards.current;if(el&&grid){grid.scrollTo({left:grid.scrollLeft+el.getBoundingClientRect().left-grid.getBoundingClientRect().left,behavior:'instant'});setOfferIndex(index);}};
  void snapshot;
  return <div className="gx-market" role="region" aria-label="Chợ bài phép riêng của bạn">
    <div className="gx-market-note" title={`Chợ riêng — chỉ bạn thấy. ${full?'Khay đầy: chọn một ô bên dưới để thay (lá bị thay sẽ mất).':`Mỗi lá mua một lần, giữ tối đa ${DEFAULTS.magicSlots} lá.`}`}>Chợ riêng — chỉ bạn thấy. {full?'Khay đầy: chọn một ô bên dưới để thay (lá bị thay sẽ mất).':`Mỗi lá mua một lần, giữ tối đa ${DEFAULTS.magicSlots} lá.`}</div>
    <div className="market-refresh"><span>Làm mới sau {own.marketHandsLeft??3} ván</span><button className="btn outline gx-refresh-btn" disabled={own.wallet<(own.marketRefreshPrice??40)} onClick={()=>send({type:'refreshMarket'})}>LÀM MỚI · ${fmt(own.marketRefreshPrice??40)}</button></div>
    {!own.market.length&&<p className="market-empty">Bạn đã mua hết lô hàng. Chờ lần làm mới tự động hoặc trả tiền làm mới ngay.</p>}
    <div className="mobile-market-nav" aria-label="Chọn lá trong chợ"><button type="button" disabled={current===0} onClick={()=>move(current-1)} aria-label="Lá trước">‹</button><span>{offers.length?`Lá ${current+1}/${offers.length}`:'Đã mua hết'}</span><button type="button" disabled={!offers.length||current===offers.length-1} onClick={()=>move(current+1)} aria-label="Lá tiếp theo">›</button><button type="button" className="mobile-market-refresh" disabled={own.wallet<(own.marketRefreshPrice??40)} onClick={()=>send({type:'refreshMarket'})} aria-label={`Làm mới chợ với giá $${fmt(own.marketRefreshPrice??40)}`} title="Làm mới chợ"><span aria-hidden="true">↻</span><small>${fmt(own.marketRefreshPrice??40)}</small></button></div>
    <div ref={cards} className="gx-market-grid" onScroll={()=>{const grid=cards.current;if(!grid||!grid.clientWidth)return;const children=Array.from(grid.children) as HTMLElement[];const left=grid.getBoundingClientRect().left;let closest=0;for(let i=1;i<children.length;i++){if(Math.abs(children[i].getBoundingClientRect().left-left)<Math.abs(children[closest].getBoundingClientRect().left-left))closest=i;}setOfferIndex(closest);}}>{offers.map(o=><Offer key={o.id} offer={o} wallet={own.wallet} full={full} pick={pick} send={send}/>)}</div>
    {full&&<details className="gx-replace"><summary>Thay lá trong khay</summary><div className="gx-replace-options" role="group" aria-label="Chọn ô để thay">{own.magic.map(m=><button key={m.slot} type="button" className={pick===m.slot?'on':''} onClick={()=>setPick(pick===m.slot?null:m.slot)} title={getMagic(m.magicId)?.description}>{m.slot+1}. {getMagic(m.magicId)?.name}</button>)}</div></details>}
  </div>;
}
