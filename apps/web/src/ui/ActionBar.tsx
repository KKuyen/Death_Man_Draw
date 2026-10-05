import type {PrivateSnapshot,PublicPlayer,RoomSnapshot} from '@saloon/protocol';
import {fmt} from './common';

type BetAction='check'|'call'|'raise'|'fold'|'allIn';
/** Betting controls. Four big labelled buttons, one raise row with quick amounts. Disabled (not hidden) off-turn so the layout never jumps. */
export function ActionBar({snapshot,own,me,turn,raiseTo,setRaiseTo,onBet}:{snapshot:RoomSnapshot;own:PrivateSnapshot;me?:PublicPlayer;turn:boolean;raiseTo:number;setRaiseTo:(v:number)=>void;onBet:(a:BetAction)=>void}){
  const l=own.legal;const maxRaise=Math.max(l.minRaiseTo,l.maxRaiseTo);
  const clamp=(v:number)=>Math.max(l.minRaiseTo,Math.min(maxRaise,Math.round(v/5)*5||l.minRaiseTo));
  const base=(me?.bet??0)+l.callAmount; // the current bet level; quick raises are measured from it
  const quick:[string,number][]=[['Tối thiểu',l.minRaiseTo],['+½ pot',base+snapshot.pot/2],['+Pot',base+snapshot.pot],['Tối đa',maxRaise]];
  const callLabel=l.canCheck?'CHECK':`THEO $${fmt(l.callAmount)}`;
  return <div className={`bet-buttons-wrap gx-actions ${turn?'is-turn':''}`}>
    <div className="bet-buttons">
      <button className="gx-btn danger" disabled={!turn||!l.canFold} onClick={()=>onBet('fold')} title="Bỏ bài: mất số tiền đã cược trong ván này."><b>BỎ BÀI</b><small>mất phần đã cược</small></button>
      <button className="gx-btn" disabled={!turn} onClick={()=>onBet(l.canCheck?'check':'call')} title={l.canCheck?'Không ai cược thêm: qua lượt, không tốn tiền.':`Đi theo mức cược hiện tại, tốn thêm $${fmt(l.callAmount)}.`}><b>{callLabel}</b><small>{l.canCheck?'qua lượt, miễn phí':'giữ bài, đi theo'}</small></button>
      <button className="gx-btn gold" disabled={!turn||!l.canRaise} onClick={()=>onBet('raise')} title="Tăng mức cược lên số tiền chọn bên dưới."><b>TỐ ${fmt(raiseTo)}</b><small>tăng cược</small></button>
      <button className="gx-btn" disabled={!turn||!!me?.allIn} onClick={()=>onBet('allIn')} title="Đẩy toàn bộ ví vào pot."><b>ALL-IN</b><small>cược hết ví</small></button>
    </div>
    <div className="raise-controls gx-raise">
      <span className="gx-raise-label">Số tiền tố</span>
      <input type="range" aria-label="Số tiền tố" min={l.minRaiseTo} max={maxRaise} step={snapshot.bigBlind||1} value={raiseTo} disabled={!turn||!l.canRaise} onChange={e=>setRaiseTo(clamp(Number(e.target.value)))}/>
      <input type="number" aria-label="Tiền tố" value={raiseTo} min={l.minRaiseTo} disabled={!turn||!l.canRaise} onChange={e=>setRaiseTo(Math.max(0,Number(e.target.value)))}/>
      <div className="gx-chips">{quick.map(([label,v])=><button key={label} type="button" disabled={!turn||!l.canRaise} onClick={()=>setRaiseTo(clamp(v))}>{label}</button>)}</div>
    </div>
  </div>;
}
