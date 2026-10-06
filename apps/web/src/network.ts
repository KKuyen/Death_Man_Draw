import {Client, type Room} from '@colyseus/sdk';
import {OfflineRoom} from './offline';
import {uuid} from './uuid';
import type {SocialState,VoiceSignal, CharacterId, Command, GameEvent, PrivateSnapshot, RoomSnapshot} from '@saloon/protocol';

export interface ConnectionState {social:SocialState;status:'offline'|'connecting'|'connected'|'reconnecting'; snapshot:RoomSnapshot|null; own:PrivateSnapshot|null; selfId:string; error:string; event:GameEvent|null}
type StripEnvelope<T> = T extends unknown ? Omit<T,'commandId'|'handId'> : never;
export type CommandInput = StripEnvelope<Command>;
const initial:ConnectionState={social:{messages:[],microphones:{}},status:'offline',snapshot:null,own:null,selfId:'',error:'',event:null};
/** Timeout that also closes a room that connects after we gave up (otherwise it would hold the seat as an orphan). */
const withTimeout=<T extends {leave?:(...a:never[])=>unknown}>(p:Promise<T>,ms=10000)=>{
  let late=false;
  p.then(room=>{if(late)void room.leave?.();},()=>{});
  return Promise.race([p,new Promise<never>((_,reject)=>setTimeout(()=>{late=true;reject(new Error('timeout'));},ms))]);
};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export class GameConnection {
  state:ConnectionState={...initial}; room:Room|null=null; offline:OfflineRoom|null=null;
  /** Bumped by create/join/leave/reconnect so a stale recovery (still in flight from a session the user already left) can never clobber a newer one. */
  private epoch=0;
  private listeners=new Set<()=>void>(); private client:Client;
  readonly endpoint:string; readonly httpEndpoint:string;
  constructor(){
    this.endpoint=(window as Window & {saloonDesktop?:{endpoint:string}}).saloonDesktop?.endpoint||localStorage.getItem('saloon.server')||import.meta.env.VITE_SERVER_URL || `${location.protocol==='https:'?'wss':'ws'}://${location.hostname}:2567`;
    this.httpEndpoint=this.endpoint.replace(/^ws/,'http'); this.client=new Client(this.endpoint);
    // The SDK defaults to credentials:'include', which needs Access-Control-Allow-Credentials from the server; we use no cookies.
    (this.client as unknown as {http:{options:RequestInit}}).http.options.credentials='omit';
  }
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  getSnapshot=()=>this.state;
  private update(patch:Partial<ConnectionState>){this.state={...this.state,...patch};this.listeners.forEach(l=>l());}
  clearError(){this.update({error:''});}
  private signals=new Set<(s:VoiceSignal)=>void>();
  onVoiceSignal=(fn:(s:VoiceSignal)=>void)=>{this.signals.add(fn);return ()=>{this.signals.delete(fn);};};
  get isOnlineRoom(){return !!this.room&&!this.offline&&this.state.status==='connected';}
  sendVoiceSignal(signal:VoiceSignal){if(this.isOnlineRoom)this.room?.send('voiceSignal',signal);}
  voiceReady(){if(this.isOnlineRoom)this.room?.send('voiceReady');}
  setMicrophone(on:boolean){if(this.isOnlineRoom)this.room?.send('microphone',on);}
  sendChat(text:string){const clean=text.trim();if(!clean||clean.length>300)return;if(this.offline){const me=this.state.snapshot?.players.find(p=>p.id===this.state.selfId);this.update({social:{...this.state.social,messages:[...this.state.social.messages,{id:uuid(),playerId:this.state.selfId,name:me?.name||'Bạn',text:clean,at:Date.now()}].slice(-50)}});}else if(this.isOnlineRoom)this.room?.send('chat',clean);}
  private bind(room:Room){
    this.room=room; this.update({status:'connected',selfId:room.sessionId,error:''});
    localStorage.setItem('saloon.reconnect',room.reconnectionToken);
    room.onMessage('welcome',(data:{playerId:string;code?:string;rejoinKey?:string})=>{if(data.rejoinKey&&data.code)localStorage.setItem('saloon.rejoinKey',JSON.stringify({key:data.rejoinKey,code:data.code}));this.update({selfId:data.playerId});});
    room.onMessage('social',(social:SocialState)=>this.update({social}));
    room.onMessage('voiceSignal',(signal:VoiceSignal)=>this.signals.forEach(fn=>fn(signal)));
    room.onMessage('public',(snapshot:RoomSnapshot)=>this.update({snapshot}));
    room.onMessage('private',(own:PrivateSnapshot)=>this.update({own,selfId:own.playerId}));
    room.onMessage('event',(event:GameEvent)=>this.update({event}));
    room.onMessage('error',(data:{message?:string;error?:string}|string)=>this.update({error:typeof data==='string'?data:data.message||data.error||'Thao tác chưa hợp lệ.'}));
    room.onError((_code:number,message?:string)=>this.update({error:message||'Mất liên lạc với bàn chơi.'}));
    room.onLeave((code:number)=>{if(this.room!==room)return;if(code===1000){localStorage.removeItem('saloon.reconnect');localStorage.removeItem('saloon.rejoinKey');this.room=null;this.update({...initial,error:this.state.error.includes('đã đuổi')?this.state.error:''});}else{this.update({status:'reconnecting',error:'Đang nối lại bàn chơi…'});void this.reconnect();}});
  }
  async create(name:string,character:CharacterId,demo=false,isPublic=false){
    if(demo){this.startOffline(name,character);return;}
    const my=++this.epoch;
    this.update({status:'connecting',error:''});
    try{
      const room=await this.client.create('saloon',{name:name.trim()||'Kẻ lạ mặt',character,public:isPublic});
      if(my!==this.epoch)return void room.leave();
      this.bind(room);
    }catch(error){if(my===this.epoch)this.update({status:'offline',error:this.formatError(error)});}
  }
  setVisibility(isPublic:boolean){if(this.isOnlineRoom)this.send({type:'setVisibility',public:isPublic});}
  /** World list: rooms whose host opted into public listing. Polled by the browse-rooms UI. */
  async listPublicRooms():Promise<{roomId:string;code:string;players:number;maxClients:number;phase:string}[]>{
    const res=await fetch(`${this.httpEndpoint}/api/public-rooms`);
    if(!res.ok)throw new Error('Không tải được danh sách bàn.');
    const data=await res.json();
    return Array.isArray(data.rooms)?data.rooms:[];
  }
  /** Local prototype: rules engine + bots in the browser, no server needed. */
  startOffline(name:string,character:CharacterId){
    this.offline?.dispose();
    const room=new OfflineRoom(name.trim()||'Kẻ lạ mặt',character,{public:snapshot=>this.update({snapshot}),private:own=>this.update({own}),event:event=>this.update({event}),error:error=>this.update({error})});
    this.offline=room;this.update({status:'connected',selfId:room.playerId,error:''});
    room.addBots(3);room.send({commandId:'',type:'ready',ready:true});room.send({commandId:'',type:'start'});
  }
  async join(code:string,name:string,character:CharacterId){
    const my=++this.epoch;
    this.update({status:'connecting',error:''});
    try{
      const response=await fetch(`${this.httpEndpoint}/api/rooms`);
      if(!response.ok)throw new Error('Không đọc được danh sách bàn.');
      const data=await response.json(); const rooms=Array.isArray(data)?data:data.rooms||[];
      const room=rooms.find((r:{code?:string;metadata?:{code?:string}})=>(r.code||r.metadata?.code||'').toUpperCase()===code.trim().toUpperCase());
      if(!room)throw new Error('Không tìm thấy bàn với mã này.');
      const joined=await this.client.joinById(room.roomId||room.id,{name:name.trim()||'Kẻ lạ mặt',character,code:code.trim().toUpperCase()});
      if(my!==this.epoch)return void joined.leave();
      this.bind(joined);
    }catch(error){if(my===this.epoch)this.update({status:'offline',error:this.formatError(error)});}
  }
  /** Called once on page load: resume a live server session after refresh. */
  async resume(){
    if(this.room||this.offline||(!localStorage.getItem('saloon.reconnect')&&!localStorage.getItem('saloon.rejoinKey')))return;
    this.update({status:'reconnecting',error:''});await this.reconnect();
  }
  /** Fallback when the Colyseus token is stale (45 s window passed or server restarted): reclaim the seat with the secret rejoinKey. */
  private async rejoinWithKey(my:number):Promise<boolean>{
    try{
      const saved=JSON.parse(localStorage.getItem('saloon.rejoinKey')||'null') as {key:string;code:string}|null;if(!saved)return false;
      const data=await (await fetch(`${this.httpEndpoint}/api/rooms`)).json();
      const room=(data.rooms||[]).find((r:{code:string})=>r.code.toUpperCase()===saved.code.toUpperCase());if(!room)return false;
      const joined=await withTimeout(this.client.joinById(room.roomId,{rejoinKey:saved.key,name:localStorage.getItem('saloon.name')||'Kẻ lạ mặt',code:saved.code}));
      if(my!==this.epoch){void joined.leave();return true;}
      this.bind(joined);return true;
    }catch{return false;}
  }
  private recovering:Promise<void>|null=null;
  /** Single-flight: refresh-resume and onLeave must never run two recoveries (the first would burn the one-shot token). */
  reconnect(){return this.recovering??=this.recover().finally(()=>{this.recovering=null;});}
  private async recover(){
    // A newer create/join/leave always wins: this recovery is for whichever session was live when it started, never a session the user has since replaced.
    const my=++this.epoch;
    // Right after a refresh the server may not have noticed the old socket drop yet, so neither the token nor the key is accepted
    // for a few seconds. Alternate both until a 60 s deadline instead of giving up on the first refusal.
    const deadline=Date.now()+60_000;
    for(let attempt=0;Date.now()<deadline;attempt++){
      if(my!==this.epoch)return;
      const token=localStorage.getItem('saloon.reconnect');
      if(token){
        try{const room=await withTimeout(this.client.reconnect(token),30_000);if(my!==this.epoch)return void room.leave();this.bind(room);return;}
        catch(e){const msg=String((e as Error)?.message??e);console.warn('reconnect attempt failed',attempt,msg);if(/format/i.test(msg))localStorage.removeItem('saloon.reconnect');}
      }
      if(await this.rejoinWithKey(my))return;
      if(my!==this.epoch)return;
      if(!localStorage.getItem('saloon.reconnect')&&!localStorage.getItem('saloon.rejoinKey'))break;
      await sleep(Math.min(3000,1000+attempt*500));
    }
    localStorage.removeItem('saloon.reconnect');localStorage.removeItem('saloon.rejoinKey');
    if(my!==this.epoch)return;
    this.room=null;this.update({...initial,error:'Bàn đã kết thúc hoặc hết thời gian kết nối lại.'});
  }
  leave(){++this.epoch;this.offline?.dispose();this.offline=null;localStorage.removeItem('saloon.reconnect');localStorage.removeItem('saloon.rejoinKey');const room=this.room;this.room=null;this.update({...initial});void room?.leave();}
  send(input:CommandInput){
    const command={...input,commandId:uuid(),handId:this.state.snapshot?.handId} as Command;
    if(this.offline){this.offline.send(command);return;}
    if(!this.room)return;
    this.room.send('command',command);
  }
  private formatError(e:unknown){if(e instanceof Error){if(/fetch|connect|network/i.test(e.message))return 'Chưa kết nối được saloon. Hãy kiểm tra server đang chạy.';return e.message;}return 'Không thể kết nối bàn chơi.';}
}
export const connection=new GameConnection();
