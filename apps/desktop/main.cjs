'use strict';
// Electron wrapper: serves apps/web/dist over local HTTP (so GLB/relative URLs and WebGL behave like a browser),
// and starts the self-contained server bundle (dist-bundle/server.mjs) as an owned child process on a dedicated local port.
const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const packaged = app.isPackaged;
const webDir = process.env.SALOON_WEB_DIR || (packaged ? path.join(process.resourcesPath, 'web') : path.join(root, 'apps/web/dist'));
const serverEntry = process.env.SALOON_SERVER_ENTRY || (packaged ? path.join(process.resourcesPath, 'server/server.mjs') : path.join(root, 'dist-bundle/server.mjs'));
let serverPort = 0;
const devUrl = process.env.SALOON_DEV_URL; // optional: load the vite dev server instead of dist
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.map': 'application/json', '.wasm': 'application/wasm' };

let serverChild = null, webServer = null, win = null;

function healthy() {
  return new Promise(res => {
    const r = http.get({ host: '127.0.0.1', port: serverPort, path: '/health', timeout: 1500 }, m => { m.resume(); res(m.statusCode === 200); });
    r.on('error', () => res(false)); r.on('timeout', () => { r.destroy(); res(false); });
  });
}

function startStatic() {
  return new Promise((resolve, reject) => {
    const base = path.resolve(webDir);
    webServer = http.createServer((req, res) => {
      let p;
      try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
      let f = path.resolve(base, '.' + (p === '/' ? '/index.html' : p));
      if (f !== base && !f.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(base, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(f).pipe(res);
    });
    webServer.on('error', reject);
    webServer.listen(0, '127.0.0.1', () => resolve(webServer.address().port));
  });
}

async function reserveLocalPort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.on('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const port = listener.address().port;
      listener.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function startServer(webPort) {
  if (process.env.SALOON_NO_SERVER === '1') return;
  serverPort = await reserveLocalPort();
  if (!fs.existsSync(serverEntry)) throw new Error('server bundle missing: ' + serverEntry + ' (run npm run bundle:server)');
  const dataDir = process.env.SALOON_DATA_DIR || path.join(app.getPath('userData'), 'data');
  serverChild = spawn(process.execPath, [serverEntry], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', HOST: '127.0.0.1', PORT: String(serverPort), DATA_DIR: dataDir,
      CORS_ORIGIN: [process.env.CORS_ORIGIN, `http://127.0.0.1:${webPort}`, devUrl].filter(Boolean).join(',') },
  });
  let spawnError;
  serverChild.on('error', e => { spawnError = e; });
  serverChild.on('exit', c => { console.log('[desktop] server exited', c); serverChild = null; });
  for (let i = 0; i < 60; i++) {
    if (spawnError) throw spawnError;
    if (!serverChild) throw new Error('owned server exited during startup');
    if (await healthy()) return;
    await new Promise(r => setTimeout(r, 500));
  }
  serverChild.kill('SIGTERM');
  throw new Error('server did not become healthy');
}

async function main() {
  const webPort = devUrl ? 0 : await startStatic();
  await startServer(webPort);
  const url = devUrl || `http://127.0.0.1:${webPort}/${process.env.SALOON_QA === '1' ? '?debug' : ''}`;
  win = new BrowserWindow({
    width: 1440, height: 900, backgroundColor: '#1b120c', title: "Dead Man's Draw", show: !process.env.SALOON_HEADLESS,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), additionalArguments: serverPort ? ['--saloon-endpoint=ws://127.0.0.1:' + serverPort] : [], contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true },
  });
  win.webContents.setWindowOpenHandler(({ url: u }) => { if (/^https?:/.test(u)) shell.openExternal(u); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, u) => { if (!u.startsWith(url.replace(/\/$/, ''))) e.preventDefault(); });
  await win.loadURL(url);
  console.log('[desktop] owned server on', serverPort);
  console.log('[desktop] loaded', url, 'title=' + win.getTitle());
  if (process.env.SALOON_SMOKE === '1') {
    // headless self-check: page DOM present and server reachable, then exit
    await new Promise(r => setTimeout(r, 3000));
    const info = await win.webContents.executeJavaScript('({endpoint:window.saloonDesktop?.endpoint,title:document.title,root:document.getElementById("root")?.children.length||0,canvas:!!document.querySelector("canvas"),text:document.body.innerText.slice(0,80)})');
    const health = await new Promise(r => http.get({ host: '127.0.0.1', port: serverPort, path: '/health' }, m => { let b = ''; m.on('data', d => b += d); m.on('end', () => r(b)); }).on('error', e => r('ERR ' + e.message)));
    const model = await new Promise(r => http.get({ host: '127.0.0.1', port: webPort, path: '/models/environment.glb' }, m => { m.resume(); r(m.statusCode + ' ' + m.headers['content-type']); }));
    if (!info.root || !info.canvas || !info.endpoint?.endsWith(':' + serverPort) || !health.includes('ok') || !model.startsWith('200')) throw new Error('desktop smoke failed: ' + JSON.stringify({ info, health, model }));
    console.log('SMOKE ' + JSON.stringify({ url, serverPort, ownedServer: !!serverChild, info, health, model }));
    app.quit();
  }
}

app.whenReady().then(main).catch(e => { console.error('[desktop] fatal', e); app.exit(1); });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { if (serverChild) serverChild.kill('SIGTERM'); if (webServer) webServer.close(); });
