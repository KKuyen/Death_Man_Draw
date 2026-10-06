import {useEffect,useRef,useState} from 'react';
import type {CharacterId} from '@saloon/protocol';
import {connection} from '../network';
import {Icon} from './common';
import {useDialog} from './useDialog';

interface PublicRoom{roomId:string;code:string;players:number;maxClients:number;phase:string}
const PHASE_LABEL:Record<string,string>={lobby:'ĐANG CHỜ',market:'CHỢ BÀI PHÉP',playing:'ĐANG CHƠI',showdown:'LẬT BÀI',finished:'ĐÃ KẾT THÚC'};

/** Browse-and-join drawer for rooms the host opted into the public world list. */
export function WorldList({name,character,busy,onClose}:{name:string;character:CharacterId;busy:boolean;onClose:()=>void}){
  const [rooms,setRooms]=useState<PublicRoom[]|null>(null);
  const [error,setError]=useState('');
  const root=useRef<HTMLDivElement>(null);useDialog(root,onClose);
  useEffect(()=>{
    let alive=true;
    const load=()=>void connection.listPublicRooms().then(r=>{if(alive){setRooms(r);setError('');}}).catch((e:Error)=>{if(alive)setError(e.message||'Lỗi tải danh sách.');});
    load();
    const t=setInterval(load,4000);
    return ()=>{alive=false;clearInterval(t);};
  },[]);
  return <div className="world-list-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
   <div ref={root} className="world-list" role="dialog" aria-modal="true" aria-label="Danh sách phòng công khai" tabIndex={-1}>
    <header><h2>Phòng công khai</h2><button className="gx-x" onClick={onClose} aria-label="Đóng phòng công khai"><Icon name="close"/></button></header>
    {error&&<p className="world-list-note">{error}</p>}
    {rooms===null&&!error&&<p className="world-list-note">Đang tải…</p>}
    {rooms&&!rooms.length&&!error&&<p className="world-list-note">Chưa có bàn công khai nào đang mở.</p>}
    <div className="world-list-rows">
     {rooms?.map(r=>{const full=r.players>=r.maxClients;return <div key={r.roomId} className="world-list-row">
      <span className="world-list-code">{r.code}</span>
      <span className={`world-list-phase phase-${r.phase}`}>{PHASE_LABEL[r.phase]||r.phase}</span>
      <span className="world-list-players"><Icon name="users" size={13}/>{r.players}/{r.maxClients}</span>
      <button className="btn outline" disabled={busy||full} onClick={()=>{onClose();void connection.join(r.code,name,character);}}>{full?'ĐẦY':'VÀO'}</button>
     </div>;})}
    </div>
   </div>
  </div>;
}
