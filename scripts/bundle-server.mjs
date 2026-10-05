// Fully self-contained server bundle (no node_modules needed) -> dist-bundle/server.mjs. Used by Docker and Electron packaging.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const r = p => fileURLToPath(new URL('../' + p, import.meta.url));
await build({
  stdin: { contents: "import { startServer } from './apps/server/src/index.ts'; // apps/server/src/index.ts auto-starts only when its own guard matches argv[1]; it fails for paths needing URL-encoding (spaces in .app names), so start explicitly in that case.\nif (import.meta.url !== `file://${process.argv[1]}` && !process.argv[1]?.endsWith('/src/index.ts') && !process.argv[1]?.endsWith('/dist/index.js')) startServer().catch(e => { console.error(e); process.exit(1); });", resolveDir: r(''), sourcefile: 'entry.ts', loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', target: 'node22',
  outfile: r('dist-bundle/server.mjs'), logLevel: 'info',
  banner: { js: "import {createRequire as __cr} from 'node:module';const require=__cr(import.meta.url);" },
  alias: { '@saloon/rules': r('packages/rules/src/index.ts'), '@saloon/content': r('packages/content/src/index.ts'), '@saloon/protocol': r('packages/protocol/src/index.ts') },
});
