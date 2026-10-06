import {Icon,MOD_GLYPH,MOD_INFO} from './common';
import {CARD_MODIFIERS,modifierLabel} from '@saloon/protocol';
import {DEFAULTS} from '@saloon/content';
import {useRef} from 'react';
import {useDialog} from './useDialog';

export interface Settings {lowQuality:boolean;setLowQuality:(v:boolean)=>void;muted:boolean;setMuted:(v:boolean)=>void;onCoach:()=>void}
/** How-to-play drawer (Bài Phép rules, short). */
export function HelpDrawer({settings,onClose}:{settings:Settings;onClose:()=>void}){
  const s=settings;
  const root=useRef<HTMLDivElement>(null);useDialog(root,onClose);
  return <><button className="surface-backdrop" onClick={onClose} aria-label="Đóng nền hướng dẫn" tabIndex={-1}/><div ref={root} className="drawer gx-drawer" role="dialog" aria-modal="true" aria-label="Cách chơi" tabIndex={-1}>
    <div className="drawer-heading"><h2>Cách chơi</h2><button onClick={onClose} aria-label="Đóng hướng dẫn"><Icon name="close"/></button></div>
    <div className="help-content">
      <button className="btn gold" onClick={s.onCoach}>Hướng dẫn nhanh</button>
      <p><b>1. Mục tiêu.</b> Texas Hold’em 2–4 người: hai lá riêng, năm lá chung, bộ năm lá mạnh nhất thắng pot. Hết tiền thì bị loại. Ví chỉ bạn biết; cược và pot công khai.</p>
      <p><b>2. Chợ.</b> Chợ riêng có 4 ô, giữ cùng lô hàng trong {DEFAULTS.marketRefreshHands} ván; lá đã mua không bù lại. Làm mới chủ động tốn tiền. Giữ tối đa 5 lá trong khay. Bài dự trữ thường đổi một lần rồi mất; các Bộ đổi bài giữ lá cũ trong khay. Xem mô tả trên từng lá.</p>
      <p><b>3. Ba loại phép.</b> <b>Kích hoạt</b>: chủ động dùng rồi mất. <b>Nội tại xuyên suốt</b>: có hiệu lực khi giữ. <b>Nội tại chờ sự kiện</b>: tự chạy khi sự kiện ghi trên lá xảy ra.</p>
      <p><b>4. Dấu trên bài.</b> Vàng, Muôn chất và Hạnh vận là buff; Bẫy và Nguyền là debuff. Rê chuột, chạm hoặc dùng bàn phím để xem ý nghĩa trên lá.</p>
      <div className="modifier-guide">{CARD_MODIFIERS.map(mod=><div key={mod} className={`mod-${mod}`}><b><span>{MOD_GLYPH[mod]}</span> {modifierLabel(mod)}</b><p>{MOD_INFO[mod]}</p></div>)}</div>
      <p><b>5. Xem bài.</b> Bài chung ở giữa bàn, bài của bạn ở khay phía dưới. Giữ phím <b>S</b> để cúi nhìn bàn 3D.</p>
      <p><b>6. Bí mật.</b> Không ai thấy phép bạn giữ hay mua; chỉ vài lá có hiệu ứng công khai khi dùng.</p>
      <p><b>Phím tắt.</b> Enter mở/gửi chat. Tab mở danh sách người chơi. Escape đóng cửa sổ. Âm thanh, mic, loa và quản lý phòng nằm trong Cài đặt.</p>
    </div>
  </div></>;
}
