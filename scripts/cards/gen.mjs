/** Wordless deterministic grid art. Default authoring/export/render happens in Blender.
 * --fallback replays Blender's primitive recipes through this native pixel rasterizer;
 * it needs only Node, and never uses fonts, SVG, gradients, or canvas smoothing.
 */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
if(!process.argv.includes('--fallback')){
  const r=spawnSync('python3',['scripts/blender/run.py','--only','cards'],{cwd:root,stdio:'inherit'});
  if(r.error)throw r.error;
  process.exitCode=r.status??1;
}else{
  const recipe=JSON.parse(readFileSync(new URL('./pixel-recipes.json',import.meta.url)));
  const {width:W,height:H,palette}=recipe;
  class Grid{
    pixels=Buffer.alloc(W*H*4);
    dot(x,y,c){if(x<0||y<0||x>=W||y>=H)return;const hex=palette[c]??c,k=(Math.trunc(y)*W+Math.trunc(x))*4;for(let j=0;j<3;j++)this.pixels[k+j]=parseInt(hex.slice(j*2,j*2+2),16);this.pixels[k+3]=255;}
    rect(x,y,w,h,c){for(let j=Math.trunc(y);j<Math.trunc(y+h);j++)for(let i=Math.trunc(x);i<Math.trunc(x+w);i++)this.dot(i,j,c);}
    ellipse(x,y,rx,ry,c){for(let j=Math.trunc(y-ry);j<=Math.trunc(y+ry);j++)for(let i=Math.trunc(x-rx);i<=Math.trunc(x+rx);i++)if(((i-x)/rx)**2+((j-y)/ry)**2<=1)this.dot(i,j,c);}
    poly(pts,c){for(let y=Math.max(0,Math.trunc(Math.min(...pts.map(p=>p[1]))));y<Math.min(H,Math.trunc(Math.max(...pts.map(p=>p[1])))+1);y++)for(let x=Math.max(0,Math.trunc(Math.min(...pts.map(p=>p[0]))));x<Math.min(W,Math.trunc(Math.max(...pts.map(p=>p[0])))+1);x++){
      let inside=false;for(let i=0;i<pts.length;i++){const [a,b]=pts[i],[u,v]=pts[(i+pts.length-1)%pts.length];if((b>y)!==(v>y)&&x<(u-a)*(y-b)/(v-b)+a)inside=!inside;}if(inside)this.dot(x,y,c);
    }}
    png(scale=4){const w=W*scale,h=H*scale,scan=Buffer.alloc(h*(1+w*4));for(let y=0;y<h;y++)for(let x=0;x<w;x++)this.pixels.copy(scan,y*(1+w*4)+1+x*4,(Math.floor(y/scale)*W+Math.floor(x/scale))*4,(Math.floor(y/scale)*W+Math.floor(x/scale))*4+4);
      const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
      return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);}
  }
  function chunk(name,data){const tag=Buffer.from(name),body=Buffer.concat([tag,data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);let crc=0xffffffff;for(const b of body){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
  const out=resolve(process.env.CARD_OUT??resolve(root,'public/cards'));
  for(const d of ['', 'plain','overlays','badges'])mkdirSync(resolve(out,d),{recursive:true});
  for(const [id,commands] of Object.entries(recipe.grids)){
    const g=new Grid();for(const [fn,...args] of commands)g[fn](...args);
    const file=id.startsWith('overlay_')?`overlays/${id.slice(8)}.png`:`${id}.png`;
    writeFileSync(resolve(out,file),g.png());
    if(id.startsWith('overlay_'))copyFileSync(resolve(out,file),resolve(out,`badges/${id.slice(8)}.png`));
    else if(id!=='back')copyFileSync(resolve(out,file),resolve(out,`plain/${id}.png`));
  }
  copyFileSync(resolve(root,'public/cards/manifest.json'),resolve(out,'manifest.json'));
  console.log(`Đã dựng pixel art dự phòng: ${Object.keys(recipe.grids).length} ảnh tại ${out}`);
}
