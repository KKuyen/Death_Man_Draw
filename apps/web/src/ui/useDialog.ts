import {useEffect,type RefObject} from 'react';

/** Keep keyboard focus in an open surface, close on Escape, then return to its opener. */
export function useDialog(ref:RefObject<HTMLElement|null>,onClose:()=>void){
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const root=ref.current;if(!root)return;
  const controls=()=>Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
  (controls()[0]||root).focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}
   if(e.key==='Tab'){const items=controls();const index=items.indexOf(document.activeElement as HTMLElement);e.preventDefault();e.stopPropagation();(items[(index+(e.shiftKey?-1:1)+items.length)%items.length]||root).focus();}
  };
  document.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
}
