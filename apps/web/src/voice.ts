import {connection} from './network';
import type {VoiceSignal} from '@saloon/protocol';
interface Peer {session:string;pc:RTCPeerConnection;audio:HTMLAudioElement;sender:RTCRtpSender;pending:RTCIceCandidateInit[];queue:Promise<void>}
export class RoomVoice {
 private peers=new Map<string,Peer>();private stream:MediaStream|null=null;private generation=0;private room='';private self='';private muted=new Set<string>();private volume=.8;private output='';private input='';private offSignal:()=>void;private offState:()=>void;
 onChange:((on:boolean,error?:string)=>void)|null=null;
 constructor(){this.offSignal=connection.onVoiceSignal(s=>this.receive(s));this.offState=connection.subscribe(()=>this.sync());window.addEventListener('pointerdown',()=>this.unlock());}
 get enabled(){return !!this.stream;}
 get inputId(){return this.input;}
 private sync(){const s=connection.getSnapshot(),room=connection.isOnlineRoom?s.snapshot?.roomId||'':'';
  if(room!==this.room||s.selfId!==this.self){this.stop();this.clearPeers();this.room=room;this.self=s.selfId;if(room)connection.voiceReady();}
  if(!room)return;const ids=s.snapshot!.players.filter(p=>!p.bot&&p.connected&&p.id!==s.selfId&&s.social.voiceSessions?.[p.id]).map(p=>p.id);
  for(const [id,p] of this.peers)if(!ids.includes(id)||p.session!==s.social.voiceSessions?.[id]){p.pc.close();p.audio.remove();this.peers.delete(id);}
  for(const id of ids)this.ensure(id);
 }
 private ensure(id:string){let p=this.peers.get(id);if(p)return p;
  let iceServers:RTCIceServer[]=[{urls:'stun:stun.l.google.com:19302'}];try{if(import.meta.env.VITE_ICE_SERVERS)iceServers=JSON.parse(import.meta.env.VITE_ICE_SERVERS);}catch{/* use default */}
  const pc=new RTCPeerConnection({iceServers}),audio=document.createElement('audio');audio.autoplay=true;audio.dataset.voicePlayer=id;audio.style.display='none';document.body.append(audio);
  const sender=pc.addTransceiver('audio',{direction:'sendrecv'}).sender;
  p={session:connection.getSnapshot().social.voiceSessions?.[id]||'',pc,audio,sender,pending:[],queue:Promise.resolve()};this.peers.set(id,p);this.route(p,id);
  if(this.stream)void sender.replaceTrack(this.stream.getAudioTracks()[0]);
  pc.ontrack=e=>{audio.srcObject=e.streams[0]||new MediaStream([e.track]);void audio.play().catch(()=>undefined);};
  pc.onicecandidate=e=>{if(e.candidate)connection.sendVoiceSignal({toPlayerId:id,toSession:p!.session,candidate:{...e.candidate.toJSON(),candidate:e.candidate.candidate}});};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')this.onChange?.(this.enabled,'Không nối được giọng nói với một người chơi.');};
  // Exactly one caller, assigned by authenticated player id; transceiver is always sendrecv, even with the mic off.
  if(this.self<id)p.queue=p.queue.then(async()=>{await pc.setLocalDescription(await pc.createOffer());connection.sendVoiceSignal({toPlayerId:id,toSession:p!.session,description:{type:'offer',sdp:pc.localDescription!.sdp}});}).catch(()=>undefined);
  return p;
 }
 private receive(s:VoiceSignal){if(!this.room||!s.fromPlayerId||s.toPlayerId!==this.self||s.fromSession!==connection.getSnapshot().social.voiceSessions?.[s.fromPlayerId])return;const state=connection.getSnapshot();if(!state.snapshot?.players.some(p=>p.id===s.fromPlayerId&&!p.bot&&p.connected))return;
  const p=this.ensure(s.fromPlayerId),id=s.fromPlayerId;p.queue=p.queue.then(async()=>{
   if(s.description){await p.pc.setRemoteDescription(s.description);for(const c of p.pending.splice(0))await p.pc.addIceCandidate(c);if(s.description.type==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());connection.sendVoiceSignal({toPlayerId:id,toSession:p!.session,description:{type:'answer',sdp:p.pc.localDescription!.sdp}});}}
   else if(s.candidate){if(p.pc.remoteDescription)await p.pc.addIceCandidate(s.candidate);else p.pending.push(s.candidate);}
  }).catch(e=>{console.warn('voice signal',e);});
 }
 async start(input=this.input){if(!connection.isOnlineRoom){this.onChange?.(false,'Mic dùng trong bàn nhiều người; đối thủ máy không có giọng nói.');return;}
  const generation=++this.generation;this.input=input;try{const stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:input?{exact:input}:undefined,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(generation!==this.generation||!connection.isOnlineRoom){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream?.getTracks().forEach(t=>t.stop());this.stream=stream;
   await Promise.all([...this.peers.values()].map(p=>p.sender.replaceTrack(stream.getAudioTracks()[0])));connection.setMicrophone(true);this.onChange?.(true);this.unlock();
  }catch(e){this.onChange?.(this.enabled,(e as Error).name==='NotAllowedError'?'Chưa được cấp quyền micro. Kiểm tra quyền của trình duyệt.':'Không mở được micro đã chọn.');}
 }
 stop(){++this.generation;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;for(const p of this.peers.values())void p.sender.replaceTrack(null).catch(()=>undefined);connection.setMicrophone(false);this.onChange?.(false);}
 async setInput(id:string){this.input=id;if(this.enabled)await this.start(id);}
 setOutput(id:string){this.output=id;for(const [pid,p] of this.peers)this.route(p,pid);}
 setVolume(v:number){this.volume=v;for(const [id,p] of this.peers)this.route(p,id);}
 mutePlayer(id:string,muted:boolean){if(muted)this.muted.add(id);else this.muted.delete(id);const p=this.peers.get(id);if(p)this.route(p,id);}
 private route(p:Peer,id:string){p.audio.volume=this.volume;p.audio.muted=this.muted.has(id);const a=p.audio as HTMLAudioElement&{setSinkId?:(id:string)=>Promise<void>};if(a.setSinkId)void a.setSinkId(this.output).catch(()=>this.onChange?.(this.enabled,'Không chọn được loa này; hãy cấp quyền thiết bị.'));}
 unlock(){for(const p of this.peers.values())if(p.audio.srcObject)void p.audio.play().catch(()=>undefined);}
 private clearPeers(){for(const p of this.peers.values()){p.pc.close();p.audio.srcObject=null;p.audio.remove();}this.peers.clear();}
 dispose(){this.stop();this.clearPeers();this.offSignal();this.offState();}
}
export const voice=new RoomVoice();
