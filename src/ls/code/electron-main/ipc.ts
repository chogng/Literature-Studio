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
} from './services/articleFetcher.js';
import { buildBatchDocxFileName, exportArticlesToDocxFile } from './services/docx.js';
import {
  normalizeFetchStrategy,
  shouldPreparePreviewArtifacts,
  type PreviewExtractionSnapshot,
  type PreviewSnapshot,
} from './services/fetchStrategy.js';
import { resolveBatchPreviewExtractions, resolveBatchPreviewSnapshots, resolvePreviewSnapshotHtml } from './services/previewChannel.js';
import { previewDownloadPdf } from './services/pdf.js';
import { resolveDocxExportDialogCopy } from './utils/locale-copy.js';
import { appError, serializeAppError } from './utils/app-error.js';
import { getMainWindow } from './window.js';
const FETCH_STATUS_CHANNEL = 'app:fetch-status';

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


async function invokeCommand<TCommand extends AppCommand>(
  command: TCommand,
  payload: AppCommandPayloadMap[TCommand],
  storage: StorageService,
  emitToRenderer?: (channel: string, payload: unknown) => void,
): Promise<AppCommandResultMap[TCommand]> {
  switch (command) {
    case 'fetch_article':
      return fetchArticle((payload as FetchArticlePayload)?.url, storage) as Promise<AppCommandResultMap[TCommand]>;
    case 'fetch_latest_articles':
      {
        const fetchLatestPayload = payload as FetchLatestArticlesPayload;
        const fetchStrategy = normalizeFetchStrategy(fetchLatestPayload.fetchStrategy ?? 'preview-first');
        const previewExtractions = shouldPreparePreviewArtifacts(fetchStrategy)
          ? await resolveBatchPreviewExtractions(fetchLatestPayload)
          : new Map<string, PreviewExtractionSnapshot>();
        const previewSnapshots =
          shouldPreparePreviewArtifacts(fetchStrategy)
            ? (previewExtractions.size > 0
              ? new Map<string, PreviewSnapshot>()
              : await resolveBatchPreviewSnapshots(fetchLatestPayload))
            : new Map<string, PreviewSnapshot>();
        return fetchLatestArticles(
          fetchLatestPayload,
          storage,
          {
            previewExtractions,
            previewSnapshots,
            fetchStrategy,
            onFetchStatus: (status) => {
              emitToRenderer?.(FETCH_STATUS_CHANNEL, status);
            },
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

      return await invokeCommand(command, payload, storage, (channel, eventPayload) => {
        if (!_event.sender.isDestroyed()) {
          _event.sender.send(channel, eventPayload);
        }
      });
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


