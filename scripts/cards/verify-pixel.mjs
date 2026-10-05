import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const manifest=JSON.parse(readFileSync('public/cards/manifest.json'));
function decode(path){const b=readFileSync(path),w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.equal(b[24],8);assert.equal(b[25],6);const data=[];for(let off=8;off<b.length;){const n=b.readUInt32BE(off),tag=b.toString('ascii',off+4,off+8);if(tag==='IDAT')data.push(b.subarray(off+8,off+8+n));off+=n+12;}
  const scan=inflateSync(Buffer.concat(data)),px=Buffer.alloc(w*h*4),stride=w*4;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<h;y++){const filter=scan[y*(stride+1)];for(let x=0;x<stride;x++){const k=y*stride+x,a=x>=4?px[k-4]:0,c=y>0&&x>=4?px[k-stride-4]:0,up=y>0?px[k-stride]:0;const v=filter===0?0:filter===1?a:filter===2?up:filter===3?Math.floor((a+up)/2):paeth(a,up,c);px[k]=(scan[y*(stride+1)+1+x]+v)&255;}}
  return {w,h,px};
}
const expected=[...Array.from({length:9},(_,i)=>`N${String(i+1).padStart(2,'0')}`),...[1,2,3,4,5,7,8,9,10,11,12,13].map(i=>`K${String(i).padStart(2,'0')}`),'X01','X02','X03'];assert.deepEqual(manifest.cards.map(c=>c.id),expected);
const fallback=spawnSync(process.execPath,['scripts/cards/gen.mjs','--fallback'],{env:{...process.env,CARD_OUT:'assets/previews/pixel-fallback'},encoding:'utf8'});assert.equal(fallback.status,0,fallback.stderr);
const files=[...manifest.cards.map(c=>c.file),manifest.back,...Object.values(manifest.overlays).map(m=>m.file)];let maxChannelDifference=0;
for(const file of files){const {w,h,px}=decode('public/cards/'+file);assert.equal(w,256);assert.equal(h,352);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++)assert.equal(px[(y*w+x)*4+c],px[(Math.floor(y/4)*4*w+Math.floor(x/4)*4)*4+c],file+' must repeat each native pixel in a 4x4 block');
  const fb=decode('assets/previews/pixel-fallback/'+file);for(let i=0;i<px.length;i++)maxChannelDifference=Math.max(maxChannelDifference,Math.abs(px[i]-fb.px[i]));
}
for(const c of manifest.cards)assert.ok(readFileSync('public/cards/'+c.file).equals(readFileSync('public/cards/'+c.plain)));
assert.equal(maxChannelDifference,0,'Blender and Node fallback grids must match decoded RGBA exactly');
const glb=readFileSync('public/models/props/magic_card.glb'),doc=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));assert.deepEqual(doc.nodes.map(n=>n.name),['prop_magic_card']);assert.equal(doc.materials.length,3);assert.equal(doc.images.length,2);assert.ok(doc.samplers.every(s=>s.magFilter===9728&&[9728,9984].includes(s.minFilter)));
const report={passed:true,cards:expected.length,artFiles:files.length,native:[64,88],exported:[256,352],nearestBlocks:true,plainCopiesIdentical:true,fallbackDecodedRGBAIdentical:true,maxChannelDifference,nodeNames:doc.nodes.map(n=>n.name),samplers:doc.samplers};writeFileSync('assets/manifests/pixel-art-verification.json',JSON.stringify(report,null,2)+'\n');console.log(report);
