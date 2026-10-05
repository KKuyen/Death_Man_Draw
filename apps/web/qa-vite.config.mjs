// QA-only Vite config: builds just qa-scene.html (scene + fx) so UI edits by other agents cannot break or reload the harness.
import {defineConfig} from 'vite';import {fileURLToPath} from 'node:url';
export default defineConfig({base:'./',publicDir:fileURLToPath(new URL('../../public',import.meta.url)),build:{outDir:process.env.QA_OUT||'dist-qa',emptyOutDir:true,chunkSizeWarningLimit:3000,rollupOptions:{input:'qa-scene.html'}}});
