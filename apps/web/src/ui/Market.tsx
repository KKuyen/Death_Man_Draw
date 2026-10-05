import {useState} from 'react';
import type {MarketOffer,PrivateSnapshot,RoomSnapshot} from '@saloon/protocol';
import {DEFAULTS,getMagic} from '@saloon/content';
import type {CommandInput} from '../network';
import {PlayingCard,MagicArt,famOf,fmt,kindTag,magicTiming,visExplain,visGlyph,visLabel} from './common';

/** Ready slots for up to 4 seats; used by lobby and market. Kick (host, lobby only) removes a seat outright. */
export function ReadyRoster({snapshot,selfId,doneLabel='SẴN SÀNG',host=false,send}:{snapshot:RoomSnapshot;selfId:string;doneLabel?:string;host?:boolean;send?:(c:CommandInput)=>void}){
  const slots=Array.from({length:4},(_,i)=>snapshot.players.find(p=>p.seat===i));
  const canKick=host&&send&&snapshot.phase==='lobby';
  return <div className="lobby-roster gx-roster">{slots.map((p,i)=>p
    ?<div key={p.id} className={p.id===selfId?'me':''}><span>{p.name}{p.id===selfId?' (bạn)':''}{p.bot?' · máy':''}{p.id===snapshot.hostId&&<em className="host-tag" title="Chủ phòng">CHỦ PHÒNG</em>}{!p.connected&&!p.bot&&<em className="offline-tag" title="Mất kết nối">MẤT KẾT NỐI</em>}</span><span className={p.ready?'ready-tag':'waiting-tag'}>{p.eliminated?'BỊ LOẠI':p.ready?doneLabel:'ĐANG CHỌN'}</span>{canKick&&p.id!==selfId&&<button type="button" className="kick-btn" title={`Đuổi ${p.name}`} aria-label={`Đuổi ${p.name}`} onClick={()=>{if(confirm(`Đuổi ${p.name} khỏi bàn?`))send!({type:'kick',targetPlayerId:p.id});}}>×</button>}</div>
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
    <footer>{blocked&&<span className="gx-offer-price">Giá chợ: ${fmt(offer.price)}</span>}{offer.purchased?<span className="gx-owned">✓ ĐÃ MUA</span>:offer.owned?<span className="gx-owned">ĐANG GIỮ</span>
      :<button className="price-button gx-buy" disabled={!afford||need} onClick={buy} title={!afford?'Không đủ tiền':need?'Khay đầy: chọn ô muốn thay ở dưới':`Mua với giá $${fmt(offer.price)}`}>${fmt(offer.price)}<span>{need?'CHỌN Ô THAY':'MUA'}</span></button>}</footer>
  </article>;
}
/** Start of every hand: this player's own four offers (nobody else sees them). */
export function PrivateMarket({snapshot,own,send}:{snapshot:RoomSnapshot;own:PrivateSnapshot;send:(c:CommandInput)=>void}){
  const [pick,setPick]=useState<number|null>(null);const full=own.magic.length>=DEFAULTS.magicSlots;
  void snapshot;
  return <div className="gx-market" role="region" aria-label="Chợ bài phép riêng của bạn">
    <div className="gx-market-note">Chợ riêng — chỉ bạn thấy. {full?'Khay đầy: chọn một ô bên dưới để thay (lá bị thay sẽ mất).':`Mỗi lá mua một lần, giữ tối đa ${DEFAULTS.magicSlots} lá.`}</div>
    <div className="market-refresh"><span>Lô hàng còn {own.marketHandsLeft??2} ván trước lần làm mới tự động</span><button className="btn outline gx-refresh-btn" disabled={own.wallet<(own.marketRefreshPrice??40)} onClick={()=>send({type:'refreshMarket'})}>LÀM MỚI · ${fmt(own.marketRefreshPrice??40)}</button></div>
    {!own.market.length&&<p className="market-empty">Bạn đã mua hết lô hàng. Chờ lần làm mới tự động hoặc trả tiền làm mới ngay.</p>}
    <div className="gx-market-grid">{[...own.market].sort((a,b)=>a.slot-b.slot).map(o=><Offer key={o.id} offer={o} wallet={own.wallet} full={full} pick={pick} send={send}/>)}</div>
    {full&&<div className="gx-replace" role="group" aria-label="Chọn ô để thay"><span>Thay ô:</span>{own.magic.map(m=><button key={m.slot} type="button" className={pick===m.slot?'on':''} onClick={()=>setPick(pick===m.slot?null:m.slot)} title={getMagic(m.magicId)?.description}>{m.slot+1}. {getMagic(m.magicId)?.name}</button>)}</div>}
  </div>;
}
