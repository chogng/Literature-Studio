import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, WebContentsView, webContents } from 'electron';

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
const hiddenBounds = { x: 0, y: 0, width: 0, height: 0 };

let menuWindow: BrowserWindow | null = null;
let menuView: WebContentsView | null = null;
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

async function ensureRendererLoaded(view: WebContentsView) {
  const currentUrl = view.webContents.getURL();
  if (hasOverlayQuery(currentUrl)) {
    return;
  }

  const target = resolveOverlayRendererTarget();
  if (target.type === 'url') {
    await view.webContents.loadURL(target.target);
    return;
  }

  await view.webContents.loadFile(target.target, { query: target.query });
}

function normalizeMenuRect(value: NativeMenuRect): NativeMenuRect {
  return {
    x: Math.max(0, Math.trunc(value.x)),
    y: Math.max(0, Math.trunc(value.y)),
    width: Math.max(0, Math.trunc(value.width)),
    height: Math.max(0, Math.trunc(value.height)),
  };
}

function emitState() {
  if (!menuView || menuView.webContents.isDestroyed()) {
    return;
  }

  menuView.webContents.send(menuStateChannel, menuState);
}

function emitEvent(targetWebContentsId: number, event: NativeMenuEvent) {
  const target = webContents.fromId(targetWebContentsId);
  if (!target || target.isDestroyed()) {
    return;
  }

  target.send(menuEventChannel, event);
}

function syncMenuBounds() {
  if (!menuView) {
    return;
  }

  const targetWindow = menuWindow;
  if (!targetWindow || targetWindow.isDestroyed() || !menuState) {
    menuView.setVisible(false);
    menuView.setBounds(hiddenBounds);
    return;
  }

  const [contentWidth, contentHeight] = targetWindow.getContentSize();
  if (contentWidth <= 0 || contentHeight <= 0) {
    menuView.setVisible(false);
    menuView.setBounds(hiddenBounds);
    return;
  }

  menuView.setBounds({
    x: 0,
    y: 0,
    width: contentWidth,
    height: contentHeight,
  });
  menuView.setVisible(true);
}

function bindWindowResize(window: BrowserWindow) {
  const handleWindowBoundsChange = () => {
    syncMenuBounds();
  };

  window.on('resize', handleWindowBoundsChange);
  window.on('maximize', handleWindowBoundsChange);
  window.on('unmaximize', handleWindowBoundsChange);

  menuView?.webContents.once('destroyed', () => {
    if (window.isDestroyed()) {
      return;
    }
    window.removeListener('resize', handleWindowBoundsChange);
    window.removeListener('maximize', handleWindowBoundsChange);
    window.removeListener('unmaximize', handleWindowBoundsChange);
  });
}

function createMenuView(window: BrowserWindow) {
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../../../base/parts/sandbox/electron-browser/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  view.setBackgroundColor('#00000000');
  view.setVisible(false);
  view.setBounds(hiddenBounds);
  window.contentView.addChildView(view);
  view.webContents.on('did-finish-load', () => {
    emitState();
    syncMenuBounds();
  });
  bindWindowResize(window);

  return view;
}

function ensureMenuView(window: BrowserWindow) {
  if (
    menuWindow === window &&
    menuView &&
    !menuView.webContents.isDestroyed()
  ) {
    return menuView;
  }

  disposeMenuOverlay();
  menuWindow = window;
  menuView = createMenuView(window);
  void ensureRendererLoaded(menuView).catch(() => {
    // Best effort only.
  });
  return menuView;
}

export function openMenuOverlay(window: BrowserWindow | null | undefined, senderId: number, payload: NativeMenuOpenPayload) {
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

  ensureMenuView(window);
  menuState = {
    requestId: payload.requestId,
    triggerRect: normalizeMenuRect(payload.triggerRect),
    options,
    value: typeof payload.value === 'string' ? payload.value : '',
    align: payload.align === 'center' ? 'center' : 'start',
    sourceWebContentsId: senderId,
  };
  emitState();
  syncMenuBounds();
}

export function closeMenuOverlay(requestId?: string) {
  if (!menuState) {
    return;
  }

  if (requestId && menuState.requestId !== requestId) {
    return;
  }

  const previousState = menuState;
  menuState = null;
  emitState();
  syncMenuBounds();
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
  syncMenuBounds();
  emitEvent(previousState.sourceWebContentsId, {
    requestId,
    type: 'select',
    value,
  });
}

export function disposeMenuOverlay(window?: BrowserWindow | null) {
  if (!menuView) {
    return;
  }

  if (window && menuWindow && menuWindow !== window) {
    return;
  }

  const view = menuView;
  menuView = null;

  if (menuWindow && !menuWindow.isDestroyed()) {
    menuWindow.contentView.removeChildView(view);
  }

  view.webContents.close({ waitForBeforeUnload: false });
  menuWindow = null;
  menuState = null;
}
