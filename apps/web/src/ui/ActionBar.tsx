import type {PrivateSnapshot,PublicPlayer,RoomSnapshot} from '@saloon/protocol';
import {useState} from 'react';
import {fmt} from './common';

type BetAction='check'|'call'|'raise'|'fold'|'allIn';
/** Betting controls. Four big labelled buttons, one raise row with quick amounts. Disabled (not hidden) off-turn so the layout never jumps. */
export function ActionBar({snapshot,own,me,turn,raiseTo,setRaiseTo,onBet}:{snapshot:RoomSnapshot;own:PrivateSnapshot;me?:PublicPlayer;turn:boolean;raiseTo:number;setRaiseTo:(v:number)=>void;onBet:(a:BetAction)=>void}){
  const l=own.legal;const maxRaise=Math.max(l.minRaiseTo,l.maxRaiseTo);
  const [raiseOpen,setRaiseOpen]=useState(false);
  const clamp=(v:number)=>Math.max(l.minRaiseTo,Math.min(maxRaise,Math.round(v/5)*5||l.minRaiseTo));
  const base=(me?.bet??0)+l.callAmount; // the current bet level; quick raises are measured from it
  const quick:[string,number][]=[['Tối thiểu',l.minRaiseTo],['+½ pot',base+snapshot.pot/2],['+Pot',base+snapshot.pot],['Tối đa',maxRaise]];
  return <div className={`bet-buttons-wrap gx-actions ${turn?'is-turn':''}`}>
    <div className="bet-buttons">
      <button className="gx-btn danger" disabled={!turn||!l.canFold} onClick={()=>onBet('fold')} title="Bỏ bài: mất số tiền đã cược trong ván này."><b>Bỏ bài</b></button>
      <button className="gx-btn" disabled={!turn} onClick={()=>onBet(l.canCheck?'check':'call')} title={l.canCheck?'Qua lượt, không tốn tiền.':`Theo cược, thêm $${fmt(l.callAmount)}.`}><b>{l.canCheck?'Check':<>Theo <span>${fmt(l.callAmount)}</span></>}</b></button>
      <button className="gx-btn gold" disabled={!turn||!l.canRaise} onClick={()=>onBet('raise')} title="Tăng mức cược lên số tiền đã chọn."><b>Tố <span>${fmt(raiseTo)}</span></b></button>
      <button className="gx-btn" disabled={!turn||!!me?.allIn} onClick={()=>onBet('allIn')} title="Cược toàn bộ ví."><b>All-in</b></button>
    </div>
    <button type="button" className="mobile-raise-toggle" disabled={!turn||!l.canRaise} aria-expanded={raiseOpen} onClick={()=>setRaiseOpen(v=>!v)}>Chỉnh mức tố · ${fmt(raiseTo)} <span>{raiseOpen?'−':'+'}</span></button>
    <div className={`raise-controls gx-raise ${raiseOpen?'raise-open':''}`}>
      <span className="gx-raise-label">Số tiền tố</span>
      <input type="range" aria-label="Số tiền tố" min={l.minRaiseTo} max={maxRaise} step={snapshot.bigBlind||1} value={raiseTo} disabled={!turn||!l.canRaise} onChange={e=>setRaiseTo(clamp(Number(e.target.value)))}/>
      <input type="number" inputMode="numeric" aria-label="Tiền tố" value={raiseTo} min={l.minRaiseTo} max={maxRaise} disabled={!turn||!l.canRaise} onChange={e=>setRaiseTo(Math.max(l.minRaiseTo,Math.min(maxRaise,Number(e.target.value))))}/>
      <div className="gx-chips">{quick.map(([label,v])=><button key={label} type="button" disabled={!turn||!l.canRaise} onClick={()=>setRaiseTo(clamp(v))}>{label}</button>)}</div>
    </div>
  </div>;
}
