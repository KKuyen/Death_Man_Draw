/** navigator.clipboard only exists in secure contexts (HTTPS/localhost); plain-HTTP deployments (e.g. a bare IP with no TLS) need the legacy execCommand fallback. */
export async function copyText(text:string):Promise<void>{
  if(navigator.clipboard){await navigator.clipboard.writeText(text);return;}
  const ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.opacity='0';ta.style.left='-9999px';
  document.body.appendChild(ta);ta.focus();ta.select();
  try{document.execCommand('copy');}finally{document.body.removeChild(ta);}
}
