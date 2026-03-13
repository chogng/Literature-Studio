import { BrowserWindow, WebContentsView } from 'electron';

import type { PreviewBounds, PreviewState } from './types.js';
import { appError } from './utils/app-error.js';

const previewPartition = 'reader-preview';
const previewCornerRadius = 10;

let previewWindow: BrowserWindow | null = null;
let previewView: WebContentsView | null = null;
let previewBounds: PreviewBounds = { x: 0, y: 0, width: 0, height: 0 };
let previewState: PreviewState = {
  url: '',
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  visible: false,
};

function getHiddenBounds(): PreviewBounds {
  return { x: 0, y: 0, width: 0, height: 0 };
}

function emitPreviewState() {
  if (!previewWindow || previewWindow.isDestroyed()) return;
  previewWindow.webContents.send('app:preview-state', previewState);
}

function updatePreviewState(partial?: Partial<PreviewState>) {
  if (partial) {
    previewState = {
      ...previewState,
      ...partial,
    };
  } else if (previewView && !previewView.webContents.isDestroyed()) {
    const contents = previewView.webContents;
    previewState = {
      ...previewState,
      url: contents.getURL(),
      canGoBack: contents.navigationHistory.canGoBack(),
      canGoForward: contents.navigationHistory.canGoForward(),
      isLoading: contents.isLoading(),
    };
  }

  emitPreviewState();
}

function applyPreviewBounds() {
  if (!previewView) return;

  const visible =
    previewState.visible &&
    previewBounds.width > 0 &&
    previewBounds.height > 0;

  previewView.setVisible(visible);
  previewView.setBounds(visible ? previewBounds : getHiddenBounds());
}

function bindPreviewEvents(view: WebContentsView) {
  const { webContents } = view;

  const syncState = () => {
    updatePreviewState();
  };

  webContents.on('did-start-loading', syncState);
  webContents.on('did-stop-loading', syncState);
  webContents.on('did-finish-load', syncState);
  webContents.on('did-navigate', syncState);
  webContents.on('did-navigate-in-page', syncState);
  webContents.on('page-title-updated', syncState);
  webContents.on('destroyed', () => {
    if (previewView === view) {
      previewView = null;
      previewState = {
        url: '',
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        visible: false,
      };
      emitPreviewState();
    }
  });
}

export function ensurePreviewView(window: BrowserWindow) {
  if (previewWindow === window && previewView && !previewView.webContents.isDestroyed()) {
    return previewView;
  }

  previewWindow = window;
  previewView = new WebContentsView({
    webPreferences: {
      partition: previewPartition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  previewView.setBorderRadius(previewCornerRadius);

  window.contentView.addChildView(previewView);
  bindPreviewEvents(previewView);
  applyPreviewBounds();
  emitPreviewState();

  return previewView;
}

export function disposePreviewView(window?: BrowserWindow | null) {
  if (!previewView) return;
  if (window && previewWindow && previewWindow !== window) return;

  const view = previewView;
  previewView = null;

  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.contentView.removeChildView(view);
  }

  view.webContents.close({ waitForBeforeUnload: false });
  previewBounds = getHiddenBounds();
  previewState = {
    url: '',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    visible: false,
  };
  emitPreviewState();
  previewWindow = null;
}

export function setPreviewBounds(bounds: PreviewBounds | null) {
  previewBounds = bounds ?? getHiddenBounds();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    previewState.visible = false;
  }
  applyPreviewBounds();
  emitPreviewState();
}

export function setPreviewVisible(visible: boolean) {
  previewState.visible = visible;
  applyPreviewBounds();
  emitPreviewState();
}

export function getPreviewState(): PreviewState {
  if (previewView && !previewView.webContents.isDestroyed()) {
    updatePreviewState();
  }

  return previewState;
}

export async function navigatePreview(url: string) {
  if (!previewView || previewView.webContents.isDestroyed()) {
    throw appError('PREVIEW_NOT_READY');
  }

  previewState.visible = true;
  applyPreviewBounds();
  await previewView.webContents.loadURL(url);
  updatePreviewState();
}

export function reloadPreview() {
  if (!previewView || previewView.webContents.isDestroyed()) return;
  previewView.webContents.reload();
}

export function goBackPreview() {
  if (!previewView || previewView.webContents.isDestroyed()) return;
  if (previewView.webContents.navigationHistory.canGoBack()) {
    previewView.webContents.navigationHistory.goBack();
  }
}

export function goForwardPreview() {
  if (!previewView || previewView.webContents.isDestroyed()) return;
  if (previewView.webContents.navigationHistory.canGoForward()) {
    previewView.webContents.navigationHistory.goForward();
  }
}
