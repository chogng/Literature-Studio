import { BrowserWindow } from 'electron';
import { getPreviewDocumentSnapshot, getPreviewListingCandidateSnapshot, getPreviewState } from './previewView.js';
import { registerAuxiliaryWindow } from './window.js';
import { appError, isAppError } from '../../../base/common/errors.js';
import {
  isScienceHostUrl as isSharedScienceHostUrl,
  isScienceSeriesCurrentTocUrl,
} from '../../../base/common/url.js';
import { cleanText } from '../../../base/common/strings.js';
import { READER_SHARED_WEB_PARTITION } from '../../native/electron-main/sharedWebSession.js';

const SCIENCE_VALIDATION_TIMEOUT_MS = 3 * 60 * 1000;
const SCIENCE_VALIDATION_POLL_MS = 600;
const SCIENCE_VALIDATION_BOOT_TIMEOUT_MS = 4000;
const SCIENCE_VALIDATION_REVEAL_DELAY_MS = 1200;
const SCIENCE_VALIDATION_READY_SETTLE_MS = 2500;
const SCIENCE_VALIDATION_PROGRESS_LOG_INTERVAL_MS = 10 * 1000;
const SCIENCE_VALIDATION_LOG_ENABLED = process.env.READER_FETCH_TIMING !== '0';
const SCIENCE_VALIDATION_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const SCIENCE_VALIDATION_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
const SCIENCE_VALIDATION_ACCEPT_LANGUAGE = 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7';
const SCIENCE_CHALLENGE_TEXT_SNIPPETS = [
  'security verification',
  'verify you are human',
  'security check',
  'complete the security check',
  'execute security verification',
  '执行安全验证',
] as const;
const SCIENCE_CHALLENGE_HTML_SNIPPETS = [
  'cf-mitigated',
  'challenge-platform',
  'google.com/recaptcha',
  'recaptcha.net/recaptcha',
  'recaptcha/api2/',
  'g-recaptcha',
  'grecaptcha',
  'data-sitekey',
] as const;
const SCIENCE_DOWNLOAD_CONTROL_SELECTORS = [
  'a.navbar-download[href]',
  'a[data-single-download="true"][href]',
  'a[data-download-files-key="pdf"][href]',
  'a[aria-label*="Download PDF"][href]',
  'a[title*="Download PDF"][href]',
  'a[href*="/doi/pdf/"][href]',
] as const;
const SCIENCE_PDF_EMBED_SELECTORS = [
  'iframe[src*="/doi/pdf/"]',
  'embed[type="application/pdf"]',
  'object[type="application/pdf"]',
] as const;

const SCIENCE_VALIDATION_STATE_SCRIPT = String.raw`(() => {
  const settleMs = ${JSON.stringify(SCIENCE_VALIDATION_READY_SETTLE_MS)};
  const monitorKey = '__scienceValidationMonitor';
  const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalizedText = cleanText(document.documentElement?.textContent ?? '').toLowerCase();
  const title = cleanText(document.title);
  const downloadSelectors = ${JSON.stringify(SCIENCE_DOWNLOAD_CONTROL_SELECTORS)};
  const pdfEmbedSelectors = ${JSON.stringify(SCIENCE_PDF_EMBED_SELECTORS)};
  const challengeTextSnippets = ${JSON.stringify(SCIENCE_CHALLENGE_TEXT_SNIPPETS)};
  const hasTextSnippet = (value, snippets) => snippets.some((snippet) => value.includes(snippet));
  const sectionCount = document.querySelectorAll(
    'div.toc > div.toc__body > div.toc__body > section.toc__section, div.toc__body > div.toc__body > section.toc__section, div.toc__body > section.toc__section'
  ).length;
  const hasDownloadControls = downloadSelectors.some((selector) => Boolean(document.querySelector(selector)));
  const hasPdfEmbed = pdfEmbedSelectors.some((selector) => Boolean(document.querySelector(selector)));
  const challengeCandidates = Array.from(
    document.querySelectorAll('iframe[src], iframe[title], script[src], [data-sitekey], .g-recaptcha, #recaptcha'),
  );
  const hasRecaptchaIndicators = challengeCandidates.some((element) => {
    const fragments = [
      element.getAttribute?.('src'),
      element.getAttribute?.('title'),
      element.getAttribute?.('id'),
      element.getAttribute?.('class'),
      element.getAttribute?.('name'),
      element.getAttribute?.('data-sitekey'),
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .filter(Boolean);
    return fragments.some(
      (value) =>
        value.includes('recaptcha') ||
        value.includes('g-recaptcha') ||
        value.includes('grecaptcha') ||
        value.includes('google.com/recaptcha') ||
        value.includes('recaptcha.net/recaptcha'),
    );
  });
  const hasChallengeIndicators =
    normalizedText.includes('cloudflare') &&
    (
      normalizedText.includes('ray id') ||
      normalizedText.includes('security verification') ||
      normalizedText.includes('执行安全验证')
    );
  const hasResolvedChallengeIndicators =
    hasChallengeIndicators ||
    hasRecaptchaIndicators ||
    hasTextSnippet(normalizedText, challengeTextSnippets);
  const ensureMonitor = () => {
    const existingMonitor = window[monitorKey];
    if (existingMonitor && typeof existingMonitor === 'object') {
      return existingMonitor;
    }

    const monitor = {
      lastMutationAtMs: Date.now(),
      observer: null,
    };
    const touchMonitor = () => {
      monitor.lastMutationAtMs = Date.now();
    };

    if (typeof MutationObserver === 'function' && document.documentElement) {
      monitor.observer = new MutationObserver(() => {
        touchMonitor();
      });
      monitor.observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    window.addEventListener('load', touchMonitor);
    document.addEventListener('readystatechange', touchMonitor);
    window.addEventListener(
      'beforeunload',
      () => {
        try {
          monitor.observer?.disconnect?.();
        } catch {}
        try {
          delete window[monitorKey];
        } catch {}
      },
      { once: true },
    );

    window[monitorKey] = monitor;
    return monitor;
  };
  const validationMonitor = ensureMonitor();
  const now = Date.now();
  const bodyTextSample = normalizedText.slice(0, 220);
  const hasStableReadyForListing =
    sectionCount > 0 &&
    !hasResolvedChallengeIndicators &&
    now - Number(validationMonitor.lastMutationAtMs ?? 0) >= settleMs;
  const hasStableReadyForPage =
    (hasDownloadControls || hasPdfEmbed) &&
    !hasResolvedChallengeIndicators &&
    now - Number(validationMonitor.lastMutationAtMs ?? 0) >= settleMs;
  return {
    currentUrl: location.href,
    title,
    documentReadyState: cleanText(document.readyState),
    visibilityState: cleanText(document.visibilityState),
    bodyTextSample,
    sectionCount,
    hasChallengeIndicators: hasResolvedChallengeIndicators,
    hasDownloadControls,
    hasPdfEmbed,
    hasRecaptchaIndicators,
    lastMutationAtMs: Number(validationMonitor.lastMutationAtMs ?? 0),
    hasStableReadyForListing,
    hasStableReadyForPage,
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
  navigationMode: 'preview-existing' | 'reuse-existing' | 'dom-ready' | 'load-finished' | 'boot-timeout';
  source: 'preview' | 'window';
};

type ScienceValidationWindowState = {
  currentUrl: string;
  title: string;
  documentReadyState: string;
  visibilityState: string;
  bodyTextSample: string;
  sectionCount: number;
  hasChallengeIndicators: boolean;
  hasDownloadControls: boolean;
  hasPdfEmbed: boolean;
  hasRecaptchaIndicators: boolean;
  lastMutationAtMs: number;
  hasStableReadyForListing: boolean;
  hasStableReadyForPage: boolean;
};

function logScienceValidation(stage: string, details: Record<string, unknown>) {
  if (!SCIENCE_VALIDATION_LOG_ENABLED) return;

  let encodedDetails = '';
  try {
    encodedDetails = JSON.stringify(details);
  } catch {
    encodedDetails = '{"error":"unserializable_log_details"}';
  }

  console.info(`[science-validation] ${stage} ${encodedDetails}`);
}

function summarizeScienceValidationHtml(html: string) {
  const normalized = cleanText(html).toLowerCase();
  return {
    hasCloudflare: normalized.includes('cloudflare'),
    hasChallengePlatform: normalized.includes('challenge-platform'),
    hasCfMitigated: normalized.includes('cf-mitigated'),
    hasDownloadPdfHref: normalized.includes('/doi/pdf/'),
    hasNavbarDownload: normalized.includes('navbar-download'),
    hasPdfEmbed:
      normalized.includes('application/pdf') ||
      normalized.includes('<embed') ||
      normalized.includes('<iframe'),
    textSample: normalized.slice(0, 220),
  };
}

function buildScienceValidationStateSignature(state: ScienceValidationWindowState) {
  return JSON.stringify({
    currentUrl: state.currentUrl,
    title: state.title,
    documentReadyState: state.documentReadyState,
    visibilityState: state.visibilityState,
    bodyTextSample: state.bodyTextSample,
    sectionCount: state.sectionCount,
    hasChallengeIndicators: state.hasChallengeIndicators,
    hasDownloadControls: state.hasDownloadControls,
    hasPdfEmbed: state.hasPdfEmbed,
    hasRecaptchaIndicators: state.hasRecaptchaIndicators,
    hasStableReadyForListing: state.hasStableReadyForListing,
    hasStableReadyForPage: state.hasStableReadyForPage,
  });
}

let scienceValidationWindow: BrowserWindow | null = null;
const scienceValidationPromiseByUrl = new Map<string, Promise<ScienceValidationResult>>();
const sciencePageValidationPromiseByUrl = new Map<string, Promise<ScienceValidationResult>>();

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

export function isScienceHostUrl(value: string) {
  return isSharedScienceHostUrl(value);
}

export function isScienceSeriesListingPageUrl(value: string) {
  return isScienceSeriesCurrentTocUrl(value);
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

function normalizeScienceNavigationComparableUrl(value: string) {
  const parsed = safeParseUrl(value);
  if (!parsed) return '';

  parsed.hash = '';
  parsed.search = '';
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

function matchesScienceNavigationComparableUrl(left: string, right: string) {
  const normalizedLeft = normalizeScienceNavigationComparableUrl(left);
  const normalizedRight = normalizeScienceNavigationComparableUrl(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function extractTitleFromHtml(html: string) {
  const matched = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(matched?.[1] ?? '');
}

function hasScienceSnippetMatch(value: string, snippets: readonly string[]) {
  return snippets.some((snippet) => value.includes(snippet));
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

  return (
    hasScienceSnippetMatch(normalized, SCIENCE_CHALLENGE_TEXT_SNIPPETS) ||
    hasScienceSnippetMatch(normalized, SCIENCE_CHALLENGE_HTML_SNIPPETS)
  );
}

function isScienceValidationReadyState(
  state: ScienceValidationWindowState,
  requireListingContent: boolean,
) {
  if (requireListingContent) {
    return state.sectionCount > 0;
  }

  return state.hasDownloadControls || state.hasPdfEmbed;
}

function isScienceValidationStableReadyState(
  state: ScienceValidationWindowState,
  requireListingContent: boolean,
) {
  if (requireListingContent) {
    return state.hasStableReadyForListing;
  }

  return state.hasStableReadyForPage;
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

function applyScienceValidationUserAgent(window: BrowserWindow) {
  try {
    window.webContents.setUserAgent?.(SCIENCE_VALIDATION_USER_AGENT);
  } catch {
    // Ignore user-agent override failures and continue with the default agent.
  }
}

function createScienceValidationWindow() {
  if (scienceValidationWindow && !scienceValidationWindow.isDestroyed()) {
    return scienceValidationWindow;
  }

  scienceValidationWindow = new BrowserWindow({
    modal: false,
    show: false,
    skipTaskbar: false,
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
      backgroundThrottling: false,
    },
  });

  applyWindowChrome(scienceValidationWindow);
  registerAuxiliaryWindow(scienceValidationWindow);
  applyScienceValidationUserAgent(scienceValidationWindow);
  scienceValidationWindow.webContents.setWindowOpenHandler?.(() => ({ action: 'deny' }));
  scienceValidationWindow.on('closed', () => {
    scienceValidationWindow = null;
  });

  return scienceValidationWindow;
}

function revealScienceValidationWindow(window: BrowserWindow) {
  if (window.isDestroyed()) return;
  if (!window.isVisible()) {
    window.show();
  }
  window.focus();
}

async function executeScienceValidationScript(window: BrowserWindow, script: string) {
  const frame = window.webContents.mainFrame;
  if (!frame || frame.isDestroyed()) {
    return null;
  }

  return await frame.executeJavaScript(script, true);
}

function buildScienceDownloadTriggerScript(downloadUrl: string) {
  const serializedDownloadUrl = JSON.stringify(downloadUrl);
  return `(() => {
    const resolvedUrl = new URL(${serializedDownloadUrl}, location.href).toString();
    const normalizeComparableUrl = (value) => {
      try {
        const parsed = new URL(String(value ?? ''), location.href);
        parsed.hash = '';
        return parsed.toString();
      } catch {
        return '';
      }
    };
    const expectedUrl = normalizeComparableUrl(resolvedUrl);
    const preferredSelectors = ${JSON.stringify(SCIENCE_DOWNLOAD_CONTROL_SELECTORS)};
    const preferredAnchors = preferredSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)),
    );
    const matchedAnchor =
      preferredAnchors.find((candidate) => normalizeComparableUrl(candidate.href) === expectedUrl) ||
      preferredAnchors[0] ||
      null;
    if (matchedAnchor) {
      matchedAnchor.scrollIntoView?.({ block: 'center', inline: 'center' });
      matchedAnchor.click();
      return matchedAnchor.href;
    }

    const root = document.body || document.documentElement;
    if (!root) {
      throw new Error('Science download page is not ready.');
    }

    const anchor = document.createElement('a');
    anchor.href = resolvedUrl;
    anchor.target = '_self';
    anchor.rel = 'noopener';
    anchor.style.position = 'fixed';
    anchor.style.left = '-9999px';
    anchor.style.top = '-9999px';
    anchor.style.width = '1px';
    anchor.style.height = '1px';
    anchor.style.opacity = '0';
    root.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      anchor.remove();
    }, 1000);

    return anchor.href;
  })()`;
}

export async function triggerSciencePdfDownloadInValidationWindow(
  window: BrowserWindow,
  downloadUrl: string,
) {
  return await executeScienceValidationScript(
    window,
    buildScienceDownloadTriggerScript(downloadUrl),
  );
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
      documentReadyState: cleanText(current.documentReadyState),
      visibilityState: cleanText(current.visibilityState),
      bodyTextSample: cleanText(current.bodyTextSample),
      sectionCount: Number(current.sectionCount) || 0,
      hasChallengeIndicators: Boolean(current.hasChallengeIndicators),
      hasDownloadControls: Boolean(current.hasDownloadControls),
      hasPdfEmbed: Boolean(current.hasPdfEmbed),
      hasRecaptchaIndicators: Boolean(current.hasRecaptchaIndicators),
      lastMutationAtMs: Number(current.lastMutationAtMs) || 0,
      hasStableReadyForListing: Boolean(current.hasStableReadyForListing),
      hasStableReadyForPage: Boolean(current.hasStableReadyForPage),
    } satisfies ScienceValidationWindowState;
  } catch {
    return null;
  }
}

async function readScienceValidationHtml(window: BrowserWindow) {
  try {
    const resolvedHtml = await executeScienceValidationScript(window, SCIENCE_VALIDATION_HTML_SCRIPT);
    return typeof resolvedHtml === 'string' ? resolvedHtml : '';
  } catch {
    return '';
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

    applyScienceValidationUserAgent(window);
    void window.webContents.loadURL(pageUrl, {
      userAgent: SCIENCE_VALIDATION_USER_AGENT,
      extraHeaders:
        `accept: ${SCIENCE_VALIDATION_ACCEPT}\n` +
        `accept-language: ${SCIENCE_VALIDATION_ACCEPT_LANGUAGE}\n`,
    }).then(
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

        const elapsed = Date.now() - startedAt;
        if (state.hasChallengeIndicators && elapsed >= SCIENCE_VALIDATION_REVEAL_DELAY_MS) {
          revealScienceValidationWindow(window);
        }

        if (!isScienceValidationReadyState(state, true)) {
          continue;
        }
        if (!isScienceValidationStableReadyState(state, true)) {
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

export async function ensureSciencePageValidationWindow(pageUrl: string): Promise<ScienceValidationResult> {
  if (!isScienceHostUrl(pageUrl)) {
    throw appError('HTTP_REQUEST_FAILED', {
      status: 'SCIENCE_VALIDATION_UNSUPPORTED',
      statusText: 'Science validation window is only available for Science pages.',
      url: pageUrl,
    });
  }

  if (isScienceSeriesListingPageUrl(pageUrl)) {
    return ensureScienceValidationWindow(pageUrl);
  }

  const existing = sciencePageValidationPromiseByUrl.get(pageUrl);
  if (existing) {
    return existing;
  }

  const task = (async () => {
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

        const html = await readScienceValidationHtml(window);
        const hasChallenge =
          !html.trim() || isScienceChallengeHtml(html) || state.hasChallengeIndicators;
        if (hasChallenge) {
          continue;
        }
        if (!isScienceValidationReadyState(state, false)) {
          continue;
        }
        if (!isScienceValidationStableReadyState(state, false)) {
          continue;
        }

        const result: ScienceValidationResult = {
          finalUrl: state.currentUrl || pageUrl,
          html,
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

      throw appError('HTTP_REQUEST_FAILED', {
        status: 'SCIENCE_VALIDATION_REQUIRED',
        statusText: 'Complete the Science verification window to continue downloading.',
        url: pageUrl,
      });
    } finally {
      if (!window.isDestroyed()) {
        window.removeListener('closed', handleClosed);
      }
    }
  })();

  sciencePageValidationPromiseByUrl.set(pageUrl, task);
  try {
    return await task;
  } finally {
    sciencePageValidationPromiseByUrl.delete(pageUrl);
  }
}

export async function withValidatedSciencePageWindow<T>(
  pageUrl: string,
  handler: (window: BrowserWindow, validation: ScienceValidationResult) => Promise<T>,
): Promise<T> {
  if (!isScienceHostUrl(pageUrl)) {
    throw appError('HTTP_REQUEST_FAILED', {
      status: 'SCIENCE_VALIDATION_UNSUPPORTED',
      statusText: 'Science validation window is only available for Science pages.',
      url: pageUrl,
    });
  }

  const requireListingContent = isScienceSeriesListingPageUrl(pageUrl);
  const pendingStatusText = requireListingContent
    ? 'Complete the Science verification window to continue fetching.'
    : 'Complete the Science verification window to continue downloading.';
  const window = createScienceValidationWindow();
  let windowClosed = false;
  let challengeRevealed = false;
  let keepWindowOpen = false;
  let lastLoggedStateSignature = '';
  let lastProgressLogAt = 0;
  const handleClosed = () => {
    windowClosed = true;
  };
  window.once('closed', handleClosed);

  try {
    const startedAt = Date.now();
    logScienceValidation('start', {
      pageUrl,
      requireListingContent,
      userAgent:
        typeof window.webContents.getUserAgent === 'function'
          ? cleanText(window.webContents.getUserAgent())
          : SCIENCE_VALIDATION_USER_AGENT,
    });
    if (!window.isDestroyed() && !requireListingContent) {
      revealScienceValidationWindow(window);
    }
    const currentWindowUrl =
      typeof window.webContents.getURL === 'function' ? cleanText(window.webContents.getURL()) : '';
    const navigationMode =
      currentWindowUrl && matchesScienceNavigationComparableUrl(currentWindowUrl, pageUrl)
        ? 'reuse-existing'
        : await waitForScienceValidationBoot(window, pageUrl);
    if (navigationMode === 'reuse-existing') {
      logScienceValidation('reuse_existing_window', {
        pageUrl,
        currentUrl: currentWindowUrl,
      });
    }

    while (Date.now() - startedAt < SCIENCE_VALIDATION_TIMEOUT_MS) {
      if (windowClosed || window.isDestroyed() || window.webContents.isDestroyed()) {
        logScienceValidation('closed_before_ready', {
          pageUrl,
          elapsedMs: Date.now() - startedAt,
        });
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

      const html = await readScienceValidationHtml(window);
      const elapsed = Date.now() - startedAt;
      const now = Date.now();
      const stateSignature = buildScienceValidationStateSignature(state);
      if (
        stateSignature !== lastLoggedStateSignature ||
        now - lastProgressLogAt >= SCIENCE_VALIDATION_PROGRESS_LOG_INTERVAL_MS
      ) {
        lastLoggedStateSignature = stateSignature;
        lastProgressLogAt = now;
        logScienceValidation('poll_state', {
          pageUrl,
          elapsedMs: elapsed,
          currentUrl: state.currentUrl || pageUrl,
          title: state.title,
          documentReadyState: state.documentReadyState,
          visibilityState: state.visibilityState,
          sectionCount: state.sectionCount,
          hasChallengeIndicators: state.hasChallengeIndicators,
          hasDownloadControls: state.hasDownloadControls,
          hasPdfEmbed: state.hasPdfEmbed,
          hasRecaptchaIndicators: state.hasRecaptchaIndicators,
          hasStableReadyForListing: state.hasStableReadyForListing,
          hasStableReadyForPage: state.hasStableReadyForPage,
          idleForMs: state.lastMutationAtMs > 0 ? now - state.lastMutationAtMs : null,
          bodyTextSample: state.bodyTextSample,
          windowVisible: window.isVisible(),
          windowFocused: window.isFocused(),
        });
      }
      const hasChallenge = !html.trim() || isScienceChallengeHtml(html) || state.hasChallengeIndicators;
      if (hasChallenge) {
        if (elapsed >= SCIENCE_VALIDATION_REVEAL_DELAY_MS) {
          if (!challengeRevealed) {
            challengeRevealed = true;
            logScienceValidation('challenge_visible', {
              pageUrl,
              currentUrl: state.currentUrl || pageUrl,
              title: state.title,
              elapsedMs: elapsed,
              hasRecaptchaIndicators: state.hasRecaptchaIndicators,
            });
          }
          revealScienceValidationWindow(window);
        }
        continue;
      }

      if (!isScienceValidationReadyState(state, requireListingContent)) {
        continue;
      }

      if (!isScienceValidationStableReadyState(state, requireListingContent)) {
        continue;
      }

      const validation: ScienceValidationResult = {
        finalUrl: state.currentUrl || pageUrl,
        html,
        sectionCount: state.sectionCount,
        title: state.title,
        readyMs: Date.now() - startedAt,
        navigationMode,
        source: 'window',
      };

      logScienceValidation('ready', {
        pageUrl,
        finalUrl: validation.finalUrl,
        title: validation.title,
        sectionCount: validation.sectionCount,
        hasDownloadControls: state.hasDownloadControls,
        hasPdfEmbed: state.hasPdfEmbed,
        readyMs: validation.readyMs,
        navigationMode: validation.navigationMode,
      });
      return await handler(window, validation);
    }

    logScienceValidation('timeout', {
      pageUrl,
      timeoutMs: SCIENCE_VALIDATION_TIMEOUT_MS,
      requireListingContent,
      lastKnownState: await inspectScienceValidationWindow(window),
      htmlSummary: summarizeScienceValidationHtml(await readScienceValidationHtml(window)),
    });
    keepWindowOpen = true;
    logScienceValidation('manual_completion_pending', {
      pageUrl,
      currentUrl: typeof window.webContents.getURL === 'function' ? cleanText(window.webContents.getURL()) : '',
    });
    throw appError('HTTP_REQUEST_FAILED', {
      status: 'SCIENCE_VALIDATION_REQUIRED',
      statusText: `${pendingStatusText} Keep the Science window open, finish verification, then retry.`,
      url: pageUrl,
    });
  } finally {
    if (!window.isDestroyed()) {
      window.removeListener('closed', handleClosed);
      if (!keepWindowOpen) {
        window.webContents.stop();
        window.close();
      }
    }
  }
}


