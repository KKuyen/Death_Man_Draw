import type {Card,PrivateSnapshot,PublicPlayer,RoomSnapshot} from '@saloon/protocol';
import {PlayingCard} from './common';

/** Always-visible community cards (HUD): five fixed slots so the layout never jumps. Modifiers on board cards are public. */
export function BoardStrip({snapshot}:{snapshot:RoomSnapshot}){
  if(snapshot.phase!=='playing'&&snapshot.phase!=='showdown')return null;
  const slots:(Card|undefined)[]=Array.from({length:5},(_,i)=>snapshot.board[i]);
  return <section className="gx-board" aria-label="Bài chung" data-count={snapshot.board.length}>
    <span className="gx-hud-label">Bài chung</span>
    <div className="gx-board-cards">{slots.map((c,i)=><div key={i} className="gx-board-slot">{c?<PlayingCard card={c}/>:<span className="card-slot-empty" aria-label="Chưa mở"><span aria-hidden="true">♠</span></span>}</div>)}</div>
  </section>;
}
/** Own hole cards, large and readable, with the modifier named under the card. Replaces the old sr-only list. */
export function OwnHand({own,me,snapshot}:{own:PrivateSnapshot;me?:PublicPlayer;snapshot:RoomSnapshot}){
  const show=snapshot.phase==='playing'||snapshot.phase==='showdown';
  const hand=own.hand;
  if(!show||!hand.length)return <div className="gx-hand empty private-cards" aria-label="Bài trên tay"><span className="gx-hud-label">BÀI CỦA BẠN</span><span className="gx-hand-none">{me?.folded||me?.eliminated?'—':'Chưa chia bài'}</span></div>;
  return <div className={`gx-hand private-cards ${me?.folded?'folded':''}`} aria-label="Bài trên tay"><span className="gx-hud-label">BÀI CỦA BẠN{me?.folded?' · ĐÃ BỎ':''}</span>
    <div className="gx-hand-cards">{hand.map(c=><PlayingCard key={c.id} card={c} big caption/>)}</div></div>;
}
