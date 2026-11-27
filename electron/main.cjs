// Electron main process: shows the Vite web build in a desktop window.
// Kept outside src/ so the game code never depends on Electron.
const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

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
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // V1 is a PC game that fills the screen: open maximized (1280×800 when restored).
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

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
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
