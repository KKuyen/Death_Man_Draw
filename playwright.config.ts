import {defineConfig} from '@playwright/test';
import {existsSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
// Use whichever cached chromium headless shell exists (override with CHROMIUM_PATH).
function chromium():string|undefined{
  if(process.env.CHROMIUM_PATH)return process.env.CHROMIUM_PATH;
  const root=join(homedir(),'Library/Caches/ms-playwright');
  if(!existsSync(root))return undefined;
  for(const d of readdirSync(root).filter(d=>d.startsWith('chromium_headless_shell')).sort().reverse()){
    for(const a of readdirSync(join(root,d))){const e=join(root,d,a,'chrome-headless-shell');if(existsSync(e))return e;}
  }
}
// Dedicated web port so e2e never attaches to some other app on 5180. Override with E2E_PORT; E2E_REUSE=1 reuses a running server.
const PORT=Number(process.env.E2E_PORT||5199);
export default defineConfig({
  testDir:'tests/e2e',timeout:180_000,workers:1,reporter:'list',
  use:{baseURL:`http://localhost:${PORT}`,viewport:{width:1440,height:900},launchOptions:{executablePath:chromium(),args:process.env.E2E_GPU==='1'?['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}},
  // E2E_PREVIEW=1 serves the built bundle (no HMR reloads, lighter): run `npm run build -w @saloon/web` first.
  webServer:{command:process.env.E2E_PREVIEW?`npm run preview -w @saloon/web -- --port ${PORT} --strictPort`:`npm run dev -w @saloon/web -- --port ${PORT} --strictPort`,url:`http://localhost:${PORT}`,reuseExistingServer:process.env.E2E_REUSE==='1',timeout:60_000}
});
