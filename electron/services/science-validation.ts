import { BrowserWindow } from 'electron';
import { getPreviewDocumentSnapshot, getPreviewListingCandidateSnapshot, getPreviewState } from '../preview-view.js';

import { getMainWindow } from '../window.js';
import { appError, isAppError } from '../utils/app-error.js';
import { cleanText } from '../utils/text.js';
import { READER_SHARED_WEB_PARTITION } from './browser-partitions.js';

const SCIENCE_HOSTS = new Set(['science.org', 'www.science.org']);
const SCIENCE_CURRENT_TOC_PATH_RE = /^\/toc\/[^/]+\/current\/?$/i;
const SCIENCE_VALIDATION_TIMEOUT_MS = 3 * 60 * 1000;
const SCIENCE_VALIDATION_POLL_MS = 600;
const SCIENCE_VALIDATION_BOOT_TIMEOUT_MS = 4000;

const SCIENCE_VALIDATION_STATE_SCRIPT = String.raw`(() => {
  const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalizedText = cleanText(document.documentElement?.textContent ?? '').toLowerCase();
  const title = cleanText(document.title);
  const sectionCount = document.querySelectorAll(
    'div.toc > div.toc__body > div.toc__body > section.toc__section, div.toc__body > div.toc__body > section.toc__section, div.toc__body > section.toc__section'
  ).length;
  const hasChallengeIndicators =
    normalizedText.includes('cloudflare') &&
    (
      normalizedText.includes('ray id') ||
      normalizedText.includes('security verification') ||
      normalizedText.includes('执行安全验证')
    );
  return {
    currentUrl: location.href,
    title,
    sectionCount,
    hasChallengeIndicators,
  };
})()`;

const SCIENCE_VALIDATION_HTML_SCRIPT = String.raw`(() => {
  try {
    return document.documentElement ? document.documentElement.outerHTML : '';
  } catch {
    return '';
  }
})()`;

type ScienceValidationResult = {
  finalUrl: string;
  html: string;
  sectionCount: number;
  title: string;
  readyMs: number;
  navigationMode: 'preview-existing' | 'dom-ready' | 'load-finished' | 'boot-timeout';
  source: 'preview' | 'window';
};

let scienceValidationWindow: BrowserWindow | null = null;
const scienceValidationPromiseByUrl = new Map<string, Promise<ScienceValidationResult>>();

type ScienceHttpErrorDetails = {
  status?: unknown;
  responseHeaders?: {
    server?: unknown;
    cfMitigated?: unknown;
    cfRay?: unknown;
  };
};

function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isScienceSeriesListingPageUrl(value: string) {
  const parsed = safeParseUrl(value);
  if (!parsed) return false;

  const host = cleanText(parsed.host).toLowerCase();
  if (!SCIENCE_HOSTS.has(host)) return false;

  return SCIENCE_CURRENT_TOC_PATH_RE.test(parsed.pathname);
}

export function getScienceChallengeSignal(error: unknown) {
  if (!isAppError(error) || error.code !== 'HTTP_REQUEST_FAILED') {
    return null;
  }

  const details = (error.details ?? {}) as ScienceHttpErrorDetails;
  const status = cleanText(details.status);
  if (status !== '403') {
    return null;
  }

  const server = cleanText(details.responseHeaders?.server).toLowerCase();
  const cfMitigated = cleanText(details.responseHeaders?.cfMitigated).toLowerCase();
  const cfRay = cleanText(details.responseHeaders?.cfRay);
  const cloudflareSignal = server.includes('cloudflare') || Boolean(cfRay);
  const challengeSignal = cfMitigated.includes('challenge');

  return {
    status,
    server: server || null,
    cfMitigated: cfMitigated || null,
    cfRay: cfRay || null,
    cloudflareSignal,
    challengeSignal,
  };
}

export function shouldUseScienceValidationRenderFallback({
  pageUrl,
  error,
}: {
  pageUrl: string;
  error: unknown;
}) {
  if (!isScienceSeriesListingPageUrl(pageUrl)) {
    return false;
  }

  const challengeSignal = getScienceChallengeSignal(error);
  if (!challengeSignal) return false;

  if (challengeSignal.challengeSignal || challengeSignal.cloudflareSignal) {
    return true;
  }

  // Keep a safe fallback for Science series even when edge headers are stripped.
  return challengeSignal.status === '403';
}

export function shouldAllowSciencePreviewWhileLoading(pageUrl: string) {
  return isScienceSeriesListingPageUrl(pageUrl);
}

function normalizeScienceComparableUrl(value: string) {
  const parsed = safeParseUrl(value);
  if (!parsed) return '';

  parsed.hash = '';
  if (parsed.pathname !== '/') {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  }

  return parsed.toString();
}

function matchesScienceComparableUrl(left: string, right: string) {
  const normalizedLeft = normalizeScienceComparableUrl(left);
  const normalizedRight = normalizeScienceComparableUrl(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function extractTitleFromHtml(html: string) {
  const matched = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(matched?.[1] ?? '');
}

export function isScienceChallengeHtml(html: string) {
  const normalized = cleanText(html).toLowerCase();
  if (!normalized) return false;

  if (
    normalized.includes('cloudflare') &&
    (normalized.includes('ray id') || normalized.includes('security verification') || normalized.includes('执行安全验证'))
  ) {
    return true;
  }

  if (normalized.includes('cf-mitigated') || normalized.includes('challenge-platform')) {
    return true;
  }

  return false;
}

async function tryUseExistingSciencePreview(pageUrl: string): Promise<ScienceValidationResult | null> {
  const previewState = getPreviewState();
  const previewUrl = cleanText(previewState.url);
  if (!previewUrl || !matchesScienceComparableUrl(previewUrl, pageUrl)) {
    return null;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < SCIENCE_VALIDATION_TIMEOUT_MS) {
    const currentState = getPreviewState();
    const currentPreviewUrl = cleanText(currentState.url);
    if (!currentPreviewUrl || !matchesScienceComparableUrl(currentPreviewUrl, pageUrl)) {
      return null;
    }

    const [extraction, snapshot] = await Promise.all([
      getPreviewListingCandidateSnapshot({
        timeoutMs: Math.min(1200, SCIENCE_VALIDATION_POLL_MS * 2),
      }),
      getPreviewDocumentSnapshot({
        timeoutMs: Math.min(1200, SCIENCE_VALIDATION_POLL_MS * 2),
      }),
    ]);

    const extractionUrl = cleanText(extraction?.previewUrl);
    const snapshotUrl = cleanText(snapshot?.url);
    const matchesExtraction = extractionUrl && matchesScienceComparableUrl(extractionUrl, pageUrl);
    const matchesSnapshot = snapshotUrl && matchesScienceComparableUrl(snapshotUrl, pageUrl);
    const html = matchesSnapshot ? String(snapshot?.html ?? '') : '';
    const title = matchesSnapshot ? extractTitleFromHtml(html) : '';
    const diagnostics = extraction?.extraction?.diagnostics;
    const sectionCount =
      matchesExtraction && diagnostics && typeof diagnostics === 'object'
        ? Number((diagnostics as Record<string, unknown>).sectionCount) || 0
        : 0;

    if (
      matchesExtraction &&
      matchesSnapshot &&
      sectionCount > 0 &&
      cleanText(html) &&
      !isScienceChallengeHtml(html)
    ) {
      return {
        finalUrl: snapshotUrl || extractionUrl || pageUrl,
        html,
        sectionCount,
        title,
        readyMs: Date.now() - startedAt,
        navigationMode: 'preview-existing',
        source: 'preview',
      };
    }

    await new Promise((resolve) => setTimeout(resolve, SCIENCE_VALIDATION_POLL_MS));
  }

  return null;
}

function applyWindowChrome(window: BrowserWindow) {
  if (typeof window.removeMenu === 'function') {
    window.removeMenu();
  } else {
    window.setMenuBarVisibility(false);
  }
}

function createScienceValidationWindow() {
  if (scienceValidationWindow && !scienceValidationWindow.isDestroyed()) {
    return scienceValidationWindow;
  }

  const parentWindow = getMainWindow();
  scienceValidationWindow = new BrowserWindow({
    parent: parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined,
    modal: false,
    show: false,
    width: 1180,
    height: 880,
    minWidth: 980,
    minHeight: 720,
    title: 'Science Validation',
    autoHideMenuBar: true,
    backgroundColor: '#f3f6fb',
    webPreferences: {
      partition: READER_SHARED_WEB_PARTITION,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  applyWindowChrome(scienceValidationWindow);
  scienceValidationWindow.webContents.setWindowOpenHandler?.(() => ({ action: 'deny' }));
  scienceValidationWindow.on('closed', () => {
    scienceValidationWindow = null;
  });
  scienceValidationWindow.once('ready-to-show', () => {
    if (!scienceValidationWindow || scienceValidationWindow.isDestroyed()) return;
    scienceValidationWindow.show();
    scienceValidationWindow.focus();
  });

  return scienceValidationWindow;
}

async function executeScienceValidationScript(window: BrowserWindow, script: string) {
  const frame = window.webContents.mainFrame;
  if (!frame || frame.isDestroyed()) {
    return null;
  }

  return await frame.executeJavaScript(script, true);
}

async function inspectScienceValidationWindow(window: BrowserWindow) {
  try {
    const state = await executeScienceValidationScript(window, SCIENCE_VALIDATION_STATE_SCRIPT);
    if (!state || typeof state !== 'object') {
      return null;
    }

    const current = state as Record<string, unknown>;
    return {
      currentUrl: cleanText(current.currentUrl),
      title: cleanText(current.title),
      sectionCount: Number(current.sectionCount) || 0,
      hasChallengeIndicators: Boolean(current.hasChallengeIndicators),
    };
  } catch {
    return null;
  }
}

async function waitForScienceValidationBoot(window: BrowserWindow, pageUrl: string) {
  return await new Promise<'dom-ready' | 'load-finished' | 'boot-timeout'>((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const webContents = window.webContents as unknown as {
      on: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
    };

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      webContents.removeListener('dom-ready', handleDomReady);
      webContents.removeListener('did-fail-load', handleDidFailLoad);
      window.removeListener('closed', handleClosed);
    };

    const resolveOnce = (mode: 'dom-ready' | 'load-finished' | 'boot-timeout') => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(mode);
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const handleDomReady = () => {
      resolveOnce('dom-ready');
    };

    const handleDidFailLoad = (...args: unknown[]) => {
      const [, errorCodeValue, errorDescriptionValue, validatedURLValue, isMainFrameValue] = args;
      const errorCode = Number(errorCodeValue);
      const errorDescription = cleanText(errorDescriptionValue);
      const validatedURL = cleanText(validatedURLValue);
      const isMainFrame = Boolean(isMainFrameValue);
      if (!isMainFrame) return;

      rejectOnce(
        appError('HTTP_REQUEST_FAILED', {
          status: 'NETWORK_ERROR',
          statusText: `Science validation page failed to load (${errorCode}: ${errorDescription})`,
          url: validatedURL || pageUrl,
        }),
      );
    };

    const handleClosed = () => {
      rejectOnce(
        appError('HTTP_REQUEST_FAILED', {
          status: 'SCIENCE_VALIDATION_REQUIRED',
          statusText: 'Science validation window was closed before verification completed.',
          url: pageUrl,
        }),
      );
    };

    timeoutId = setTimeout(() => {
      resolveOnce('boot-timeout');
    }, SCIENCE_VALIDATION_BOOT_TIMEOUT_MS);

    webContents.on('dom-ready', handleDomReady);
    webContents.on('did-fail-load', handleDidFailLoad);
    window.on('closed', handleClosed);

    void window.loadURL(pageUrl).then(
      () => resolveOnce('load-finished'),
      (error) => rejectOnce(error),
    );
  });
}

export async function ensureScienceValidationWindow(pageUrl: string): Promise<ScienceValidationResult> {
  if (!isScienceSeriesListingPageUrl(pageUrl)) {
    throw appError('HTTP_REQUEST_FAILED', {
      status: 'SCIENCE_VALIDATION_UNSUPPORTED',
      statusText: 'Science validation window is only available for Science TOC pages.',
      url: pageUrl,
    });
  }

  const existing = scienceValidationPromiseByUrl.get(pageUrl);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    const previewResult = await tryUseExistingSciencePreview(pageUrl);
    if (previewResult) {
      return previewResult;
    }

    const window = createScienceValidationWindow();
    let windowClosed = false;
    const handleClosed = () => {
      windowClosed = true;
    };
    window.once('closed', handleClosed);

    try {
      const startedAt = Date.now();
      if (!window.isDestroyed()) {
        window.show();
        window.focus();
      }
      const navigationMode = await waitForScienceValidationBoot(window, pageUrl);

      while (Date.now() - startedAt < SCIENCE_VALIDATION_TIMEOUT_MS) {
        if (windowClosed || window.isDestroyed() || window.webContents.isDestroyed()) {
          throw appError('HTTP_REQUEST_FAILED', {
            status: 'SCIENCE_VALIDATION_REQUIRED',
            statusText: 'Science validation window was closed before verification completed.',
            url: pageUrl,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, SCIENCE_VALIDATION_POLL_MS));
        const state = await inspectScienceValidationWindow(window);
        if (!state) {
          continue;
        }

        if (state.sectionCount > 0 && !state.hasChallengeIndicators) {
          let html = '';
          try {
            const resolvedHtml = await executeScienceValidationScript(window, SCIENCE_VALIDATION_HTML_SCRIPT);
            html = typeof resolvedHtml === 'string' ? resolvedHtml : '';
          } catch {
            continue;
          }
          const normalizedHtml = html;
          if (!normalizedHtml.trim() || isScienceChallengeHtml(normalizedHtml)) {
            continue;
          }

          const result: ScienceValidationResult = {
            finalUrl: state.currentUrl || pageUrl,
            html: normalizedHtml,
            sectionCount: state.sectionCount,
            title: state.title,
            readyMs: Date.now() - startedAt,
            navigationMode,
            source: 'window',
          };

          if (!window.isDestroyed()) {
            window.webContents.stop();
            window.close();
          }

          return result;
        }
      }

      throw appError('HTTP_REQUEST_FAILED', {
        status: 'SCIENCE_VALIDATION_REQUIRED',
        statusText: 'Complete the Science verification window to continue fetching.',
        url: pageUrl,
      });
    } finally {
      if (!window.isDestroyed()) {
        window.removeListener('closed', handleClosed);
      }
    }
  })();

  scienceValidationPromiseByUrl.set(pageUrl, task);
  try {
    return await task;
  } finally {
    scienceValidationPromiseByUrl.delete(pageUrl);
  }
}

