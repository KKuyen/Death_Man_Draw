import {registerAudio} from './soundBus';
/** Original procedural saloon theme: slow minor plucked notes over a quiet bass. */
export type MusicMode='lobby'|'game';
class SaloonMusic {
 private ctx:AudioContext|null=null;private gain:GainNode|null=null;private timer:ReturnType<typeof setInterval>|null=null;private next=0;private beat=0;private volume=.22;private mode:MusicMode='lobby';
 set(enabled:boolean,volume:number,mode:MusicMode='lobby'){this.volume=volume;this.mode=mode;if(!enabled){if(this.timer)clearInterval(this.timer);this.timer=null;if(this.gain&&this.ctx)this.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.08);return;}
  this.ctx??=registerAudio(new AudioContext());this.gain??=this.ctx.createGain();this.gain.connect(this.ctx.destination);this.gain.gain.setTargetAtTime(volume*.25,this.ctx.currentTime,.15);
  if(this.timer)return;this.next=this.ctx.currentTime+.1;this.beat=0;this.timer=setInterval(()=>this.schedule(),200);this.schedule();
 }
 private note(midi:number,at:number,duration:number,vol:number){const c=this.ctx!,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=440*Math.pow(2,(midi-69)/12);g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(vol,at+.015);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(this.gain!);o.start(at);o.stop(at+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 private schedule(){const c=this.ctx!;if(c.state==='suspended')return;if(this.next<c.currentTime)this.next=c.currentTime+.05;
  const game=this.mode==='game';
  const melody=game?[64,67,71,74,71,67,64,62,64,69,72,76,72,69,64,62,64,67,71,74,71,67,64,60,64,69,72,76,72,67,64,0]:[64,67,71,67,64,62,60,62,64,67,69,67,62,59,57,59,60,64,67,64,60,59,57,59,62,66,69,66,62,59,57,0];
  const bass=game?[40,45,47,48]:[40,45,48,47];
  const step=game?.42:.6,dur=game?.62:1.1,bassDur=game?1.1:2,vol=game?.4:.35;
  while(this.next<c.currentTime+.5){const i=this.beat%32;if(melody[i])this.note(melody[i],this.next,dur,vol);if(i%4===0)this.note(bass[Math.floor(i/8)],this.next,bassDur,.5);this.next+=step;this.beat++;}
 }
}
export const music=new SaloonMusic();
