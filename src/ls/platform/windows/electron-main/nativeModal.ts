import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow } from 'electron';

import type {
  NativeModalState,
  OpenArticleDetailsModalPayload,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import { appError } from '../../../base/common/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nativeModalQueryKey = 'nativeModal';
const modalStateByWebContentsId = new Map<number, NativeModalState>();

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

function createModalWindow(parentWindow: BrowserWindow, title: string) {
  const modalWindow = new BrowserWindow({
    parent: parentWindow,
    modal: true,
    show: false,
    width: 760,
    height: 640,
    minWidth: 520,
    minHeight: 420,
    title,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
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

  return modalWindow;
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
  const modalWindow = createModalWindow(parentWindow, title);
  const webContentsId = modalWindow.webContents.id;

  modalStateByWebContentsId.set(webContentsId, {
    kind: 'article-details',
    article,
    labels,
    locale,
  });

  modalWindow.on('closed', () => {
    modalStateByWebContentsId.delete(webContentsId);
  });

  const target = resolveRendererTarget('article-details');
  if (target.type === 'url') {
    await modalWindow.loadURL(target.target);
    return true;
  }

  await modalWindow.loadFile(target.target, { query: target.query });
  return true;
}

export function getNativeModalState(webContentsId: number): NativeModalState | null {
  return modalStateByWebContentsId.get(webContentsId) ?? null;
}
