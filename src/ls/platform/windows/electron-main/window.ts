import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, type BrowserWindowConstructorOptions, type WebContents } from 'electron';
import type { WindowControlAction, WindowState } from '../../../base/parts/sandbox/common/desktopTypes.js';
import { disposePreviewView, ensurePreviewView } from './previewView.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const auxiliaryWindows = new Set<BrowserWindow>();
const autoMinimizedAuxiliaryWindowIds = new Set<number>();
let currentUseMica = true;

function resolveWindowBackgroundMaterial(useMica: boolean) {
  if (process.platform !== 'win32') {
    return 'auto' as const;
  }

  return useMica ? ('mica' as const) : ('none' as const);
}

function applyWindowBackgroundMaterial(window: BrowserWindow, useMica: boolean) {
  if (window.isDestroyed()) {
    return;
  }

  window.setBackgroundMaterial(resolveWindowBackgroundMaterial(useMica));
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

export function applyMainWindowBackgroundMaterial(
  useMica: boolean,
  window: BrowserWindow | null = mainWindow,
) {
  currentUseMica = useMica;

  if (!window || window.isDestroyed()) {
    for (const auxiliaryWindow of auxiliaryWindows) {
      applyWindowBackgroundMaterial(auxiliaryWindow, useMica);
    }
    return;
  }

  applyWindowBackgroundMaterial(window, useMica);

  for (const auxiliaryWindow of auxiliaryWindows) {
    applyWindowBackgroundMaterial(auxiliaryWindow, useMica);
  }
}

function closeAuxiliaryWindows() {
  for (const window of auxiliaryWindows) {
    if (window.isDestroyed()) {
      continue;
    }

    window.close();
  }
}

function minimizeAuxiliaryWindows() {
  autoMinimizedAuxiliaryWindowIds.clear();

  for (const window of auxiliaryWindows) {
    if (window.isDestroyed() || !window.isVisible() || window.isMinimized()) {
      continue;
    }

    autoMinimizedAuxiliaryWindowIds.add(window.webContents.id);
    window.minimize();
  }
}

function restoreAuxiliaryWindows() {
  for (const window of auxiliaryWindows) {
    if (window.isDestroyed()) {
      continue;
    }

    if (!autoMinimizedAuxiliaryWindowIds.has(window.webContents.id)) {
      continue;
    }

    if (window.isMinimized()) {
      window.restore();
    } else if (!window.isVisible()) {
      window.show();
    }
  }

  autoMinimizedAuxiliaryWindowIds.clear();
}

export function registerAuxiliaryWindow(window: BrowserWindow) {
  auxiliaryWindows.add(window);
  const webContentsId = window.webContents.id;
  applyWindowBackgroundMaterial(window, currentUseMica);

  window.on('closed', () => {
    auxiliaryWindows.delete(window);
    autoMinimizedAuxiliaryWindowIds.delete(webContentsId);
  });
}

export function getCurrentUseMica() {
  return currentUseMica;
}

export function createAuxiliaryWindow(options: BrowserWindowConstructorOptions) {
  const window = new BrowserWindow({
    ...options,
    backgroundMaterial: resolveWindowBackgroundMaterial(currentUseMica),
  });

  registerAuxiliaryWindow(window);
  return window;
}

export function resolveWindowFromWebContents(contents?: WebContents | null) {
  return (contents ? BrowserWindow.fromWebContents(contents) : null) ?? getMainWindow();
}

export function performWindowControlAction(window: BrowserWindow, action: WindowControlAction) {
  switch (action) {
    case 'minimize':
      window.minimize();
      break;
    case 'maximize':
      window.maximize();
      break;
    case 'unmaximize':
      window.unmaximize();
      break;
    case 'toggle-maximize':
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      break;
    case 'close':
      window.close();
      break;
    default:
      break;
  }
}

export function getWindowState(window?: BrowserWindow | null): WindowState {
  return {
    isMaximized: Boolean(window && !window.isDestroyed() && window.isMaximized()),
  };
}

export function createMainWindow(options: { useMica?: boolean } = {}) {
  const useMica = options.useMica ?? true;
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
    backgroundMaterial: resolveWindowBackgroundMaterial(useMica),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../../../base/parts/sandbox/electron-browser/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });

  const window = mainWindow;
  applyMainWindowBackgroundMaterial(useMica, window);
  ensurePreviewView(window);

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(path.join(__dirname, '..', '..', '..', '..', 'dist', 'index.html'));
  }

  window.on('closed', () => {
    closeAuxiliaryWindows();
    disposePreviewView(window);
    mainWindow = null;
  });

  if (typeof window.removeMenu === 'function') {
    window.removeMenu();
  } else {
    window.setMenuBarVisibility(false);
  }

  window.on('maximize', () => publishWindowState(window));
  window.on('minimize', () => minimizeAuxiliaryWindows());
  window.on('restore', () => restoreAuxiliaryWindows());
  window.on('show', () => restoreAuxiliaryWindows());
  window.on('unmaximize', () => publishWindowState(window));
  window.on('enter-full-screen', () => publishWindowState(window));
  window.on('leave-full-screen', () => publishWindowState(window));
  window.webContents.on('did-finish-load', () => publishWindowState(window));

  return window;
}
