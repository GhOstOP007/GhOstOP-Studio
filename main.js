const { app, BrowserWindow, dialog, ipcMain, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const fsSync = require('node:fs');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const iconPath = path.join(__dirname, 'assets', 'ghostop.ico');
const geocodeCache = new Map(); let lastGeocodeAt = 0;
const MODEL_ID = 'Xenova/clip-vit-base-patch32';
let activeDownload = null;
const modelRoot = () => path.join(app.getPath('userData'), 'models');
const modelDir = () => path.join(modelRoot(), ...MODEL_ID.split('/'));
const modelReady = () => fsSync.existsSync(path.join(modelDir(), '.ghostop-ready'));


let win;
const mediaExt = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?|mp4|mov|m4v|webm|mkv|avi|3gp)$/i;
function inside(parent, child) { const rel = path.relative(parent, child); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); }

protocol.registerSchemesAsPrivileged([{ scheme: 'ghostop', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

async function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 960, minWidth: 1050, minHeight: 720,
    frame: false, title: 'GhOstOP Studio', icon: iconPath, backgroundColor: '#0b0a16',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  await win.loadURL('ghostop://app/index.html');
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') app.setAppUserModelId('com.ghostop.studio');
  protocol.handle('ghostop', request => {
    const url = new URL(request.url);
    const requested = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const base = url.hostname === 'models' ? modelRoot() : path.resolve(__dirname);
    const target = path.resolve(base, requested || (url.hostname === 'models' ? '' : 'index.html'));
    if (!inside(base, target)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(target).toString());
  });

  ipcMain.handle('model:status', () => ({ ready: modelReady(), downloading: !!activeDownload, directory: modelDir() }));
  ipcMain.handle('model:cancel', () => { if (activeDownload) activeDownload.abort(); return true; });
  ipcMain.handle('model:delete', async () => {
    if (activeDownload) throw new Error('Cancel the download first');
    await fs.rm(modelDir(), { recursive: true, force: true }); return true;
  });
  ipcMain.handle('model:download', async event => {
    if (modelReady()) return { ready: true };
    if (activeDownload) throw new Error('A model download is already running');
    const controller = new AbortController(); activeDownload = controller;
    const notify = payload => { if (!event.sender.isDestroyed()) event.sender.send('model:progress', payload); };
    try {
      const api = `https://huggingface.co/api/models/${MODEL_ID}/tree/main?recursive=true`;
      const listingResponse = await net.fetch(api, { signal: controller.signal });
      if (!listingResponse.ok) throw new Error(`Could not retrieve model file list: HTTP ${listingResponse.status}`);
      const listing = await listingResponse.json();
      // Full snapshot for compatibility with WebGPU fp16 and WASM q8.
      const files = listing.filter(x => x.type === 'file' && typeof x.path === 'string' && Number.isFinite(x.size) && x.size >= 0);
      if (!files.length) throw new Error('Model repository returned no files');
      const total = files.reduce((n, x) => n + x.size, 0);
      let completed = 0;
      for (const entry of files) {
        if (controller.signal.aborted) throw new Error('Download cancelled');
        const parts = entry.path.split('/');
        if (parts.some(x => !x || x === '.' || x === '..' || x.includes('\\'))) throw new Error('Invalid model file path');
        const destination = path.join(modelDir(), ...parts);
        if (!inside(modelDir(), destination)) throw new Error('Invalid model path');
        await fs.mkdir(path.dirname(destination), { recursive: true });
        const existing = await fs.stat(destination).catch(() => null);
        if (existing && existing.size === entry.size) {
          completed += entry.size; notify({ downloaded: completed, total, file: entry.path }); continue;
        }
        const uri = `https://huggingface.co/${MODEL_ID}/resolve/main/${parts.map(encodeURIComponent).join('/')}?download=true`;
        const response = await net.fetch(uri, { signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${entry.path}`);
        const tmp = destination + '.part';
        let received = 0;
        try {
          const source = Readable.fromWeb(response.body);
          source.on('data', chunk => { received += chunk.length; notify({ downloaded: completed + received, total, file: entry.path }); });
          await pipeline(source, fsSync.createWriteStream(tmp), { signal: controller.signal });
          const stat = await fs.stat(tmp);
          if (stat.size !== entry.size) throw new Error(`Incomplete file: ${entry.path}`);
          await fs.rename(tmp, destination);
        } finally { await fs.rm(tmp, { force: true }).catch(() => {}); }
        completed += entry.size;
      }
      await fs.writeFile(path.join(modelDir(), '.ghostop-ready'), JSON.stringify({ id: MODEL_ID, bytes: total, files: files.length }));
      notify({ downloaded: total, total, ready: true });
      return { ready: true };
    } catch (err) { notify({ error: err.message }); throw err; }
    finally { activeDownload = null; }
  });

  // OpenStreetMap Nominatim reverse geocoding. Requests are throttled to <= 1/sec
  // and cached in memory. Only GPS coordinates are sent when the user enables online names.
  ipcMain.handle('location:reverseGeocode', async (_e, latitude, longitude) => {
    const lat = Number(latitude), lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error('Invalid GPS coordinates');
    }
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (geocodeCache.has(key)) return geocodeCache.get(key);
    const wait = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastGeocodeAt = Date.now();
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({
      format: 'jsonv2', lat: String(lat), lon: String(lon),
      zoom: '10', addressdetails: '1'
    }).toString();
    const response = await net.fetch(url.toString(), {
      headers: { 'User-Agent': 'GhOstOP-Studio/1.1 (desktop photo organizer)' }
    });
    if (!response.ok) throw new Error(`Place lookup failed (${response.status})`);
    const data = await response.json();
    const a = data.address || {};
    const locality = a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county;
    const parts = [locality, a.state || a.region, a.country].filter(Boolean);
    const label = parts.length ? [...new Set(parts)].join(', ') : (data.name || data.display_name || '');
    if (label) geocodeCache.set(key, label);
    return label || null;
  });

  ipcMain.handle('folder:choose', async () => {
    const result = await dialog.showOpenDialog(win, { title: 'Choose a folder to organise', properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths[0]) return null;
    return { path: result.filePaths[0], name: path.basename(result.filePaths[0]) };
  });
  ipcMain.handle('folder:listMedia', async (_e, folder) => {
    const root = path.resolve(folder); const out = [];
    for (const ent of await fs.readdir(root, { withFileTypes: true })) {
      if (!ent.isFile() || !mediaExt.test(ent.name)) continue;
      const full = path.join(root, ent.name); const st = await fs.stat(full);
      out.push({ name: ent.name, path: full, size: st.size, lastModified: st.mtimeMs });
    }
    return out;
  });
  ipcMain.handle('file:readRange', async (_e, filePath, start, length) => {
    if (typeof filePath !== 'string' || !Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(length) || length < 0 || length > 4 * 1024 * 1024) throw new Error('Invalid file range');
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, start);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + bytesRead);
    } finally { await handle.close(); }
  });
  ipcMain.handle('file:read', async (_e, filePath) => {
    const data = await fs.readFile(filePath);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  });
  ipcMain.handle('file:move', async (_e, folder, sourcePath, relParts, originalName) => {
    const root = path.resolve(folder), src = path.resolve(sourcePath);
    if (!inside(root, src) || src === root) throw new Error('Source path outside selected folder');
    let destDir = root;
    for (const part of relParts) { if (typeof part !== 'string' || !part || part.includes('..') || part.includes('/') || part.includes('\\')) throw new Error('Invalid destination'); destDir = path.join(destDir, part); }
    await fs.mkdir(destDir, { recursive: true });
    const ext = path.extname(originalName), stem = path.basename(originalName, ext); let name = originalName, n = 1;
    while (true) { try { await fs.access(path.join(destDir, name)); name = `${stem} (${n++})${ext}`; } catch { break; } }
    const destination = path.join(destDir, name);
    try { await fs.rename(src, destination); } catch (err) { if (err.code !== 'EXDEV') throw err; await fs.copyFile(src, destination); const a = await fs.stat(src), b = await fs.stat(destination); if (a.size !== b.size) { await fs.rm(destination, { force: true }); throw new Error('Copy verification failed'); } await fs.rm(src); }
    return name;
  });
  ipcMain.handle('file:undo', async (_e, folder, relParts, movedName, originalPath) => {
    const root = path.resolve(folder); let srcDir = root;
    for (const part of relParts) srcDir = path.join(srcDir, part);
    const src = path.resolve(srcDir, movedName), dst = path.resolve(originalPath);
    if (!inside(root, src) || !inside(root, dst)) throw new Error('Invalid undo path');
    let dest = dst, i = 1;
    const ext = path.extname(dst), stem = path.basename(dst, ext);
    while (true) { try { await fs.access(dest); dest = path.join(path.dirname(dst), `${stem} (${i++})${ext}`); } catch { break; } }
    try { await fs.rename(src, dest); } catch (err) { if (err.code !== 'EXDEV') throw err; await fs.copyFile(src, dest); await fs.rm(src); }
    return true;
  });
  ipcMain.handle('file:writeLog', async (_e, folder, records) => fs.writeFile(path.join(folder, '_sort-log.json'), JSON.stringify(records, null, 2), 'utf8'));
  ipcMain.handle('file:removeLog', async (_e, folder) => fs.rm(path.join(folder, '_sort-log.json'), { force: true }));
  ipcMain.handle('window:action', (_e, action) => {
    if (!win) return;
    if (action === 'minimize') win.minimize();
    if (action === 'toggleMaximize') win.isMaximized() ? win.unmaximize() : win.maximize();
    if (action === 'close') win.close();
  });
  await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
