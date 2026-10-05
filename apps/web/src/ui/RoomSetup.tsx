import {useEffect,useState} from 'react';
import type {GameSetup,RoomSnapshot} from '@saloon/protocol';
import {DEFAULT_SETUP,validSetup} from '@saloon/content';
import type {CommandInput} from '../network';
export function RoomSetup({snapshot,host,send}:{snapshot:RoomSnapshot;host:boolean;send:(c:CommandInput)=>void}){
 const setup=snapshot.setup||DEFAULT_SETUP;const [draft,setDraft]=useState(setup),[open,setOpen]=useState(false);
 useEffect(()=>setDraft(setup),[JSON.stringify(setup)]);
 const fields:[keyof GameSetup,string,number,number,number][]=[['startingWallet','Tiền khởi đầu',100,100000,100],['smallBlind','Small blind',1,10000,1],['bigBlind','Big blind',2,20000,1],['turnSeconds','Thời gian lượt (giây)',10,120,5],['marketSeconds','Thời gian chợ (giây)',15,180,5],['blindEveryHands','Tăng blind sau số ván (0 = giữ nguyên)',0,50,1],['blindGrowth','Hệ số tăng blind',1,3,.1]];
 return <section className="room-setup"><button type="button" className="text-button" onClick={()=>setOpen(!open)}>{open?'▾':'▸'} SETUP TRẬN · ${setup.startingWallet} · BLIND {setup.smallBlind}/{setup.bigBlind}</button>{open&&<><p>{host?'Chỉnh trước trận. Áp dụng sẽ yêu cầu mọi người sẵn sàng lại.':'Chỉ chủ phòng chỉnh setup. Các thay đổi áp dụng cho cả bàn.'}</p><div className="setup-fields">{fields.map(([key,label,min,max,step])=><label key={key}>{label}<input aria-label={label} type="number" disabled={!host} min={min} max={max} step={step} value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value)})}/></label>)}</div>{host&&<button className="btn outline" disabled={!validSetup(draft)||JSON.stringify(draft)===JSON.stringify(setup)} onClick={()=>send({type:'configureGame',setup:draft})}>ÁP DỤNG SETUP</button>}{!validSetup(draft)&&<p role="alert">Tiền phải đủ big blind; small blind nhỏ hơn big blind. Kiểm tra các mức và thời gian.</p>}</>}</section>;
}
