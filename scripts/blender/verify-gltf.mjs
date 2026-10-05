// Official Khronos validator, pinned to gltf-validator 2.0.0-dev.3.10.
// Fetches the Apache-2.0 validator into an owned cache without modifying package/lock files.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const validatorURL = new URL('./validator.cjs', import.meta.url);
try { await readFile(validatorURL); }
catch {
  const response = await fetch('https://unpkg.com/gltf-validator@2.0.0-dev.3.10/gltf_validator.dart.js',
    { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Validator download failed: ${response.status}`);
  await writeFile(validatorURL, new Uint8Array(await response.arrayBuffer()));
}
const validator = createRequire(import.meta.url)('./validator.cjs');
const files = ['environment.glb'];
for (const dir of ['characters', 'props']) for (const name of await readdir(`${root}public/models/${dir}`)) {
  if (name.endsWith('.glb')) files.push(`${dir}/${name}`);
}
const results = [];
let errors = 0;
for (const file of files) {
  const report = await validator.validateBytes(new Uint8Array(await readFile(`${root}public/models/${file}`)),
    { uri: file, writeTimestamp: false, maxIssues: 0 });
  errors += report.issues.numErrors;
  results.push({file, ...report});
}
await writeFile(`${root}assets/manifests/gltf-validation.json`, JSON.stringify({
  validator: validator.version(), passed: errors === 0, errors, results
}, null, 2) + '\n');
console.log(JSON.stringify(results.map(r=>({file:r.file, errors:r.issues.numErrors,
  warnings:r.issues.numWarnings, infos:r.issues.numInfos})),null,2));
if (errors) process.exitCode = 1;
