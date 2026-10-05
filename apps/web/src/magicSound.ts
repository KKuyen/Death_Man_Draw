import {registerAudio,effectLevel} from './soundBus';
/**
 * Procedural WebAudio stingers for magic cards (no assets). 6 stereo families, chosen from the catalog `sound` category
 * (MAGIC.sound / GameEvent.cue): coin, peek, shift, power, dark, hush. Pan follows the user's seat. Plus a faint private hint cue.
 *  coin  : coin, rescue, cushion      bright bell arpeggio + clink
 *  peek  : peek, lens, reveal         rising shimmer sweep
 *  shift : swap, board, market        card-riffle noise bursts
 *  power : enhance, cleanse, armor    major-chord swell + sparkle
 *  dark  : curse, trick, decoy        low growl with a tritone
 *  hush  : silence                    barely audible breath
 */
export type MagicFamily='coin'|'peek'|'shift'|'power'|'dark'|'hush';
const FAMILY:Record<string,MagicFamily>={coin:'coin',rescue:'coin',cushion:'coin',peek:'peek',lens:'peek',reveal:'peek',swap:'shift',board:'shift',market:'shift',enhance:'power',cleanse:'power',armor:'power',curse:'dark',trick:'dark',decoy:'dark',silence:'hush',steal:'dark',shatter:'dark',fortune:'shift'};
let ctx:AudioContext|null=null;
const ac=()=>{ctx??=registerAudio(new AudioContext());if(ctx.state==='suspended')void ctx.resume();return ctx;};
export const magicFamily=(category:string):MagicFamily=>FAMILY[category]??'power';
function noise(c:AudioContext,dur:number){const b=c.createBuffer(1,Math.ceil(c.sampleRate*dur),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;return s;}
function out(c:AudioContext,seat:number,vol:number,len:number){
  const pan=c.createStereoPanner();pan.pan.value=Math.max(-.85,Math.min(.85,(seat-1.5)*.5));pan.connect(c.destination);
  vol=effectLevel(vol);const g=c.createGain();const t=c.currentTime;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+len);g.connect(pan);return g;
}
const osc=(c:AudioContext,type:OscillatorType,f:number,at:number,dur:number,dest:AudioNode,f2?:number)=>{const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f,at);if(f2)o.frequency.exponentialRampToValueAtTime(f2,at+dur);o.connect(dest);o.start(at);o.stop(at+dur+.05);};
/** Loud, distinctive stinger for a public magic use. `category` = MagicDefinition.sound / event cue. */
export function playMagicCategory(category:string,seat=0,volume=.8){
  try{
    const c=ac(),t=c.currentTime;
    switch(magicFamily(category)){
      case 'coin':{const g=out(c,seat,volume,1.3);[1318,1568,2093,2637].forEach((f,i)=>osc(c,'triangle',f,t+i*.08,.35,g));osc(c,'sine',3136,t+.34,.5,g);break;}
      case 'peek':{const g=out(c,seat,volume*.9,1.4);osc(c,'sine',320,t,1.0,g,1760);osc(c,'triangle',640,t+.05,1.0,g,3520);const n=noise(c,.6),f=c.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(600,t);f.frequency.exponentialRampToValueAtTime(6000,t+.8);n.connect(f);f.connect(g);n.start(t);break;}
      case 'shift':{const g=out(c,seat,volume,1.0);for(let i=0;i<7;i++){const n=noise(c,.06),f=c.createBiquadFilter();f.type='highpass';f.frequency.value=2500+i*300;n.connect(f);f.connect(g);n.start(t+i*.07);}osc(c,'square',196,t+.5,.25,g,392);break;}
      case 'power':{const g=out(c,seat,volume,1.4);[262,330,392,523].forEach(f=>osc(c,'sawtooth',f,t,1.1,g));[1047,1319,1568].forEach((f,i)=>osc(c,'sine',f,t+.2+i*.1,.5,g));break;}
      case 'dark':{const g=out(c,seat,volume,1.5);osc(c,'sawtooth',92,t,1.2,g,60);osc(c,'sawtooth',130,t,1.2,g,85);osc(c,'square',46,t,1.0,g);const n=noise(c,.9),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=380;n.connect(f);f.connect(g);n.start(t);break;}
      case 'hush':{const g=out(c,seat,volume*.12,.6);const n=noise(c,.5),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=900;n.connect(f);f.connect(g);n.start(t);break;}
    }
  }catch{/* audio can be blocked by the browser */}
}
/** Faint private whisper for a hinted card used on you (pairs with scene.showMagicHint). kind: 'looked' | 'hexed'. */
export function playHintCue(kind='looked',volume=.18){
  try{
    const c=ac(),t=c.currentTime,g=out(c,1.5,volume,1.1);
    const n=noise(c,1),f=c.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(kind==='hexed'?500:1400,t);f.frequency.exponentialRampToValueAtTime(kind==='hexed'?250:2600,t+.9);f.Q.value=3;n.connect(f);f.connect(g);n.start(t);
    osc(c,'sine',kind==='hexed'?110:880,t+.1,.8,g);
  }catch{/* ignore */}
}

/** Riffle shuffle: a run of short card-flick noise bursts. */
export function playShuffle(volume=.35){
  try{const c=ac(),t=c.currentTime,g=out(c,1.5,volume,1.9);for(let i=0;i<22;i++){const n=noise(c,.04),f=c.createBiquadFilter();f.type='highpass';f.frequency.value=1800+(i%5)*500;n.connect(f);f.connect(g);n.start(t+.45+i*.06+(i>11?.05:0));}}catch{/* ignore */}
}
