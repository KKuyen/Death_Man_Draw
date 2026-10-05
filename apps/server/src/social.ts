import type {VoiceSignal} from '@saloon/protocol';
export function cleanChat(payload:unknown):string|null {
  if(typeof payload!=='string')return null;
  const text=payload.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
  return text.length>0&&text.length<=300?text:null;
}
export function cleanSignal(payload:unknown):VoiceSignal|null {
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return null;
  const p=payload as Record<string,any>;
  if(typeof p.toPlayerId!=='string'||p.toPlayerId.length>128)return null;
  if(p.description){const d=p.description;if(!['offer','answer'].includes(d.type)||typeof d.sdp!=='string'||d.sdp.length>16000||d.sdp.includes('m=video'))return null;return {toPlayerId:p.toPlayerId,...(typeof p.toSession==='string'?{toSession:p.toSession}:{}),description:{type:d.type,sdp:d.sdp}};}
  if(p.candidate){const c=p.candidate;if(typeof c.candidate!=='string'||c.candidate.length>2048||!(c.sdpMid==null||typeof c.sdpMid==='string'&&c.sdpMid.length<128)||!(c.sdpMLineIndex==null||Number.isInteger(c.sdpMLineIndex)&&c.sdpMLineIndex>=0&&c.sdpMLineIndex<16))return null;return {toPlayerId:p.toPlayerId,...(typeof p.toSession==='string'?{toSession:p.toSession}:{}),candidate:{candidate:c.candidate,sdpMid:c.sdpMid??null,sdpMLineIndex:c.sdpMLineIndex??null}};}
  return null;
}
