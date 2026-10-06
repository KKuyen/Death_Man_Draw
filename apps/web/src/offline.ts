import {createGame} from '@saloon/rules';
import {runBots,type BotMemory} from '@saloon/bots';
import type {CharacterId,Command,GameEngine,GameEvent,PrivateSnapshot,RoomSnapshot} from '@saloon/protocol';
import {uuid} from './uuid';

export interface OfflineSink {public:(s:RoomSnapshot)=>void;private:(p:PrivateSnapshot)=>void;event:(e:GameEvent)=>void;error:(m:string)=>void}
const botNames:[string,CharacterId][]=[['Dusty Pete','lynx'],['Mad Maggie','badger'],['Silas Reed','rabbit']];
/** In-browser room: runs the pure rules engine locally with the shared bot brain (@saloon/bots). Prototype/demo only. */
export class OfflineRoom {
  readonly playerId='you'; private engine:GameEngine; private timer=0; private mems=new Map<string,BotMemory>(); private lastKey=''; private bots=0;
  constructor(name:string,character:CharacterId,private sink:OfflineSink){
    this.engine=createGame({roomId:'offline',code:'DEMO'});
    this.engine.addPlayer({id:this.playerId,name,character},Date.now());
    this.timer=window.setInterval(()=>this.tick(),50); this.publish(true);
  }
  addBots(n:number){for(let i=0;i<n&&this.bots<3;i++){const [name,character]=botNames[this.bots++];this.engine.addPlayer({id:`bot${this.bots}`,name,character,bot:true},Date.now());}this.publish(true);}
  send(command:Command){
    if(command.type==='addBot'){this.addBots(1);return;}
    const r=this.engine.applyCommand(this.playerId,{...command,commandId:command.commandId||uuid()},Date.now());
    if(!r.ok&&r.error)this.sink.error(r.error);
    this.publish(true);
  }
  private tick(){
    const now=Date.now();this.engine.tick(now);runBots(this.engine,this.mems,now,Math.random,uuid);this.publish(false);
  }
  private publish(force:boolean){
    const now=Date.now();const pub=this.engine.publicSnapshot(now),priv=this.engine.privateSnapshot(this.playerId,now);
    const key=JSON.stringify([pub,priv],(k,v)=>k==='serverTime'?undefined:v);
    if(force||key!==this.lastKey){this.lastKey=key;this.sink.public(pub);this.sink.private(priv);}
    for(const e of this.engine.takeEvents()){if(e.to&&e.to!==this.playerId)continue; // private events of bots never reach the UI
      this.sink.event(e);}
  }
  dispose(){clearInterval(this.timer);}
}
