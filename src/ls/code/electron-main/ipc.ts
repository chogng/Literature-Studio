import { app, ipcMain, shell } from 'electron';

import type {
  AppCommand,
  AppCommandPayloadMap,
  AppCommandResultMap,
  FetchArticlePayload,
  FetchLatestArticlesPayload,
  IndexDownloadedPdfPayload,
  LibraryDocumentStatusPayload,
  ListLibraryDocumentsPayload,
  OpenArticleDetailsModalPayload,
  OpenPathPayload,
  PreviewDownloadPdfPayload,
  PreviewBounds,
  NativeModalState,
  PreviewNavigatePayload,
  PreviewState,
  ReindexLibraryDocumentPayload,
  RagAnswerArticlesPayload,
  SaveSettingsPayload,
  TestLlmConnectionPayload,
  TestRagConnectionPayload,
  TestTranslationConnectionPayload,
  WindowControlAction,
} from '../../base/parts/sandbox/common/desktopTypes.js';
import type { StorageService } from '../../platform/storage/common/storage.js';
import {
  getPreviewState,
  activatePreviewTarget,
  goBackPreview,
  goForwardPreview,
  navigatePreviewTarget,
  releasePreviewTarget,
  reloadPreview,
  setPreviewBounds,
  setPreviewVisible,
} from '../../platform/windows/electron-main/previewView.js';
import { getNativeModalState, openArticleDetailsModal } from '../../platform/windows/electron-main/articleDetailsWindow.js';
import {
  dismissToast,
  getToastState,
  reportToastLayout,
  setToastHovering,
  showToast,
} from '../../platform/windows/electron-main/toastOverlayView.js';
import {
  closeMenuOverlay,
  getMenuOverlayState,
  openMenuOverlay,
  selectMenuOption,
} from '../../platform/windows/electron-main/menuOverlayView.js';
import {
  fetchArticle,
  fetchLatestArticles,
} from './fetch/articleFetcher.js';
import { exportArticlesDocx } from './document/docx.js';
import {
  normalizeFetchStrategy,
  shouldPreparePreviewArtifacts,
  type PreviewExtractionSnapshot,
  type PreviewSnapshot,
} from './fetch/fetchStrategy.js';
import { resolveBatchPreviewExtractions, resolveBatchPreviewSnapshots, resolvePreviewSnapshotHtml } from './fetch/previewChannel.js';
import { previewDownloadPdf } from './pdf/pdf.js';
import { appError, serializeAppError } from '../../base/common/errors.js';
import { pickDirectoryDialog } from '../../platform/dialogs/electron-main/dialogMainService.js';
import { testLlmConnection } from './llm/llm.js';
import { answerQuestionFromArticles, testRagConnection } from './rag/rag.js';
import { testTranslationConnection } from './translation/translation.js';
import {
  applyMainWindowBackgroundMaterial,
  getMainWindow,
  getWindowState,
  performWindowControlAction,
  resolveWindowFromWebContents,
} from '../../platform/windows/electron-main/window.js';
const FETCH_STATUS_CHANNEL = 'app:fetch-status';
type AppInvokeResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error: string };

async function showArticleDetailsModal(
  parentWindow: ReturnType<typeof getMainWindow>,
  payload: OpenArticleDetailsModalPayload = {},
) {
  const targetWindow = parentWindow ?? getMainWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    throw appError('MAIN_WINDOW_UNAVAILABLE');
  }

  return openArticleDetailsModal(targetWindow, payload);
}

let micaMaterialTimeout: ReturnType<typeof setTimeout> | null = null;


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
      {
        const saved = await storage.saveSettings((payload as SaveSettingsPayload)?.settings ?? {});
        if (micaMaterialTimeout) {
          clearTimeout(micaMaterialTimeout);
          micaMaterialTimeout = null;
        }
        if (saved.useMica) {
          applyMainWindowBackgroundMaterial(true);
        } else {
          micaMaterialTimeout = setTimeout(() => {
            applyMainWindowBackgroundMaterial(false);
            micaMaterialTimeout = null;
          }, 300);
        }
        return saved as AppCommandResultMap[TCommand];
      }
    case 'test_llm_connection':
      return testLlmConnection(
        payload as TestLlmConnectionPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'test_translation_connection':
      return testTranslationConnection(
        payload as TestTranslationConnectionPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'test_rag_connection':
      return testRagConnection(
        payload as TestRagConnectionPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'pick_download_directory':
      return pickDirectoryDialog(getMainWindow()) as Promise<AppCommandResultMap[TCommand]>;
    case 'open_path': {
      const targetPath = (payload as OpenPathPayload)?.path?.trim();
      if (!targetPath) {
        throw appError('UNKNOWN_ERROR', { message: 'Path is required.' });
      }

      shell.showItemInFolder(targetPath);
      return true as AppCommandResultMap[TCommand];
    }
    case 'preview_download_pdf': {
      const previewHtml = await resolvePreviewSnapshotHtml(payload as PreviewDownloadPdfPayload);
      const downloadResult = await previewDownloadPdf(
        payload as PreviewDownloadPdfPayload,
        app.getPath('downloads'),
        previewHtml,
      );

      try {
        const settings = await storage.loadSettings();
        const knowledgeBaseModeEnabled =
          settings.rag.knowledgeBaseModeEnabled ?? settings.rag.enabled;
        if (knowledgeBaseModeEnabled && settings.rag.autoIndexDownloadedPdf) {
          const registration = await storage.registerLibraryDocument({
            ...(payload as PreviewDownloadPdfPayload),
            filePath: downloadResult.filePath,
            sourceUrl: downloadResult.sourceUrl,
          });
          return {
            ...downloadResult,
            libraryRegistration: registration,
          } as AppCommandResultMap[TCommand];
        }
      } catch (registrationError) {
        console.error('Failed to auto-register downloaded PDF in the library.', registrationError);
      }

      return {
        ...downloadResult,
        libraryRegistration: null,
      } as AppCommandResultMap[TCommand];
    }
    case 'index_downloaded_pdf':
      return storage.registerLibraryDocument(
        payload as IndexDownloadedPdfPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'get_library_document_status':
      return storage.getLibraryDocumentStatus(
        payload as LibraryDocumentStatusPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'list_library_documents':
      return storage.listLibraryDocuments(
        payload as ListLibraryDocumentsPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'reindex_library_document':
      return storage.reindexLibraryDocument(
        payload as ReindexLibraryDocumentPayload,
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'rag_answer_articles':
      return answerQuestionFromArticles(
        payload as RagAnswerArticlesPayload,
        await storage.loadSettings(),
      ) as Promise<AppCommandResultMap[TCommand]>;
    case 'export_articles_docx':
      {
        const mainWindow = getMainWindow();
        if (!mainWindow) {
          throw appError('MAIN_WINDOW_UNAVAILABLE');
        }
        return exportArticlesDocx(
          payload as AppCommandPayloadMap['export_articles_docx'],
          app.getPath('downloads'),
          storage,
          mainWindow,
        ) as Promise<AppCommandResultMap[TCommand]>;
      }
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
        const target = resolveWindowFromWebContents(_event.sender);
        return {
          ok: true,
          result: await showArticleDetailsModal(target, payload as OpenArticleDetailsModalPayload),
        } satisfies AppInvokeResponse<AppCommandResultMap[typeof command]>;
      }

      return {
        ok: true,
        result: await invokeCommand(command, payload, storage, (channel, eventPayload) => {
          if (!_event.sender.isDestroyed()) {
            _event.sender.send(channel, eventPayload);
          }
        }),
      } satisfies AppInvokeResponse<AppCommandResultMap[typeof command]>;
    } catch (error) {
      return {
        ok: false,
        error: serializeAppError(error),
      } satisfies AppInvokeResponse<AppCommandResultMap[typeof command]>;
    }
  });

  ipcMain.on('app:window-action', (event, action: WindowControlAction) => {
    const target = resolveWindowFromWebContents(event.sender);
    if (!target || target.isDestroyed()) return;

    performWindowControlAction(target, action);
  });

  ipcMain.handle('app:get-window-state', (event) => {
    return getWindowState(resolveWindowFromWebContents(event.sender));
  });

  ipcMain.handle('app:preview-get-state', (_event, payload?: { targetId?: string | null }) => {
    const state: PreviewState = getPreviewState(payload?.targetId);
    return state;
  });

  ipcMain.handle('app:modal-get-state', (event) => {
    const state: NativeModalState | null = getNativeModalState(event.sender.id);
    return state;
  });

  ipcMain.on('app:native-toast-show', (event, options) => {
    showToast(resolveWindowFromWebContents(event.sender), options);
  });

  ipcMain.on('app:native-toast-dismiss', (_event, id: number) => {
    dismissToast(id);
  });

  ipcMain.handle('app:native-toast-get-state', () => {
    return getToastState();
  });

  ipcMain.on('app:native-toast-layout', (event, layout) => {
    reportToastLayout(event.sender.id, layout);
  });

  ipcMain.on('app:native-toast-hover', (_event, hovering: boolean) => {
    setToastHovering(hovering);
  });

  ipcMain.on('app:native-menu-open', (event, payload) => {
    openMenuOverlay(resolveWindowFromWebContents(event.sender), event.sender.id, payload);
  });

  ipcMain.on('app:native-menu-close', (_event, requestId: string) => {
    closeMenuOverlay(requestId);
  });

  ipcMain.handle('app:native-menu-get-state', () => {
    return getMenuOverlayState();
  });

  ipcMain.on('app:native-menu-select', (_event, requestId: string, value: string) => {
    selectMenuOption(requestId, value);
  });

  ipcMain.on('app:preview-activate', (_event, payload?: { targetId?: string | null }) => {
    activatePreviewTarget(payload?.targetId);
  });

  ipcMain.on('app:preview-release', (_event, payload?: { targetId?: string | null }) => {
    releasePreviewTarget(payload?.targetId);
  });

  ipcMain.handle('app:preview-navigate', async (_event, payload: PreviewNavigatePayload) => {
    try {
      await navigatePreviewTarget(payload.url, payload.targetId, payload.mode);
      return getPreviewState(payload.targetId);
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

  ipcMain.on('app:preview-reload', (_event, payload?: { targetId?: string | null }) => {
    reloadPreview(payload?.targetId);
  });

  ipcMain.on('app:preview-go-back', (_event, payload?: { targetId?: string | null }) => {
    goBackPreview(payload?.targetId);
  });

  ipcMain.on('app:preview-go-forward', (_event, payload?: { targetId?: string | null }) => {
    goForwardPreview(payload?.targetId);
  });
}


