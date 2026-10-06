import {Engine,Scene,Vector3,Color3,Color4,UniversalCamera,HemisphericLight,DirectionalLight,PointLight,MeshBuilder,StandardMaterial,TransformNode,SceneLoader,ShadowGenerator,Mesh,AbstractMesh,AnimationGroup,Matrix,Quaternion} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type {Card,CharacterId,PrivateSnapshot,RoomSnapshot,GameEvent} from '@saloon/protocol';
import {TableFx,SEAT_POS,type ActorRefs} from './fx';
import {playShuffle} from './magicSound';

export const SEATS=SEAT_POS;
const colors=['#bc7048','#77907b','#cfac66','#bca797'];
interface Actor {root:TransformNode; meshes:AbstractMesh[]; groups:AnimationGroup[]; character:CharacterId|string; sockets:Map<string,TransformNode>}
export class SaloonScene {
  engine:Engine; scene:Scene; camera:UniversalCamera;
  private shadow:ShadowGenerator; private actors:Actor[]=[]; fx:TableFx;
  private potRoot:TransformNode; private snapshot:RoomSnapshot|null=null;private own:PrivateSnapshot|null=null;
  private selfId='';private ownSeat=-1;private cameraTarget=new Vector3(4.6,3.2,5.6);private lookOff={yaw:0,pitch:0};
  private canvas:HTMLCanvasElement;private start=performance.now();private lobby=true;private onReady:()=>void;
  private disposed=false;private cleanupResize:()=>void;
  constructor(canvas:HTMLCanvasElement,onReady:()=>void){
    this.canvas=canvas;this.onReady=onReady;this.engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,antialias:true});
    this.engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));
    this.scene=new Scene(this.engine);this.scene.useRightHandedSystem=true;this.scene.clearColor=new Color4(.065,.058,.045,1);
    this.scene.fogMode=Scene.FOGMODE_EXP2;this.scene.fogDensity=.037;this.scene.fogColor=new Color3(.10,.085,.06);
    this.scene.imageProcessingConfiguration.exposure=1.25;this.scene.imageProcessingConfiguration.contrast=1.15;
    this.camera=new UniversalCamera('eyes',this.cameraTarget.clone(),this.scene);this.camera.fov=1.1;this.camera.minZ=.06;this.camera.maxZ=40;
    this.camera.setTarget(new Vector3(0,.85,0));
    const hemi=new HemisphericLight('ambient',new Vector3(0,1,0),this.scene);hemi.intensity=.65;hemi.diffuse=new Color3(.88,.79,.62);hemi.groundColor=new Color3(.16,.14,.1);
    const sun=new DirectionalLight('window',new Vector3(-.5,-1,.3),this.scene);sun.position=new Vector3(3,7,-3);sun.diffuse=new Color3(.77,.84,.9);sun.intensity=1.5;
    this.shadow=new ShadowGenerator(1024,sun);this.shadow.useBlurExponentialShadowMap=true;this.shadow.blurKernel=16;
    const warm=new PointLight('tablelamp',new Vector3(0,3,0),this.scene);warm.diffuse=new Color3(1,.67,.32);warm.intensity=1.8;warm.range=7;
    const fill=new PointLight('barlight',new Vector3(-3,2.5,-3.3),this.scene);fill.diffuse=new Color3(1,.48,.20);fill.intensity=1;fill.range=8;
    this.potRoot=new TransformNode('pot',this.scene);this.buildFallback();
    this.fx=new TableFx(this.scene,this.camera);this.fx.actorOf=seat=>this.refs(seat);this.fx.dealerActor=()=>this.refs(4);this.fx.onShuffle=()=>{if(this.soundOn)playShuffle();};
    canvas.addEventListener('pointermove',this.pointerMove);canvas.addEventListener('pointerleave',this.pointerLeave);
    const resize=()=>this.engine.resize();window.addEventListener('resize',resize);this.cleanupResize=()=>window.removeEventListener('resize',resize);
    this.engine.runRenderLoop(()=>{if(!this.disposed){this.animate();this.scene.render();}});
        void this.load();
  }
  private material(name:string,color:string){const m=new StandardMaterial(name,this.scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=new Color3(.1,.08,.06);return m;}
  private fallbackRoot:TransformNode|null=null;
  private buildFallback(){
    const root=new TransformNode('fallback',this.scene);this.fallbackRoot=root;
    const floor=MeshBuilder.CreateBox('floor',{width:12,height:.08,depth:10},this.scene);floor.position.y=-.05;floor.material=this.material('wood','#34271e');floor.parent=root;floor.receiveShadows=true;
    const table=MeshBuilder.CreateCylinder('table',{diameter:2,height:.18,tessellation:64},this.scene);table.scaling.x=1.3;table.scaling.z=.85;table.position.y=.71;table.material=this.material('rim','#5e3b25');table.parent=root;
    const felt=MeshBuilder.CreateCylinder('felt',{diameter:1.85,height:.025,tessellation:64},this.scene);felt.scaling.x=1.3;felt.scaling.z=.85;felt.position.y=.812;felt.material=this.material('felt','#31594e');felt.parent=root;felt.receiveShadows=true;
    for(const x of [-.7,.7]){const leg=MeshBuilder.CreateBox('leg',{width:.15,height:.7,depth:.15},this.scene);leg.position.set(x,.35,0);leg.material=table.material;leg.parent=root;}
    const wall=MeshBuilder.CreateBox('back',{width:12,height:5,depth:.2},this.scene);wall.position.set(0,2.4,-4);wall.material=this.material('wall','#423127');wall.parent=root;
    const bar=MeshBuilder.CreateBox('bar',{width:5,height:1.1,depth:.9},this.scene);bar.position.set(-.8,.55,-3);bar.material=this.material('barwood','#613f2b');bar.parent=root;
  }
  private async load(){
    try{
      const env=await SceneLoader.ImportMeshAsync(null,'/models/','environment.glb',this.scene);
      if(this.disposed){env.meshes.forEach(m=>m.dispose());return;}
      this.fallbackRoot?.dispose();this.fallbackRoot=null;
      env.meshes.forEach(m=>{m.receiveShadows=true;if(m.getTotalVertices()>0)this.shadow.addShadowCaster(m);});
    }catch{ /* blockout remains usable until assets are exported */ }
    const characters:CharacterId[]=['coyote','lynx','badger','rabbit'];
    for(let i=0;i<4&&!this.disposed;i++)this.actors[i]=await this.loadActor(characters[i],i);
    if(this.disposed)return;
    // No dealer character: dealing/shuffling effects originate at the table.
    if(!this.disposed){this.onReady();if(this.snapshot)this.sync(this.snapshot,this.own,this.selfId);}
  }
  private async loadActor(character:string,seat:number):Promise<Actor>{
    const root=new TransformNode(`actor-${seat}`,this.scene);let meshes:AbstractMesh[]=[];let groups:AnimationGroup[]=[];let loaded:Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>>|null=null;
    try{
      loaded=await SceneLoader.ImportMeshAsync(null,'/models/characters/',`${character}.glb`,this.scene);
      if(this.disposed){loaded.meshes.forEach(m=>m.dispose());loaded.animationGroups.forEach(g=>g.dispose());throw new Error('disposed');}
      meshes=loaded.meshes;groups=loaded.animationGroups;
      loaded.meshes.filter(m=>!m.parent).forEach(m=>{m.parent=root;});
      const idle=groups.find(g=>g.name==='idle_seated'||g.name.toLowerCase().includes('idle'));groups.forEach(g=>g.stop());idle?.start(true);
    }catch{
      if(this.disposed)return{root,meshes:[],groups:[],character,sockets:new Map()};
      const body=MeshBuilder.CreateSphere(`body-${seat}`,{diameter:.6,segments:10},this.scene);body.scaling.set(1,1.25,.8);body.position.y=.87;body.material=this.material(`coat-${seat}`,colors[seat%4]);body.parent=root;
      const head=MeshBuilder.CreateSphere(`head-${seat}`,{diameter:.39,segments:12},this.scene);head.position.y=1.35;head.material=this.material(`skin-${seat}`,'#a77a51');head.parent=root;meshes=[body,head];
    }
    root.position=seat===4?new Vector3(0,0,-1.55):SEATS[seat].clone();root.rotation.y=Math.atan2(-root.position.x,-root.position.z);
    meshes.forEach(m=>{m.receiveShadows=true;if(m.getTotalVertices()>0)this.shadow.addShadowCaster(m);});
    // the GLBs still contain optional prosthetic/cap finger meshes (unused by the Bài Phép rules): keep only the real fingers visible
    for(const n of [...(loaded?.transformNodes??[]),...meshes])if(/^finger_(thumb|index|middle|ring|pinky)_[lr]_(real|prosthetic|cap)$/.test(n.name))n.setEnabled(n.name.endsWith('_real'));
    const sockets=new Map<string,TransformNode>();for(const n of loaded?.transformNodes??[])if(/^socket_(card|tool|sleeve|chips|eye)/.test(n.name)||n.name==='hand_l'||n.name==='hand_r')sockets.set(n.name,n);
    return{root,meshes,groups,character,sockets};
  }
  sync(snapshot:RoomSnapshot|null,own:PrivateSnapshot|null,selfId:string){
    this.snapshot=snapshot;this.own=own;this.selfId=selfId;
    this.lobby=!snapshot;this.ownSeat=snapshot?.players.find(p=>p.id===selfId)?.seat??-1;
    if(snapshot){
      for(let seat=0;seat<4;seat++){
        const p=snapshot.players.find(p=>p.seat===seat),actor=this.actors[seat];if(!actor)continue;
        actor.root.setEnabled(!!p&&!p.kicked&&seat!==this.ownSeat);
        if(p){
          if(actor.character!==p.character){actor.character=p.character;void this.replaceActor(p.character,seat);}
          
        }
      }
      this.updatePot(snapshot.pot);
      if(this.ownSeat>=0){const seat=SEATS[this.ownSeat];this.cameraTarget=new Vector3(seat.x*1.12,1.5,seat.z*1.12);}
    }else{this.cameraTarget=new Vector3(4.6,3.2,5.6);this.actors.slice(0,4).forEach(a=>a?.root.setEnabled(true));this.updatePot(520);}
    this.fx.syncState(snapshot,own,this.ownSeat,selfId,true);
  }
  private async replaceActor(character:string,seat:number){const old=this.actors[seat];const replacement=await this.loadActor(character,seat);if(this.disposed){replacement.root.dispose();return;}old?.root.dispose();old?.groups.forEach(g=>g.dispose());this.actors[seat]=replacement;if(this.snapshot)this.sync(this.snapshot,this.own,this.selfId);}
  private play(actor:Actor,name:string){const group=actor.groups.find(g=>g.name===name||g.name.endsWith(name));if(group){actor.groups.filter(g=>!g.loopAnimation).forEach(g=>g.stop());group.start(false);}}
  private potKey=0;private chipMats:StandardMaterial[]|null=null;
  private updatePot(amount:number){if(amount===this.potKey)return;this.potKey=amount;this.potRoot.getChildMeshes().forEach(m=>m.dispose());const count=Math.min(24,Math.max(0,Math.ceil(amount/25)));const mats=this.chipMats??=[this.material('chipred','#993f32'),this.material('chipgreen','#557768'),this.material('chipcream','#cdbf97')];
    for(let i=0;i<count;i++){const chip=MeshBuilder.CreateCylinder(`chip-${i}`,{diameter:.064,height:.012,tessellation:16},this.scene);chip.parent=this.potRoot;chip.position.set(-.26+(i%4)*.075,.828+Math.floor(i/4)*.012,.23);chip.material=mats[i%3];}
  }
  seatScreen(seat:number){const pos=SEATS[seat].add(new Vector3(0,1.65,0));const projected=Vector3.Project(pos,Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()));return{x:projected.x/this.engine.getRenderWidth()*100,y:projected.y/this.engine.getRenderHeight()*100};}
  private pointerMove=(e:PointerEvent)=>{if(this.ownSeat<0||e.buttons!==2)return;this.lookOff.yaw=Math.max(-.55,Math.min(.55,this.lookOff.yaw+e.movementX*.0025));this.lookOff.pitch=Math.max(-.2,Math.min(.25,this.lookOff.pitch+e.movementY*.002));};
  private pointerLeave=()=>{this.lookOff={yaw:0,pitch:0};};
  private camLook=new Vector3();private camDown=new Vector3();private camPos=new Vector3();
  private animate(){
    const dt=Math.min(.1,this.engine.getDeltaTime()/1000);this.fx.update(dt);const ld=this.fx.ld;
    const own=this.ownSeat>=0&&!this.lobby?SEATS[this.ownSeat]:null;
    // look-down pose: the head drops and moves slightly toward the table while the gaze falls onto the own cards
    this.camPos.copyFrom(this.cameraTarget);
    if(own&&ld>0){this.camPos.y-=.16*ld;this.camPos.x-=own.x*.07*ld;this.camPos.z-=own.z*.07*ld;}
    const k=Math.min(1,dt*3.4),p=this.camera.position;p.x+=(this.camPos.x-p.x)*k;p.y+=(this.camPos.y-p.y)*k;p.z+=(this.camPos.z-p.z)*k;
    const t=(performance.now()-this.start)/1000;
    if(this.lobby)this.camLook.set(Math.sin(t*.07)*.1,.95,0);
    else if(this.ownSeat===1||this.ownSeat===2)this.camLook.set(this.lookOff.yaw,.62+this.lookOff.pitch,.25);
    else this.camLook.set(this.lookOff.yaw,.95+this.lookOff.pitch,-.15);
    if(own&&ld>0){const inx=-own.x,inz=-own.z,n=Math.hypot(inx,inz)||1;this.camDown.set(own.x+inx/n*.9,.62,own.z+inz/n*.9);this.camLook.x+=(this.camDown.x-this.camLook.x)*ld;this.camLook.y+=(this.camDown.y-this.camLook.y)*ld;this.camLook.z+=(this.camDown.z-this.camLook.z)*ld;this.camLook.x+=this.lookOff.yaw*ld*.6;this.camLook.y+=this.lookOff.pitch*ld*.6;}
    this.camera.setTarget(this.camLook);
    if(this.lobby){this.cameraTarget.x=4.6+Math.sin(t*.06)*.25;this.cameraTarget.z=5.6+Math.cos(t*.06)*.15;}
  }
  // ---- animation API (see apps/web/SCENE_API.md) ----
  private refCache:(ActorRefs|null)[]=[];
  private refs(seat:number):ActorRefs|null{
    const a=this.actors[seat];if(!a)return null;
    let r=this.refCache[seat];
    if(!r||r.root!==a.root){r={root:a.root,sockets:a.sockets,character:String(a.character),play:(name:string)=>this.play(a,name)};this.refCache[seat]=r;}
    else r.sockets=a.sockets;
    return r;
  }
  /** Hold = true: look down at the cards held in your hands (cards raise, face you). false: look up at the table. Smoothly tweened. */
  setLookDown(down:boolean){this.fx.setLookDown(down);}
  /** Frontend hook: the viewer's hole cards (also taken from sync()). */
  /** Scene-owned sounds (currently only the shuffle riffle) can be muted with this. */
  setSoundEnabled(on:boolean){this.soundOn=on;}
  private soundOn=true;
  /** Visible two-stack shuffle animation + riffle sound (~1.9 s). Also runs automatically before every deal. */
  shuffleDeck(){this.fx.shuffleDeck();}
  setHoldCards(cards:Card[]|null){this.fx.setHoldCards(cards);}
  get lookingDown(){return this.fx.ld>.5;}
  /** Deal `count` hole cards from the deck to `seat` (automatic from sync; exposed for overrides/QA). */
  dealTo(seat:number,count=1,startIndex=0){this.fx.dealTo(seat,count,startIndex);}
  /** Deal community cards: first slot index and the cards (burn, deal face-down, flip). */
  dealBoard(index:number,cards:Card[]){this.fx.dealBoard(index,cards);}
  flipBoard(index:number){this.fx.flipBoard(index);}
  /** Showdown reveal for a seat: cards flip face up on the table. */
  revealHand(seat:number,cards:Card[]){this.fx.revealHand(seat,cards,true);}
  /**
   * A magic card was used (public by default): the card (public/cards/<id>.png) pops up above the user's head (in front of the camera for
   * your own seat) without texture text, ~3 s. `opts` may be the target seat number (legacy) or {name,targetSeat,ms}. No sound here: the UI plays it.
   * Decoy plays (K09) look identical: pass the fake card id from the event.
   */
  showMagicUse(seat:number,cardId:string,opts?:number|{name?:string;targetSeat?:number;ms?:number}){this.fx.showMagicUse(seat,cardId,typeof opts==='number'?{targetSeat:opts}:opts??{});}
  /** Your own private peek result (also derived automatically from PrivateSnapshot.peeks): the card flashes big in front of you. */
  peekFlash(card:Card|null,crystalBall=false){this.fx.peekFlash(card,crystalBall);}
  /** Somebody looked at your hand: red pulse (also triggered by a private 'peeked' event through onGameEvent). */
  peekedFlash(){this.fx.peekedFlash();}
  /** Private magic peek (K10 Lá soi phép): that opponent's magic card (`magicId`) hovers beside them face-down then flips face-up for ~2.8 s. Only the actor's client calls it. */
  showMagicPeek(seat:number,magicId:string,opts?:{name?:string;ms?:number}){this.fx.showMagicPeek(seat,magicId,opts??{});}
  /** Private 'magicHint' (hinted card used on you): soft violet edge pulse + 'Bạn cảm thấy có ai đó…' line. UI plays audio.playHintCue(). */
  showMagicHint(kind?:string,text?:string){this.fx.showMagicHint(kind,text);}
  /** A triggered passive fired: that held card flips/glows in the tray. Also automatic for private 'use' events of passive cards. */
  pulseSlot(slotOrMagicId:number|string){this.fx.pulseSlot(slotOrMagicId);}
  /** Show the 5-slot magic tray for a moment (it also shows while looking down and during buy/use animations). */
  showTray(seconds=3){this.fx.showTray(seconds);}
  /** Feed game events (private ones only reach you). Public magic uses go through showMagicUse. */
  onGameEvent(ev:GameEvent,seat:number){void seat;this.fx.onEvent(ev);}
  animationStats(){return this.fx.stats();}
  setQuality(low:boolean){this.engine.setHardwareScalingLevel(low?2:Math.max(1,devicePixelRatio/1.5));this.shadow.getShadowMap()?.resize(low?512:1024);}
  dispose(){this.disposed=true;this.engine.stopRenderLoop();this.chipMats?.forEach(m=>m.dispose());this.fx.dispose();this.cleanupResize();this.canvas.removeEventListener('pointermove',this.pointerMove);this.canvas.removeEventListener('pointerleave',this.pointerLeave);this.scene.dispose();this.engine.dispose();}
}
