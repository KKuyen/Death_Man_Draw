import {Scene,Vector3,Quaternion,Matrix,Color3,Color4,TransformNode,Mesh,MeshBuilder,StandardMaterial,DynamicTexture,Texture,Material,AbstractMesh,SceneLoader,Camera,ParticleSystem} from '@babylonjs/core';
import type {Card,PrivateSnapshot,RoomSnapshot,GameEvent} from '@saloon/protocol';
import {rankLabel,suitSymbol} from '@saloon/protocol';
import {getMagic} from '@saloon/content';

/**
 * Table animation layer (Bài Phép version): playing cards (deal / flip / hold / reveal / swap), the first-person hand rig,
 * the 5-slot magic tray (buy / use / burn), public magic-use popups, peek and force-reveal effects.
 * Time based (wall clock dt), allocation light per frame, driven by snapshots (`syncState`) or the explicit API.
 * Card local frame: +X right, +Y up (top edge), +Z = face normal. `orient()` builds a quaternion from (normal, up).
 */
export const SEAT_POS=[new Vector3(-1.35,0,.55),new Vector3(-1,0,-1.15),new Vector3(1,0,-1.15),new Vector3(1.35,0,.55)];
export const DECK_POS=new Vector3(0,.8,-.42);
const BURN_POS=new Vector3(.2,.796,-.5);
const TABLE_Y=.797; // felt top .78 + half a card thickness + margin
const CARD_W=.1,CARD_H=.14;
// community cards (scale x CARD size, spacing, lift of the centre, normal elevation rad); showdown cards scale with distance
const BOARD_SCALE=1.8,BOARD_STEP=.205,BOARD_LIFT=.1;
const REVEAL_STEP=.18,REVEAL_LIFT=.09,REVEAL_ELEV=.66;
const FUR:Record<string,string>={coyote:'#b98a55',lynx:'#c9a46a',badger:'#7a7168',rabbit:'#d8cfc0'};
const SHUFFLE_S=1.9; // seconds the dealer shuffles before dealing
const MAGIC_W=.07,MAGIC_H=MAGIC_W*88/64; // tray card size (camera space metres)

const _x=new Vector3(),_y=new Vector3(),_z=new Vector3(),_m=new Matrix();
export function orient(normal:Vector3,up:Vector3,out:Quaternion){
  _z.copyFrom(normal).normalize();Vector3.CrossToRef(up,_z,_x);
  if(_x.lengthSquared()<1e-8){_x.set(1,0,0);}_x.normalize();Vector3.CrossToRef(_z,_x,_y);
  Matrix.FromXYZAxesToRef(_x,_y,_z,_m);Quaternion.FromRotationMatrixToRef(_m,out);return out;
}
const ease=(k:number)=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const easeOut=(k:number)=>1-Math.pow(1-k,3);

interface Tw{owner:unknown;delay:number;t:number;dur:number;update:(k:number)=>void;done?:()=>void;ease:(k:number)=>number;dead:boolean}
class Tweens{
  private list:Tw[]=[];private free:Tw[]=[];private running=false;
  add(owner:unknown,dur:number,update:(k:number)=>void,opt:{delay?:number;done?:()=>void;ease?:(k:number)=>number}={}){
    const tw=this.free.pop()??{owner,delay:0,t:0,dur:0,update,ease,dead:false};
    tw.owner=owner;tw.delay=opt.delay??0;tw.t=0;tw.dur=Math.max(.001,dur);tw.update=update;tw.done=opt.done;tw.ease=opt.ease??ease;tw.dead=false;this.list.push(tw);
  }
  after(owner:unknown,delay:number,fn:()=>void){this.add(owner,.001,noop,{delay,done:fn});}
  cancel(owner:unknown){for(const tw of this.list)if(tw.owner===owner){tw.dead=true;tw.done=undefined;}}
  clear(){for(const tw of this.list){tw.dead=true;tw.done=undefined;}}
  get active(){let n=0;for(const tw of this.list)if(!tw.dead)n++;return n;}
  update(dt:number){
    const n=this.list.length;
    for(let i=0;i<n;i++){
      const tw=this.list[i];if(tw.dead)continue;
      if(tw.delay>0){tw.delay-=dt;if(tw.delay>0)continue;tw.t=-tw.delay;tw.delay=0;}else tw.t+=dt;
      const k=Math.min(1,tw.t/tw.dur);tw.update(tw.ease(k));
      if(k>=1){tw.dead=true;const done=tw.done;tw.done=undefined;done?.();}
    }
    let w=0;for(let i=0;i<this.list.length;i++){const tw=this.list[i];if(tw.dead)this.free.push(tw);else this.list[w++]=tw;}this.list.length=w;
  }
}
const noop=()=>{};


/** One playing card: two planes (face +Z, back -Z) under a root node with a quaternion rotation. */
export class CardObj{
  root:TransformNode;face:Mesh;back:Mesh;cardId='';
  readonly p0=new Vector3();readonly p1=new Vector3();readonly q0=new Quaternion();readonly q1=new Quaternion();readonly qm=new Quaternion();
  state='hidden';
  constructor(scene:Scene,name:string,backMat:StandardMaterial,blank:StandardMaterial,parent:TransformNode|null=null){
    this.root=new TransformNode(name,scene);this.root.rotationQuaternion=Quaternion.Identity();if(parent)this.root.parent=parent;
    this.face=MeshBuilder.CreatePlane(name+'-face',{width:CARD_W,height:CARD_H},scene);this.face.parent=this.root;this.face.position.z=.0006;this.face.material=blank;
    this.back=MeshBuilder.CreatePlane(name+'-back',{width:CARD_W,height:CARD_H},scene);this.back.parent=this.root;this.back.position.z=-.0006;this.back.rotation.y=Math.PI;this.back.material=backMat;
    for(const m of [this.face,this.back]){m.isPickable=false;}
    this.show(false);
  }
  show(v:boolean){this.root.setEnabled(v);if(!v){this.state='hidden';this.root.scaling.setAll(1);}}
  get pos(){return this.root.position;}
  get quat(){return this.root.rotationQuaternion!;}
  snapshotPose(){this.p0.copyFrom(this.root.position);this.q0.copyFrom(this.quat);}
  dispose(){this.face.dispose();this.back.dispose();this.root.dispose();}
}

/** One magic card: a single plane showing public/cards/<id>.png (or the unified back). */
export class MagicCardObj{
  root:TransformNode;plane:Mesh;id='';state='hidden';
  readonly p0=new Vector3();readonly q0=new Quaternion();
  constructor(scene:Scene,name:string,parent:TransformNode|null,w:number,h:number){
    this.root=new TransformNode(name,scene);this.root.rotationQuaternion=Quaternion.Identity();if(parent)this.root.parent=parent;
    this.plane=MeshBuilder.CreatePlane(name+'-plane',{width:w,height:h},scene);this.plane.parent=this.root;this.plane.isPickable=false;
    this.show(false);
  }
  show(v:boolean){this.root.setEnabled(v);if(!v){this.state='hidden';this.plane.visibility=1;this.root.scaling.setAll(1);}}
  get pos(){return this.root.position;}
  get quat(){return this.root.rotationQuaternion!;}
  dispose(){this.plane.dispose();this.root.dispose();}
}

type PropName='deck';
const PROP_SIZE:Record<PropName,number>={deck:.15};

export interface ActorRefs{root:TransformNode;sockets:Map<string,TransformNode>;play:(name:string)=>void;character:string}
interface Pop{peek?:boolean;flipped?:boolean;faceId?:string;screenSlot:number;k0:number;card:MagicCardObj;hud:boolean;pos:Vector3;t:number;ms:number}
const backOut=(k:number)=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(k-1,3)+c*Math.pow(k-1,2);};

export class TableFx{
  readonly tw=new Tweens();
  private scene:Scene;private camera:Camera;
  private backMat:StandardMaterial;private blank:StandardMaterial;private faceMats=new Map<string,StandardMaterial>();private magicMats=new Map<string,StandardMaterial>();
  private overlays=new Map<string,HTMLImageElement>();
  private shuf:CardObj[]=[];private ball:Mesh|null=null;private board:CardObj[]=[];private hole:CardObj[][]=[[],[],[],[]];private burn:CardObj[]=[];private rig:CardObj[]=[];private temp:CardObj[]=[];
  private hud:TransformNode;private rigRoot:TransformNode;private rigHands:TransformNode;private handMat:StandardMaterial;private cuffMat:StandardMaterial;
  private tray:MagicCardObj[]=[];private slotIds:string[]=['','','','',''];private spares:(Card|undefined)[]=[];private consumedSpare:{id:string;at:number}|null=null;
  private trayShow=0;private trayHold=0;
  private peekCard:CardObj;private flashGold:Mesh;private flashRed:Mesh;private flashHint:Mesh;
  private pops:Pop[]=[];private seatNames=['','','',''];
  private ps:ParticleSystem|null=null;private psPos=new Vector3();
  private deckNode:TransformNode|null=null;
  private props=new Map<string,TransformNode>();private propSource=new Map<PropName,TransformNode>();
  ld=0;private ldTarget=0;private t=0;timeScale=1; // timeScale: QA slow motion
  private handId=-1;private initialDone=false;private boardCount=0;private dealt=false;private picked=[false,false,false,false];private revealKey='';
  private foldedSeen=[false,false,false,false];private ownHandKey='';private ownShown=[false,false];private ownSeat=-1;private ownCharacter='';
  private peekSeen=new Set<string>();private revealSeen=new Set<string>();
  actorOf:(seat:number)=>ActorRefs|null=()=>null;
  dealerActor:()=>ActorRefs|null=()=>null;
  onDeal:(seat:number)=>void=()=>{};
  /** Called when the shuffle starts (the scene plays the riffle sound). */
  onShuffle:()=>void=()=>{};
  constructor(scene:Scene,camera:Camera){
    this.scene=scene;this.camera=camera;
    this.backMat=this.mat('card-back','#4a2f2a');this.backMat.emissiveColor=new Color3(.10,.06,.05);this.backMat.backFaceCulling=false;this.backMat.twoSidedLighting=true;
    this.blank=this.mat('card-blank','#efe2c5');this.blank.backFaceCulling=false;this.blank.twoSidedLighting=true;
    this.paintBack(this.backMat);
    for(let i=0;i<5;i++)this.board.push(new CardObj(scene,`board-${i}`,this.backMat,this.blank));
    for(let s=0;s<4;s++)for(let k=0;k<2;k++)this.hole[s].push(new CardObj(scene,`hole-${s}-${k}`,this.backMat,this.blank));
    for(let i=0;i<4;i++)this.burn.push(new CardObj(scene,`burn-${i}`,this.backMat,this.blank));
    for(let i=0;i<8;i++)this.shuf.push(new CardObj(scene,`shuf-${i}`,this.backMat,this.blank));
    this.hud=new TransformNode('hud',scene);this.hud.parent=camera;
    this.rigRoot=new TransformNode('rig',scene);this.rigRoot.parent=camera;this.rigRoot.rotationQuaternion=Quaternion.Identity();
    this.rigHands=new TransformNode('rig-hands',scene);this.rigHands.parent=this.rigRoot;
    for(let k=0;k<2;k++)this.rig.push(new CardObj(scene,`rig-${k}`,this.backMat,this.blank,this.rigRoot));
    for(let k=0;k<2;k++)this.temp.push(new CardObj(scene,`temp-${k}`,this.backMat,this.blank,this.rigRoot));
    this.handMat=this.mat('rig-fur','#b98a55');this.handMat.specularColor=Color3.Black();this.cuffMat=this.mat('rig-cuff','#753a3a');
    this.buildHands();this.rigRoot.setEnabled(false);
    for(let i=0;i<5;i++)this.tray.push(new MagicCardObj(scene,`tray-${i}`,this.hud,MAGIC_W,MAGIC_H));
    this.peekCard=new CardObj(scene,'peek',this.backMat,this.blank,this.hud);
    this.flashGold=this.makeFlash('gold','255,214,90');this.flashRed=this.makeFlash('red','230,40,50');this.flashHint=this.makeFlash('hint','150,110,230');
    void this.loadProps();
  }
  private mat(name:string,hex:string){const m=new StandardMaterial(name,this.scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(.08,.07,.05);return m;}
  private makeFlash(name:string,rgb:string){
    const tex=new DynamicTexture('flash-'+name,{width:128,height:128},this.scene,false);const ctx=tex.getContext() as CanvasRenderingContext2D;
    const g=ctx.createRadialGradient(64,64,10,64,64,64);g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(.6,`rgba(${rgb},.25)`);g.addColorStop(1,`rgba(${rgb},.85)`);ctx.fillStyle=g;ctx.fillRect(0,0,128,128);tex.update();tex.hasAlpha=true;
    const m=new StandardMaterial('flash-'+name,this.scene);m.diffuseColor=Color3.Black();m.emissiveTexture=tex;m.opacityTexture=tex;m.disableLighting=true;m.backFaceCulling=false;
    const p=MeshBuilder.CreatePlane('flash-'+name,{width:1.6,height:1.1},this.scene);p.parent=this.hud;p.position.set(0,0,this.fwd*.32);p.material=m;p.isPickable=false;p.visibility=0;p.setEnabled(false);p.renderingGroupId=1;return p;
  }
  /** Painted back of a playing card (plain; the magic-card back lives in public/cards/back.png). */
  private paintBack(mat:StandardMaterial){
    mat.diffuseTexture?.dispose();
    const tex=new DynamicTexture('backtex',{width:128,height:192},this.scene,false,Texture.NEAREST_SAMPLINGMODE);const ctx=tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle='#4a2f2a';ctx.fillRect(0,0,128,192);ctx.strokeStyle='#a88b52';ctx.lineWidth=5;ctx.strokeRect(8,8,112,176);ctx.strokeStyle='#8a6e42';ctx.lineWidth=2;ctx.strokeRect(18,18,92,156);
    ctx.fillStyle='#a88b52';for(let y=40;y<152;y+=16)for(let x=32;x<100;x+=16)ctx.fillRect(x,y,6,6);
    tex.update();mat.diffuseTexture=tex;
  }
  /** Card face texture: big corner indices + centre pip, unlit (emissive) so it stays bright from every angle; modifier overlay from public/cards/overlays. */
  private faceMat(card:Card){
    const mod=card.modifiers?.[0]??'';const key=card.id+'|'+card.rank+card.suit+'|'+mod;
    let m=this.faceMats.get(key);if(m)return m;
    const W=512,H=768;
    const tex=new DynamicTexture('facetex-'+key,{width:W,height:H},this.scene,false,Texture.NEAREST_SAMPLINGMODE);
    m=new StandardMaterial('facemat-'+key,this.scene);m.diffuseColor=Color3.Black();m.emissiveTexture=tex;m.disableLighting=true;m.specularColor=Color3.Black();m.backFaceCulling=false;this.faceMats.set(key,m);
    const draw=()=>{
      const ctx=tex.getContext() as CanvasRenderingContext2D;ctx.imageSmoothingEnabled=false;
      const red=card.suit==='H'||card.suit==='D',ink=red?'#b3261e':'#16181a',sym=suitSymbol(card.suit),rk=rankLabel(card.rank),font='Georgia, "Times New Roman", serif';
      const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#fff8e6');g.addColorStop(1,'#f1e3c0');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='#8c6a35';ctx.lineWidth=10;ctx.strokeRect(14,14,W-28,H-28);ctx.strokeStyle='#c9a45e';ctx.lineWidth=3;ctx.strokeRect(34,34,W-68,H-68);
      ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='alphabetic';
      const corner=()=>{ctx.font=`bold ${rk.length>1?150:180}px ${font}`;ctx.fillText(rk,86,190);ctx.font=`120px ${font}`;ctx.fillText(sym,86,320);};
      corner();ctx.save();ctx.translate(W,H);ctx.rotate(Math.PI);corner();ctx.restore();
      ctx.font=`330px ${font}`;ctx.fillText(sym,W/2+30,H/2+130);
      if(card.rank>=11){ctx.strokeStyle=ink;ctx.lineWidth=6;ctx.strokeRect(148,200,W-148-70,H-400);ctx.font=`bold 120px ${font}`;ctx.fillStyle=red?'rgba(179,38,30,.16)':'rgba(22,24,26,.16)';ctx.fillText(rk,W/2+39,H/2-120);ctx.fillStyle=ink;}
      const img=mod?this.overlays.get(mod):undefined;if(img&&img.complete&&img.naturalWidth)ctx.drawImage(img,0,0,W,H);
      tex.update(true);
    };
    draw();
    if(mod&&!(this.overlays.get(mod)?.complete)){ // overlay PNG still loading: repaint once it arrives
      let img=this.overlays.get(mod);if(!img){img=new Image();img.src=`/cards/overlays/${mod}.png`;this.overlays.set(mod,img);}
      img.addEventListener('load',draw,{once:true});
    }
    return m;
  }
  private setFace(c:CardObj,card:Card|null){c.cardId=card?.id??'';c.face.material=card?this.faceMat(card):this.blank;}
  /** Material for a magic card face (id) or the unified back ('back'). Textures are generated by scripts/cards/gen.mjs. */
  private magicMat(id:string,plain=false){
    const key=plain?'plain:'+id:id;let m=this.magicMats.get(key);if(m)return m;
    const tex=new Texture(`/cards/${id}.png`,this.scene,true,true,Texture.NEAREST_SAMPLINGMODE);tex.hasAlpha=true;
    m=new StandardMaterial('mc-'+id,this.scene);m.diffuseColor=Color3.Black();m.emissiveTexture=tex;m.opacityTexture=tex;m.disableLighting=true;m.specularColor=Color3.Black();m.backFaceCulling=false;m.transparencyMode=Material.MATERIAL_ALPHATESTANDBLEND;
    this.magicMats.set(key,m);return m;
  }

  // ---------------------------------------------------------------- geometry helpers
  private inward=new Vector3();private side=new Vector3();private tmpP=new Vector3();private tmpN=new Vector3();private tmpU=new Vector3();
  private seatFrame(seat:number){const s=SEAT_POS[seat];this.inward.set(-s.x,0,-s.z).normalize();this.side.set(-this.inward.z,0,this.inward.x);}
  /** Where hole card k lands on the table in front of seat. Writes p (position) and q (orientation). */
  tableSpot(seat:number,k:number,p:Vector3,q:Quaternion,faceUp=false,jitter=true){
    this.seatFrame(seat);const s=SEAT_POS[seat];
    p.set(s.x+this.inward.x*.64+this.side.x*(k-.5)*.125,TABLE_Y,s.z+this.inward.z*.64+this.side.z*(k-.5)*.125);
    this.tmpU.copyFrom(this.inward);if(jitter){const a=(k?1:-1)*.07;const c=Math.cos(a),sn=Math.sin(a);this.tmpU.set(this.inward.x*c-this.inward.z*sn,0,this.inward.x*sn+this.inward.z*c);}
    this.tmpN.set(0,faceUp?1:-1,0);orient(this.tmpN,this.tmpU,q);
  }
  /** Viewer frame: `viewDir` points from the table centre to the viewer, `viewRight` is the viewer's screen-right on the table. */
  private viewDir=new Vector3(0,0,1);private viewRight=new Vector3(1,0,0);private viewAway=new Vector3(0,0,-1);
  private viewFrame(){
    if(this.ownSeat>=0){const o=SEAT_POS[this.ownSeat];this.viewDir.set(o.x,0,o.z);}else this.viewDir.set(4.6,0,5.6);
    this.viewDir.normalize();this.viewAway.set(-this.viewDir.x,0,-this.viewDir.z);this.viewRight.set(-this.viewAway.z,0,this.viewAway.x);
  }
  /** Reading pose: card standing at an angle, normal leaning toward the viewer, top edge away from them. */
  private readQuat(elev:number,out:Quaternion){
    this.tmpN.set(this.viewDir.x*Math.cos(elev),Math.sin(elev),this.viewDir.z*Math.cos(elev));this.tmpU.copyFrom(this.viewAway);orient(this.tmpN,this.tmpU,out);
  }
  /** Community cards: lie flat on the felt in a row (the 2D board HUD is the readable copy; this is just the table's physical state). */
  private boardSpot(i:number,p:Vector3,q:Quaternion,faceUp:boolean){
    this.viewFrame();
    p.set(this.viewRight.x*(i-2)*BOARD_STEP,TABLE_Y+(faceUp?BOARD_LIFT:0),this.viewRight.z*(i-2)*BOARD_STEP-.02);
    this.tmpN.set(0,faceUp?1:-1,0);this.tmpU.copyFrom(this.viewAway);orient(this.tmpN,this.tmpU,q);
  }
  /** Showdown / forced-reveal spot for hole card k of `seat`: large, face-up, leaning toward the viewer. Returns the card scale. */
  private revealSpot(seat:number,k:number,p:Vector3,q:Quaternion):number{
    this.viewFrame();this.seatFrame(seat);const s=SEAT_POS[seat];
    const mine=seat===this.ownSeat,out=mine?1:1.2;
    const cx=(s.x+this.inward.x*.64)*out,cz=(s.z+this.inward.z*.64)*out;
    const vx=this.ownSeat>=0?SEAT_POS[this.ownSeat].x:4.6,vz=this.ownSeat>=0?SEAT_POS[this.ownSeat].z:5.6;
    const dist=Math.hypot(cx-vx,cz-vz),sc=Math.max(1.3,Math.min(2.1,dist*.8)),step=REVEAL_STEP*sc/1.55;
    p.set(cx+this.viewRight.x*(k-.5)*step,TABLE_Y+REVEAL_LIFT*sc/1.55,cz+this.viewRight.z*(k-.5)*step);
    this.readQuat(REVEAL_ELEV,q);return sc;
  }
  private flight(c:CardObj,p1:Vector3,q1:Quaternion,dur:number,arc:number,delay=0,done?:()=>void){
    c.snapshotPose();c.p1.copyFrom(p1);c.q1.copyFrom(q1);
    this.tw.cancel(c);
    this.tw.add(c,dur,k=>{
      Vector3.LerpToRef(c.p0,c.p1,k,c.pos);c.pos.y+=arc*Math.sin(Math.PI*k);
      Quaternion.SlerpToRef(c.q0,c.q1,k,c.quat);
    },{delay,done,ease:ease});
  }
  /** Turn a card over into the given final pose (position + orientation), with a small lift in the middle. */
  private flipTo(c:CardObj,p1:Vector3,q1:Quaternion,dur=.5,delay=0,done?:()=>void,lift=.08){
    c.snapshotPose();c.p1.copyFrom(p1);c.q1.copyFrom(q1);this.tw.cancel(c);
    this.tw.add(c,dur,k=>{
      Vector3.LerpToRef(c.p0,c.p1,k,c.pos);c.pos.y+=lift*Math.sin(Math.PI*k);
      Quaternion.SlerpToRef(c.q0,c.q1,k,c.quat);
    },{delay,done,ease:ease});
  }
  private placeInstant(c:CardObj,p:Vector3,q:Quaternion){this.tw.cancel(c);c.pos.copyFrom(p);c.quat.copyFrom(q);c.show(true);}

  // ---------------------------------------------------------------- deck prop, particles
  private async loadProps(){
    try{
      const r=await SceneLoader.ImportMeshAsync(null,'/models/props/','deck.glb',this.scene);
      const holder=new TransformNode('prop-src-deck',this.scene);holder.setEnabled(false);
      r.meshes.filter(m=>!m.parent).forEach(m=>{m.parent=holder;});r.meshes.forEach(m=>{m.isPickable=false;});
      this.propSource.set('deck',holder);this.deckNode=this.makeProp('deck','deck-main');
      if(this.deckNode){this.deckNode.parent=null;this.deckNode.position.copyFrom(DECK_POS);this.deckNode.position.y=.785;this.deckNode.setEnabled(true);}
    }catch{ /* optional */ }
  }
  /** A pooled, normalised clone of a prop (longest side = PROP_SIZE). */
  private makeProp(name:PropName,key:string):TransformNode|null{
    let node=this.props.get(key);if(node)return node;
    const src=this.propSource.get(name);if(!src)return null;
    const holder=new TransformNode('prop-'+key,this.scene);
    const c=src.clone('prop-clone-'+key,holder) as TransformNode|null;if(!c)return null;c.setEnabled(true);
    holder.computeWorldMatrix(true);c.computeWorldMatrix(true);
    const {min,max}=c.getHierarchyBoundingVectors(true);
    const size=Math.max(max.x-min.x,max.y-min.y,max.z-min.z)||1;const sc=PROP_SIZE[name]/size;
    c.scaling.setAll(sc);c.position.set(-(min.x+max.x)/2*sc,-(min.y+max.y)/2*sc,-(min.z+max.z)/2*sc);
    holder.setEnabled(false);this.props.set(key,holder);return holder;
  }
  private initEmbers(){
    const tex=new DynamicTexture('ember-tex',{width:64,height:64},this.scene,false);const ctx=tex.getContext() as CanvasRenderingContext2D;
    const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);tex.update();tex.hasAlpha=true;
    const ps=new ParticleSystem('embers',260,this.scene);ps.particleTexture=tex;ps.emitter=this.psPos;
    ps.minEmitBox=new Vector3(-.06,-.04,-.06);ps.maxEmitBox=new Vector3(.06,.06,.06);
    ps.minSize=.012;ps.maxSize=.04;ps.minLifeTime=.5;ps.maxLifeTime=1.3;ps.emitRate=0;ps.gravity=new Vector3(0,.35,0);
    ps.direction1=new Vector3(-.45,.6,-.45);ps.direction2=new Vector3(.45,1.3,.45);ps.minEmitPower=.15;ps.maxEmitPower=.55;
    ps.blendMode=ParticleSystem.BLENDMODE_ADD;ps.colorDead=new Color4(.15,.03,.03,0);ps.renderingGroupId=1;ps.start();this.ps=ps;
  }
  /** Burst of embers at a world position. kind: fire (burn), gold (buff), violet (curse/peek). */
  burst(pos:Vector3,kind:'fire'|'gold'|'violet'|'green'='fire',count=36){
    if(!this.ps)this.initEmbers();const ps=this.ps!;this.psPos.copyFrom(pos);
    const c={fire:[new Color4(1,.62,.15,1),new Color4(1,.25,.08,1)],gold:[new Color4(1,.9,.4,1),new Color4(1,.7,.15,1)],violet:[new Color4(.75,.45,1,1),new Color4(.45,.2,.85,1)],green:[new Color4(.6,1,.6,1),new Color4(.3,.85,.4,1)]}[kind];
    ps.color1=c[0];ps.color2=c[1];ps.manualEmitCount=count;
  }
  private worldOf(n:TransformNode,out:Vector3){n.computeWorldMatrix(true);return out.copyFrom(n.getAbsolutePosition());}
  private screenFlash(kind:'gold'|'red'|'hint',peak=.9,dur=.7){
    const p=kind==='gold'?this.flashGold:kind==='red'?this.flashRed:this.flashHint;p.setEnabled(true);p.position.z=this.fwd*.32;this.tw.cancel(p);
    this.tw.add(p,dur,k=>{p.visibility=peak*Math.sin(Math.PI*k);},{ease:z=>z,done:()=>{p.visibility=0;p.setEnabled(false);}});
  }

  // ---------------------------------------------------------------- first-person hands
  private buildHands(){
    const mk=(side:number)=>{
      const g=new TransformNode('hand-'+side,this.scene);g.parent=this.rigHands;
      const palm=MeshBuilder.CreateCapsule('palm',{radius:.034,height:.1,tessellation:10,subdivisions:2},this.scene);palm.rotation.z=Math.PI/2;palm.scaling.set(1,1,.6);palm.parent=g;palm.material=this.handMat;
      for(let f=0;f<4;f++){const fing=MeshBuilder.CreateCapsule('finger',{radius:.011,height:.07,tessellation:6,subdivisions:1},this.scene);fing.parent=g;fing.position.set(side*(.002+f*.0),.045,-.01);fing.position.x=(f-1.5)*.02*side;fing.rotation.x=-.35;fing.material=this.handMat;}
      const thumb=MeshBuilder.CreateCapsule('thumb',{radius:.012,height:.06,tessellation:6,subdivisions:1},this.scene);thumb.parent=g;thumb.position.set(-side*.06,.03,.0);thumb.rotation.z=side*.9;thumb.rotation.x=-.2;thumb.material=this.handMat;
      const cuff=MeshBuilder.CreateCylinder('cuff',{diameter:.085,height:.05,tessellation:12},this.scene);cuff.parent=g;cuff.position.set(0,-.09,0);cuff.material=this.cuffMat;
      g.getChildMeshes().forEach(m=>{m.isPickable=false;});return g;
    };
    const l=mk(-1),r=mk(1);l.position.set(-.095,-.03,.0);r.position.set(.095,-.03,.0);l.rotation.z=.25;r.rotation.z=-.25;
    l.rotation.x=-.4;r.rotation.x=-.4;
  }
  private rigPose=new Vector3();private rigQ=new Quaternion();private rigRest=new Vector3(0,-.46,.5);private rigRead=new Vector3(0,-.05,.5);
  private fwd=-1; // camera-local forward axis sign (right-handed scene: the camera looks down -Z)
  setFwd(sign:number){this.fwd=sign;}
  /** Local pose of rig card k (relative to the rig root): a two-card fan; rest tilts the top edge away, read tilts it toward the eyes. */
  private rigCardTarget(k:number,p:Vector3,q:Quaternion,ld:number){
    const spread=k?1:-1,roll=-spread*(.12+.05*ld);
    p.set(spread*(.052+.03*ld),k?.004:0,0);
    const lean=-.38*(1-ld)-.1*ld;
    this.tmpN.set(0,-Math.sin(lean),-this.fwd*Math.cos(lean));this.tmpU.set(Math.sin(roll),Math.cos(roll),0);orient(this.tmpN,this.tmpU,q);
  }
  private updateRig(dt:number){
    this.t+=dt;const ld=this.ld;
    const sway=Math.sin(this.t*1.3)*.004*(1-ld),bob=Math.sin(this.t*.9)*.003;
    this.rigRoot.position.set(sway,this.rigRest.y+(this.rigRead.y-this.rigRest.y)*ld+bob,this.fwd*(this.rigRest.z+(this.rigRead.z-this.rigRest.z)*ld));
    this.rigRoot.scaling.setAll(1+.55*ld);
    for(let k=0;k<2;k++){const c=this.rig[k];if(c.state!=='held')continue;this.rigCardTarget(k,this.rigPose,this.rigQ,ld);c.pos.set(this.rigPose.x,this.rigPose.y+this.rigOffset[k],this.rigPose.z);c.quat.copyFrom(this.rigQ);}
    this.rigHands.position.set(0,-.12+.045*ld,0);
    // the hands/cards only appear while looking down (they sit below the action bar otherwise)
    const show=!this.holdHidden&&this.ownSeat>=0&&ld>.02&&(this.rig[0].state==='held'||this.rig[1].state==='held');
    this.rigRoot.setEnabled(show);
  }
  private rigOffset=[0,0];

  // ---------------------------------------------------------------- magic tray (own 5 slots, camera space) + animations
  private slotPos(i:number,out:Vector3){return out.set(.25+i*.067,-.30,this.fwd*.62);}
  private trayTmp=new Vector3();
  private updateTray(dt:number){
    this.trayHold=Math.max(0,this.trayHold-dt);
    const target=(this.ld>.2||this.trayHold>0)?1:0;this.trayShow+=(target-this.trayShow)*(1-Math.exp(-dt*8));if(Math.abs(target-this.trayShow)<.003)this.trayShow=target;
    for(let i=0;i<5;i++){const c=this.tray[i];if(c.state!=='tray')continue;
      this.slotPos(i,this.trayTmp);c.pos.set(this.trayTmp.x,this.trayTmp.y-(1-this.trayShow)*.18,this.trayTmp.z);
      c.root.setEnabled(this.trayShow>.02&&this.ownSeat>=0);}
  }
  private syncMagic(own:PrivateSnapshot|null,live:boolean){
    const cur=new Map<number,{magicId:string;spare?:Card}>();for(const m of own?.magic??[])cur.set(m.slot,m);
    for(let i=0;i<5;i++){
      const prev=this.slotIds[i],now=cur.get(i),nid=now?.magicId??'';
      if(prev===nid){this.spares[i]=now?.spare;continue;}
      if(prev){ // card left the slot: used / discarded / replaced -> fly to the middle and burn
        if(this.spares[i])this.consumedSpare={id:this.spares[i]!.id,at:performance.now()};
        const old=this.tray[i];if(live&&old.state!=='hidden')this.consumeTray(old);else old.dispose();
        this.tray[i]=this.makeTraySlot(i);
      }
      this.slotIds[i]=nid;this.spares[i]=now?.spare;
      if(nid){const c=this.tray[i];c.id=nid;c.plane.material=this.magicMat(nid);
        if(live)this.buyFly(c,i);else{c.state='tray';c.root.setEnabled(false);c.root.scaling.setAll(1);}}
    }
  }
  private makeTraySlot(i:number){const c=new MagicCardObj(this.scene,`tray-${i}-${this.slotSerial++}`,this.hud,MAGIC_W,MAGIC_H);return c;}
  private slotSerial=0;
  private hudCenter(out:Vector3,y=.05){return out.set(0,y,this.fwd*.55);}
  /** Buy: the card appears big in the middle of the view, then flies into its tray slot. */
  private buyFly(c:MagicCardObj,slot:number){
    this.trayHold=3.2;c.state='anim';c.show(true);c.state='anim';
    const from=this.hudCenter(new Vector3()),to=this.slotPos(slot,new Vector3());
    this.tw.cancel(c);
    this.tw.add(c,.4,k=>{c.pos.copyFrom(from);c.root.scaling.setAll(.4+1.9*backOut(k));c.plane.visibility=Math.min(1,k*3);},{done:()=>{this.burst(this.worldOf(c.root,this.psTmp),'gold',22);}});
    this.tw.add(c,.55,k=>{Vector3.LerpToRef(from,to,k,c.pos);c.root.scaling.setAll(2.3-1.3*k);c.pos.y+=.06*Math.sin(Math.PI*k);},{delay:.8,done:()=>{c.state='tray';c.root.scaling.setAll(1);}});
  }
  private psTmp=new Vector3();
  /** Use / discard / replace: the card rises to the middle, then burns away (embers + fade). */
  private consumeTray(c:MagicCardObj){
    this.trayHold=3;c.state='anim';c.root.setEnabled(true);this.tw.cancel(c);
    const from=c.pos.clone(),mid=this.hudCenter(new Vector3(),.08);
    this.tw.add(c,.4,k=>{Vector3.LerpToRef(from,mid,k,c.pos);c.root.scaling.setAll(1+1.4*k);});
    this.tw.after(c,.45,()=>{this.burst(this.worldOf(c.root,this.psTmp),'fire',46);});
    this.tw.add(c,.8,k=>{c.plane.visibility=1-k;c.root.scaling.setAll(2.4+.25*k);c.pos.y=mid.y+.05*k;if(Math.random()<.35&&k>.15&&k<.85)this.burst(this.worldOf(c.root,this.psTmp),'fire',3);},{delay:.55,ease:z=>z,done:()=>{c.dispose();}});
  }

  // ---------------------------------------------------------------- public magic-use popup (seat-aligned screen lanes, ~3 s)
  /** Card pops up above `seat`'s head (or in front of the camera for your own seat) without texture labels; scale-in, hold, fade. */
  showMagicUse(seat:number,cardId:string,o:{name?:string;targetSeat?:number;ms?:number;peek?:boolean}={}){
    const ms=o.ms??3000,own=seat===this.ownSeat;
    // Ten camera-space lanes preserve the seat's horizontal position and keep concurrent cards apart.
    const screenSlot=this.popupSlot(seat);const nx=(screenSlot%5-2)*.32,ny=screenSlot<5?.55:.06;
    const w=own?.2:.42,h=w*88/64;
    const card=new MagicCardObj(this.scene,`pop-${this.slotSerial++}`,own?this.hud:null,w,h);card.plane.material=this.magicMat(o.peek?'back':cardId,true);card.id=cardId;card.show(true);card.plane.renderingGroupId=1;
    const pos=new Vector3();
    if(own){const th=Math.tan(this.camera.fov/2),aspect=this.scene.getEngine().getAspectRatio(this.camera);card.pos.set(nx*.7*th*aspect,ny*.7*th,this.fwd*.7);}
    else{this.seatFrame(seat);const s=SEAT_POS[seat];pos.set(s.x+this.inward.x*.1,2.12,s.z+this.inward.z*.1);this.placePopup(pos,nx,ny);card.pos.copyFrom(pos);}
    const k0=own?1:Math.max(.5,Math.min(1.05,Vector3.Distance((this.camera as unknown as {position:Vector3}).position,pos)/3.3));
    const pop:Pop={peek:o.peek,faceId:cardId,screenSlot,k0,card,hud:own,pos,t:0,ms:ms/1000};this.pops.push(pop);
    card.root.scaling.setAll(.2);
    this.burst(own?this.worldOf(card.root,this.psTmp):pos,o.peek?'violet':'gold',30);
  }
  /** Private magic peek (Lá soi phép): the opponent's held magic card hovers by them face-down, then flips face-up for ~2 s (only call it on the actor's client). */
  showMagicPeek(seat:number,magicId:string,o:{name?:string;ms?:number}={}){this.showMagicUse(seat,magicId,{...o,peek:true,ms:o.ms??2800});}
  private popupSlot(seat:number){
    const eng=this.scene.getEngine(),w=eng.getRenderWidth(),h=eng.getRenderHeight();
    const pos=seat===this.ownSeat?new Vector3():SEAT_POS[seat].add(new Vector3(0,2.12,0));
    const projected=Vector3.Project(pos,Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(w,h));
    const desired=seat===this.ownSeat?0:Math.max(-.64,Math.min(.64,projected.x/w*2-1));
    const occupied=new Set(this.pops.map(p=>p.screenSlot));let best=-1,score=Infinity;
    for(let i=0;i<10;i++){if(occupied.has(i))continue;const d=Math.abs((i%5-2)*.32-desired)+(i>=5?.8:0);if(d<score){best=i;score=d;}}
    // Under an exceptional burst (>10), replace the oldest popup and release its mesh.
    if(best<0){const old=this.pops.shift()!;best=old.screenSlot;old.card.dispose();}
    return best;
  }
  /** Reproject onto a camera-facing plane; unlike distance-based clamping this also works at side seats. */
  private placePopup(pos:Vector3,nx:number,ny:number){
    const cam=(this.camera as Camera & {position:Vector3}),forward=this.camera.getDirection(new Vector3(0,0,this.fwd));
    const depth=Math.max(.5,Vector3.Dot(pos.subtract(cam.position),forward)),th=Math.tan(cam.fov/2);
    pos.copyFrom(cam.position).addInPlace(forward.scale(depth))
      .addInPlace(this.camera.getDirection(new Vector3(1,0,0)).scale(nx*depth*th*this.scene.getEngine().getAspectRatio(cam)))
      .addInPlace(this.camera.getDirection(new Vector3(0,1,0)).scale(ny*depth*th));
  }
  private camPos=new Vector3();private popN=new Vector3();private popQ=new Quaternion();
  private updatePops(dt:number){
    for(let i=this.pops.length-1;i>=0;i--){
      const p=this.pops[i];p.t+=dt;const k=p.t/p.ms;
      const crowded=this.pops.length>5;
      const nx=(p.screenSlot%5-2)*.32,ny=p.screenSlot<5?(crowded?.75:.55):(crowded?.37:.06);
      if(p.hud){const th=Math.tan(this.camera.fov/2);p.card.pos.set(nx*.7*th*this.scene.getEngine().getAspectRatio(this.camera),ny*.7*th,this.fwd*.7);}else this.placePopup(p.pos,nx,ny);
      const sIn=Math.min(1,p.t/.35),sc=p.k0*(p.hud?.55:1)*(crowded?.68:1)*(.2+.8*backOut(sIn))*(k>1-.12?1+(k-(1-.12))*.8:1);
      const fade=k>1-.14?Math.max(0,(1-k)/.14):1;
      const c=p.card;c.root.scaling.setAll(sc);c.plane.visibility=fade;
      if(p.peek){const ft=(p.t-.5)/.5;if(ft>=0&&ft<1){const sx=Math.abs(Math.cos(ft*Math.PI));c.root.scaling.x=sc*Math.max(.02,sx);if(ft>=.5&&!p.flipped){p.flipped=true;c.plane.material=this.magicMat(p.faceId!,true);this.burst(this.worldOf(c.root,this.psTmp),'violet',26);}}}
      if(!p.hud){
        const bob=Math.sin(p.t*2.4)*.02;c.pos.set(p.pos.x,p.pos.y+bob,p.pos.z);
        const cam=(this.camera as unknown as {position:Vector3}).position;this.camPos.copyFrom(cam);
        this.popN.copyFrom(this.camPos).subtractInPlace(c.pos);this.tmpU.set(0,1,0);orient(this.popN,this.tmpU,this.popQ);c.quat.copyFrom(this.popQ);
      }
      if(k>=1){c.dispose();this.pops.splice(i,1);}
    }
  }


  /**
   * Hinted card used on you (private 'magicHint' event): subtle violet edge pulse. DOM owns any wording; no actor or card identity.
   * `kind` = event cue ('looked' | 'hexed'); `text` overrides the default Vietnamese line.
   */
  showMagicHint(kind?:string,text?:string){
    this.screenFlash('hint',.55,1.3);
    // Hint wording belongs to the DOM; the scene supplies only a subtle pulse.
    void kind;void text;
  }

  /** A held passive just fired (its trigger happened): the slot's card flips a full turn, pops and glows. `slotOrMagicId` = slot number or magic id. */
  pulseSlot(slotOrMagicId:number|string){
    const i=typeof slotOrMagicId==='number'?slotOrMagicId:this.slotIds.indexOf(slotOrMagicId);if(i<0||i>4||!this.slotIds[i])return;
    const c=this.tray[i];if(c.state!=='tray')return;this.trayHold=Math.max(this.trayHold,2.4);c.state='anim';c.root.setEnabled(true);
    const base=new Vector3();this.slotPos(i,base);this.tw.cancel(c);
    this.tw.after(c,.05,()=>this.burst(this.worldOf(c.root,this.psTmp),'gold',26));
    this.tw.add(c,.9,k=>{const up=Math.sin(Math.PI*k);c.pos.set(base.x,base.y+.05*up,base.z);c.root.scaling.setAll(1+.7*up);c.quat.copyFrom(Quaternion.RotationAxis(Vector3.Up(),k*Math.PI*2));},{done:()=>{c.quat.set(0,0,0,1);c.root.scaling.setAll(1);c.state='tray';}});
  }


  /** Dealer riffle shuffle of the deck (~1.9 s): the stack splits in two halves, the halves interleave, the stack squares up. Runs automatically before every deal. */
  shuffleDeck(){
    this.onShuffle();this.dealerActor()?.play('dealer_cut');
    this.deckNode?.setEnabled(false);
    const base=new Quaternion();this.deckQuat(base);
    this.shuf.forEach((c,i)=>{
      const left=i%2===0,side=left?-1:1,idx=i>>1;
      c.show(true);c.state='shuffle';this.setFace(c,null);c.back.material=this.backMat;this.tw.cancel(c);
      c.root.scaling.setAll(1.65);
      const stackY=DECK_POS.y+.01+idx*.007;
      c.pos.set(DECK_POS.x,stackY,DECK_POS.z);c.quat.copyFrom(base);
      const sx=DECK_POS.x+side*.16,sy=stackY+.2+idx*.012,order=idx*2+(left?0:1);
      // 1: halves lift apart, tilted like a bridge
      this.tw.add(c,.5,k=>{c.pos.set(DECK_POS.x+side*.16*k,stackY+(.2+idx*.012)*k,DECK_POS.z+Math.sin(k*Math.PI)*.01);Quaternion.RotationAxisToRef(Vector3.Forward(),side*.7*k,this.qTmp);this.qTmp.multiplyToRef(base,c.quat);},{ease:ease});
      // 2: cards drop alternately into the middle
      this.tw.add(c,.26,k=>{c.pos.set(sx*(1-k)+DECK_POS.x*k,sy*(1-k)+(DECK_POS.y+.004+order*.0012)*k+Math.sin(k*Math.PI)*.09,DECK_POS.z);Quaternion.RotationAxisToRef(Vector3.Forward(),side*.7*(1-k),this.qTmp);this.qTmp.multiplyToRef(base,c.quat);},{delay:.55+order*.085,ease:ease});
      // 3: square up and hide
      this.tw.after(c,SHUFFLE_S-.12,()=>{c.show(false);if(i===0)this.deckNode?.setEnabled(true);});
    });
  }
  private qTmp=new Quaternion();

  // ---------------------------------------------------------------- peek / reveal effects
  /** Your own private peek (Lá soi / Gương thần): the peeked card flashes big in front of the camera. */
  peekFlash(card:Card|null,ball=false){
    this.screenFlash(ball?'hint':'gold',.7,.9);
    if(!card)return;
    if(ball)this.showBall();
    const c=this.peekCard;this.setFace(c,card);c.show(true);c.state='peek';c.quat.set(0,0,0,1);this.tw.cancel(c);
    const mid=new Vector3(0,.06,this.fwd*(ball?.62:.58)),sMul=ball?.62:1;c.pos.copyFrom(mid);
    this.tw.add(c,2.9,k=>{
      const sIn=Math.min(1,k/.1),out=k>.86?(k-.86)/.14:0;
      c.root.scaling.setAll(Math.max(.01,(.3+2.2*backOut(sIn))*(1-out)*sMul));c.pos.set(mid.x,mid.y+.02*Math.sin(k*9),mid.z);if(this.ball&&ball){this.ball.position.set(mid.x,mid.y+.02*Math.sin(k*9),mid.z);this.ball.scaling.setAll(Math.max(.01,(.3+.7*backOut(sIn))*(1-out)));}
    },{ease:z=>z,done:()=>{c.show(false);this.ball?.setEnabled(false);}});
    this.tw.after(c,.12,()=>this.burst(this.worldOf(c.root,this.psTmp),'violet',34));
  }
  /** Crystal ball (K07 Quả cầu soi): a glassy sphere in front of the camera that holds the peeked card. */
  private showBall(){
    if(!this.ball){
      const m=new StandardMaterial('ball',this.scene);m.diffuseColor=new Color3(.45,.55,1);m.emissiveColor=new Color3(.12,.14,.34);m.specularColor=new Color3(1,1,1);m.specularPower=48;m.alpha=.3;m.backFaceCulling=false;
      const b=MeshBuilder.CreateSphere('ball',{diameter:.34,segments:24},this.scene);b.parent=this.hud;b.material=m;b.isPickable=false;b.renderingGroupId=1;this.ball=b;
    }
    this.ball.setEnabled(true);this.ball.scaling.setAll(.01);this.ball.position.set(0,.06,this.fwd*.62);
  }
  /** Somebody looked at your hand (private 'peeked' event): red pulse, your cards flinch. */
  peekedFlash(){
    this.screenFlash('red',.8,.8);
    for(let k=0;k<2;k++)if(this.rig[k].state==='held')this.tw.add(this.rig[k],.5,z=>{this.rigOffset[k]=Math.sin(z*Math.PI)*.035*Math.sin(z*22);},{ease:q=>q,done:()=>{this.rigOffset[k]=0;}});
  }
  /** A hole card whose modifier changed (Nâng buff / Phá bẫy / Bùa bẫy): small burst on the card. */
  private modifierFx(k:number,debuff:boolean){
    const c=this.rig[k];if(c.state!=='held')return;this.burst(this.worldOf(c.root,this.psTmp),debuff?'violet':'gold',28);
    this.tw.add(c,.45,z=>{this.rigOffset[k]=Math.sin(Math.PI*z)*.03;},{ease:q=>q,done:()=>{this.rigOffset[k]=0;}});
  }
  /** Swap card used: the old hole card burns away in the hand while the spare rises into its place. */
  private exchangeRig(k:number,oldCard:Card){
    const c=this.rig[k],t=this.temp[k];if(c.state!=='held')return;
    this.setFace(t,oldCard);t.show(true);t.pos.copyFrom(c.pos);t.quat.copyFrom(c.quat);t.pos.y+=this.rigOffset[k];this.tw.cancel(t);const y0=t.pos.y,s0=t.pos.clone();
    this.tw.add(t,.7,z=>{t.pos.set(s0.x,y0+.14*z,s0.z);t.root.scaling.setAll(Math.max(.01,1-z*.9));},{done:()=>{this.burst(this.worldOf(t.root,this.psTmp),'fire',30);t.show(false);}});
    this.tw.add(c,.6,z=>{this.rigOffset[k]=-.3*(1-z);},{delay:.25,ease:easeOut,done:()=>{this.rigOffset[k]=0;}});this.rigOffset[k]=-.3;
    this.trayHold=Math.max(this.trayHold,2);
  }

  // ---------------------------------------------------------------- state sync
  syncState(snap:RoomSnapshot|null,own:PrivateSnapshot|null,ownSeat:number,selfId:string,animate:boolean){
    const nextSeat=snap?ownSeat:-1;
    if(nextSeat!==this.ownSeat){this.resetCards();this.handId=-1;this.initialDone=false;}
    this.ownSeat=nextSeat;
    if(!snap){this.resetCards();this.showLobbyBoard();this.handId=-1;this.initialDone=true;this.ownCharacter='';this.rigRoot.setEnabled(false);this.syncMagic(null,false);return;}
    for(const p of snap.players)this.seatNames[p.seat]=p.name;
    const mine=snap.players.find(p=>p.id===selfId);
    if(mine&&mine.character!==this.ownCharacter){this.ownCharacter=mine.character;{const fur=Color3.FromHexString(FUR[mine.character]??'#b98a55');this.handMat.diffuseColor=fur.scale(.35);this.handMat.emissiveColor=fur.scale(.42);}}
    const live=this.initialDone&&animate;
    this.syncMagic(own,live);this.syncPeeks(own,live);
    if(snap.phase!=='playing'&&snap.phase!=='showdown'){
      if(this.handId!==-2){this.resetCards();this.handId=-2;}
      this.initialDone=true;return;
    }
    if(snap.handId!==this.handId){
      this.resetCards();this.handId=snap.handId;this.dealt=false;this.boardCount=0;this.revealKey='';
    }
    if(!this.dealt){this.dealt=true;this.startDeal(snap,own,live&&snap.street==='preflop'&&snap.board.length===0);}
    this.syncBoard(snap,live);
    this.syncPoses(snap,live);
    this.syncOwnHand(own,live);
    this.syncForced(snap,live);
    this.syncReveal(snap,live);
    this.initialDone=true;
  }
  private showLobbyBoard(){
    const demo:Card[]=[{id:'AS',rank:14,suit:'S'},{id:'QH',rank:12,suit:'H'},{id:'JC',rank:11,suit:'C'}];
    for(let i=0;i<5;i++){const c=this.board[i];if(i<3){this.boardSpot(i,c.p1,c.q1,true);this.setFace(c,demo[i]);this.placeInstant(c,c.p1,c.q1);c.root.scaling.setAll(BOARD_SCALE);c.state='lobby';}else if(c.state==='lobby'||c.root.isEnabled()){c.show(false);}}
    this.boardCount=-1;
  }
  resetCards(){
    this.tw.cancel(this);
    for(const c of [...this.board,...this.burn,...this.hole.flat(),...this.rig,...this.temp,this.peekCard]){this.tw.cancel(c);c.show(false);}
    this.ball?.setEnabled(false);
    this.picked=[false,false,false,false];this.foldedSeen=[false,false,false,false];this.ownShown=[false,false];this.ownHandKey='';this.ownCards=[];this.boardCount=0;this.revealKey='';this.revealSeen.clear();
    this.rigOffset[0]=this.rigOffset[1]=0;this.dealt=false;
  }
  private activeSeats(snap:RoomSnapshot){return snap.players.filter(p=>!p.eliminated&&p.handSize>0).map(p=>p.seat);}
  private startDeal(snap:RoomSnapshot,own:PrivateSnapshot|null,animate:boolean){
    const seats=this.activeSeats(snap);const order:number[]=[];
    for(let i=1;i<=4;i++){const s=(snap.dealerSeat+i)%4;if(seats.includes(s))order.push(s);}
    const p=this.tmpP.clone(),q=new Quaternion();let n=0;
    if(animate)this.shuffleDeck();
    for(let round=0;round<2;round++)for(const seat of order){
      const c=this.hole[seat][round];this.tableSpot(seat,round,p,q,false);const delay=n*.3+(animate?SHUFFLE_S:0);n++;
      this.setFace(c,null);c.back.material=this.backMat;
      if(!animate){this.placeInstant(c,p,q);c.state='table';continue;}
      c.pos.copyFrom(DECK_POS);c.pos.y+=.02;this.deckQuat(c.quat);c.show(false);c.state='flying';
      const pp=p.clone(),qq=q.clone();
      this.tw.after(c,delay,()=>{c.show(true);this.dealerActor()?.play('dealer_deal');this.onDeal(seat);this.flight(c,pp,qq,.46,.22,0,()=>{c.state='table';});});
    }
    const total=animate?n*.3+.55+SHUFFLE_S:0;
    const picks=()=>{for(const seat of order)this.pickUp(seat,animate);};
    if(animate)this.tw.after(this,total+.15,picks);else picks();
    void own;
  }
  private deckQuat(out:Quaternion){this.tmpN.set(0,-1,0);this.tmpU.set(0,0,-1);orient(this.tmpN,this.tmpU,out);}
  private pickUp(seat:number,animate:boolean){
    this.picked[seat]=true;
    if(seat===this.ownSeat){
      // cards leave the table and arrive in the first-person hands
      for(let k=0;k<2;k++){
        const c=this.hole[seat][k];const delay=k*.12;
        this.tw.after(c,delay,()=>{this.rigWorldSpot(k,c.p1);c.q1.copyFrom(c.quat);this.flight(c,c.p1.clone(),c.quat.clone(),.34,.1,0,()=>{c.show(false);this.ownShown[k]=true;this.showRigCard(k);});});
        if(!animate){c.show(false);this.ownShown[k]=true;this.showRigCard(k);}
      }
      return;
    }
    if(animate)this.actorOf(seat)?.play('receive_item');
  }
  private rigWorldSpot(k:number,out:Vector3){
    this.rigRoot.computeWorldMatrix(true);this.camera.getWorldMatrix();
    this.rigCardTarget(k,this.rigPose,this.rigQ,0);Vector3.TransformCoordinatesFromFloatsToRef(this.rigPose.x*this.rigRoot.scaling.x,this.rigPose.y*this.rigRoot.scaling.y,this.rigPose.z*this.rigRoot.scaling.z,this.rigRoot.getWorldMatrix(),out);
  }
  private showRigCard(k:number){const c=this.rig[k];c.show(true);c.state='held';this.rigCardTarget(k,this.rigPose,this.rigQ,this.ld);c.pos.copyFrom(this.rigPose);c.quat.copyFrom(this.rigQ);this.syncOwnFaces();}
  private syncOwnFaces(){const hand=this.ownCards;for(let k=0;k<2;k++){this.setFace(this.rig[k],hand[k]??null);}}
  private ownCards:Card[]=[];
  private syncOwnHand(own:PrivateSnapshot|null,live:boolean){
    const hand=own?.hand??[];const key=hand.map(c=>c.id+(c.modifiers?.[0]??'')).join(',');
    if(key===this.ownHandKey)return;
    const prev=this.ownCards;this.ownCards=hand;this.ownHandKey=key;
    this.syncOwnFaces();
    if(!(live&&prev.length===2&&hand.length===2))return;
    for(let k=0;k<2;k++){
      if(prev[k].id!==hand[k].id){ // swap card used (or the forced-reveal lifted card changed): old card burns, new one rises
        if(this.consumedSpare&&this.consumedSpare.id===hand[k].id&&performance.now()-this.consumedSpare.at<5000)this.exchangeRig(k,prev[k]);
        else this.modifierFx(k,false);
      }else if((prev[k].modifiers?.[0]??'')!==(hand[k].modifiers?.[0]??'')){
        const m=hand[k].modifiers?.[0];this.modifierFx(k,m==='trapRank'||m==='trapSuit'||m==='cursed');
      }
    }
  }
  private syncPeeks(own:PrivateSnapshot|null,live:boolean){
    for(const [i,p] of (own?.peeks??[]).entries()){
      const key=`${p.handId}:${i}:${p.label}:${p.card?.id??p.text??''}`;if(this.peekSeen.has(key))continue;this.peekSeen.add(key);
      if(live&&p.card)this.peekFlash(p.card,/cầu|crystal|ball/i.test(p.label));
    }
  }
  private syncBoard(snap:RoomSnapshot,live:boolean){
    const cards=snap.board;if(this.boardCount===-1){for(const c of this.board)c.show(false);this.boardCount=0;}
    if(cards.length<this.boardCount){for(const c of this.board)c.show(false);this.boardCount=0;}
    // Đổi bài chung (K03): same number of cards, but one was replaced -> it turns face-down, changes, turns back with embers
    for(let i=0;i<Math.min(this.boardCount,cards.length);i++){
      const c=this.board[i];if(!c.root.isEnabled()||c.state==='flying')continue;
      const sig=cards[i].id+(cards[i].modifiers?.[0]??'');
      if(c.cardId&&(c.cardId!==cards[i].id||this.boardSig[i]!==sig)){
        this.boardSig[i]=sig;
        if(!live){this.setFace(c,cards[i]);continue;}
        const fp=new Vector3(),fq=new Quaternion(),dp=new Vector3(),dq=new Quaternion();this.boardSpot(i,fp,fq,true);this.boardSpot(i,dp,dq,false);dp.y+=.04;
        this.burst(this.worldOf(c.root,this.psTmp),'violet',26);
        this.flipTo(c,dp,dq,.35,0,()=>{this.setFace(c,cards[i]);this.burst(this.worldOf(c.root,this.psTmp),'gold',26);this.flipTo(c,fp,fq,.45,.1,()=>{c.state='board';});},.05);
      }
    }
    if(cards.length===this.boardCount)return;
    const from=this.boardCount;this.boardCount=cards.length;
    const p=new Vector3(),q=new Quaternion();
    const newCards=cards.length-from;
    if(!live){for(let i=from;i<cards.length;i++){const c=this.board[i];this.boardSpot(i,p,q,true);this.setFace(c,cards[i]);this.placeInstant(c,p,q);c.root.scaling.setAll(BOARD_SCALE);c.state='board';this.boardSig[i]=cards[i].id+(cards[i].modifiers?.[0]??'');}return;}
    // burn card first, then each community card is dealt face-down and flipped in place
    const b=this.burn[this.burnIdx++%this.burn.length];this.deckQuat(b.quat);b.pos.copyFrom(DECK_POS);b.pos.y+=.02;b.show(true);this.setFace(b,null);
    const bq=new Quaternion();this.tmpN.set(0,-1,0);this.tmpU.set(.3,0,-1);orient(this.tmpN,this.tmpU,bq);
    const bp=BURN_POS.clone();bp.y=TABLE_Y+this.burnIdx*.002;
    this.dealerActor()?.play('dealer_deal');
    this.flight(b,bp,bq,.4,.18);
    for(let j=0;j<newCards;j++){
      const i=from+j,c=this.board[i];this.boardSpot(i,p,q,false);const delay=.45+j*.42;
      this.setFace(c,cards[i]);this.boardSig[i]=cards[i].id+(cards[i].modifiers?.[0]??'');c.state='flying';c.pos.copyFrom(DECK_POS);c.pos.y+=.02;this.deckQuat(c.quat);c.show(false);
      const pp=p.clone(),qq=q.clone(),fp=new Vector3(),fq2=new Quaternion();this.boardSpot(i,fp,fq2,true);
      this.tw.after(c,delay,()=>{c.show(true);c.root.scaling.setAll(BOARD_SCALE);this.dealerActor()?.play('dealer_deal');this.flight(c,pp,qq,.4,.2,0,()=>{this.flipTo(c,fp,fq2,.5,.1,()=>{c.state='board';if(cards[i].modifiers?.length)this.burst(this.worldOf(c.root,this.psTmp),cards[i].modifiers![0]==='trapRank'||cards[i].modifiers![0]==='trapSuit'||cards[i].modifiers![0]==='cursed'?'violet':'gold',24);});});});
    }
  }
  private boardSig:string[]=[];private burnIdx=0;
  /** Folded / eliminated opponents' cards slide back to the deck. */
  private syncPoses(snap:RoomSnapshot,live:boolean){
    for(const p of snap.players){
      if(p.seat===this.ownSeat){
        if((p.folded||p.eliminated)&&!this.foldedSeen[p.seat]){this.foldedSeen[p.seat]=true;this.foldRig(live);}
        continue;
      }
      if(!this.picked[p.seat])continue;
      const gone=p.folded||p.eliminated||p.handSize===0;
      if(gone&&!this.foldedSeen[p.seat]&&snap.phase==='playing'){this.foldedSeen[p.seat]=true;this.foldSeat(p.seat,live);}
    }
  }
  private foldSeat(seat:number,live:boolean){
    const a=this.actorOf(seat);if(live)a?.play('fold_cards');
    for(let k=0;k<2;k++){const c=this.hole[seat][k];if(!c.root.isEnabled())continue;
      if(!live){c.show(false);continue;}
      const qq=new Quaternion();this.deckQuat(qq);const pp=DECK_POS.clone();pp.y=.84;
      this.flight(c,pp,qq,.35,.12,k*.06,()=>{c.show(false);});}
  }
  private foldRig(live:boolean){
    for(let k=0;k<2;k++){const c=this.rig[k];if(c.state!=='held')continue;
      this.tw.add(c,.4,kk=>{this.rigOffset[k]=-.35*kk;},{delay:k*.05,done:()=>{c.show(false);this.ownShown[k]=false;this.rigOffset[k]=0;}});}
    void live;
  }
  /** Ép lộ bài (K02): hole cards forced public (PublicPlayer.revealedCards) flip face-up on the table for everyone. */
  private syncForced(snap:RoomSnapshot,live:boolean){
    if(snap.phase!=='playing')return;
    for(const p of snap.players){
      const rc=p.revealedCards;if(!rc||!rc.length||p.folded)continue;
      const key=`${snap.handId}:${p.seat}:${rc.map(c=>c.id).join(',')}`;if(this.revealSeen.has(key))continue;this.revealSeen.add(key);
      this.revealHand(p.seat,rc,live,0);
      if(live)this.burst(this.hole[p.seat][0].pos,'fire',30);
    }
  }
  private syncReveal(snap:RoomSnapshot,live:boolean){
    const res=snap.result;const key=res?`${snap.handId}:${res.revealed.map(r=>r.playerId).join(',')}`:'';
    if(key===this.revealKey)return;this.revealKey=key;if(!res)return;
    let n=0;
    for(const r of res.revealed){
      const seat=snap.players.find(p=>p.id===r.playerId)?.seat;if(seat==null)continue;
      this.revealHand(seat,r.cards,live,n++*.35);
    }
  }
  /** Public API: lay the seat's hole cards on the table, big and facing you, and flip them face up (showdown / forced reveal). */
  revealHand(seat:number,cards:Card[],live=true,delay=0){
    const pp=new Vector3(),qq=new Quaternion(),mid=new Vector3(),midQ=new Quaternion();
    for(let k=0;k<2;k++){
      const c=this.hole[seat][k];if(!cards[k])continue;
      if(c.state==='revealing'||(c.state==='revealed'&&c.cardId===cards[k].id))continue;
      const isOwn=seat===this.ownSeat;
      if(isOwn){const rc=this.rig[k];if(rc.state==='held'){this.rigWorldPoseOf(rc,c);rc.show(false);this.ownShown[k]=false;c.show(true);}else if(!c.root.isEnabled()){this.tableSpot(seat,k,c.pos,c.quat,false);c.show(true);}}
      else if(!c.root.isEnabled()){this.tableSpot(seat,k,c.pos,c.quat,false);c.show(true);}
      this.setFace(c,cards[k]);c.back.material=this.backMat;
      const rsc=this.revealSpot(seat,k,pp,qq);
      if(!live){this.placeInstant(c,pp,qq);c.root.scaling.setAll(rsc);c.state='revealed';continue;}
      c.state='revealing';
      mid.copyFrom(pp);mid.y=TABLE_Y+.02;this.tmpN.set(0,-1,0);this.tmpU.copyFrom(this.viewAway);orient(this.tmpN,this.tmpU,midQ);
      const tp=pp.clone(),tq=qq.clone(),m1=mid.clone(),mq=midQ.clone();
      this.tw.after(c,delay+k*.12,()=>{c.root.scaling.setAll(rsc);this.flight(c,m1,mq,.36,.1,0,()=>this.flipTo(c,tp,tq,.55,.05,()=>{c.state='revealed';}));});
    }
  }
  private rigWorldPoseOf(rc:CardObj,to:CardObj){rc.root.computeWorldMatrix(true);rc.root.getWorldMatrix().decompose(undefined,to.quat,to.pos);}

  // ---------------------------------------------------------------- public animation API
  setLookDown(down:boolean){this.ldTarget=down?1:0;}
  private holdHidden=false;
  /** null or [] hides the held cards (e.g. outside a hand); a non-empty array shows/updates them. */
  setHoldCards(cards:Card[]|null){
    const hand=cards??[];this.holdHidden=hand.length===0;
    const key=hand.map(c=>c.id+(c.modifiers?.[0]??'')).join(',');if(key===this.ownHandKey)return;this.ownHandKey=key;this.ownCards=hand;this.syncOwnFaces();
  }
  get lookDownAmount(){return this.ld;}
  /** Smoothed look-down factor 0..1, advanced by the scene each frame. */
  update(dt:number){
    dt*=this.timeScale;
    this.ld+=(this.ldTarget-this.ld)*(1-Math.exp(-dt*7.5));if(Math.abs(this.ldTarget-this.ld)<.001)this.ld=this.ldTarget;
    this.tw.update(dt);this.updateRig(dt);this.updateTray(dt);this.updatePops(dt);
  }
  /** Fly `count` cards from the deck to the seat's table spot (hole cards). Used by sync automatically; exposed for QA/overrides. */
  dealTo(seat:number,count=1,startIndex=0){
    const p=new Vector3(),q=new Quaternion();
    for(let i=0;i<count;i++){
      const k=Math.min(1,startIndex+i);const c=this.hole[seat][k];this.tableSpot(seat,k,p,q,false);
      this.setFace(c,null);c.back.material=this.backMat;c.pos.copyFrom(DECK_POS);c.pos.y+=.02;this.deckQuat(c.quat);c.show(true);c.state='flying';
      this.dealerActor()?.play('dealer_deal');
      this.flight(c,p.clone(),q.clone(),.46,.22,i*.3,()=>{c.state='table';});
    }
  }
  /** Deal community cards (index = first slot): burn, deal face-down, flip. */
  dealBoard(index:number,cards:Card[]){
    this.boardCount=index;
    const full:Card[]=[];for(let i=0;i<index;i++)full.push({id:this.board[i].cardId||'?',rank:0,suit:'S'});
    this.syncBoard({board:[...full,...cards]} as unknown as RoomSnapshot,true);
  }
  flipBoard(i:number){const c=this.board[i];if(!c.root.isEnabled())return;const p=new Vector3(),q=new Quaternion();this.boardSpot(i,p,q,true);this.flipTo(c,p,q);}
  showTray(seconds=3){this.trayHold=Math.max(this.trayHold,seconds);}
  /** Event feed hook (private events only matter for you): 'peeked' = somebody looked at your hand. */
  onEvent(ev:GameEvent){
    const t=ev.type as string;
    if(t==='peeked')this.peekedFlash();
    else if(t==='magicHint')this.showMagicHint(ev.cue,ev.text);
    else if(t==='use'&&ev.magicId){const k=getMagic(ev.magicId)?.kind;if(k==='passive_triggered'||k==='passive_continuous')this.pulseSlot(ev.magicId);}
  }
  /** Debug/QA summary. */
  stats(){return{tweens:this.tw.active,ld:+this.ld.toFixed(3),handId:this.handId,boardShown:this.boardCount,picked:[...this.picked],rig:this.rig.map(c=>c.state),tray:this.tray.map(c=>c.state+':'+this.slotIds[this.tray.indexOf(c)]),pops:this.pops.length,cards:[...this.board,...this.hole.flat()].filter(c=>c.root.isEnabled()).length};}
  dispose(){
    this.tw.clear();for(const c of [...this.board,...this.burn,...this.hole.flat(),...this.rig,...this.temp,...this.shuf,this.peekCard])c.dispose();
    for(const c of this.tray)c.dispose();for(const p of this.pops){p.card.dispose();}this.ps?.dispose();
    this.faceMats.forEach(m=>{m.emissiveTexture?.dispose();m.dispose();});this.magicMats.forEach(m=>{m.emissiveTexture?.dispose();m.dispose();});
    this.backMat.diffuseTexture?.dispose();this.backMat.dispose();this.blank.dispose();this.handMat.dispose();this.cuffMat.dispose();
    this.props.forEach(n=>n.dispose(false,false));this.propSource.forEach(n=>n.dispose());this.deckNode?.dispose();this.rigRoot.dispose();this.hud.dispose();
  }
}
export type {AbstractMesh};
