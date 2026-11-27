// Electron main process: shows the Vite web build in a desktop window.
// Kept outside src/ so the game code never depends on Electron.
const { app, BrowserWindow, ipcMain, Menu, net, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');

/** Set by `npm run electron:dev` to load the Vite dev server instead of the build. */
const DEV_URL = process.env.SPILL_DEV_URL;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// The build is served from app://spill/ rather than file://, so the page has a
// stable, secure origin of its own: localStorage (the run save, `spill.run.v2`)
// persists across launches, and Vite's absolute /assets/ paths resolve.
const SCHEME = 'app';
const HOST = 'spill';
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// The desktop battle layout needs 900px of width (`useDesktop` in src/ui/useMediaQuery.ts).
const MIN_WIDTH = 960;
const MIN_HEIGHT = 640;

function serveDist() {
  protocol.handle(SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.normalize(path.join(DIST_DIR, relative));
    if (!file.startsWith(DIST_DIR + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

// ---------- Updates ----------
// The installed game checks GitHub Releases (build.publish in package.json) on
// launch. The main menu shows what it found (src/ui/UpdateNotice.tsx); the
// download only starts when the player clicks Update, then it installs and restarts.
// SPILL_UPDATE_URL points the check at another folder of builds, for testing.

/** The latest update status, also sent to a page that loads (or reloads) later. */
let updateStatus = { state: 'none' };

function setUpdateStatus(status) {
  updateStatus = status;
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send('updates:status', status);
}

function setUpUpdates() {
  ipcMain.handle('updates:status', () => updateStatus);
  ipcMain.handle('updates:download', () => {
    if (updateStatus.state !== 'available' && updateStatus.state !== 'error') return;
    setUpdateStatus({ state: 'downloading', version: updateStatus.version, percent: 0 });
    autoUpdater.downloadUpdate().catch(() => {
      // Reported through the 'error' event.
    });
  });
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  if (process.env.SPILL_UPDATE_URL) autoUpdater.setFeedURL({ provider: 'generic', url: process.env.SPILL_UPDATE_URL });

  autoUpdater.on('update-available', (info) => setUpdateStatus({ state: 'available', version: info.version }));
  autoUpdater.on('download-progress', (progress) => {
    if (updateStatus.state !== 'downloading') return;
    setUpdateStatus({ state: 'downloading', version: updateStatus.version, percent: Math.floor(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    setUpdateStatus({ state: 'installing', version: info.version });
    // Silent install, then the new version starts. The save lives in the user profile, so it stays.
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
  });
  autoUpdater.on('error', (error) => {
    // A failed check (offline, say) shows nothing; a failed download offers Retry.
    if (updateStatus.state === 'downloading') {
      setUpdateStatus({ state: 'error', version: updateStatus.version, message: error?.message ?? String(error) });
    }
  });
  autoUpdater.checkForUpdates().catch(() => {
    // Offline or no releases yet: play on without an update notice.
  });
}

// ---------- Fullscreen ----------
// Settings → Display switches between windowed and fullscreen (F11 does too).
// The choice is remembered in the user's app data and applied on the next launch.

const displayFile = () => path.join(app.getPath('userData'), 'display.json');

function loadFullScreen() {
  try {
    return JSON.parse(fs.readFileSync(displayFile(), 'utf8')).fullscreen === true;
  } catch {
    return false;
  }
}

function saveFullScreen(fullscreen) {
  try {
    fs.writeFileSync(displayFile(), JSON.stringify({ fullscreen }));
  } catch {
    // Not remembered; the game still switches.
  }
}

function setUpFullScreen() {
  ipcMain.handle('window:isFullScreen', (event) => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false);
  ipcMain.handle('window:setFullScreen', (event, fullscreen) => {
    BrowserWindow.fromWebContents(event.sender)?.setFullScreen(fullscreen === true);
  });
}

/** Keeps the page and the saved choice in step with the window, however it changed. */
function watchFullScreen(win) {
  const report = () => {
    const fullscreen = win.isFullScreen();
    saveFullScreen(fullscreen);
    win.webContents.send('window:fullscreen', fullscreen);
  };
  win.on('enter-full-screen', report);
  win.on('leave-full-screen', report);
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'Spill',
    width: 1280,
    height: 800,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    backgroundColor: '#14121a',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // V1 is a PC game that fills the screen: open maximized (1280×800 when restored).
  win.once('ready-to-show', () => {
    win.maximize();
    if (loadFullScreen()) win.setFullScreen(true);
    win.show();
  });
  watchFullScreen(win);

  // Links that would leave the game open in the user's browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = DEV_URL ? url.startsWith(DEV_URL) : url.startsWith(`${SCHEME}://${HOST}/`);
    if (!allowed) event.preventDefault();
  });

  win.loadURL(DEV_URL ?? `${SCHEME}://${HOST}/`);
}

// One window only: a second launch focuses the running game.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    if (!DEV_URL) Menu.setApplicationMenu(null);
    serveDist();
    setUpUpdates();
    setUpFullScreen();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
