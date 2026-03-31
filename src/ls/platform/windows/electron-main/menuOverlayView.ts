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

let menuParentWindow: BrowserWindow | null = null;
let menuOverlayView: WebContentsView | null = null;
let menuState: NativeMenuState | null = null;

function bringMenuOverlayToFront() {
  if (
    !menuParentWindow ||
    menuParentWindow.isDestroyed() ||
    !menuOverlayView ||
    menuOverlayView.webContents.isDestroyed()
  ) {
    return;
  }

  menuParentWindow.contentView.removeChildView(menuOverlayView);
  menuParentWindow.contentView.addChildView(menuOverlayView);
}

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
  if (!menuOverlayView || menuOverlayView.webContents.isDestroyed()) {
    return;
  }

  menuOverlayView.webContents.send(menuStateChannel, menuState);
}

function emitEvent(targetWebContentsId: number, event: NativeMenuEvent) {
  const target = webContents.fromId(targetWebContentsId);
  if (!target || target.isDestroyed()) {
    return;
  }

  target.send(menuEventChannel, event);
}

function applyMenuOverlayBounds() {
  if (!menuOverlayView) {
    return;
  }

  const targetWindow = menuParentWindow;
  if (!targetWindow || targetWindow.isDestroyed()) {
    menuOverlayView.setVisible(false);
    menuOverlayView.setBounds(hiddenBounds);
    return;
  }

  const [contentWidth, contentHeight] = targetWindow.getContentSize();
  if (
    !menuState ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    menuOverlayView.setVisible(false);
    menuOverlayView.setBounds(hiddenBounds);
    return;
  }

  menuOverlayView.setBounds({
    x: 0,
    y: 0,
    width: contentWidth,
    height: contentHeight,
  });
  menuOverlayView.setVisible(true);
}

function bindParentWindow(parentWindow: BrowserWindow, view: WebContentsView) {
  const sync = () => {
    applyMenuOverlayBounds();
  };
  const closeForParentStateChange = () => {
    closeMenuOverlay();
  };

  parentWindow.on('resize', sync);
  parentWindow.on('maximize', sync);
  parentWindow.on('unmaximize', sync);
  parentWindow.on('enter-full-screen', sync);
  parentWindow.on('leave-full-screen', sync);
  parentWindow.on('blur', closeForParentStateChange);
  parentWindow.on('minimize', closeForParentStateChange);
  parentWindow.on('hide', closeForParentStateChange);
  parentWindow.on('closed', closeForParentStateChange);

  view.webContents.once('destroyed', () => {
    if (!parentWindow.isDestroyed()) {
      parentWindow.removeListener('resize', sync);
      parentWindow.removeListener('maximize', sync);
      parentWindow.removeListener('unmaximize', sync);
      parentWindow.removeListener('enter-full-screen', sync);
      parentWindow.removeListener('leave-full-screen', sync);
      parentWindow.removeListener('blur', closeForParentStateChange);
      parentWindow.removeListener('minimize', closeForParentStateChange);
      parentWindow.removeListener('hide', closeForParentStateChange);
      parentWindow.removeListener('closed', closeForParentStateChange);
    }
  });
}

function createMenuOverlayView(window: BrowserWindow) {
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
    applyMenuOverlayBounds();
  });

  bindParentWindow(window, view);
  return view;
}

function ensureMenuOverlayView(window: BrowserWindow) {
  if (
    menuParentWindow === window &&
    menuOverlayView &&
    !menuOverlayView.webContents.isDestroyed()
  ) {
    return menuOverlayView;
  }

  disposeMenuOverlay();
  menuParentWindow = window;
  menuOverlayView = createMenuOverlayView(window);
  void ensureRendererLoaded(menuOverlayView).catch(() => {
    // Best effort only.
  });
  return menuOverlayView;
}

function isMenuOverlayRendererReady() {
  if (!menuOverlayView || menuOverlayView.webContents.isDestroyed()) {
    return false;
  }

  return hasOverlayQuery(menuOverlayView.webContents.getURL());
}

function showMenuOverlayView() {
  if (!menuOverlayView || menuOverlayView.webContents.isDestroyed()) {
    return;
  }

  bringMenuOverlayToFront();
  applyMenuOverlayBounds();
  menuOverlayView.webContents.focus();
}

export function prewarmMenuOverlay(window: BrowserWindow | null | undefined) {
  if (!window || window.isDestroyed()) {
    return;
  }

  ensureMenuOverlayView(window);
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

  ensureMenuOverlayView(window);
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

  showMenuOverlayView();
  emitState();
}

export function closeMenuOverlay(requestId?: string) {
  if (!menuState) {
    if (menuOverlayView && !menuOverlayView.webContents.isDestroyed()) {
      menuOverlayView.setVisible(false);
      menuOverlayView.setBounds(hiddenBounds);
    }
    return;
  }

  if (requestId && menuState.requestId !== requestId) {
    return;
  }

  const previousState = menuState;
  menuState = null;
  emitState();

  if (menuOverlayView && !menuOverlayView.webContents.isDestroyed()) {
    menuOverlayView.setVisible(false);
    menuOverlayView.setBounds(hiddenBounds);
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

  if (menuOverlayView && !menuOverlayView.webContents.isDestroyed()) {
    menuOverlayView.setVisible(false);
    menuOverlayView.setBounds(hiddenBounds);
  }

  emitEvent(previousState.sourceWebContentsId, {
    requestId,
    type: 'select',
    value,
  });
}

export function disposeMenuOverlay(window?: BrowserWindow | null) {
  if (!menuOverlayView) {
    return;
  }

  if (window && menuParentWindow && menuParentWindow !== window) {
    return;
  }

  const view = menuOverlayView;
  menuOverlayView = null;

  if (menuParentWindow && !menuParentWindow.isDestroyed()) {
    menuParentWindow.contentView.removeChildView(view);
  }

  menuParentWindow = null;
  menuState = null;
  view.webContents.close({ waitForBeforeUnload: false });
}
