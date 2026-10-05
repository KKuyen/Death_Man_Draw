// Verifies every asset in assets/manifests/saloon-assets.json exists in public/ and is a valid GLB; every web model URL resolves.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const manifest = JSON.parse(readFileSync(join(root, 'assets/manifests/saloon-assets.json'), 'utf8'));
function checkGlb(rel) {
  const f = join(root, rel);
  if (!existsSync(f)) { errors.push(`missing ${rel}`); return; }
  const b = readFileSync(f);
  if (b.length < 20 || b.readUInt32LE(0) !== 0x46546c67) { errors.push(`not a GLB: ${rel}`); return; }
  if (b.readUInt32LE(8) !== b.length) errors.push(`GLB length header mismatch: ${rel}`);
  const jsonLen = b.readUInt32LE(12);
  try { const j = JSON.parse(b.slice(20, 20 + jsonLen).toString('utf8')); if (!j.asset || !j.meshes?.length) errors.push(`GLB has no meshes: ${rel}`); }
  catch { errors.push(`GLB JSON chunk invalid: ${rel}`); }
}
let n = 0;
for (const a of manifest.assets) {
  const rel = a.exportPath || a.path || a.file || a.glb || a.output;
  if (!rel) { errors.push(`asset ${a.assetId}: no path field in manifest`); continue; }
  checkGlb(rel.startsWith('public/') ? rel : join('public', rel)); n++;
}
// every glb in public/models must be covered by the manifest or at least be valid
const walk = d => readdirSync(d).flatMap(e => { const p = join(d, e); return statSync(p).isDirectory() ? walk(p) : [p]; });
const all = walk(join(root, 'public/models')).filter(f => f.endsWith('.glb'));
for (const f of all) checkGlb(f.slice(root.length + 1));
// previews / source files referenced by manifest
for (const a of manifest.assets) for (const k of ['source', 'preview', 'sourceBlend', 'previewPng']) if (a[k] && !existsSync(join(root, a[k]))) errors.push(`asset ${a.assetId}: ${k} missing: ${a[k]}`);
// models referenced from web source must exist
const src = walk(join(root, 'apps/web/src')).filter(f => /\.(ts|tsx)$/.test(f));
for (const f of src) for (const m of readFileSync(f, 'utf8').matchAll(/['"`]\/?(models\/[\w/.-]+\.glb)['"`]/g)) if (!existsSync(join(root, 'public', m[1]))) errors.push(`${f.slice(root.length + 1)} references missing public/${m[1]}`);
console.log(`check:assets manifest entries=${n}, glb files in public/models=${all.length}`);
if (errors.length) { console.error(errors.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log('check:assets OK');
