let effectsVolume=.7,sinkId='';
const contexts=new Set<AudioContext>();
export const effectLevel=(volume:number)=>volume*effectsVolume;
export function registerAudio(ctx:AudioContext){contexts.add(ctx);void route(ctx);return ctx;}
async function route(ctx:AudioContext){const c=ctx as AudioContext&{setSinkId?:(id:string)=>Promise<void>};if(c.setSinkId)await c.setSinkId(sinkId).catch(()=>undefined);}
export function setEffectsVolume(v:number){effectsVolume=Math.max(0,Math.min(1,v));}
export async function setSoundOutput(id:string){sinkId=id;await Promise.all([...contexts].map(route));}
export function unlockAudio(){for(const ctx of contexts)if(ctx.state==='suspended')void ctx.resume();}
