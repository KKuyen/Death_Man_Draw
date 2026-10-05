import {registerAudio,effectLevel} from './soundBus';
let audioContext:AudioContext|null=null;
/** Short burst of filtered noise (card/felt scrape, used by the fold cue). */
function noiseBurst(ctx:AudioContext,dest:AudioNode,at:number,dur:number,freq:number,peak:number){
  const buf=ctx.createBuffer(1,Math.max(1,Math.round(ctx.sampleRate*dur)),ctx.sampleRate);
  const data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  const src=ctx.createBufferSource();src.buffer=buf;
  const band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.value=freq;band.Q.value=.8;
  const g=ctx.createGain();g.gain.setValueAtTime(peak,at);g.gain.exponentialRampToValueAtTime(.001,at+dur);
  src.connect(band);band.connect(g);g.connect(dest);src.start(at);src.stop(at+dur);
}
export function playCue(cue:string,seat=0,volume=0.35){
  volume=effectLevel(volume);
  if(!volume)return;
  try{
    audioContext??=registerAudio(new AudioContext());if(audioContext.state==='suspended')void audioContext.resume();
    const ctx=audioContext,now=ctx.currentTime;
    const pan=ctx.createStereoPanner();pan.pan.value=Math.max(-.8,Math.min(.8,(seat-1.5)*.45));pan.connect(ctx.destination);
    const gain=ctx.createGain();gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+.22);gain.connect(pan);
    if(/^joint_cl(ick|ack)/.test(cue)){
      // click = high wooden tick, clack = lower brassy knock; *_soft is quieter
      const clack=cue.startsWith('joint_clack'),soft=cue.endsWith('_soft');gain.gain.setValueAtTime(volume*(soft?.45:1),now);
      for(const [offset,freq] of (clack?[[0,780],[.05,520]]:[[0,1900],[.05,1250]]) as [number,number][]){const o=ctx.createOscillator();o.type=clack?'square':'triangle';o.frequency.value=freq;o.connect(gain);o.start(now+offset);o.stop(now+offset+.06);}
    }else if(/prosthetic|fumble|tap/i.test(cue)){
      for(const [offset,freq] of [[0,1900],[.06,1100]] as const){const o=ctx.createOscillator();o.type='triangle';o.frequency.value=freq;o.connect(gain);o.start(now+offset);o.stop(now+offset+.06);}
    }else if(cue==='raise'){
      // a handful of poker chips clinking: short bright clicks in quick, slightly irregular succession
      const notes=[2400,2000,2600,2150,2350];notes.forEach((f,i)=>{const t=now+i*.045+Math.random()*.012;const og=ctx.createGain();og.gain.setValueAtTime(volume*.8,t);og.gain.exponentialRampToValueAtTime(.001,t+.07);og.connect(pan);const o=ctx.createOscillator();o.type='square';o.frequency.value=f;o.connect(og);o.start(t);o.stop(t+.07);});
    }else if(cue==='call'){
      // "cộc cộc": two dry wooden knocks on the table
      for(const offset of [0,.14]){const t=now+offset;const og=ctx.createGain();og.gain.setValueAtTime(volume,t);og.gain.exponentialRampToValueAtTime(.001,t+.09);og.connect(pan);const o=ctx.createOscillator();o.type='square';o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(110,t+.08);o.connect(og);o.start(t);o.stop(t+.09);}
    }else if(cue==='fold'){
      // "xoạt xoạt": two quick felt/card scrapes as the hand is swept away
      noiseBurst(ctx,pan,now,.16,1400,volume*.9);noiseBurst(ctx,pan,now+.1,.14,1000,volume*.7);
    }else{
      const o=ctx.createOscillator();o.type=/verdict|accus/i.test(cue)?'sine':'triangle';o.frequency.setValueAtTime(/win/i.test(cue)?660:360,now);o.frequency.exponentialRampToValueAtTime(/win/i.test(cue)?880:120,now+.2);o.connect(gain);o.start(now);o.stop(now+.22);
    }
  }catch{/* audio can be disabled by browser policy */}
}

/** Loud, distinct stinger when somebody plays a magic card (public by default). Pitch/shape by kind: passive = chime, active = hit, swap = shuffle. */
export function playMagicCue(magicId:string,seat=0,category?:string,kind:'passive'|'active'='active'){
  const volume=effectLevel(.7);
  if(!volume)return;
  try{
    audioContext??=registerAudio(new AudioContext());if(audioContext.state==='suspended')void audioContext.resume();
    const ctx=audioContext,now=ctx.currentTime;
    const pan=ctx.createStereoPanner();pan.pan.value=Math.max(-.8,Math.min(.8,(seat-1.5)*.45));pan.connect(ctx.destination);
    const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.02);gain.gain.exponentialRampToValueAtTime(.001,now+1.1);gain.connect(pan);
    const seed=[...(category||magicId)].reduce((a,c)=>a+c.charCodeAt(0),0)%5;
    const swap=category==='swap';const notes=kind==='passive'?[523,659,784,1047]:swap?[330,392,330,494,392]:[196,294,392,[233,277,330,415,311][seed]];
    notes.forEach((f,i)=>{const o=ctx.createOscillator();o.type=kind==='active'?'sawtooth':'triangle';o.frequency.value=f;o.connect(gain);o.start(now+i*.09);o.stop(now+i*.09+.5);});
    const thud=ctx.createOscillator();thud.type='sine';thud.frequency.setValueAtTime(110,now);thud.frequency.exponentialRampToValueAtTime(40,now+.4);thud.connect(gain);thud.start(now);thud.stop(now+.45);
  }catch{/* audio can be disabled by browser policy */}
}

/** One mechanical tick per displayed second; a smooth gain rise through the final ten seconds. */
export const countdownVolume=(seconds:number)=>seconds>10?.035:.05+.25*(10-Math.max(1,seconds))/9;
export function playCountdownTick(seconds:number){
 try{audioContext??=registerAudio(new AudioContext());const c=audioContext,t=c.currentTime,g=c.createGain(),o=c.createOscillator();g.gain.setValueAtTime(effectLevel(countdownVolume(seconds)),t);g.gain.exponentialRampToValueAtTime(.0001,t+.055);o.type='triangle';o.frequency.value=seconds%2?1250:920;o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.06);o.onended=()=>{o.disconnect();g.disconnect();};}catch{/* browser policy */}
}
export function playTurnCue(){
 try{audioContext??=registerAudio(new AudioContext());const c=audioContext,t=c.currentTime;[523,784].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(effectLevel(.23),t+i*.12);g.gain.exponentialRampToValueAtTime(.001,t+i*.12+.35);o.connect(g);g.connect(c.destination);o.start(t+i*.12);o.stop(t+i*.12+.36);o.onended=()=>{o.disconnect();g.disconnect();};});}catch{/* browser policy */}
}
