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
import { shouldAllowSciencePreviewWhileLoading } from './services/science-validation.js';
import { buildBatchDocxFileName, exportArticlesToDocxFile } from './services/docx.js';
import { previewDownloadPdf } from './services/pdf.js';
import { resolveDocxExportDialogCopy } from './utils/locale-copy.js';
import { appError, serializeAppError } from './utils/app-error.js';
import { normalizeUrl } from './utils/url.js';
import { getMainWindow } from './window.js';

const BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS = 2500;
const BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS = 1500;
const BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS = 5000;
const BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS = 120;
const BATCH_PREVIEW_EXTRACTION_GATE_STABLE_POLLS = 4;
const BATCH_PREVIEW_EXTRACTION_GATE_STABLE_MS = 450;
const BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_POLLS = 8;
const BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_MS = 900;
const FETCH_HOMEPAGE_SOURCE_CHANNEL = 'app:fetch-homepage-source';

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

function normalizePreviewMatchUrl(value: unknown) {
  const normalized = safeNormalizeUrl(value);
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    url.hash = '';
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    }
    return url.toString();
  } catch {
    return '';
  }
}

function matchesPreviewTargetUrl(left: unknown, right: unknown) {
  const normalizedLeft = normalizePreviewMatchUrl(left);
  const normalizedRight = normalizePreviewMatchUrl(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function logPreviewBatchDiagnostic(event: string, details: Record<string, unknown>) {
  try {
    console.info(`[preview-batch] ${event} ${JSON.stringify(details)}`);
  } catch {
    console.info(`[preview-batch] ${event}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPreviewExtractionDiagnostics(
  extraction: HomepagePreviewExtractionSnapshot | Awaited<ReturnType<typeof getPreviewHomepageCandidateSnapshot>>,
) {
  const diagnostics = extraction?.extraction?.diagnostics;
  if (!diagnostics || typeof diagnostics !== 'object' || Array.isArray(diagnostics)) {
    return null;
  }

  return diagnostics as Record<string, unknown>;
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPreviewExtractionGateKey(
  extraction: Awaited<ReturnType<typeof getPreviewHomepageCandidateSnapshot>>,
) {
  const diagnostics = getPreviewExtractionDiagnostics(extraction);
  return JSON.stringify({
    candidateCount: extraction?.extraction?.candidates?.length ?? 0,
    sectionCount: toFiniteNumber(diagnostics?.sectionCount),
    cardCount: toFiniteNumber(diagnostics?.cardCount),
    datedCandidateCount: toFiniteNumber(diagnostics?.datedCandidateCount),
    summarizedCandidateCount: toFiniteNumber(diagnostics?.summarizedCandidateCount),
    selectedSectionIndex: toFiniteNumber(diagnostics?.selectedSectionIndex),
    previewUrl: safeNormalizeUrl(extraction?.previewUrl ?? ''),
  });
}

function getPreviewExtractionStructureState(
  extraction: Awaited<ReturnType<typeof getPreviewHomepageCandidateSnapshot>>,
) {
  if (!extraction || extraction.extraction.candidates.length === 0) {
    return {
      structurallyReady: false,
      trailingSection: false,
    };
  }

  if (!extraction.isLoading) {
    return {
      structurallyReady: true,
      trailingSection: false,
    };
  }

  const diagnostics = getPreviewExtractionDiagnostics(extraction);
  const sectionCount = toFiniteNumber(diagnostics?.sectionCount);
  const selectedSectionIndex = toFiniteNumber(diagnostics?.selectedSectionIndex);
  const trailingSection = Boolean(
    sectionCount !== null &&
      selectedSectionIndex !== null &&
      selectedSectionIndex >= sectionCount - 1,
  );

  return {
    structurallyReady: true,
    trailingSection,
  };
}

async function waitForPreviewHomepageExtraction({
  previewUrl,
  matchedUrls,
}: {
  previewUrl: string;
  matchedUrls: string[];
}) {
  const startedAt = Date.now();
  let attempts = 0;
  let lastStableKey = '';
  let stableSince = 0;
  let stablePolls = 0;
  let bestCandidateCount = 0;
  let bestSectionCount: number | null = null;

  logPreviewBatchDiagnostic('extraction_gate_started', {
    previewUrl,
    matchedUrls,
    gateTimeoutMs: BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS,
    pollMs: BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS,
    stablePollsRequired: BATCH_PREVIEW_EXTRACTION_GATE_STABLE_POLLS,
    stableMsRequired: BATCH_PREVIEW_EXTRACTION_GATE_STABLE_MS,
  });

  while (Date.now() - startedAt < BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS) {
    attempts += 1;

    const currentPreviewState = getPreviewState();
    const currentPreviewUrl = safeNormalizeUrl(currentPreviewState.url ?? '');
    if (
      !currentPreviewUrl ||
      !matchedUrls.some((homepageUrl) => matchesPreviewTargetUrl(homepageUrl, currentPreviewUrl))
    ) {
      logPreviewBatchDiagnostic('extraction_gate_aborted', {
        reason: 'preview_url_changed',
        previewUrl,
        currentPreviewUrl,
        matchedUrls,
        attempts,
        waitMs: Date.now() - startedAt,
      });
      return null;
    }

    const extraction = await getPreviewHomepageCandidateSnapshot({
      timeoutMs: BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS,
    });
    const extractionUrl = safeNormalizeUrl(extraction?.previewUrl ?? '');
    const allowExtractionWhileLoading = extractionUrl
      ? shouldAllowSciencePreviewWhileLoading(extractionUrl)
      : false;
    if (
      extraction &&
      extractionUrl &&
      (!extraction.isLoading || allowExtractionWhileLoading) &&
      matchedUrls.some((homepageUrl) => matchesPreviewTargetUrl(homepageUrl, extractionUrl))
    ) {
      const now = Date.now();
      const diagnostics = getPreviewExtractionDiagnostics(extraction);
      const sectionCount = toFiniteNumber(diagnostics?.sectionCount);
      const selectedSectionIndex = toFiniteNumber(diagnostics?.selectedSectionIndex);
      const candidateCount = extraction.extraction.candidates.length;
      bestCandidateCount = Math.max(bestCandidateCount, candidateCount);
      if (sectionCount !== null) {
        bestSectionCount = bestSectionCount === null ? sectionCount : Math.max(bestSectionCount, sectionCount);
      }

      const stableKey = buildPreviewExtractionGateKey(extraction);
      if (stableKey === lastStableKey) {
        stablePolls += 1;
      } else {
        lastStableKey = stableKey;
        stableSince = now;
        stablePolls = 1;
      }

      const stableMs = stableSince > 0 ? now - stableSince : 0;
      const structureState = getPreviewExtractionStructureState(extraction);
      const requiredStablePolls = structureState.trailingSection
        ? BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_POLLS
        : BATCH_PREVIEW_EXTRACTION_GATE_STABLE_POLLS;
      const requiredStableMs = structureState.trailingSection
        ? BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_MS
        : BATCH_PREVIEW_EXTRACTION_GATE_STABLE_MS;
      const stabilityReady =
        !extraction.isLoading ||
        (stablePolls >= requiredStablePolls && stableMs >= requiredStableMs);

      if (structureState.structurallyReady && stabilityReady) {
        logPreviewBatchDiagnostic('extraction_gate_ready', {
          previewUrl,
          extractionUrl,
          candidateCount,
          sectionCount,
          selectedSectionIndex,
          attempts,
          waitMs: Date.now() - startedAt,
          extractionIsLoading: extraction.isLoading,
          trailingSection: structureState.trailingSection,
          stablePolls,
          stableMs,
          requiredStablePolls,
          requiredStableMs,
        });
        return extraction;
      }
    }

    await sleep(BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS);
  }

  logPreviewBatchDiagnostic('extraction_gate_timeout', {
    previewUrl,
    matchedUrls,
    attempts,
    waitMs: Date.now() - startedAt,
    bestCandidateCount,
    bestSectionCount,
  });

  return null;
}

async function resolvePreviewSnapshotHtml(payload: PreviewDownloadPdfPayload = {}) {
  const requestedUrl = safeNormalizeUrl(payload.pageUrl ?? '');
  if (!requestedUrl) return null;

  const previewState = getPreviewState();
  const previewUrl = safeNormalizeUrl(previewState.url ?? '');
  if (!previewUrl || !matchesPreviewTargetUrl(previewUrl, requestedUrl)) {
    return null;
  }

  const snapshot = await getPreviewDocumentSnapshot();
  const snapshotUrl = safeNormalizeUrl(snapshot?.url ?? '');
  if (!snapshot || !snapshotUrl || !matchesPreviewTargetUrl(snapshotUrl, requestedUrl)) {
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
    if (homepageUrl && matchesPreviewTargetUrl(homepageUrl, previewUrl)) {
      matchedUrls.add(homepageUrl);
    }
  }

  if (matchedUrls.size === 0) {
    logPreviewBatchDiagnostic('snapshot_skipped', {
      reason: 'preview_url_not_matched',
      previewUrl,
      sourceUrls: sources
        .map((source) => safeNormalizeUrl(source?.homepageUrl))
        .filter(Boolean),
    });
    return new Map<string, HomepagePreviewSnapshot>();
  }

  const allowWhileLoading = shouldAllowSciencePreviewWhileLoading(previewUrl);
  if (previewState.isLoading && !allowWhileLoading) {
    return new Map<string, HomepagePreviewSnapshot>();
  }

  const snapshot = await getPreviewDocumentSnapshot({
    timeoutMs: BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS,
  });
  const snapshotUrl = safeNormalizeUrl(snapshot?.url ?? '');
  const allowSnapshotWhileLoading = snapshotUrl ? shouldAllowSciencePreviewWhileLoading(snapshotUrl) : false;
  if (
    !snapshot ||
    !snapshotUrl ||
    (snapshot.isLoading && !allowSnapshotWhileLoading) ||
    ![...matchedUrls].some((homepageUrl) => matchesPreviewTargetUrl(homepageUrl, snapshotUrl))
  ) {
    logPreviewBatchDiagnostic('snapshot_skipped', {
      reason: !snapshot
        ? 'snapshot_unavailable'
        : !snapshotUrl
          ? 'snapshot_url_empty'
          : snapshot.isLoading && !allowSnapshotWhileLoading
            ? 'snapshot_loading_blocked'
            : 'snapshot_url_not_matched',
      previewUrl,
      snapshotUrl,
      previewIsLoading: previewState.isLoading,
      snapshotIsLoading: snapshot?.isLoading ?? null,
      matchedUrls: [...matchedUrls],
    });
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
  if (!previewUrl) {
    return new Map<string, HomepagePreviewExtractionSnapshot>();
  }

  const matchedUrls = new Set<string>();
  for (const source of sources) {
    const homepageUrl = safeNormalizeUrl(source?.homepageUrl);
    if (homepageUrl && matchesPreviewTargetUrl(homepageUrl, previewUrl)) {
      matchedUrls.add(homepageUrl);
    }
  }

  if (matchedUrls.size === 0) {
    logPreviewBatchDiagnostic('extraction_skipped', {
      reason: 'preview_url_not_matched',
      previewUrl,
      sourceUrls: sources
        .map((source) => safeNormalizeUrl(source?.homepageUrl))
        .filter(Boolean),
    });
    return new Map<string, HomepagePreviewExtractionSnapshot>();
  }

  const allowWhileLoading = shouldAllowSciencePreviewWhileLoading(previewUrl);
  if (previewState.isLoading && !allowWhileLoading) {
    return new Map<string, HomepagePreviewExtractionSnapshot>();
  }

  const extraction =
    previewState.isLoading && allowWhileLoading
      ? await waitForPreviewHomepageExtraction({
          previewUrl,
          matchedUrls: [...matchedUrls],
        })
      : await getPreviewHomepageCandidateSnapshot({
          timeoutMs: BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS,
        });
  const extractionUrl = safeNormalizeUrl(extraction?.previewUrl ?? '');
  const allowExtractionWhileLoading = extractionUrl ? shouldAllowSciencePreviewWhileLoading(extractionUrl) : false;
  if (
    !extraction ||
    !extractionUrl ||
    (extraction.isLoading && !allowExtractionWhileLoading) ||
    ![...matchedUrls].some((homepageUrl) => matchesPreviewTargetUrl(homepageUrl, extractionUrl))
  ) {
    logPreviewBatchDiagnostic('extraction_skipped', {
      reason: !extraction
        ? 'extraction_unavailable'
        : !extractionUrl
          ? 'extraction_url_empty'
          : extraction.isLoading && !allowExtractionWhileLoading
            ? 'extraction_loading_blocked'
            : 'extraction_url_not_matched',
      previewUrl,
      extractionUrl,
      previewIsLoading: previewState.isLoading,
      extractionIsLoading: extraction?.isLoading ?? null,
      matchedUrls: [...matchedUrls],
    });
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
  emitToRenderer?: (channel: string, payload: unknown) => void,
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
          onHomepageSourceStatus: (status) => {
            emitToRenderer?.(FETCH_HOMEPAGE_SOURCE_CHANNEL, status);
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
