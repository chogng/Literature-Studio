import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, webContents } from 'electron';

import type {
  NativeMenuEvent,
  NativeMenuOpenPayload,
  NativeMenuRect,
  NativeMenuState,
} from '../../../base/parts/sandbox/common/desktopTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const menuStateChannel = 'app:native-menu-state';
const menuEventChannel = 'app:native-menu-event';
const overlayQueryKey = 'nativeOverlay';
const overlayQueryValue = 'menu';

let menuParentWindow: BrowserWindow | null = null;
let menuOverlayWindow: BrowserWindow | null = null;
let menuState: NativeMenuState | null = null;

function resolveOverlayRendererTarget() {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    const url = new URL(devUrl);
    url.pathname = '/src/ls/code/electron-sandbox/workbench/workbench.html';
    url.search = '';
    url.searchParams.set(overlayQueryKey, overlayQueryValue);

    return {
      type: 'url' as const,
      target: url.toString(),
    };
  }

  return {
    type: 'file' as const,
    target: path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'dist',
      'src',
      'ls',
      'code',
      'electron-sandbox',
      'workbench',
      'workbench.html',
    ),
    query: {
      [overlayQueryKey]: overlayQueryValue,
    },
  };
}

function hasOverlayQuery(url: string) {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).searchParams.get(overlayQueryKey) === overlayQueryValue;
  } catch {
    return false;
  }
}

async function ensureRendererLoaded(window: BrowserWindow) {
  const currentUrl = window.webContents.getURL();
  if (hasOverlayQuery(currentUrl)) {
    return;
  }

  const target = resolveOverlayRendererTarget();
  if (target.type === 'url') {
    await window.loadURL(target.target);
    return;
  }

  await window.loadFile(target.target, { query: target.query });
}

function normalizeMenuRect(value: NativeMenuRect): NativeMenuRect {
  return {
    x: Math.max(0, Math.trunc(value.x)),
    y: Math.max(0, Math.trunc(value.y)),
    width: Math.max(0, Math.trunc(value.width)),
    height: Math.max(0, Math.trunc(value.height)),
  };
}

function syncMenuOverlayBounds() {
  if (!menuOverlayWindow || menuOverlayWindow.isDestroyed()) {
    return;
  }

  const targetWindow = menuParentWindow;
  if (!targetWindow || targetWindow.isDestroyed() || !menuState) {
    menuOverlayWindow.hide();
    return;
  }

  const contentBounds = targetWindow.getContentBounds();
  if (contentBounds.width <= 0 || contentBounds.height <= 0) {
    menuOverlayWindow.hide();
    return;
  }

  menuOverlayWindow.setBounds(contentBounds, false);
}

function emitState() {
  if (!menuOverlayWindow || menuOverlayWindow.isDestroyed()) {
    return;
  }

  menuOverlayWindow.webContents.send(menuStateChannel, menuState);
}

function emitEvent(targetWebContentsId: number, event: NativeMenuEvent) {
  const target = webContents.fromId(targetWebContentsId);
  if (!target || target.isDestroyed()) {
    return;
  }

  target.send(menuEventChannel, event);
}

function bindParentWindow(parentWindow: BrowserWindow, overlayWindow: BrowserWindow) {
  const sync = () => {
    syncMenuOverlayBounds();
  };
  const closeForParentStateChange = () => {
    closeMenuOverlay();
  };

  parentWindow.on('move', sync);
  parentWindow.on('resize', sync);
  parentWindow.on('maximize', sync);
  parentWindow.on('unmaximize', sync);
  parentWindow.on('enter-full-screen', sync);
  parentWindow.on('leave-full-screen', sync);
  parentWindow.on('minimize', closeForParentStateChange);
  parentWindow.on('hide', closeForParentStateChange);
  parentWindow.on('closed', closeForParentStateChange);

  overlayWindow.on('closed', () => {
    if (!parentWindow.isDestroyed()) {
      parentWindow.removeListener('move', sync);
      parentWindow.removeListener('resize', sync);
      parentWindow.removeListener('maximize', sync);
      parentWindow.removeListener('unmaximize', sync);
      parentWindow.removeListener('enter-full-screen', sync);
      parentWindow.removeListener('leave-full-screen', sync);
      parentWindow.removeListener('minimize', closeForParentStateChange);
      parentWindow.removeListener('hide', closeForParentStateChange);
      parentWindow.removeListener('closed', closeForParentStateChange);
    }
  });
}

function createMenuOverlayWindow(parentWindow: BrowserWindow) {
  const overlayWindow = new BrowserWindow({
    parent: parentWindow,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../../../base/parts/sandbox/electron-browser/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (typeof overlayWindow.removeMenu === 'function') {
    overlayWindow.removeMenu();
  } else {
    overlayWindow.setMenuBarVisibility(false);
  }

  overlayWindow.on('blur', () => {
    closeMenuOverlay();
  });

  overlayWindow.webContents.on('did-finish-load', () => {
    syncMenuOverlayBounds();
    emitState();
    if (menuState) {
      showMenuOverlayWindow();
    }
  });

  overlayWindow.on('closed', () => {
    if (menuOverlayWindow === overlayWindow) {
      menuOverlayWindow = null;
      menuParentWindow = null;
      menuState = null;
    }
  });

  bindParentWindow(parentWindow, overlayWindow);
  return overlayWindow;
}

function ensureMenuOverlayWindow(parentWindow: BrowserWindow) {
  if (
    menuParentWindow === parentWindow &&
    menuOverlayWindow &&
    !menuOverlayWindow.isDestroyed()
  ) {
    return menuOverlayWindow;
  }

  disposeMenuOverlay();
  menuParentWindow = parentWindow;
  menuOverlayWindow = createMenuOverlayWindow(parentWindow);
  void ensureRendererLoaded(menuOverlayWindow).catch(() => {
    // Best effort only.
  });
  return menuOverlayWindow;
}

function isMenuOverlayRendererReady() {
  if (!menuOverlayWindow || menuOverlayWindow.isDestroyed()) {
    return false;
  }

  return hasOverlayQuery(menuOverlayWindow.webContents.getURL());
}

function showMenuOverlayWindow() {
  if (!menuOverlayWindow || menuOverlayWindow.isDestroyed()) {
    return;
  }

  syncMenuOverlayBounds();

  if (!menuOverlayWindow.isVisible()) {
    menuOverlayWindow.show();
  }

  menuOverlayWindow.focus();
}

export function prewarmMenuOverlay(window: BrowserWindow | null | undefined) {
  if (!window || window.isDestroyed()) {
    return;
  }

  ensureMenuOverlayWindow(window);
}

export function openMenuOverlay(
  window: BrowserWindow | null | undefined,
  senderId: number,
  payload: NativeMenuOpenPayload,
) {
  if (!window || window.isDestroyed()) {
    return;
  }

  const options = Array.isArray(payload.options)
    ? payload.options.map((option) => ({
        value: String(option.value ?? ''),
        label: String(option.label ?? ''),
        title: typeof option.title === 'string' ? option.title : undefined,
        disabled: Boolean(option.disabled),
      }))
    : [];
  if (!payload.requestId || options.length === 0) {
    return;
  }

  ensureMenuOverlayWindow(window);
  menuState = {
    requestId: payload.requestId,
    triggerRect: normalizeMenuRect(payload.triggerRect),
    options,
    value: typeof payload.value === 'string' ? payload.value : '',
    align:
      payload.align === 'center'
        ? 'center'
        : payload.align === 'end'
          ? 'end'
          : 'start',
    coverage: payload.coverage === 'trigger-band' ? 'trigger-band' : 'full-window',
    sourceWebContentsId: senderId,
  };

  if (!isMenuOverlayRendererReady()) {
    return;
  }

  emitState();
  showMenuOverlayWindow();
}

export function closeMenuOverlay(requestId?: string) {
  if (!menuState) {
    if (menuOverlayWindow && !menuOverlayWindow.isDestroyed() && menuOverlayWindow.isVisible()) {
      menuOverlayWindow.hide();
    }
    return;
  }

  if (requestId && menuState.requestId !== requestId) {
    return;
  }

  const previousState = menuState;
  menuState = null;
  emitState();

  if (menuOverlayWindow && !menuOverlayWindow.isDestroyed() && menuOverlayWindow.isVisible()) {
    menuOverlayWindow.hide();
  }

  emitEvent(previousState.sourceWebContentsId, {
    requestId: previousState.requestId,
    type: 'close',
  });
}

export function getMenuOverlayState() {
  return menuState;
}

export function selectMenuOption(requestId: string, value: string) {
  if (!menuState || menuState.requestId !== requestId) {
    return;
  }

  const previousState = menuState;
  menuState = null;
  emitState();

  if (menuOverlayWindow && !menuOverlayWindow.isDestroyed() && menuOverlayWindow.isVisible()) {
    menuOverlayWindow.hide();
  }

  emitEvent(previousState.sourceWebContentsId, {
    requestId,
    type: 'select',
    value,
  });
}

export function disposeMenuOverlay(window?: BrowserWindow | null) {
  if (!menuOverlayWindow) {
    return;
  }

  if (window && menuParentWindow && menuParentWindow !== window) {
    return;
  }

  const overlayWindow = menuOverlayWindow;
  menuOverlayWindow = null;
  menuParentWindow = null;
  menuState = null;

  if (!overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
}
