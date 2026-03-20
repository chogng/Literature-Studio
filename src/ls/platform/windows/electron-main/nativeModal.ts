import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow } from 'electron';

import type {
  NativeModalState,
  OpenArticleDetailsModalPayload,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import { appError } from '../../../base/common/errors.js';
import { createAuxiliaryWindow } from './window.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nativeModalQueryKey = 'nativeModal';
const nativeModalStateChannel = 'app:modal-state';
const articleDetailsModalKind: NativeModalState['kind'] = 'article-details';

const modalStateByWebContentsId = new Map<number, NativeModalState>();
let articleDetailsWindow: BrowserWindow | null = null;

function applyWindowChrome(window: BrowserWindow) {
  if (typeof window.removeMenu === 'function') {
    window.removeMenu();
  } else {
    window.setMenuBarVisibility(false);
  }
}

function resolveRendererTarget(kind: NativeModalState['kind']) {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    const url = new URL(devUrl);
    url.searchParams.set(nativeModalQueryKey, kind);
    return {
      type: 'url' as const,
      target: url.toString(),
    };
  }

  return {
    type: 'file' as const,
    target: path.join(__dirname, '..', '..', '..', '..', 'dist', 'index.html'),
    query: {
      [nativeModalQueryKey]: kind,
    },
  };
}

function publishModalState(window: BrowserWindow, state: NativeModalState) {
  if (window.isDestroyed() || window.webContents.isDestroyed()) {
    return;
  }

  window.webContents.send(nativeModalStateChannel, state);
}

function setWindowModalState(window: BrowserWindow, state: NativeModalState) {
  const webContentsId = window.webContents.id;
  modalStateByWebContentsId.set(webContentsId, state);
  publishModalState(window, state);
}

function createModalWindow(_parentWindow: BrowserWindow, title: string) {
  const modalWindow = createAuxiliaryWindow({
    show: false,
    skipTaskbar: false,
    width: 760,
    height: 640,
    minWidth: 520,
    minHeight: 420,
    title,
    resizable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    titleBarOverlay: false,
    autoHideMenuBar: true,
    backgroundColor: '#eff4fb',
    webPreferences: {
      preload: path.join(__dirname, '../../../base/parts/sandbox/electron-browser/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  applyWindowChrome(modalWindow);
  modalWindow.once('ready-to-show', () => {
    if (!modalWindow.isDestroyed()) {
      modalWindow.show();
    }
  });

  const webContentsId = modalWindow.webContents.id;
  modalWindow.webContents.on('did-finish-load', () => {
    const state = modalStateByWebContentsId.get(webContentsId);
    if (state) {
      publishModalState(modalWindow, state);
    }
  });

  modalWindow.on('closed', () => {
    modalStateByWebContentsId.delete(webContentsId);
    if (articleDetailsWindow === modalWindow) {
      articleDetailsWindow = null;
    }
  });

  return modalWindow;
}

function getOrCreateArticleDetailsWindow(parentWindow: BrowserWindow, title: string) {
  if (articleDetailsWindow && !articleDetailsWindow.isDestroyed()) {
    articleDetailsWindow.setTitle(title);
    return articleDetailsWindow;
  }

  articleDetailsWindow = createModalWindow(parentWindow, title);
  return articleDetailsWindow;
}

function hasNativeModalQuery(url: string, kind: NativeModalState['kind']) {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).searchParams.get(nativeModalQueryKey) === kind;
  } catch {
    return false;
  }
}

async function ensureModalRendererLoaded(window: BrowserWindow, kind: NativeModalState['kind']) {
  const currentUrl = window.webContents.getURL();
  if (hasNativeModalQuery(currentUrl, kind)) {
    return;
  }

  const target = resolveRendererTarget(kind);
  if (target.type === 'url') {
    await window.loadURL(target.target);
    return;
  }

  await window.loadFile(target.target, { query: target.query });
}

function focusWindow(window: BrowserWindow) {
  if (window.isDestroyed()) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }
  if (!window.isVisible()) {
    window.show();
  }

  window.focus();
}

export async function openArticleDetailsModal(
  parentWindow: BrowserWindow,
  payload: OpenArticleDetailsModalPayload = {},
) {
  const article = payload.article;
  const labels = payload.labels;
  if (!article || !labels) {
    throw appError('UNKNOWN_ERROR', {
      message: 'Article details modal payload is incomplete.',
    });
  }

  const locale = payload.locale === 'en' ? 'en' : 'zh';
  const title = article.title?.trim() || labels.untitled;
  const modalWindow = getOrCreateArticleDetailsWindow(parentWindow, title);

  setWindowModalState(modalWindow, {
    kind: articleDetailsModalKind,
    article,
    labels,
    locale,
  });

  await ensureModalRendererLoaded(modalWindow, articleDetailsModalKind);
  focusWindow(modalWindow);
  return true;
}

export function getNativeModalState(webContentsId: number): NativeModalState | null {
  return modalStateByWebContentsId.get(webContentsId) ?? null;
}
