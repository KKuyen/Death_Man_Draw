/** Anchor a server timestamp once at receipt. Never recompute its offset on each render. */
export function remainingSeconds(deadline:number,serverTime:number,receivedAt:number,now:number){return deadline?Math.max(0,Math.ceil((deadline-serverTime-Math.max(0,now-receivedAt))/1000)):0;}
