import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import type {
  AppCommand,
  AppCommandPayloadMap,
  AppCommandResultMap,
  ExportArticlesDocxPayload,
  FetchArticlePayload,
  FetchLatestArticlesPayload,
  OpenArticleDetailsModalPayload,
  PreviewDownloadPdfPayload,
  PreviewBounds,
  NativeModalState,
  PreviewState,
  SaveSettingsPayload,
  StorageService,
  WindowControlAction,
  WindowState,
} from './types.js';
import {
  getPreviewDocumentSnapshot,
  getPreviewHomepageCandidateSnapshot,
  getPreviewState,
  goBackPreview,
  goForwardPreview,
  navigatePreview,
  reloadPreview,
  setPreviewBounds,
  setPreviewVisible,
} from './preview-view.js';
import { getNativeModalState, openArticleDetailsModal } from './native-modal.js';
import {
  fetchArticle,
  fetchLatestArticles,
  type HomepagePreviewExtractionSnapshot,
  type HomepagePreviewSnapshot,
} from './services/article-fetcher.js';
import { buildBatchDocxFileName, exportArticlesToDocxFile } from './services/docx.js';
import { previewDownloadPdf } from './services/pdf.js';
import { resolveDocxExportDialogCopy } from './utils/locale-copy.js';
import { appError, serializeAppError } from './utils/app-error.js';
import { normalizeUrl } from './utils/url.js';
import { getMainWindow } from './window.js';

const BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS = 700;
const BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS = 700;

async function pickDownloadDirectory() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    throw appError('MAIN_WINDOW_UNAVAILABLE');
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  return result.filePaths[0];
}

async function exportArticlesDocx(
  payload: ExportArticlesDocxPayload = {},
  defaultDownloadDir: string,
) {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    throw appError('MAIN_WINDOW_UNAVAILABLE');
  }

  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  if (articles.length === 0) {
    throw appError('DOCX_EXPORT_NO_ARTICLES');
  }

  const preferredDirectory =
    typeof payload.preferredDirectory === 'string' ? payload.preferredDirectory.trim() : '';
  const dialogCopy = resolveDocxExportDialogCopy(payload.locale);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: dialogCopy.title,
    buttonLabel: dialogCopy.buttonLabel,
    defaultPath: path.join(preferredDirectory || defaultDownloadDir, buildBatchDocxFileName()),
    filters: [
      {
        name: 'Word Document',
        extensions: ['docx'],
      },
    ],
    properties: ['showOverwriteConfirmation'],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return exportArticlesToDocxFile({
    articles,
    filePath: result.filePath,
    locale: payload.locale === 'en' ? 'en' : 'zh',
  });
}

async function showArticleDetailsModal(
  parentWindow: BrowserWindow | null,
  payload: OpenArticleDetailsModalPayload = {},
) {
  const targetWindow = parentWindow ?? getMainWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    throw appError('MAIN_WINDOW_UNAVAILABLE');
  }

  return openArticleDetailsModal(targetWindow, payload);
}

function safeNormalizeUrl(value: unknown) {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

async function resolvePreviewSnapshotHtml(payload: PreviewDownloadPdfPayload = {}) {
  const requestedUrl = safeNormalizeUrl(payload.pageUrl ?? '');
  if (!requestedUrl) return null;

  const previewState = getPreviewState();
  const previewUrl = safeNormalizeUrl(previewState.url ?? '');
  if (!previewUrl || previewUrl !== requestedUrl) {
    return null;
  }

  const snapshot = await getPreviewDocumentSnapshot();
  const snapshotUrl = safeNormalizeUrl(snapshot?.url ?? '');
  if (!snapshot || !snapshotUrl || snapshotUrl !== requestedUrl) {
    return null;
  }

  return snapshot.html;
}

async function resolveBatchHomepagePreviewSnapshots(payload: FetchLatestArticlesPayload = {}) {
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  if (sources.length === 0) {
    return new Map<string, HomepagePreviewSnapshot>();
  }

  const previewState = getPreviewState();
  const previewUrl = safeNormalizeUrl(previewState.url ?? '');
  if (!previewUrl) {
    return new Map<string, HomepagePreviewSnapshot>();
  }

  const matchedUrls = new Set<string>();
  for (const source of sources) {
    const homepageUrl = safeNormalizeUrl(source?.homepageUrl);
    if (homepageUrl && homepageUrl === previewUrl) {
      matchedUrls.add(homepageUrl);
    }
  }

  if (matchedUrls.size === 0) {
    return new Map<string, HomepagePreviewSnapshot>();
  }

  if (previewState.isLoading) {
    return new Map<string, HomepagePreviewSnapshot>();
  }

  const snapshot = await getPreviewDocumentSnapshot({
    timeoutMs: BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS,
  });
  const snapshotUrl = safeNormalizeUrl(snapshot?.url ?? '');
  if (!snapshot || !snapshotUrl || snapshot.isLoading || !matchedUrls.has(snapshotUrl)) {
    return new Map<string, HomepagePreviewSnapshot>();
  }

  const resolvedSnapshot: HomepagePreviewSnapshot = {
    html: snapshot.html,
    previewUrl: snapshotUrl,
    captureMs: snapshot.captureMs,
    isLoading: snapshot.isLoading,
  };
  const snapshots = new Map<string, HomepagePreviewSnapshot>();

  for (const homepageUrl of matchedUrls) {
    snapshots.set(homepageUrl, resolvedSnapshot);
  }

  return snapshots;
}

async function resolveBatchHomepagePreviewExtractions(payload: FetchLatestArticlesPayload = {}) {
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  if (sources.length === 0) {
    return new Map<string, HomepagePreviewExtractionSnapshot>();
  }

  const previewState = getPreviewState();
  const previewUrl = safeNormalizeUrl(previewState.url ?? '');
  if (!previewUrl || previewState.isLoading) {
    return new Map<string, HomepagePreviewExtractionSnapshot>();
  }

  const matchedUrls = new Set<string>();
  for (const source of sources) {
    const homepageUrl = safeNormalizeUrl(source?.homepageUrl);
    if (homepageUrl && homepageUrl === previewUrl) {
      matchedUrls.add(homepageUrl);
    }
  }

  if (matchedUrls.size === 0) {
    return new Map<string, HomepagePreviewExtractionSnapshot>();
  }

  const extraction = await getPreviewHomepageCandidateSnapshot({
    timeoutMs: BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS,
  });
  const extractionUrl = safeNormalizeUrl(extraction?.previewUrl ?? '');
  if (!extraction || !extractionUrl || extraction.isLoading || !matchedUrls.has(extractionUrl)) {
    return new Map<string, HomepagePreviewExtractionSnapshot>();
  }

  const resolvedExtraction: HomepagePreviewExtractionSnapshot = {
    extraction: extraction.extraction,
    extractorId: extraction.extractorId,
    previewUrl: extractionUrl,
    captureMs: extraction.captureMs,
    isLoading: extraction.isLoading,
    nextPageUrl: extraction.nextPageUrl,
  };
  const extractions = new Map<string, HomepagePreviewExtractionSnapshot>();
  for (const homepageUrl of matchedUrls) {
    extractions.set(homepageUrl, resolvedExtraction);
  }

  return extractions;
}

async function invokeCommand<TCommand extends AppCommand>(
  command: TCommand,
  payload: AppCommandPayloadMap[TCommand],
  storage: StorageService,
): Promise<AppCommandResultMap[TCommand]> {
  switch (command) {
    case 'fetch_article':
      return fetchArticle((payload as FetchArticlePayload)?.url, storage) as Promise<AppCommandResultMap[TCommand]>;
    case 'fetch_latest_articles':
      {
        const homepagePreviewExtractions = await resolveBatchHomepagePreviewExtractions(
          payload as FetchLatestArticlesPayload,
        );
        const homepagePreviewSnapshots =
          homepagePreviewExtractions.size > 0
            ? new Map<string, HomepagePreviewSnapshot>()
            : await resolveBatchHomepagePreviewSnapshots(payload as FetchLatestArticlesPayload);
      return fetchLatestArticles(
        payload as FetchLatestArticlesPayload,
        storage,
        {
          homepagePreviewExtractions,
          homepagePreviewSnapshots,
          homepageSourceMode: 'prefer-preview',
        },
      ) as Promise<AppCommandResultMap[TCommand]>;
      }
    case 'load_settings':
      return storage.loadSettings() as Promise<AppCommandResultMap[TCommand]>;
    case 'save_settings':
      return storage.saveSettings((payload as SaveSettingsPayload)?.settings ?? {}) as Promise<AppCommandResultMap[TCommand]>;
    case 'pick_download_directory':
      return pickDownloadDirectory() as Promise<AppCommandResultMap[TCommand]>;
    case 'preview_download_pdf': {
      const previewHtml = await resolvePreviewSnapshotHtml(payload as PreviewDownloadPdfPayload);
      return previewDownloadPdf(
        payload as PreviewDownloadPdfPayload,
        app.getPath('downloads'),
        previewHtml,
      ) as Promise<AppCommandResultMap[TCommand]>;
    }
    case 'export_articles_docx':
      return exportArticlesDocx(
        payload as ExportArticlesDocxPayload,
        app.getPath('downloads'),
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'open_article_details_modal':
      return showArticleDetailsModal(
        getMainWindow(),
        payload as OpenArticleDetailsModalPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    default:
      throw appError('UNKNOWN_COMMAND', { command });
  }
}

export function registerAppIpc(storage: StorageService) {
  ipcMain.handle('app:invoke', async (_event, command: AppCommand, payload: AppCommandPayloadMap[AppCommand]) => {
    try {
      if (command === 'open_article_details_modal') {
        const target = BrowserWindow.fromWebContents(_event.sender) ?? getMainWindow();
        return await showArticleDetailsModal(target, payload as OpenArticleDetailsModalPayload);
      }

      return await invokeCommand(command, payload, storage);
    } catch (error) {
      throw new Error(serializeAppError(error));
    }
  });

  ipcMain.on('app:window-action', (event, action: WindowControlAction) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();
    if (!target || target.isDestroyed()) return;

    switch (action) {
      case 'minimize':
        target.minimize();
        break;
      case 'maximize':
        target.maximize();
        break;
      case 'unmaximize':
        target.unmaximize();
        break;
      case 'toggle-maximize':
        if (target.isMaximized()) {
          target.unmaximize();
        } else {
          target.maximize();
        }
        break;
      case 'close':
        target.close();
        break;
      default:
        break;
    }
  });

  ipcMain.handle('app:get-window-state', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();
    const state: WindowState = {
      isMaximized: Boolean(target && !target.isDestroyed() && target.isMaximized()),
    };
    return state;
  });

  ipcMain.handle('app:preview-get-state', () => {
    const state: PreviewState = getPreviewState();
    return state;
  });

  ipcMain.handle('app:modal-get-state', (event) => {
    const state: NativeModalState | null = getNativeModalState(event.sender.id);
    return state;
  });

  ipcMain.handle('app:preview-navigate', async (_event, url: string) => {
    try {
      await navigatePreview(url);
      return getPreviewState();
    } catch (error) {
      throw new Error(serializeAppError(error));
    }
  });

  ipcMain.on('app:preview-set-bounds', (_event, bounds: PreviewBounds | null) => {
    setPreviewBounds(bounds);
  });

  ipcMain.on('app:preview-set-visible', (_event, visible: boolean) => {
    setPreviewVisible(Boolean(visible));
  });

  ipcMain.on('app:preview-reload', () => {
    reloadPreview();
  });

  ipcMain.on('app:preview-go-back', () => {
    goBackPreview();
  });

  ipcMain.on('app:preview-go-forward', () => {
    goForwardPreview();
  });
}
