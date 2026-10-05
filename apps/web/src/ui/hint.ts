import type {PrivateSnapshot,RoomSnapshot} from '@saloon/protocol';
import {fmt} from './common';

/** One line that always says what the player should do next. */
export function nextStepHint(snapshot:RoomSnapshot,own:PrivateSnapshot|null,selfId:string,seconds:number,host:boolean):string{
  const me=snapshot.players.find(p=>p.id===selfId);
  if(me?.eliminated&&snapshot.phase!=='finished')return 'Bạn đã bị loại. Xem nốt ván hoặc rời bàn.';
  const usable=own?.magic.some(m=>m.usable);
  switch(snapshot.phase){
    case 'lobby':return me?.ready?'Đã sẵn sàng. Chờ mọi người bấm SẴN SÀNG.':'Bấm SẴN SÀNG khi bạn đã chuẩn bị xong. Vào trận là có chợ bài phép ngay.';
    case 'market':return me?.ready?'Bạn đã xong. Ván bắt đầu khi mọi người xong hoặc hết giờ.':'Chọn lá phép muốn mua (chỉ bạn thấy), rồi bấm XONG.';
    case 'showdown':return 'Ván kết thúc — xem ai thắng. Chợ ván sau mở sau ít giây.';
    case 'finished':return host?'Trận đã kết thúc. Bắt đầu ván mới hoặc giải tán bàn.':'Trận đã kết thúc. Chờ chủ phòng bắt đầu ván mới hoặc rời bàn.';
    default:{
      if(me?.folded)return 'Bạn đã bỏ bài. Xem tiếp ván.';
      if(snapshot.turnPlayerId===selfId&&own){
        const l=own.legal;
        return `Đến lượt bạn (${seconds}s): ${l.canCheck?'CHECK để qua lượt':`THEO $${fmt(l.callAmount)} để giữ bài`}, TỐ để tăng cược, hoặc BỎ BÀI.${usable?' Bạn có phép dùng được ở khay bên phải.':''}`;
      }
      const who=snapshot.players.find(p=>p.id===snapshot.turnPlayerId)?.name;
      return `${who?`Chờ ${who}. `:''}Xem bài chung ở thanh trên bàn và bài của bạn ở khay dưới. ${usable?'Bạn có phép dùng được ngay trong khay.':'Chọn lá trong khay để xem thời điểm dùng.'}`;
    }
  }
}
