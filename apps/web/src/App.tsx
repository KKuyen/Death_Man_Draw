import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {Card,CharacterId} from '@saloon/protocol';
import {connection,type CommandInput} from './network';
import type {SaloonScene} from './scene';
import {playCue,playCountdownTick,playTurnCue} from './audio';
import {remainingSeconds} from './clock';
import {voice} from './voice';
import {music} from './music';
import {setEffectsVolume,setSoundOutput,unlockAudio} from './soundBus';
import {SettingsDrawer,readPreferences} from './ui/Settings';
import {RoomSetup} from './ui/RoomSetup';
import {RoomSocial} from './ui/Social';
import {playMagicCategory,playHintCue} from './magicSound';
import {getMagic} from '@saloon/content';
import {Icon,PlayingCard,characters,fmt,streetName} from './ui/common';
import {Nameplates} from './ui/Nameplates';
import {ActionBar} from './ui/ActionBar';
import {HelpDrawer} from './ui/Help';
import {PrivateMarket,ReadyRoster,Countdown} from './ui/Market';
import {BoardStrip,OwnHand} from './ui/Hud';
import {MagicTray} from './ui/MagicTray';
import {Toasts,PeekModal,peekIsCrystal,peekNote} from './ui/Toasts';
import {nextStepHint} from './ui/hint';
import {PhaseStepper,MatchStrip,TurnBanner,EventLog,Coach,usePhaseBanner} from './ui/Progress';
import './game.css';
import './magic.css';
import './social.css';

/** Optional scene hooks (held cards / look-down camera); no-ops until the scene implements them. */
interface SceneHooks {showMagicUse?:(seat:number,magicId:string,opts?:{name?:string;targetSeat?:number})=>void;showMagicPeek?:(seat:number,magicId:string)=>void;setHoldCards?:(cards:Card[]|null)=>void}

/** The 3D scene is owned by another module; never let a scene exception take the DOM UI down. */
const safe=(f:()=>void)=>{try{f();}catch(e){console.warn('scene',e);}};

export function App(){
 const state=useSyncExternalStore(connection.subscribe,connection.getSnapshot);const {snapshot,own,selfId}=state;
 const canvas=useRef<HTMLCanvasElement>(null),scene=useRef<SaloonScene|null>(null);
 const [loaded,setLoaded]=useState(false),[sceneTick,setSceneReady]=useState(0),[name,setName]=useState(localStorage.getItem('saloon.name')||''),[character,setCharacter]=useState<CharacterId>('coyote'),[roomCode,setRoomCode]=useState(()=>new URLSearchParams(location.search).get('join')?.trim().toUpperCase()||'');
 const [prefs,setPrefs]=useState(readPreferences),[settings,setSettings]=useState(false),[micOn,setMicOn]=useState(false),[micError,setMicError]=useState(''),[chatOpen,setChatOpen]=useState(false),[mutedPlayers,setMutedPlayers]=useState<string[]>([]);
 const [help,setHelp]=useState(false),[raiseTo,setRaiseTo]=useState(40),[muted,setMuted]=[prefs.muted,(v:boolean)=>setPrefs(p=>({...p,muted:v}))],[lowQuality,setLowQuality]=[prefs.lowQuality,(v:boolean)=>setPrefs(p=>({...p,lowQuality:v}))];
 const [now,setNow]=useState(Date.now()),[copied,setCopied]=useState(false),[copiedLink,setCopiedLink]=useState(false),[coach,setCoach]=useState(false);
 useEffect(()=>{if(location.search.includes('join='))history.replaceState(null,'',location.pathname);},[]);
 const [flash,setFlash]=useState<{magicId:string;n:string}|null>(null);
 const handStart=useRef({hand:-1,wallet:0});
 const me=snapshot?.players.find(p=>p.id===selfId),others=snapshot?.players.filter(p=>p.id!==selfId&&!p.eliminated)||[];
 const spectating=!!me?.eliminated;
 const clockAnchor=useRef({snapshot:null as typeof snapshot,at:Date.now()});
 if(clockAnchor.current.snapshot!==snapshot)clockAnchor.current={snapshot,at:Date.now()};
 const turn=snapshot?.turnPlayerId===selfId,host=!!snapshot&&snapshot.hostId===selfId;
 useEffect(()=>{
  if(!canvas.current)return;let cancelled=false,instance:SaloonScene|null=null;
  // Babylon is large: load it as a separate chunk so the lobby UI paints first.
  void import('./scene').then(({SaloonScene})=>{if(cancelled||!canvas.current)return;instance=new SaloonScene(canvas.current,()=>setLoaded(true));scene.current=instance;if(import.meta.env.DEV||location.search.includes('debug'))(window as unknown as {__saloon?:SaloonScene}).__saloon=instance;
   // the state that arrived before the chunk finished loading
   const latest=connection.getSnapshot();safe(()=>instance?.sync(latest.snapshot,latest.snapshot?.players.find(p=>p.id===latest.selfId)?.eliminated?null:latest.own,latest.selfId));setSceneReady(v=>v+1);});
  return()=>{cancelled=true;instance?.dispose();scene.current=null;};},[]);
 useEffect(()=>{safe(()=>scene.current?.sync(snapshot,spectating?null:own,selfId));},[snapshot,own,selfId,spectating]);
 useEffect(()=>{safe(()=>scene.current?.setQuality(lowQuality));},[lowQuality,sceneTick]);
 useEffect(()=>{safe(()=>scene.current?.setSoundEnabled(!muted));},[muted,sceneTick]);
 useEffect(()=>{safe(()=>(scene.current as SceneHooks|null)?.setHoldCards?.(!spectating&&snapshot?.phase==='playing'?own?.hand??null:null));},[own?.hand.map(c=>c.id).join(),snapshot?.phase,sceneTick,spectating]);
 useEffect(()=>{const e=state.event;if(e&&e.to===selfId&&e.magicId&&(e.type==='use'||e.type==='notice')){setFlash({magicId:e.magicId,n:e.id});const h=setTimeout(()=>setFlash(null),2500);return()=>clearTimeout(h);}},[state.event?.id]);
 useEffect(()=>{const e=state.event;if(!e||(e.to&&e.to!==selfId))return;const seatOf=(id?:string)=>snapshot?.players.find(p=>p.id===id)?.seat??0;const seat=seatOf(e.playerId);
  const hooks=scene.current as SceneHooks|null;
  if(e.type==='shuffle')return; // the scene shuffles by itself on a new handId (calling shuffleDeck here would double it)
  if(e.type==='magicUsed'&&!e.to){ // public use: card over the user's head + sound family from the catalog
   if(e.magicId){const def=getMagic(e.magicId);safe(()=>hooks?.showMagicUse?.(seat,e.magicId!,{name:def?.name,targetSeat:e.targetPlayerId?seatOf(e.targetPlayerId):undefined}));if(!muted)playMagicCategory(e.cue??def?.sound??'power',seat);}
   return;}
  if(e.type==='magicHint'){safe(()=>scene.current?.onGameEvent(e,seat));if(!muted)playHintCue(e.cue);return;}
  safe(()=>scene.current?.onGameEvent(e,seat));if(e.cue&&e.type==='sound'&&!muted)playCue(e.cue,seat);},[state.event?.id]);
 // K10 result: show the peeked magic card by that opponent (actor's client only; own.peeks is private)
 const peekSeen=useRef(-1);
 useEffect(()=>{const ps=own?.peeks??[];if(spectating||peekSeen.current<0){peekSeen.current=ps.length;return;}
  if(ps.length<peekSeen.current)peekSeen.current=0;
  for(const p of ps.slice(peekSeen.current)){if(p.magic?.magicId&&!muted){/* sound comes from the use event */}
   if(p.magic?.magicId)safe(()=>(scene.current as SceneHooks|null)?.showMagicPeek?.(snapshot?.players.find(x=>x.id===p.magic!.targetPlayerId)?.seat??0,p.magic!.magicId!));}
  peekSeen.current=ps.length;},[own?.peeks.length,snapshot?.handId,spectating]);
 const lastActionSound=useRef('');
 useEffect(()=>{if(!snapshot)return;const actions=snapshot.log.filter(l=>l.kind==='bet');if(!actions.length)return;let fresh:typeof actions;if(!lastActionSound.current)fresh=[];else{const i=actions.findIndex(a=>a.id===lastActionSound.current);fresh=i<0?actions.slice(-1):actions.slice(i+1);}for(const a of fresh){const text=a.text;if(/\btăng cược\b/.test(text)||/\ball-in\b/.test(text))playCue('raise');else if(/\btheo cược\b/.test(text))playCue('call');else if(/\bbỏ bài\b/.test(text))playCue('fold');else if(/\bcheck\b/.test(text))playCue('call_soft');}lastActionSound.current=actions.at(-1)!.id;},[snapshot?.log.at(-1)?.id]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),200);return()=>clearInterval(t);},[]);
 useEffect(()=>{if(own?.legal) setRaiseTo(v=>Math.max(own.legal.minRaiseTo,Math.min(v,own.legal.maxRaiseTo)));},[own?.legal.minRaiseTo,own?.legal.maxRaiseTo]);
 useEffect(()=>{localStorage.setItem('saloon.name',name);},[name]);
 useEffect(()=>{void connection.resume();if(location.search.includes('debug'))(window as unknown as {__conn?:unknown}).__conn=connection;},[]);
 // first game ever: show the quick coach once (demo or real)
 useEffect(()=>{if(snapshot&&!spectating&&!localStorage.getItem('saloon.coach.done')){setCoach(true);}},[!!snapshot,spectating]);
 const closeCoach=()=>{setCoach(false);try{localStorage.setItem('saloon.coach.done','1');}catch{/* private mode */}};
 // wallet at the start of the hand, for the +/- trend
 useEffect(()=>{if(snapshot&&own&&handStart.current.hand!==snapshot.handId){handStart.current={hand:snapshot.handId,wallet:own.wallet};}},[snapshot?.handId,own?.wallet]);
 useEffect(()=>{if(!state.error)return;const t=setTimeout(()=>connection.clearError(),6000);return()=>clearTimeout(t);},[state.error]);
 useEffect(()=>{const c=canvas.current;const prevent=(e:Event)=>e.preventDefault();c?.addEventListener('contextmenu',prevent);return()=>c?.removeEventListener('contextmenu',prevent);},[]);
 const send=(command:CommandInput)=>connection.send(command);
 const seconds=snapshot?remainingSeconds(snapshot.deadline,snapshot.serverTime,clockAnchor.current.at,now):0;
 const lastTick=useRef(''),lastTurn=useRef('');
 const myTurnKey=snapshot?.phase==='playing'&&turn?`${snapshot.roomId}:${snapshot.handId}:${snapshot.street}:${snapshot.deadline}`:'';
 useEffect(()=>{if(myTurnKey&&myTurnKey!==lastTurn.current&&!muted)playTurnCue();lastTurn.current=myTurnKey;},[myTurnKey]);
 useEffect(()=>{const key=`${snapshot?.deadline}:${seconds}`;if(key!==lastTick.current&&seconds>0&&!spectating&&(snapshot?.phase==='market'||snapshot?.phase==='playing'&&turn)&&!muted)playCountdownTick(seconds);lastTick.current=key;},[snapshot?.deadline,seconds,turn,muted,spectating]);
 const betLogSeen=useRef<{code?:string;len:number}>({len:0});
 useEffect(()=>{
  if(!snapshot)return;
  if(betLogSeen.current.code!==snapshot.code){betLogSeen.current={code:snapshot.code,len:snapshot.log.length};return;}
  const from=Math.min(betLogSeen.current.len,snapshot.log.length);
  if(!muted)for(const entry of snapshot.log.slice(from)){
   if(entry.kind!=='bet')continue;
   const seat=snapshot.players.find(p=>entry.text.startsWith(`${p.name} `))?.seat??0;
   const cue=entry.text.includes('bỏ bài')?'fold':entry.text.includes('tăng cược')?'raise':entry.text.includes('theo cược')?'call':null;
   if(cue)playCue(cue,seat);
  }
  betLogSeen.current.len=snapshot.log.length;
 },[snapshot?.log.length,snapshot?.code,muted]);
 const musicMode=snapshot&&snapshot.phase!=='lobby'?'game':'lobby';
 useEffect(()=>{setEffectsVolume(prefs.muted?0:prefs.effects);music.set(prefs.musicOn,prefs.music,musicMode);voice.setVolume(prefs.voice);voice.setOutput(prefs.output);void setSoundOutput(prefs.output);if(voice.inputId!==prefs.input)void voice.setInput(prefs.input);localStorage.setItem('saloon.settings',JSON.stringify(prefs));},[prefs,musicMode]);
 useEffect(()=>{voice.onChange=(on,error)=>{setMicOn(on);setMicError(error||'');};const unlock=()=>{unlockAudio();voice.unlock();};window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);return()=>{voice.onChange=null;window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};},[]);
 const toggleMic=()=>{setMicError('');if(voice.enabled)voice.stop();else void voice.start(prefs.input);};
 const busy=state.status==='connecting';
 async function copy(){if(!snapshot)return;await navigator.clipboard.writeText(snapshot.code);setCopied(true);setTimeout(()=>setCopied(false),1800);}
 async function copyLink(){if(!snapshot)return;await navigator.clipboard.writeText(`${location.origin}${location.pathname}?join=${snapshot.code}`);setCopiedLink(true);setTimeout(()=>setCopiedLink(false),1800);}
 function bet(action:'check'|'call'|'raise'|'fold'|'allIn'){send({type:'bet',action,amount:action==='raise'?raiseTo:undefined});}
 const phase=snapshot?.phase;
 const phaseLabel=!snapshot?'SALOON N° 04':phase==='lobby'?'SẢNH CHỜ':phase==='market'?'CHỢ BÀI PHÉP':phase==='showdown'?'KẾT QUẢ VÁN':phase==='finished'?'HẠ MÀN':streetName[snapshot.street];
 const hint=snapshot?nextStepHint(snapshot,own,selfId,seconds,host):'';
 const banner=usePhaseBanner(snapshot,seconds);
 const trend=own&&handStart.current.hand===snapshot?.handId?own.wallet-handStart.current.wallet:0;
 const inHand=phase==='playing'&&!me?.eliminated;
 return <div className={`app ${snapshot?'in-game':'in-lobby'} ${snapshot?`phase-${snapshot.phase}`:''} ${spectating?'is-spectating':''}`}>
  <canvas ref={canvas} className="world" aria-label="Quán saloon 3D"/><div className="vignette"/><div className="grain"/>
  <header className="topbar"><a className="wordmark" href="#" onClick={e=>e.preventDefault()}><span className="logo-spade">♠</span><span>DEAD MAN’S <b>DRAW</b></span></a><div className="top-center"><span className="live-dot"/>{phaseLabel}{snapshot&&<span className="hand-count">VÁN {snapshot.handId}</span>}</div><nav><button onClick={()=>setSettings(v=>!v)} aria-label="Cài đặt" title="Cài đặt"><Icon name="settings"/></button>{snapshot&&<><button className={micOn?'mic-on':'dim'} onClick={toggleMic} aria-label={micOn?'Tắt mic':'Bật mic'} title={micOn?'Tắt mic':'Bật mic'}><Icon name={micOn?'mic':'micOff'}/></button><button onClick={()=>setChatOpen(v=>!v)} aria-label="Mở chat" title="Chat · Enter"><Icon name="chat"/></button></>}<button className={muted?'dim':''} onClick={()=>setMuted(!muted)} aria-label={muted?'Bật âm thanh':'Tắt âm thanh'} title={muted?'Bật âm thanh':'Tắt âm thanh'}><Icon name="sound"/></button><button onClick={()=>setHelp(h=>!h)} aria-label="Cách chơi" title="Cách chơi"><Icon name="help"/></button>{snapshot&&<button onClick={()=>connection.leave()} aria-label="Rời bàn" title="Rời bàn"><Icon name="exit"/></button>}</nav></header>
  {!snapshot?<>
   <main className="welcome"><div className="welcome-copy"><div className="eyebrow"><span className="rule-line"/>THE LAST HONEST SALOON<span className="rule-line"/></div><h1>BÀI ĐẸP.<br/><em>TAY KÍN.</em></h1><p>Bốn tay chơi. Một bàn poker.<br/>Mua bài phép trong bóng tối — dùng đúng lúc.</p><div className="welcome-tags"><span><i>♠</i> TEXAS HOLD’EM</span><span><Icon name="users" size={14}/> MULTIPLAYER</span><span><Icon name="eye" size={14}/> BÀI PHÉP</span></div></div>
   <section className="entry-panel"><div className="entry-heading"><span className="eyebrow">MỘT CHỖ Ở BÀN</span><span className="entry-number">01 — 04</span></div><h2>Người lạ, tên gì?</h2><label className="field-label" htmlFor="player-name">TÊN TAY CHƠI</label><input id="player-name" maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Kẻ lạ mặt" autoComplete="nickname"/><label className="field-label">CHỌN NHÂN VẬT</label><div className="character-picker">{characters.map(c=><button key={c.id} className={character===c.id?'chosen':''} onClick={()=>setCharacter(c.id)} aria-label={c.label}><span className="character-glyph" style={{color:c.color}}>{c.glyph}</span><span>{c.name}</span></button>)}</div><button className="btn gold entry-create" disabled={busy} onClick={()=>void connection.create(name,character)}>{busy?'ĐANG MỞ CỬA…':'MỞ BÀN MỚI'}<Icon name="chevron"/></button><div className="join-row"><input aria-label="Mã bàn" placeholder="MÃ BÀN" maxLength={8} value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())}/><button className="btn outline" disabled={busy||!roomCode.trim()} onClick={()=>void connection.join(roomCode,name,character)}>VÀO BÀN</button></div><button className="demo-link" disabled={busy} onClick={()=>void connection.create(name,character,true)}>Chơi thử với 3 đối thủ máy <span>↗</span></button></section></main>
   <footer className="welcome-footer"><span>WESTERN POKER · KHÔNG CÓ TAY CHƠI VÔ TỘI</span><span>{loaded?'SALOO N° 04 · OPEN':'ĐANG DỰNG SALOON…'}</span></footer>
  </>:<>
   <div className="room-label"><button onClick={()=>void copy()} title="Sao chép mã bàn"><span className="eyebrow">MÃ BÀN</span><strong>{copied?'ĐÃ CHÉP':snapshot.code}</strong></button><button className="room-label-copy-link" onClick={()=>void copyLink()} aria-label="Sao chép link mời" title={copiedLink?'Đã chép link':'Sao chép link mời'}><Icon name="copy" size={13}/></button><span><Icon name="users" size={14}/>{snapshot.players.length}/4</span>{host&&!['lobby','finished'].includes(phase||'')&&<button className="text-button danger" onClick={()=>{if(confirm('Kết thúc trận đang chơi sớm?'))send({type:'endMatch'});}}>Kết thúc trận</button>}</div>
   <RoomSocial state={state} open={chatOpen} setOpen={setChatOpen}/>
   <PhaseStepper snapshot={snapshot}/>
   <MatchStrip snapshot={snapshot}/>
   {banner&&<div className="gx-banner" key={banner}>{banner}</div>}
   <BoardStrip snapshot={snapshot}/>
   <Nameplates snapshot={snapshot} selfId={selfId} scene={scene.current} sceneTick={sceneTick} seconds={seconds} microphones={state.social.microphones}/>

   {phase==='lobby'&&<section className="table-dialog gx-dialog"><span className="eyebrow">CHỜ TAY CHƠI</span><h2>Bàn đã mở</h2><p className="lobby-code-line">MÃ BÀN <b>{snapshot.code}</b></p><div className="dialog-actions"><button className="btn outline" onClick={()=>void copy()}>{copied?'ĐÃ CHÉP MÃ':'SAO CHÉP MÃ'}</button><button className="btn outline" onClick={()=>void copyLink()}>{copiedLink?'ĐÃ CHÉP LINK':'SAO CHÉP LINK MỜI'}</button></div><p>Gửi mã bàn hoặc link mời cho bạn bè. Ai cũng bấm SẴN SÀNG thì chủ bàn BẮT ĐẦU — vào trận là có chợ bài phép ngay.</p><RoomSetup snapshot={snapshot} host={host} send={send}/><ReadyRoster snapshot={snapshot} selfId={selfId} host={host} send={send}/><div className="dialog-actions"><button className="btn outline" onClick={()=>send({type:'ready',ready:!me?.ready})}>{me?.ready?'HỦY SẴN SÀNG':'SẴN SÀNG'}</button>{host&&<button className="btn gold" disabled={snapshot.players.length<2||snapshot.players.some(p=>!p.ready)} onClick={()=>send({type:'start'})} title="Cần ít nhất 2 người, tất cả sẵn sàng">BẮT ĐẦU</button>}</div>{host&&snapshot.players.length<4&&<button className="text-button" onClick={()=>send({type:'addBot'})}>+ Thêm đối thủ máy</button>}</section>}

   {phase==='market'&&own&&!spectating&&<>
    <section className="gx-market-head"><span className="eyebrow">ĐẦU VÁN {snapshot.handId||1}</span><h2>Chợ bài phép</h2><Countdown seconds={seconds} label="Còn lại"/><ReadyRoster snapshot={snapshot} selfId={selfId} doneLabel="XONG"/><button className="btn gold" onClick={()=>send({type:'ready',ready:!me?.ready})}>{me?.ready?'HỦY — TÔI CHƯA XONG':'XONG · VÀO VÁN'}</button></section>
    <PrivateMarket snapshot={snapshot} own={own} send={send}/>
   </>}

   {(phase==='showdown'||phase==='finished')&&<section className={`table-dialog result-dialog gx-dialog ${phase==='finished'?(me?.id===snapshot.winnerId?'won':'lost'):''}`}><span className="eyebrow">{phase==='finished'?(me?.id===snapshot.winnerId?'BẠN THẮNG TRẬN':'TRẬN ĐÃ KẾT THÚC'):'LẬT BÀI'}</span><h2>{phase==='finished'?(me?.id===snapshot.winnerId?'Bạn là người cuối cùng!':`${snapshot.players.find(p=>p.id===snapshot.winnerId)?.name||'?'} thắng trận`):snapshot.result?.summary||'Ván đã kết thúc'}</h2><div className="result-hands">{snapshot.result?.revealed.map(r=><div key={r.playerId}><span>{snapshot.players.find(p=>p.id===r.playerId)?.name}</span><div>{r.cards.map(c=><PlayingCard key={c.id} card={c} small/>)}</div></div>)}</div>{snapshot.result?.winners.map(w=><p key={w.playerId}>{snapshot.players.find(p=>p.id===w.playerId)?.name} nhận <b>${fmt(w.amount)}</b>{w.handName?` · ${w.handName}`:''}</p>)}{phase==='finished'?<div className="dialog-actions result-actions">{host?<><button className="btn gold" onClick={()=>send({type:'rematch'})}>BẮT ĐẦU VÁN MỚI</button><button className="btn outline danger" onClick={()=>send({type:'disband'})}>GIẢI TÁN BÀN</button></>:<p className="waiting-host">Đang chờ chủ phòng bắt đầu ván mới hoặc giải tán…</p>}<button className="btn outline" onClick={()=>connection.leave()}>{host?'RỜI BÀN':'VỀ SẢNH'}</button></div>:<p className="waiting-host">Sang chợ ván sau trong {seconds}s…</p>}</section>}
   {spectating&&phase!=='finished'&&<div className="elim-banner" role="status"><span className="eyebrow">BẠN ĐANG QUAN SÁT</span><p>Hết tiền hoặc vào bàn sau khi ván đã bắt đầu — xem các tay chơi còn lại chơi tiếp. Sẵn sàng lại khi chủ phòng bắt đầu ván mới.</p></div>}

   <EventLog log={snapshot.log} priv={spectating?undefined:own?.privateLog.slice(-3)} me={me}/>

   {own&&!spectating&&<div className="gx-bottom">
    <section className="wallet-block"><div className="eyebrow">{me?.name||'BẠN'}{host&&<em className="host-tag" title="Chủ phòng">CHỦ PHÒNG</em>} <span>· VÍ RIÊNG (chỉ bạn thấy)</span></div><strong><small>$</small>{fmt(own.wallet)}</strong>{inHand&&<span className={`gx-trend ${trend>0?'up':trend<0?'down':''}`} title="So với đầu ván">{trend>0?'▲':trend<0?'▼':'■'} {trend>0?'+':''}{fmt(trend)} trong ván này</span>}<OwnHand own={own} me={me} snapshot={snapshot}/></section>
    <section className="gx-center">
     {phase==="lobby"||phase==="finished"?<div className="gx-hint" role="status"><Icon name="chevron" size={14}/><span>{hint}</span></div>:<TurnBanner snapshot={snapshot} own={own} selfId={selfId} seconds={seconds}/>}
     {inHand?<ActionBar snapshot={snapshot} own={own} me={me} turn={turn} raiseTo={raiseTo} setRaiseTo={setRaiseTo} onBet={bet}/>:<div className="gx-idle">{phase==='showdown'||phase==='market'||phase==='lobby'?<span>{phaseLabel}</span>:null}</div>}
    </section>
    <aside className="gx-right">
     <MagicTray snapshot={snapshot} own={own} others={others} send={send} mine={turn} flash={flash}/>
    </aside>
   </div>}

   <Toasts event={state.event} snapshot={snapshot} selfId={selfId} publicOnly={spectating}/>
   {own&&!spectating&&<PeekModal peeks={own.peeks} snapshot={snapshot}/>}
   {own&&!spectating&&own.peeks.length>0&&<div className="secret-note" aria-label="Thông tin riêng"><span className="eyebrow">CHỈ BẠN BIẾT</span>{own.peeks.slice(-2).map((p,i)=><div key={i} title={peekNote(p,snapshot)}><span>{p.label}{peekIsCrystal(p)?' · lúc soi':''}</span> {p.card?<PlayingCard card={p.card} small caption/>:<b>{p.text}</b>}</div>)}</div>}
  </>}
  {help&&<HelpDrawer settings={{lowQuality,setLowQuality,muted,setMuted,onCoach:()=>{setHelp(false);setCoach(true);}}} onClose={()=>setHelp(false)}/>}
  {settings&&<SettingsDrawer prefs={prefs} setPrefs={setPrefs} micOn={micOn} toggleMic={toggleMic} players={snapshot?.players||[]} selfId={selfId} mutedPlayers={mutedPlayers} setMutedPlayers={setMutedPlayers} onClose={()=>setSettings(false)}/>}
  {micError&&<div className="toast error-toast" role="alert">{micError}<button onClick={()=>setMicError('')} aria-label="Đóng lỗi mic">×</button></div>}
  {coach&&!spectating&&<Coach onClose={closeCoach}/>}
  {state.error&&<div className="toast error-toast" role="alert"><span>!</span>{state.error}<button onClick={()=>connection.clearError()} aria-label="Bỏ qua"><Icon name="close" size={14}/></button></div>}
  {state.status==='reconnecting'&&<div className="reconnect-banner">Đang tìm đường trở lại bàn…</div>}
 </div>;
}
