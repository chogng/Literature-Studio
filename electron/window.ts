import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function isDevMode() {
  return !app.isPackaged || Boolean(process.env.ELECTRON_RENDERER_URL);
}

function publishWindowState(window: BrowserWindow) {
  if (window.isDestroyed()) return;

  window.webContents.send('app:window-state', {
    isMaximized: window.isMaximized(),
  });
}

export function getMainWindow() {
  return mainWindow;
}

export function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    title: 'Literature Studio',
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    titleBarOverlay: false,
    backgroundColor: '#edf2f8',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });

  const window = mainWindow;
  const enableDevToolsShortcut = isDevMode();

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  window.on('closed', () => {
    mainWindow = null;
  });

  if (enableDevToolsShortcut) {
    window.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase();
      const isF12 = key === 'f12';
      const isCtrlShiftI = input.control && input.shift && key === 'i';

      if (!isF12 && !isCtrlShiftI) {
        return;
      }

      event.preventDefault();
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.closeDevTools();
      } else {
        window.webContents.openDevTools({ mode: 'detach' });
      }
    });
  }

  if (typeof window.removeMenu === 'function') {
    window.removeMenu();
  } else {
    window.setMenuBarVisibility(false);
  }

  window.on('maximize', () => publishWindowState(window));
  window.on('unmaximize', () => publishWindowState(window));
  window.on('enter-full-screen', () => publishWindowState(window));
  window.on('leave-full-screen', () => publishWindowState(window));
  window.webContents.on('did-finish-load', () => publishWindowState(window));

  return window;
}
