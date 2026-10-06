/** Fullscreen preserves the phone's orientation so either layout remains usable. */
export async function enterMobileFullscreen():Promise<boolean>{
  try{
    if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
    return !!document.fullscreenElement;
  }catch{return false;}
}
