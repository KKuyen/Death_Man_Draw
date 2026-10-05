import {Icon,MOD_GLYPH,MOD_INFO} from './common';
import {CARD_MODIFIERS,modifierLabel} from '@saloon/protocol';

export interface Settings {lowQuality:boolean;setLowQuality:(v:boolean)=>void;muted:boolean;setMuted:(v:boolean)=>void;onCoach:()=>void}
/** How-to-play drawer (Bài Phép rules, short). */
export function HelpDrawer({settings,onClose}:{settings:Settings;onClose:()=>void}){
  const s=settings;
  return <div className="drawer gx-drawer" role="dialog" aria-label="Cách chơi">
    <div className="drawer-heading"><div><span className="eyebrow">DEAD MAN’S DRAW</span><h2>Cách chơi</h2></div><button onClick={onClose} aria-label="Đóng"><Icon name="close"/></button></div>
    <div className="help-content">
      <button className="btn gold" onClick={s.onCoach}>▶ XEM LẠI HƯỚNG DẪN NHANH</button>
      <p><b>1. Mục tiêu.</b> Texas Hold’em 2–4 người: hai lá riêng, năm lá chung, bộ năm lá mạnh nhất thắng pot. Hết tiền thì bị loại. Ví chỉ bạn biết; cược và pot công khai.</p>
      <p><b>2. Chợ bài phép.</b> Chợ riêng có 4 ô, mỗi ô ngẫu nhiên là bài phép hoặc bài tây dự trữ. Lô hàng giữ 2 ván, lá đã mua không bù lại. Làm mới chủ động tốn tiền. Giữ tối đa 5 ô. Bài dự trữ chỉ đổi được một lần — lá tay cũ bị bỏ luôn.</p>
      <p><b>3. Ba loại phép.</b> <b>Kích hoạt</b>: chủ động dùng rồi mất. <b>Nội tại xuyên suốt</b>: có hiệu lực khi giữ. <b>Nội tại chờ sự kiện</b>: tự chạy khi sự kiện ghi trên lá xảy ra.</p>
      <p><b>4. Bài có phụ trợ.</b> Lá bài tây có thể mang dấu: Vàng, Muôn chất (buff) hoặc Bẫy, Nguyền (debuff). Rê chuột lên lá để đọc.</p>
      <div className="modifier-guide">{CARD_MODIFIERS.map(mod=><div key={mod} className={`mod-${mod}`}><b><span>{MOD_GLYPH[mod]}</span> {modifierLabel(mod)}</b><p>{MOD_INFO[mod]}</p></div>)}</div>
      <p><b>5. Xem bài.</b> Bài chung nằm ở thanh trên cùng bàn, bài của bạn ở khay phía dưới. Giữ phím <b>S</b> chỉ để cúi nhìn 3D cho vui, không ảnh hưởng luật.</p>
      <p><b>6. Bí mật.</b> Không ai thấy phép bạn giữ hay mua; chỉ vài lá có hiệu ứng công khai khi dùng.</p>
      <p>Enter mở/gửi chat. Giữ Tab xem đối thủ. Nút bánh răng mở Cài đặt âm thanh, nhạc, mic và loa.</p>
      <label className="check-row"><input type="checkbox" checked={s.lowQuality} onChange={e=>s.setLowQuality(e.target.checked)}/> Chế độ đồ họa nhẹ</label>
      <label className="check-row"><input type="checkbox" checked={s.muted} onChange={e=>s.setMuted(e.target.checked)}/> Tắt âm thanh</label>
    </div>
  </div>;
}
