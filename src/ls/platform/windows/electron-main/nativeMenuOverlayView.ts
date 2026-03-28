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

const nativeMenuStateChannel = 'app:native-menu-state';
const nativeMenuEventChannel = 'app:native-menu-event';
const nativeMenuQueryKey = 'nativeOverlay';
const nativeMenuQueryValue = 'menu';
const hiddenBounds = { x: 0, y: 0, width: 0, height: 0 };

let nativeMenuWindow: BrowserWindow | null = null;
let nativeMenuView: WebContentsView | null = null;
let nativeMenuState: NativeMenuState | null = null;

function resolveRendererTarget() {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    const url = new URL(devUrl);
    url.pathname = '/src/ls/code/electron-sandbox/workbench/workbench.html';
    url.search = '';
    url.searchParams.set(nativeMenuQueryKey, nativeMenuQueryValue);

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
      [nativeMenuQueryKey]: nativeMenuQueryValue,
    },
  };
}

function hasNativeMenuQuery(url: string) {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).searchParams.get(nativeMenuQueryKey) === nativeMenuQueryValue;
  } catch {
    return false;
  }
}

async function ensureNativeMenuRendererLoaded(view: WebContentsView) {
  const currentUrl = view.webContents.getURL();
  if (hasNativeMenuQuery(currentUrl)) {
    return;
  }

  const target = resolveRendererTarget();
  if (target.type === 'url') {
    await view.webContents.loadURL(target.target);
    return;
  }

  await view.webContents.loadFile(target.target, { query: target.query });
}

function normalizeRect(value: NativeMenuRect): NativeMenuRect {
  return {
    x: Math.max(0, Math.trunc(value.x)),
    y: Math.max(0, Math.trunc(value.y)),
    width: Math.max(0, Math.trunc(value.width)),
    height: Math.max(0, Math.trunc(value.height)),
  };
}

function emitNativeMenuState() {
  if (!nativeMenuView || nativeMenuView.webContents.isDestroyed()) {
    return;
  }

  nativeMenuView.webContents.send(nativeMenuStateChannel, nativeMenuState);
}

function emitNativeMenuEvent(targetWebContentsId: number, event: NativeMenuEvent) {
  const target = webContents.fromId(targetWebContentsId);
  if (!target || target.isDestroyed()) {
    return;
  }

  target.send(nativeMenuEventChannel, event);
}

function applyNativeMenuBounds() {
  if (!nativeMenuView) {
    return;
  }

  const targetWindow = nativeMenuWindow;
  if (!targetWindow || targetWindow.isDestroyed() || !nativeMenuState) {
    nativeMenuView.setVisible(false);
    nativeMenuView.setBounds(hiddenBounds);
    return;
  }

  const [contentWidth, contentHeight] = targetWindow.getContentSize();
  if (contentWidth <= 0 || contentHeight <= 0) {
    nativeMenuView.setVisible(false);
    nativeMenuView.setBounds(hiddenBounds);
    return;
  }

  nativeMenuView.setBounds({
    x: 0,
    y: 0,
    width: contentWidth,
    height: contentHeight,
  });
  nativeMenuView.setVisible(true);
}

function bindWindowResize(window: BrowserWindow) {
  const handleWindowBoundsChange = () => {
    applyNativeMenuBounds();
  };

  window.on('resize', handleWindowBoundsChange);
  window.on('maximize', handleWindowBoundsChange);
  window.on('unmaximize', handleWindowBoundsChange);

  nativeMenuView?.webContents.once('destroyed', () => {
    if (window.isDestroyed()) {
      return;
    }
    window.removeListener('resize', handleWindowBoundsChange);
    window.removeListener('maximize', handleWindowBoundsChange);
    window.removeListener('unmaximize', handleWindowBoundsChange);
  });
}

function createNativeMenuView(window: BrowserWindow) {
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
    emitNativeMenuState();
    applyNativeMenuBounds();
  });
  bindWindowResize(window);

  return view;
}

function ensureNativeMenuView(window: BrowserWindow) {
  if (
    nativeMenuWindow === window &&
    nativeMenuView &&
    !nativeMenuView.webContents.isDestroyed()
  ) {
    return nativeMenuView;
  }

  disposeNativeMenuOverlay();
  nativeMenuWindow = window;
  nativeMenuView = createNativeMenuView(window);
  void ensureNativeMenuRendererLoaded(nativeMenuView).catch(() => {
    // Best effort only.
  });
  return nativeMenuView;
}

export function openNativeMenu(window: BrowserWindow | null | undefined, senderId: number, payload: NativeMenuOpenPayload) {
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

  ensureNativeMenuView(window);
  nativeMenuState = {
    requestId: payload.requestId,
    triggerRect: normalizeRect(payload.triggerRect),
    options,
    value: typeof payload.value === 'string' ? payload.value : '',
    sourceWebContentsId: senderId,
  };
  emitNativeMenuState();
  applyNativeMenuBounds();
}

export function closeNativeMenu(requestId?: string) {
  if (!nativeMenuState) {
    return;
  }

  if (requestId && nativeMenuState.requestId !== requestId) {
    return;
  }

  const previousState = nativeMenuState;
  nativeMenuState = null;
  emitNativeMenuState();
  applyNativeMenuBounds();
  emitNativeMenuEvent(previousState.sourceWebContentsId, {
    requestId: previousState.requestId,
    type: 'close',
  });
}

export function getNativeMenuState() {
  return nativeMenuState;
}

export function selectNativeMenuOption(requestId: string, value: string) {
  if (!nativeMenuState || nativeMenuState.requestId !== requestId) {
    return;
  }

  const previousState = nativeMenuState;
  nativeMenuState = null;
  emitNativeMenuState();
  applyNativeMenuBounds();
  emitNativeMenuEvent(previousState.sourceWebContentsId, {
    requestId,
    type: 'select',
    value,
  });
}

export function disposeNativeMenuOverlay(window?: BrowserWindow | null) {
  if (!nativeMenuView) {
    return;
  }

  if (window && nativeMenuWindow && nativeMenuWindow !== window) {
    return;
  }

  const view = nativeMenuView;
  nativeMenuView = null;

  if (nativeMenuWindow && !nativeMenuWindow.isDestroyed()) {
    nativeMenuWindow.contentView.removeChildView(view);
  }

  view.webContents.close({ waitForBeforeUnload: false });
  nativeMenuWindow = null;
  nativeMenuState = null;
}
