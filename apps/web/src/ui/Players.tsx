import type {RoomSnapshot} from '@saloon/protocol';
import type {CommandInput} from '../network';
import {Icon} from './common';

export function PlayerActions({snapshot,selfId,playerId,send}:{snapshot:RoomSnapshot;selfId:string;playerId:string;send:(c:CommandInput)=>void}){
 const p=snapshot.players.find(p=>p.id===playerId);
 if(!p||p.kicked||snapshot.hostId!==selfId||p.id===selfId)return null;
 return <div className="player-actions">
  {!p.bot&&p.connected&&!p.eliminated&&<button type="button" onClick={()=>{if(confirm(`Trao quyền chủ phòng cho ${p.name}?`))send({type:'transferHost',targetPlayerId:p.id});}} aria-label={`Trao quyền chủ phòng cho ${p.name}`}><Icon name="crown"/>Trao quyền</button>}
  <button type="button" className="danger" onClick={()=>{if(confirm(`Đuổi ${p.name} khỏi bàn?`))send({type:'kick',targetPlayerId:p.id});}} aria-label={`Đuổi ${p.name}`}><Icon name="exit"/>Đuổi</button>
 </div>;
}

export function PlayersList({snapshot,selfId,send,mutedPlayers=[],onMute}:{snapshot:RoomSnapshot;selfId:string;send:(c:CommandInput)=>void;mutedPlayers?:string[];onMute?:(id:string,muted:boolean)=>void}){
 return <div className="players-list">{snapshot.players.filter(p=>!p.kicked).sort((a,b)=>a.seat-b.seat).map(p=><article key={p.id} className="player-row">
  <div className="player-identity"><span className="player-seat" aria-hidden="true">{p.seat+1}</span><div><strong title={p.name}>{p.name}{p.id===selfId?' (bạn)':''}</strong><span>{p.id===snapshot.hostId?'Chủ phòng':p.bot?'Máy':p.eliminated?'Đang quan sát':!p.connected?'Mất kết nối':snapshot.phase==='lobby'?(p.ready?'Sẵn sàng':'Chưa sẵn sàng'):p.folded?'Đã bỏ bài':snapshot.turnPlayerId===p.id?'Đang đến lượt':'Đang chơi'}</span></div></div>
  {onMute&&p.id!==selfId&&!p.bot&&<button type="button" className="player-mute" aria-pressed={mutedPlayers.includes(p.id)} aria-label={`${mutedPlayers.includes(p.id)?'Bật tiếng':'Tắt tiếng'} ${p.name}`} onClick={()=>onMute(p.id,!mutedPlayers.includes(p.id))}><Icon name={mutedPlayers.includes(p.id)?'micOff':'mic'}/><span>{mutedPlayers.includes(p.id)?'Bật tiếng':'Tắt tiếng'}</span></button>}
  <PlayerActions snapshot={snapshot} selfId={selfId} playerId={p.id} send={send}/>
 </article>)}</div>;
}
