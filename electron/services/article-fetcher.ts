import { load } from 'cheerio';

import type {
  Article,
  DateRange,
  FetchLatestArticlesPayload,
  HomepageFetchSource,
  HomepageSourceStatus,
  StorageService,
} from '../types.js';
import { buildArticleFromHtml, hasStrongArticleSignals, isProbablyArticle, scoreCandidate } from './article-parser.js';
import { hasArticlePathSignal, isLikelyStaticResourcePath } from './article-url-rules.js';
import { isWithinDateRange, parseDateRange } from '../utils/date.js';
import { parseDateHintFromText } from '../utils/date-hint.js';
import { cleanText } from '../utils/text.js';
import { normalizeUrl } from '../utils/url.js';
import { READER_SHARED_WEB_PARTITION } from './browser-partitions.js';
import { createFetchTraceId, elapsedMs, shortenForLog, timingLog } from './fetch-timing.js';
import {
  ensureScienceValidationWindow,
  getScienceChallengeSignal,
  isScienceChallengeHtml,
  shouldUseScienceValidationRenderFallback,
} from './science-validation.js';
import {
  findHomepageCandidateExtractor,
  type HomepageCandidateExtraction,
  type HomepageCandidateExtractor,
  type HomepageCandidatePrefetchedArticle,
  type HomepagePaginationStopEvaluation,
  type HomepageCandidateSeed,
} from './source-extractors/index.js';
import { appError, isAppError } from '../utils/app-error.js';

const SYSTEM_BATCH_LIMIT_MAX = 100;
const USER_BATCH_LIMIT_MIN = 1;
const DEFAULT_USER_BATCH_LIMIT = 20;
const DEFAULT_FETCH_TIMEOUT_MS = 12000;
const HOMEPAGE_FETCH_TIMEOUT_MS = 12000;
const ARTICLE_FETCH_TIMEOUT_MS = 3000;
const ARTICLE_FETCH_RETRY_TIMEOUT_MS = 4200;
const ARTICLE_FETCH_RETRY_MAX_ATTEMPTS = 2;
const ARTICLE_FETCH_RETRY_BACKOFF_MS = 20;
const CANDIDATE_FETCH_CONCURRENCY = 12;
const EXTRACTOR_CANDIDATE_FETCH_CONCURRENCY = 8;
const SOURCE_FETCH_CONCURRENCY = 4;
const MIN_CANDIDATE_ATTEMPTS = 12;
const ATTEMPTS_PER_LIMIT = 4;
const EXTRACTOR_ATTEMPTS_MULTIPLIER = 1.25;
const EXTRACTOR_ATTEMPTS_MIN_BUFFER = 6;
const EXTRACTOR_FAST_ATTEMPTS_MULTIPLIER = 1.1;
const EXTRACTOR_FAST_ATTEMPTS_MIN_BUFFER = 4;
const DATE_HINT_HIGH_COVERAGE_THRESHOLD = 0.65;
const RETRY_PRIORITY_MIN_ORDER = 6;
const RETRY_PRIORITY_LIMIT_MULTIPLIER = 1.2;
const CANDIDATE_DATE_HINT_PARENT_DEPTH = 4;
const CANDIDATE_DATE_HINT_TEXT_MAX_LENGTH = 320;
const MIN_SORTED_DATE_HINTS_FOR_EARLY_STOP = 3;
const MIN_CONSECUTIVE_OLDER_DATE_HINTS_FOR_EARLY_STOP = 4;
const IN_RANGE_DATE_HINT_SCORE_BOOST = 40;
const HTML_FETCH_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HTML_FETCH_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
const BROWSER_FETCH_PARTITION = READER_SHARED_WEB_PARTITION;
const PREFER_BROWSER_FETCH = process.env.READER_FETCH_TRANSPORT !== 'node';
const ENABLE_BROWSER_RENDER_FALLBACK = process.env.READER_FETCH_RENDER_FALLBACK !== '0';
const ARTICLE_RENDER_TIMEOUT_MS = 4500;
const HOMEPAGE_RENDER_TIMEOUT_MS = 4500;
const BROWSER_RENDER_DOM_SETTLE_MS = 180;
const RENDER_FALLBACK_MAX_ORDER = 8;
const EXTRACTOR_RENDER_FALLBACK_MAX_ORDER = 10;
const RENDER_FALLBACK_HTTP_STATUS = new Set(['401', '403', '408', '409', '423', '425', '429', '451']);
const MAX_PAGINATED_HOMEPAGE_PAGES = 20;

let browserHtmlFetchPromise: Promise<BrowserHtmlFetch | null> | null = null;
let browserHtmlFetchUnsupported = false;
let browserHtmlRendererPromise: Promise<BrowserHtmlRenderer | null> | null = null;
let browserHtmlRendererUnsupported = false;
let browserHtmlRendererQueue: Promise<void> = Promise.resolve();

type FetchHtmlOptions = {
  timeoutMs?: number;
  traceId?: string;
  stage?: string;
  signal?: AbortSignal;
};

type HtmlFetchTransport = 'node' | 'browser';

type BrowserHtmlFetch = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  partition: string;
};

type BrowserDidFailLoadListener = (
  event: unknown,
  errorCode: number,
  errorDescription: string,
  validatedURL: string,
  isMainFrame?: boolean,
) => void;

type BrowserRendererWebContents = {
  isDestroyed: () => boolean;
  loadURL: (url: string, options?: { userAgent?: string; extraHeaders?: string }) => Promise<unknown>;
  executeJavaScript: (code: string, userGesture?: boolean) => Promise<unknown>;
  stop: () => void;
  setWindowOpenHandler?: (handler: () => { action: 'deny' }) => void;
  getURL?: () => string;
  on(event: 'did-fail-load', listener: BrowserDidFailLoadListener): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  off?(event: 'did-fail-load', listener: BrowserDidFailLoadListener): void;
  off?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: 'did-fail-load', listener: BrowserDidFailLoadListener): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

type BrowserHtmlRenderer = {
  window: {
    isDestroyed: () => boolean;
    destroy: () => void;
    webContents: BrowserRendererWebContents;
  };
  partition: string;
};

type HomepageSource = {
  sourceId: string;
  homepageUrl: string;
  journalTitle: string;
};

export type HomepagePreviewSnapshot = {
  html: string;
  previewUrl: string;
  captureMs: number;
  isLoading: boolean;
};

export type HomepagePreviewExtractionSnapshot = {
  extraction: HomepageCandidateExtraction;
  extractorId: string;
  previewUrl: string;
  captureMs: number;
  isLoading: boolean;
  nextPageUrl: string | null;
};

export type HomepageSourceMode = 'network' | 'prefer-preview' | 'compare';

export type FetchLatestArticlesOptions = {
  homepagePreviewExtractions?: ReadonlyMap<string, HomepagePreviewExtractionSnapshot>;
  homepagePreviewSnapshots?: ReadonlyMap<string, HomepagePreviewSnapshot>;
  homepageSourceMode?: HomepageSourceMode;
  onHomepageSourceStatus?: (status: HomepageSourceStatus) => void;
};

type HomepageNetworkAttemptResult =
  | {
      ok: true;
      html: string;
    }
  | {
      ok: false;
      error: unknown;
    };

type HomepageHtmlResult = {
  html: string;
  source: 'network' | 'preview';
  usedRenderFallback?: boolean;
};

type CheerioAcceptedNode = Parameters<ReturnType<typeof load>>[0];

type CandidateDescriptor = {
  url: string;
  score: number;
  order: number;
  dateHint: string | null;
  articleType: string | null;
  prefetchedArticle: HomepageCandidatePrefetchedArticle | null;
};

type CandidateCollectionResult = {
  candidates: CandidateDescriptor[];
  linkCount: number;
  datedCandidateCount: number;
  inRangeDateHintCount: number;
  dateFilteredCount: number;
  stoppedByDateHint: boolean;
  sortedDateHintsObserved: boolean;
  consecutiveOlderDateHints: number;
  stopDateHint: string | null;
  extractorId: string | null;
  extractorDiagnostics: Record<string, unknown> | null;
  paginationStopEvaluation: HomepagePaginationStopEvaluation | null;
};

type HomepagePageFetchResult = {
  homepageSource: HomepageFetchSource;
  articles: Article[];
  candidateAttempted: number;
  candidateResolved: number;
  candidateAccepted: number;
  usedHomepageOnly: boolean;
  nextPageUrl: string | null;
  stoppedByDateHint: boolean;
};

function describeHomepageSourceDetail(homepageSource: HomepageFetchSource) {
  switch (homepageSource) {
    case 'preview-extract':
      return 'live-preview-dom';
    case 'preview':
      return 'preview-dom-snapshot';
    default:
      return 'network-fetch';
  }
}

function normalizeSourceId(input: unknown, homepageUrl: string, index: number) {
  const cleaned = cleanText(input);
  if (cleaned) return cleaned;

  const hostnameSeed = cleanText(homepageUrl)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);

  if (hostnameSeed) {
    return `source-${hostnameSeed}-${index + 1}`;
  }

  return `source-${index + 1}`;
}

function safeNormalizeUrl(value: string) {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

function isNatureListingHomepagePath(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPathname === '/latest-news') return true;
  if (normalizedPathname === '/opinion') return true;
  return /^\/[^/]+\/(?:research-articles|reviews-and-analysis)$/i.test(normalizedPathname);
}

function isLikelyArticleDetailHomepagePath(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  return /^(?:\/(?:article|articles|paper|papers|doi|abs|content)\/[^/]+)$/i.test(normalizedPathname);
}

function normalizeNatureListingHomepageUrl(homepageUrl: string) {
  try {
    const homepage = new URL(homepageUrl);
    if (homepage.host !== 'www.nature.com') {
      return homepageUrl;
    }

    if (!isNatureListingHomepagePath(homepage.pathname)) {
      return homepageUrl;
    }

    homepage.searchParams.delete('page');
    homepage.hash = '';
    return homepage.toString();
  } catch {
    return homepageUrl;
  }
}

function toTimeoutMs(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeBatchLimitValue(value: unknown, fallback: number = DEFAULT_USER_BATCH_LIMIT) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    return Math.min(SYSTEM_BATCH_LIMIT_MAX, Math.max(USER_BATCH_LIMIT_MIN, fallback));
  }
  return Math.min(SYSTEM_BATCH_LIMIT_MAX, Math.max(USER_BATCH_LIMIT_MIN, parsed));
}

async function resolveConfiguredUserBatchLimit(storage: StorageService) {
  try {
    const settings = await storage.loadSettings();
    return normalizeBatchLimitValue(settings?.defaultBatchLimit, DEFAULT_USER_BATCH_LIMIT);
  } catch {
    return DEFAULT_USER_BATCH_LIMIT;
  }
}

function isAbortError(error: unknown) {
  return Boolean(error && typeof error === 'object' && (error as { name?: string }).name === 'AbortError');
}

function isTimeoutRequestError(error: unknown) {
  if (!isAppError(error)) return false;
  if (error.code !== 'HTTP_REQUEST_FAILED') return false;
  return cleanText((error.details as { status?: unknown } | undefined)?.status) === 'TIMEOUT';
}

function isAbortedRequestError(error: unknown) {
  if (!isAppError(error)) return false;
  if (error.code !== 'HTTP_REQUEST_FAILED') return false;
  return cleanText((error.details as { status?: unknown } | undefined)?.status) === 'ABORTED';
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function hasUsablePreviewHomepageHtml(html: string) {
  const trimmed = typeof html === 'string' ? html.trim() : '';
  if (!trimmed) return false;
  return /<(?:html|body|a)\b/i.test(trimmed);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHtmlFetchHeaders() {
  return {
    'user-agent': HTML_FETCH_USER_AGENT,
    accept: HTML_FETCH_ACCEPT,
  };
}

function collectHttpErrorResponseHeaders(response: Response) {
  const responseHeaders = {
    server: cleanText(response.headers.get('server')),
    cfMitigated: cleanText(response.headers.get('cf-mitigated')),
    cfRay: cleanText(response.headers.get('cf-ray')),
  };

  return Object.values(responseHeaders).some((value) => Boolean(value)) ? responseHeaders : null;
}

function logBrowserLoadFailure({
  traceId,
  stage,
  partition,
  requestedUrl,
  currentUrl,
  failedUrl,
  errorCode,
  errorDescription,
  isMainFrame,
}: {
  traceId: string;
  stage: string;
  partition: string;
  requestedUrl: string;
  currentUrl: string;
  failedUrl: string;
  errorCode: number;
  errorDescription: string;
  isMainFrame: boolean;
}) {
  if (errorCode === -3 || /^ERR_ABORTED$/i.test(errorDescription)) {
    return;
  }

  timingLog(traceId, `${stage}:did_fail_load`, {
    partition,
    requestedUrl: shortenForLog(requestedUrl),
    currentUrl: shortenForLog(currentUrl),
    failedUrl: shortenForLog(failedUrl),
    errorCode,
    errorDescription,
    isMainFrame,
  });
}

async function resolveBrowserHtmlFetch() {
  if (!PREFER_BROWSER_FETCH || browserHtmlFetchUnsupported) {
    return null;
  }

  if (!browserHtmlFetchPromise) {
    browserHtmlFetchPromise = (async () => {
      try {
        const electronModule = (await import('electron')) as {
          app?: { isReady?: () => boolean };
          session?: {
            fromPartition?: (
              partition: string,
            ) => {
              fetch?: (url: string, init: RequestInit) => Promise<Response>;
            };
          };
        };
        const electronApp = electronModule.app;
        const electronSession = electronModule.session;
        if (!electronApp || typeof electronApp.isReady !== 'function') {
          browserHtmlFetchUnsupported = true;
          return null;
        }
        if (!electronApp.isReady()) {
          return null;
        }
        if (!electronSession || typeof electronSession.fromPartition !== 'function') {
          browserHtmlFetchUnsupported = true;
          return null;
        }

        const chromiumSession = electronSession.fromPartition(BROWSER_FETCH_PARTITION);
        if (!chromiumSession || typeof chromiumSession.fetch !== 'function') {
          browserHtmlFetchUnsupported = true;
          return null;
        }

        return {
          fetch: chromiumSession.fetch.bind(chromiumSession),
          partition: BROWSER_FETCH_PARTITION,
        } satisfies BrowserHtmlFetch;
      } catch {
        browserHtmlFetchUnsupported = true;
        return null;
      }
    })();
  }

  const resolved = await browserHtmlFetchPromise;
  if (!resolved && !browserHtmlFetchUnsupported) {
    browserHtmlFetchPromise = null;
  }

  return resolved;
}

async function requestHtmlWithPreferredTransport({
  traceId,
  stage,
  url,
  signal,
}: {
  traceId: string;
  stage: string;
  url: string;
  signal: AbortSignal;
}): Promise<{ response: Response; transport: HtmlFetchTransport }> {
  const browserHtmlFetch = await resolveBrowserHtmlFetch();
  if (browserHtmlFetch) {
    try {
      const response = await browserHtmlFetch.fetch(url, {
        signal,
        headers: buildHtmlFetchHeaders(),
      });
      return {
        response,
        transport: 'browser',
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      timingLog(traceId, `${stage}:browser_fallback`, {
        url: shortenForLog(url),
        partition: browserHtmlFetch.partition,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const response = await fetch(url, {
    signal,
    headers: buildHtmlFetchHeaders(),
  });
  return {
    response,
    transport: 'node',
  };
}

async function resolveBrowserHtmlRenderer() {
  if (!ENABLE_BROWSER_RENDER_FALLBACK || browserHtmlRendererUnsupported) {
    return null;
  }

  if (!browserHtmlRendererPromise) {
    browserHtmlRendererPromise = (async () => {
      try {
        const electronModule = (await import('electron')) as {
          app?: { isReady?: () => boolean };
          BrowserWindow?: new (options?: Record<string, unknown>) => BrowserHtmlRenderer['window'];
        };
        const electronApp = electronModule.app;
        const ElectronBrowserWindow = electronModule.BrowserWindow;
        if (!electronApp || typeof electronApp.isReady !== 'function') {
          browserHtmlRendererUnsupported = true;
          return null;
        }
        if (!electronApp.isReady()) {
          return null;
        }
        if (!ElectronBrowserWindow) {
          browserHtmlRendererUnsupported = true;
          return null;
        }

        const window = new ElectronBrowserWindow({
          show: false,
          width: 1280,
          height: 900,
          autoHideMenuBar: true,
          webPreferences: {
            partition: BROWSER_FETCH_PARTITION,
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
          },
        });
        window.webContents.setWindowOpenHandler?.(() => ({ action: 'deny' }));

        return {
          window,
          partition: BROWSER_FETCH_PARTITION,
        } satisfies BrowserHtmlRenderer;
      } catch {
        browserHtmlRendererUnsupported = true;
        return null;
      }
    })();
  }

  const resolved = await browserHtmlRendererPromise;
  if (!resolved && !browserHtmlRendererUnsupported) {
    browserHtmlRendererPromise = null;
    return null;
  }
  if (resolved?.window.isDestroyed()) {
    browserHtmlRendererPromise = null;
    return resolveBrowserHtmlRenderer();
  }

  return resolved;
}

async function runBrowserHtmlRenderTask<T>(task: () => Promise<T>) {
  const previousTask = browserHtmlRendererQueue.catch(() => undefined);
  const currentTask = previousTask.then(task);
  browserHtmlRendererQueue = currentTask.then(
    () => undefined,
    () => undefined,
  );
  return currentTask;
}

function toErrorStatusCode(error: unknown) {
  if (!isAppError(error)) return '';
  return cleanText((error.details as { status?: unknown } | undefined)?.status);
}

function canAttemptRenderedFallback({
  candidateOrder,
  extractorId,
}: {
  candidateOrder: number;
  extractorId: string | null;
}) {
  if (!ENABLE_BROWSER_RENDER_FALLBACK) return false;
  if (extractorId) return candidateOrder <= EXTRACTOR_RENDER_FALLBACK_MAX_ORDER;
  return candidateOrder <= RENDER_FALLBACK_MAX_ORDER;
}

function shouldRenderCandidateAfterError({
  error,
  candidateOrder,
  extractorId,
}: {
  error: unknown;
  candidateOrder: number;
  extractorId: string | null;
}) {
  if (!canAttemptRenderedFallback({ candidateOrder, extractorId })) {
    return false;
  }

  const status = toErrorStatusCode(error);
  return status === 'TIMEOUT' || status === 'NETWORK_ERROR' || RENDER_FALLBACK_HTTP_STATUS.has(status);
}

function shouldRenderHomepageAfterError(error: unknown) {
  if (!ENABLE_BROWSER_RENDER_FALLBACK) return false;
  const status = toErrorStatusCode(error);
  return status === 'TIMEOUT' || status === 'NETWORK_ERROR' || RENDER_FALLBACK_HTTP_STATUS.has(status);
}

function shouldConfirmRenderedArticle({
  article,
  candidateUrl,
}: {
  article: Article;
  candidateUrl: string;
}) {
  if (!isProbablyArticle(candidateUrl, article)) {
    return true;
  }

  const pathname = new URL(candidateUrl).pathname.toLowerCase();
  if (!hasArticlePathSignal(pathname)) {
    return false;
  }

  const title = cleanText(article.title);
  const weakMetadata = !article.doi && !article.publishedAt && !article.abstractText;
  const genericTitle = title.length < 12 || /^(?:shell|loading|article|home)$/i.test(title);
  return weakMetadata && genericTitle;
}

function applyCandidateArticleType(article: Article, candidateArticleType: string | null) {
  const normalizedCandidateType = cleanText(candidateArticleType);
  if (!normalizedCandidateType) return;

  const normalizedArticleType = cleanText(article.articleType);
  const genericArticleType = normalizedArticleType
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const canPromoteCandidateType =
    !normalizedArticleType ||
    /^(?:article|web ?page|web ?site|site|page|thing|creative ?work|work)$/i.test(genericArticleType);

  if (canPromoteCandidateType) {
    article.articleType = normalizedCandidateType;
  }
}

function normalizePrefetchedCandidateArticle(
  prefetchedArticle: HomepageCandidatePrefetchedArticle | null | undefined,
  fallbackPublishedAt: string | null,
): HomepageCandidatePrefetchedArticle | null {
  const title = cleanText(prefetchedArticle?.title);
  if (!title) return null;

  const doi = cleanText(prefetchedArticle?.doi);
  const authors =
    Array.isArray(prefetchedArticle?.authors) && prefetchedArticle.authors.length > 0
      ? [...new Set(prefetchedArticle.authors.map((author) => cleanText(author)).filter(Boolean))]
      : [];
  const abstractText = cleanText(prefetchedArticle?.abstractText);
  const publishedAt = cleanText(prefetchedArticle?.publishedAt) || cleanText(fallbackPublishedAt);

  return {
    title,
    doi: doi || null,
    authors,
    abstractText: abstractText || null,
    publishedAt: publishedAt || null,
  };
}

function buildArticleFromPrefetchedCandidate(candidate: CandidateDescriptor): Article | null {
  const prefetchedArticle = normalizePrefetchedCandidateArticle(
    candidate.prefetchedArticle,
    candidate.dateHint,
  );
  if (!prefetchedArticle) return null;

  return {
    title: prefetchedArticle.title,
    articleType: cleanText(candidate.articleType) || null,
    doi: prefetchedArticle.doi ?? null,
    authors: prefetchedArticle.authors ?? [],
    abstractText: prefetchedArticle.abstractText ?? null,
    publishedAt: prefetchedArticle.publishedAt ?? null,
    sourceUrl: candidate.url,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchRenderedHtml(url: string, options: FetchHtmlOptions = {}) {
  const traceId = cleanText(options.traceId) || 'fetch';
  const stage = cleanText(options.stage) || 'html_render';
  const timeoutMs = toTimeoutMs(options.timeoutMs, ARTICLE_RENDER_TIMEOUT_MS);
  const renderer = await resolveBrowserHtmlRenderer();
  if (!renderer) {
    throw appError('HTTP_REQUEST_FAILED', {
      status: 'RENDER_UNAVAILABLE',
      statusText: 'Browser renderer unavailable',
      url,
    });
  }

  return runBrowserHtmlRenderTask(async () => {
    const requestStartedAt = Date.now();
    const { window, partition } = renderer;
    if (window.isDestroyed() || window.webContents.isDestroyed()) {
      browserHtmlRendererPromise = null;
      throw appError('HTTP_REQUEST_FAILED', {
        status: 'RENDER_UNAVAILABLE',
        statusText: 'Browser renderer destroyed',
        url,
      });
    }

    let abortedByExternalSignal = false;
    let timedOut = false;
    const externalSignal = options.signal;
    const stopLoading = () => {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        try {
          window.webContents.stop();
        } catch {
          // Ignore stop failures while tearing down a hidden renderer window.
        }
      }
    };
    const abortFromExternalSignal = () => {
      abortedByExternalSignal = true;
      stopLoading();
    };

    if (externalSignal?.aborted) {
      abortFromExternalSignal();
    } else if (externalSignal) {
      externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
    }

    const timeoutId = setTimeout(() => {
      timedOut = true;
      stopLoading();
    }, timeoutMs);
    const didFailLoad = (
      _event: unknown,
      errorCode: number,
      errorDescription: string,
      validatedURL: string,
      isMainFrame = false,
    ) => {
      logBrowserLoadFailure({
        traceId,
        stage,
        partition,
        requestedUrl: url,
        currentUrl: window.webContents.getURL?.() ?? '',
        failedUrl: validatedURL,
        errorCode,
        errorDescription,
        isMainFrame,
      });
    };
    const detachDidFailLoad = () => {
      if (typeof window.webContents.off === 'function') {
        window.webContents.off('did-fail-load', didFailLoad);
        return;
      }
      if (typeof window.webContents.removeListener === 'function') {
        window.webContents.removeListener('did-fail-load', didFailLoad);
      }
    };
    window.webContents.on('did-fail-load', didFailLoad);

    try {
      await window.webContents.loadURL(url, {
        userAgent: HTML_FETCH_USER_AGENT,
        extraHeaders: `accept: ${HTML_FETCH_ACCEPT}\n`,
      });
      if (BROWSER_RENDER_DOM_SETTLE_MS > 0) {
        await sleep(BROWSER_RENDER_DOM_SETTLE_MS);
      }

      const html = await window.webContents.executeJavaScript(
        `(() => {
          try {
            return document.documentElement ? document.documentElement.outerHTML : '';
          } catch {
            return '';
          }
        })()`,
        true,
      );
      const normalizedHtml = typeof html === 'string' ? html : '';
      if (!normalizedHtml.trim()) {
        throw appError('HTTP_REQUEST_FAILED', {
          status: 'EMPTY_RENDERED_HTML',
          statusText: 'Rendered page returned empty HTML',
          url,
        });
      }

      timingLog(traceId, `${stage}:ok`, {
        ms: elapsedMs(requestStartedAt),
        timeoutMs,
        transport: 'browser-render',
        url: shortenForLog(url),
        finalUrl: shortenForLog(window.webContents.getURL?.() ?? url),
        size: normalizedHtml.length,
      });
      return normalizedHtml;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }

      if (abortedByExternalSignal) {
        timingLog(traceId, `${stage}:aborted`, {
          ms: elapsedMs(requestStartedAt),
          timeoutMs,
          transport: 'browser-render',
          url: shortenForLog(url),
        });
        throw appError('HTTP_REQUEST_FAILED', {
          status: 'ABORTED',
          statusText: 'Request aborted',
          url,
        });
      }

      if (timedOut) {
        timingLog(traceId, `${stage}:timeout`, {
          ms: elapsedMs(requestStartedAt),
          timeoutMs,
          transport: 'browser-render',
          url: shortenForLog(url),
        });
        throw appError('HTTP_REQUEST_FAILED', {
          status: 'TIMEOUT',
          statusText: `Rendered request timed out after ${timeoutMs}ms`,
          url,
        });
      }

      timingLog(traceId, `${stage}:network_error`, {
        ms: elapsedMs(requestStartedAt),
        timeoutMs,
        transport: 'browser-render',
        url: shortenForLog(url),
        message: error instanceof Error ? error.message : String(error),
      });
      throw appError('HTTP_REQUEST_FAILED', {
        status: 'NETWORK_ERROR',
        statusText: error instanceof Error ? error.message : String(error),
        url,
      });
    } finally {
      detachDidFailLoad();
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortFromExternalSignal);
      }
      clearTimeout(timeoutId);
    }
  });
}

function extractDateHintFromElement($: ReturnType<typeof load>, node: CheerioAcceptedNode) {
  const element = $(node);
  const directValues = [
    element.attr('datetime'),
    element.attr('content'),
    element.attr('aria-label'),
    element.attr('title'),
  ];
  for (const value of directValues) {
    const parsed = parseDateHintFromText(value);
    if (parsed) return parsed;
  }

  const nestedDateElement = element
    .find(
      'time[datetime], [datetime], [itemprop="datePublished"], meta[property="article:published_time"], meta[name="dc.date"], meta[name="prism.publicationDate"]',
    )
    .first();
  if (nestedDateElement.length > 0) {
    const nestedValues = [
      nestedDateElement.attr('datetime'),
      nestedDateElement.attr('content'),
      nestedDateElement.text(),
      nestedDateElement.attr('aria-label'),
      nestedDateElement.attr('title'),
    ];
    for (const value of nestedValues) {
      const parsed = parseDateHintFromText(value);
      if (parsed) return parsed;
    }
  }

  const text = cleanText(element.text());
  if (text && text.length <= CANDIDATE_DATE_HINT_TEXT_MAX_LENGTH) {
    return parseDateHintFromText(text);
  }

  return null;
}

function extractCandidateDateHint($: ReturnType<typeof load>, node: CheerioAcceptedNode) {
  let current = $(node);
  for (let depth = 0; depth <= CANDIDATE_DATE_HINT_PARENT_DEPTH && current.length > 0; depth += 1) {
    const currentNode = current.get(0);
    if (currentNode) {
      const parsed = extractDateHintFromElement($, currentNode);
      if (parsed) return parsed;
    }
    current = current.parent();
  }

  return null;
}

function buildGenericCandidateSeeds($: ReturnType<typeof load>) {
  return $('a[href]')
    .toArray()
    .map((node, order) => ({
      href: cleanText($(node).attr('href')),
      order,
      dateHint: extractCandidateDateHint($, node),
    }))
    .filter((candidate) => Boolean(candidate.href));
}

function collectCandidateDescriptorsFromSeeds(
  homepage: URL,
  homepageUrl: string,
  sameDomainOnly: boolean,
  dateRange: DateRange,
  seeds: HomepageCandidateSeed[],
): CandidateCollectionResult {
  const candidates: CandidateDescriptor[] = [];
  const seen = new Set<string>();
  let datedCandidateCount = 0;
  let dateFilteredCount = 0;
  let inRangeDateHintCount = 0;
  let sortedDateHintsObserved = true;
  let lastDateHint: string | null = null;
  let consecutiveOlderDateHints = 0;
  let stoppedByDateHint = false;
  let stopDateHint: string | null = null;

  for (const seed of seeds) {
    const href = cleanText(seed.href);
    if (!href) continue;

    try {
      const candidateUrl = new URL(href, homepageUrl);
      if (!/^https?:$/i.test(candidateUrl.protocol)) continue;
      if (sameDomainOnly && candidateUrl.host !== homepage.host) continue;
      if (isLikelyStaticResourcePath(candidateUrl.pathname)) continue;
      candidateUrl.hash = '';

      const normalized = candidateUrl.toString();
      if (seen.has(normalized)) continue;

      const dateHint = seed.dateHint ?? null;
      const articleType = cleanText(seed.articleType ?? '') || null;
      if (dateHint) {
        datedCandidateCount += 1;
        if (lastDateHint && dateHint > lastDateHint) {
          sortedDateHintsObserved = false;
        }
        lastDateHint = dateHint;

        if (isWithinDateRange(dateHint, dateRange)) {
          inRangeDateHintCount += 1;
          consecutiveOlderDateHints = 0;
        } else {
          dateFilteredCount += 1;
          if (dateRange.start && dateHint < dateRange.start) {
            consecutiveOlderDateHints += 1;
          } else {
            consecutiveOlderDateHints = 0;
          }
          if (
            dateRange.start &&
            dateHint < dateRange.start &&
            sortedDateHintsObserved &&
            datedCandidateCount >= MIN_SORTED_DATE_HINTS_FOR_EARLY_STOP &&
            inRangeDateHintCount > 0 &&
            consecutiveOlderDateHints >= MIN_CONSECUTIVE_OLDER_DATE_HINTS_FOR_EARLY_STOP
          ) {
            stoppedByDateHint = true;
            stopDateHint = dateHint;
            break;
          }
          continue;
        }
      }

      seen.add(normalized);
      let score = scoreCandidate(homepage, normalized) + Math.max(0, Number(seed.scoreBoost ?? 0) || 0);
      if (dateHint && (dateRange.start || dateRange.end) && isWithinDateRange(dateHint, dateRange)) {
        score += IN_RANGE_DATE_HINT_SCORE_BOOST;
      }
      candidates.push({
        url: normalized,
        score,
        order: seed.order,
        dateHint,
        articleType,
        prefetchedArticle: normalizePrefetchedCandidateArticle(seed.prefetchedArticle, dateHint),
      });
    } catch {
      continue;
    }
  }

  return {
    candidates,
    linkCount: seeds.length,
    datedCandidateCount,
    inRangeDateHintCount,
    dateFilteredCount,
    stoppedByDateHint,
    sortedDateHintsObserved,
    consecutiveOlderDateHints,
    stopDateHint,
    extractorId: null,
    extractorDiagnostics: null,
    paginationStopEvaluation: null,
  };
}

function evaluateExtractorPaginationStop({
  extractor,
  homepage,
  homepageUrl,
  pageNumber,
  dateRange,
  extraction,
}: {
  extractor: HomepageCandidateExtractor;
  homepage: URL;
  homepageUrl: string;
  pageNumber: number;
  dateRange: DateRange;
  extraction: HomepageCandidateExtraction;
}) {
  if (!extractor.evaluatePaginationStop) {
    return null;
  }

  return (
    extractor.evaluatePaginationStop({
      homepage,
      homepageUrl,
      pageNumber,
      dateRange,
      extraction,
    }) ?? null
  );
}

async function collectHomepageCandidateDescriptors(
  homepage: URL,
  homepageUrl: string,
  $: ReturnType<typeof load>,
  extractor: HomepageCandidateExtractor | null,
  sameDomainOnly: boolean,
  dateRange: DateRange,
  traceId: string,
  pageNumber: number,
): Promise<CandidateCollectionResult> {
  if (extractor) {
    let extracted = extractor.extract({
      homepage,
      homepageUrl,
      $,
    });
    if (extracted && extracted.candidates.length > 0 && extractor.refineExtraction) {
      const refined = await extractor.refineExtraction({
        homepage,
        homepageUrl,
        $,
        pageNumber,
        traceId,
        dateRange,
        extraction: extracted,
        fetchHtml,
      });
      if (refined && refined.candidates.length > 0) {
        extracted = refined;
      }
    }
    if (extracted && extracted.candidates.length > 0) {
      const paginationStopEvaluation = evaluateExtractorPaginationStop({
        extractor,
        homepage,
        homepageUrl,
        pageNumber,
        dateRange,
        extraction: extracted,
      });
      const result = collectCandidateDescriptorsFromSeeds(
        homepage,
        homepageUrl,
        sameDomainOnly,
        dateRange,
        extracted.candidates,
      );
      return {
        ...result,
        extractorId: extractor.id,
        extractorDiagnostics: extracted.diagnostics ?? null,
        paginationStopEvaluation,
      };
    }
  }

  return collectCandidateDescriptorsFromSeeds(
    homepage,
    homepageUrl,
    sameDomainOnly,
    dateRange,
    buildGenericCandidateSeeds($),
  );
}

async function collectHomepageCandidateDescriptorsFromPreviewExtraction({
  homepage,
  homepageUrl,
  extractor,
  sameDomainOnly,
  dateRange,
  traceId,
  pageNumber,
  previewExtraction,
}: {
  homepage: URL;
  homepageUrl: string;
  extractor: HomepageCandidateExtractor;
  sameDomainOnly: boolean;
  dateRange: DateRange;
  traceId: string;
  pageNumber: number;
  previewExtraction: HomepagePreviewExtractionSnapshot;
}): Promise<CandidateCollectionResult | null> {
  if (previewExtraction.extractorId !== extractor.id) {
    return null;
  }

  let extracted = previewExtraction.extraction;
  if (!extracted || extracted.candidates.length === 0) {
    return null;
  }

  if (extractor.refineExtraction) {
    const refined = await extractor.refineExtraction({
      homepage,
      homepageUrl,
      $: load(''),
      pageNumber,
      traceId,
      dateRange,
      extraction: extracted,
      fetchHtml,
    });
    if (refined && refined.candidates.length > 0) {
      extracted = refined;
    }
  }

  const result = collectCandidateDescriptorsFromSeeds(
    homepage,
    homepageUrl,
    sameDomainOnly,
    dateRange,
    extracted.candidates,
  );
  const paginationStopEvaluation = evaluateExtractorPaginationStop({
    extractor,
    homepage,
    homepageUrl,
    pageNumber,
    dateRange,
    extraction: extracted,
  });

  return {
    ...result,
    extractorId: extractor.id,
    extractorDiagnostics: {
      ...(extracted.diagnostics ?? {}),
      previewCaptureMs: previewExtraction.captureMs,
      previewNextPageUrl: previewExtraction.nextPageUrl,
      previewUrl: previewExtraction.previewUrl,
      source: 'preview-extract',
    },
    paginationStopEvaluation,
  };
}

async function fetchLatestArticlesFromHomepagePage({
  sourceId,
  homepageUrl,
  journalTitle,
  remainingLimit,
  sameDomainOnly,
  dateRange,
  traceId,
  options,
  fetchedSourceUrls,
  seenHomepageUrls,
  pageNumber,
}: {
  sourceId: string;
  homepageUrl: string;
  journalTitle: string;
  remainingLimit: number;
  sameDomainOnly: boolean;
  dateRange: DateRange;
  traceId: string;
  options: FetchLatestArticlesOptions;
  fetchedSourceUrls: Set<string>;
  seenHomepageUrls: ReadonlySet<string>;
  pageNumber: number;
}): Promise<HomepagePageFetchResult> {
  const homepage = new URL(homepageUrl);
  const extractor = findHomepageCandidateExtractor(homepage);
  const fetched: Article[] = [];
  const homepagePathname = homepage.pathname.toLowerCase();
  const isLikelyArticleDetailSource = isLikelyArticleDetailHomepagePath(homepagePathname);
  let homepageSource: HomepageFetchSource = 'network';
  let candidateCollection: CandidateCollectionResult | null = null;
  let $: ReturnType<typeof load> | null = null;
  let previewNextPageUrl: string | null = null;
  let homepageSourceReported = false;
  const emitHomepageSourceStatus = (overrides: Partial<HomepageSourceStatus> = {}) => {
    const reporter = options.onHomepageSourceStatus;
    if (typeof reporter !== 'function') return;

    reporter({
      sourceId,
      homepageUrl,
      pageNumber,
      homepageSource,
      homepageSourceDetail: describeHomepageSourceDetail(homepageSource),
      extractorId: extractor?.id ?? null,
      ...overrides,
    });
  };
  const reportHomepageSource = () => {
    if (homepageSourceReported) return;
    emitHomepageSourceStatus();
    homepageSourceReported = true;
  };

  const previewExtraction =
    !hasArticlePathSignal(homepagePathname) && pageNumber === 1
      ? options.homepagePreviewExtractions?.get(homepageUrl) ?? null
      : null;

  if (previewExtraction && extractor) {
    candidateCollection = await collectHomepageCandidateDescriptorsFromPreviewExtraction({
      homepage,
      homepageUrl,
      extractor,
      sameDomainOnly,
      dateRange,
      traceId,
      pageNumber,
      previewExtraction,
    });
    if (candidateCollection && candidateCollection.candidates.length > 0) {
      homepageSource = 'preview-extract';
      previewNextPageUrl = previewExtraction.nextPageUrl;
      timingLog(traceId, 'source:homepage_preview_extract_applied', {
        pageNumber,
        extractorId: previewExtraction.extractorId,
        candidateCount: candidateCollection.candidates.length,
        captureMs: previewExtraction.captureMs,
        nextPageUrl: shortenForLog(previewNextPageUrl ?? ''),
        previewUrl: shortenForLog(previewExtraction.previewUrl),
        reuseMode: 'live-preview-dom',
        historicalCache: false,
      });
    }
  }

  if (!candidateCollection) {
    const homepageResult = await resolveHomepageHtml(homepageUrl, traceId, options);
    homepageSource = homepageResult.source;
    reportHomepageSource();
    let html = homepageResult.html;
    const homepageParseStartedAt = Date.now();
    let homepageArticle = buildArticleFromHtml(homepageUrl, html);
    $ = load(html);
    timingLog(traceId, 'source:homepage_parsed', {
      pageNumber,
      ms: elapsedMs(homepageParseStartedAt),
      homepageSource: homepageResult.source,
      hasTitle: Boolean(homepageArticle.title),
      hasDoi: Boolean(homepageArticle.doi),
      hasAbstract: Boolean(homepageArticle.abstractText),
      publishedAt: homepageArticle.publishedAt,
    });

    if (
      hasArticlePathSignal(homepagePathname) &&
      hasStrongArticleSignals(homepageUrl, homepageArticle) &&
      isWithinDateRange(homepageArticle.publishedAt, dateRange)
    ) {
      homepageArticle.sourceId = sourceId;
      if (journalTitle) {
        homepageArticle.journalTitle = journalTitle;
      }
      fetchedSourceUrls.add(homepageArticle.sourceUrl);
      fetched.push(homepageArticle);
      timingLog(traceId, 'source:homepage_accepted', {
        pageNumber,
        sourceUrl: shortenForLog(homepageArticle.sourceUrl),
      });
      if (fetched.length >= remainingLimit) {
        return {
          homepageSource,
          articles: fetched,
          candidateAttempted: 0,
          candidateResolved: 0,
          candidateAccepted: 0,
          usedHomepageOnly: true,
          nextPageUrl: null,
          stoppedByDateHint: false,
        };
      }
    }

    if (isLikelyArticleDetailSource) {
      timingLog(traceId, 'source:homepage_detail_only', {
        pageNumber,
        sourceUrl: shortenForLog(homepageUrl),
        homepageAccepted: fetched.length > 0,
      });
      return {
        homepageSource,
        articles: fetched,
        candidateAttempted: 0,
        candidateResolved: 0,
        candidateAccepted: 0,
        usedHomepageOnly: true,
        nextPageUrl: null,
        stoppedByDateHint: false,
      };
    }

    candidateCollection = await collectHomepageCandidateDescriptors(
      homepage,
      homepageUrl,
      $,
      extractor,
      sameDomainOnly,
      dateRange,
      traceId,
      pageNumber,
    );
    if (
      candidateCollection.candidates.length === 0 &&
      homepageResult.source === 'network' &&
      !homepageResult.usedRenderFallback &&
      ENABLE_BROWSER_RENDER_FALLBACK
    ) {
      try {
        const renderedHomepageHtml = await fetchRenderedHtml(homepageUrl, {
          timeoutMs: HOMEPAGE_RENDER_TIMEOUT_MS,
          traceId,
          stage: 'source_homepage_render',
        });
        html = renderedHomepageHtml;
        homepageArticle = buildArticleFromHtml(homepageUrl, html);
        $ = load(html);
        candidateCollection = await collectHomepageCandidateDescriptors(
          homepage,
          homepageUrl,
          $,
          extractor,
          sameDomainOnly,
          dateRange,
          traceId,
          pageNumber,
        );
        timingLog(traceId, 'source:homepage_render_applied', {
          pageNumber,
          candidateCount: candidateCollection.candidates.length,
          hasTitle: Boolean(homepageArticle.title),
          hasAbstract: Boolean(homepageArticle.abstractText),
          publishedAt: homepageArticle.publishedAt,
        });
      } catch (error) {
        timingLog(traceId, 'source:homepage_render_skipped', {
          pageNumber,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  reportHomepageSource();

  const resolvedCandidateCollection =
    candidateCollection ??
    collectCandidateDescriptorsFromSeeds(homepage, homepageUrl, sameDomainOnly, dateRange, []);

  let {
    candidates,
    linkCount,
    datedCandidateCount,
    inRangeDateHintCount,
    dateFilteredCount,
    stoppedByDateHint,
    sortedDateHintsObserved,
    consecutiveOlderDateHints,
    stopDateHint,
    extractorId,
    extractorDiagnostics,
    paginationStopEvaluation,
  } = resolvedCandidateCollection;

  if (extractorId) {
    timingLog(traceId, 'source:candidate_extractor_selected', {
      pageNumber,
      extractorId,
      ...extractorDiagnostics,
    });
  }

  if (stoppedByDateHint) {
    timingLog(traceId, 'source:candidate_date_early_stop', {
      pageNumber,
      stopDateHint,
      dateStart: dateRange.start,
      datedCandidateCount,
      consecutiveOlderDateHints,
    });
  }

  const stoppedByPaginationPolicy = Boolean(paginationStopEvaluation?.shouldStop);
  if (stoppedByPaginationPolicy) {
    emitHomepageSourceStatus({
      paginationStopped: true,
      paginationStopReason: paginationStopEvaluation?.reason ?? 'extractor_policy',
    });
    timingLog(traceId, 'source:pagination_policy_stop', {
      pageNumber,
      reason: paginationStopEvaluation?.reason ?? 'extractor_policy',
      ...(paginationStopEvaluation?.diagnostics ?? {}),
    });
  }

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (extractorId) {
      return a.order - b.order;
    }
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return a.order - b.order;
  });
  const prioritizedCandidates = extractorId
    ? sortedCandidates
    : sortedCandidates.filter((candidate) => candidate.score >= -40);
  const candidatesForAttempt = prioritizedCandidates.length > 0 ? prioritizedCandidates : sortedCandidates;
  const defaultAttemptBudget = Math.min(
    candidatesForAttempt.length,
    Math.max(MIN_CANDIDATE_ATTEMPTS, remainingLimit * ATTEMPTS_PER_LIMIT),
  );
  const extractorAttemptBudget = Math.min(
    candidatesForAttempt.length,
    Math.max(
      remainingLimit + EXTRACTOR_ATTEMPTS_MIN_BUFFER,
      Math.ceil(remainingLimit * EXTRACTOR_ATTEMPTS_MULTIPLIER),
    ),
  );
  const fastExtractorAttemptBudget = Math.min(
    candidatesForAttempt.length,
    Math.max(
      remainingLimit + EXTRACTOR_FAST_ATTEMPTS_MIN_BUFFER,
      Math.ceil(remainingLimit * EXTRACTOR_FAST_ATTEMPTS_MULTIPLIER),
    ),
  );
  const hasDateRangeFilter = Boolean(dateRange.start || dateRange.end);
  const dateHintCoverageRatio =
    candidates.length > 0 ? Math.min(1, datedCandidateCount / candidates.length) : 0;
  const shouldUseFastExtractorBudget = Boolean(
    extractorId &&
      (!hasDateRangeFilter ||
        (dateHintCoverageRatio >= DATE_HINT_HIGH_COVERAGE_THRESHOLD && inRangeDateHintCount >= remainingLimit)),
  );
  const attemptBudgetMode = extractorId
    ? shouldUseFastExtractorBudget
      ? 'extractor_date_aware_fast'
      : 'extractor_capped'
    : 'default';
  const attemptBudget = extractorId
    ? shouldUseFastExtractorBudget
      ? fastExtractorAttemptBudget
      : extractorAttemptBudget
    : defaultAttemptBudget;
  const candidatesToFetch = candidatesForAttempt.slice(0, attemptBudget);
  const maxAttempts = candidatesToFetch.length;
  const candidateFetchConcurrency = extractorId ? EXTRACTOR_CANDIDATE_FETCH_CONCURRENCY : CANDIDATE_FETCH_CONCURRENCY;
  const candidateSlotsRemaining = Math.max(remainingLimit - fetched.length, 0);
  const retryEligibleMaxOrder = Math.max(
    RETRY_PRIORITY_MIN_ORDER,
    Math.ceil(remainingLimit * RETRY_PRIORITY_LIMIT_MULTIPLIER),
  );
  timingLog(traceId, 'source:candidates_ready', {
    pageNumber,
    linkCount,
    candidateCount: candidates.length,
    prioritizedCount: prioritizedCandidates.length,
    attemptBudget,
    attemptBudgetMode,
    defaultAttemptBudget,
    extractorAttemptBudget,
    fastExtractorAttemptBudget,
    datedCandidateCount,
    inRangeDateHintCount,
    dateHintCoverageRatio,
    dateFilteredCount,
    stoppedByDateHint,
    sortedDateHintsObserved,
    consecutiveOlderDateHints,
    retryEligibleMaxOrder,
    candidateFetchConcurrency,
  });

  let candidateAttempted = 0;
  let candidateResolved = 0;
  let candidateAccepted = 0;
  let candidateSettled = 0;
  let acceptedSinceLastBatchLog = 0;
  let nextCandidateIndex = 0;
  let nextBatchLogAt = Math.min(candidateFetchConcurrency, maxAttempts);
  const acceptedCandidates: Array<{ candidateOrder: number; article: Article }> = [];
  const inFlightControllers = new Map<number, AbortController>();
  const settledCandidateOrders = new Set<number>();
  const totalAcceptedCount = () => fetched.length + acceptedCandidates.length;
  const abortInFlightCandidatesAfterOrder = (maxCandidateOrderToKeep: number) => {
    for (const [candidateOrder, controller] of inFlightControllers) {
      if (candidateOrder <= maxCandidateOrderToKeep) continue;
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }
  };
  const resolveAcceptedCutoffOrder = () => {
    if (candidateSlotsRemaining <= 0 || acceptedCandidates.length < candidateSlotsRemaining) {
      return null;
    }

    const sortedAcceptedOrders = acceptedCandidates
      .map((item) => item.candidateOrder)
      .sort((a, b) => a - b);
    return sortedAcceptedOrders[candidateSlotsRemaining - 1] ?? null;
  };
  const hasSettledAllCandidatesThroughOrder = (maxCandidateOrder: number) => {
    for (let order = 1; order <= maxCandidateOrder; order += 1) {
      if (!settledCandidateOrders.has(order)) {
        return false;
      }
    }
    return true;
  };
  const maybeStopAfterResolvingLeadingCandidates = () => {
    const cutoffOrder = resolveAcceptedCutoffOrder();
    if (cutoffOrder === null) return;
    if (!hasSettledAllCandidatesThroughOrder(cutoffOrder)) return;

    stopLaunching = true;
    abortInFlightCandidatesAfterOrder(cutoffOrder);
  };

  const maybeLogCandidateBatch = (force = false) => {
    if (candidateSettled === 0) return;

    const lastBatchUpperBound = Math.max(0, nextBatchLogAt - candidateFetchConcurrency);
    const canLogRegularBatch = candidateSettled >= nextBatchLogAt;
    const canLogPartialBatch = force && candidateSettled > lastBatchUpperBound;
    if (!canLogRegularBatch && !canLogPartialBatch) return;

    const batchStartOrder = lastBatchUpperBound + 1;
    const batchSize = Math.min(candidateFetchConcurrency, candidateSettled - lastBatchUpperBound);
    timingLog(traceId, 'source:candidate_batch_done', {
      pageNumber,
      batchStartOrder,
      batchSize,
      candidateResolved,
      acceptedInBatch: acceptedSinceLastBatchLog,
      totalFetched: totalAcceptedCount(),
    });
    acceptedSinceLastBatchLog = 0;

    while (nextBatchLogAt <= candidateSettled) {
      nextBatchLogAt += candidateFetchConcurrency;
    }
  };

  const workerCount = Math.min(candidateFetchConcurrency, maxAttempts);
  let stopLaunching = false;
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        if (stopLaunching) break;

        const currentIndex = nextCandidateIndex;
        nextCandidateIndex += 1;
        if (currentIndex >= maxAttempts) break;

        candidateAttempted += 1;
        const candidateOrder = currentIndex + 1;
        const candidate = candidatesToFetch[currentIndex];
        let accepted = false;
        const requestController = new AbortController();
        inFlightControllers.set(candidateOrder, requestController);

        try {
          const prefetchedArticle = buildArticleFromPrefetchedCandidate(candidate);
          if (prefetchedArticle && isProbablyArticle(candidate.url, prefetchedArticle)) {
            timingLog(traceId, 'candidate:parsed', {
              pageNumber,
              candidateOrder,
              ms: 0,
              score: candidate.score,
              url: shortenForLog(candidate.url),
              hasTitle: Boolean(prefetchedArticle.title),
              hasDoi: Boolean(prefetchedArticle.doi),
              hasAbstract: Boolean(prefetchedArticle.abstractText),
              publishedAt: prefetchedArticle.publishedAt,
              rendered: false,
              prefetched: true,
            });
            candidateResolved += 1;

            if (!isWithinDateRange(prefetchedArticle.publishedAt, dateRange)) {
              continue;
            }
            if (fetchedSourceUrls.has(prefetchedArticle.sourceUrl)) {
              continue;
            }

            prefetchedArticle.sourceId = sourceId;
            if (journalTitle) {
              prefetchedArticle.journalTitle = journalTitle;
            }

            fetchedSourceUrls.add(prefetchedArticle.sourceUrl);
            acceptedCandidates.push({
              candidateOrder,
              article: prefetchedArticle,
            });
            accepted = true;
            candidateAccepted += 1;
            continue;
          }

          const allowTimeoutRetry = Boolean(
            extractorId || (candidateOrder <= retryEligibleMaxOrder && candidate.dateHint === null),
          );
          let articleHtml = '';
          let usedRenderedHtml = false;
          try {
            articleHtml = await fetchCandidateHtmlWithRetry(
              candidate.url,
              traceId,
              candidateOrder,
              requestController.signal,
              allowTimeoutRetry,
            );
          } catch (error) {
            if (!shouldRenderCandidateAfterError({ error, candidateOrder, extractorId })) {
              throw error;
            }

            articleHtml = await fetchRenderedHtml(candidate.url, {
              timeoutMs: ARTICLE_RENDER_TIMEOUT_MS,
              traceId,
              stage: `candidate#${candidateOrder}:render`,
              signal: requestController.signal,
            });
            usedRenderedHtml = true;
          }

          const parseStartedAt = Date.now();
          let article = buildArticleFromHtml(candidate.url, articleHtml);
          applyCandidateArticleType(article, candidate.articleType);
          if (
            !usedRenderedHtml &&
            shouldConfirmRenderedArticle({
              article,
              candidateUrl: candidate.url,
            })
          ) {
            if (canAttemptRenderedFallback({ candidateOrder, extractorId })) {
              try {
                const renderedArticleHtml = await fetchRenderedHtml(candidate.url, {
                  timeoutMs: ARTICLE_RENDER_TIMEOUT_MS,
                  traceId,
                  stage: `candidate#${candidateOrder}:render_after_parse`,
                  signal: requestController.signal,
                });
                const renderedArticle = buildArticleFromHtml(candidate.url, renderedArticleHtml);
                applyCandidateArticleType(renderedArticle, candidate.articleType);
                if (isProbablyArticle(candidate.url, renderedArticle)) {
                  article = renderedArticle;
                  usedRenderedHtml = true;
                  timingLog(traceId, 'candidate:render_promoted', {
                    pageNumber,
                    candidateOrder,
                    url: shortenForLog(candidate.url),
                  });
                } else {
                  continue;
                }
              } catch {
                continue;
              }
            } else {
              continue;
            }
          }
          timingLog(traceId, 'candidate:parsed', {
            pageNumber,
            candidateOrder,
            ms: elapsedMs(parseStartedAt),
            score: candidate.score,
            url: shortenForLog(candidate.url),
            hasTitle: Boolean(article.title),
            hasDoi: Boolean(article.doi),
            hasAbstract: Boolean(article.abstractText),
            publishedAt: article.publishedAt,
            rendered: usedRenderedHtml,
          });
          candidateResolved += 1;

          if (!isProbablyArticle(candidate.url, article)) continue;
          if (!isWithinDateRange(article.publishedAt, dateRange)) continue;
          if (fetchedSourceUrls.has(article.sourceUrl)) continue;

          article.sourceId = sourceId;
          if (journalTitle) {
            article.journalTitle = journalTitle;
          }

          fetchedSourceUrls.add(article.sourceUrl);
          acceptedCandidates.push({
            candidateOrder,
            article,
          });
          accepted = true;
          candidateAccepted += 1;
        } catch {
          // Ignore individual candidate failures and continue draining the queue.
        } finally {
          inFlightControllers.delete(candidateOrder);
          settledCandidateOrders.add(candidateOrder);
          candidateSettled += 1;
          if (accepted) {
            acceptedSinceLastBatchLog += 1;
          }
          maybeStopAfterResolvingLeadingCandidates();
          maybeLogCandidateBatch();
        }
      }
    }),
  );
  maybeLogCandidateBatch(true);

  for (const item of acceptedCandidates.sort((a, b) => a.candidateOrder - b.candidateOrder)) {
    if (fetched.length >= remainingLimit) break;
    fetched.push(item.article);
  }

  const nextPageUrl =
    fetched.length < remainingLimit && !stoppedByDateHint && !stoppedByPaginationPolicy
      ? previewNextPageUrl && !seenHomepageUrls.has(previewNextPageUrl)
        ? previewNextPageUrl
        : extractor?.findNextPageUrl && $
          ? extractor.findNextPageUrl({
              homepage,
              homepageUrl,
              $,
              seenPageUrls: seenHomepageUrls,
            })
          : null
      : null;

  return {
    homepageSource,
    articles: fetched,
    candidateAttempted,
    candidateResolved,
    candidateAccepted,
    usedHomepageOnly: false,
    nextPageUrl,
    stoppedByDateHint: stoppedByDateHint || stoppedByPaginationPolicy,
  };
}

async function fetchCandidateHtmlWithRetry(
  candidateUrl: string,
  traceId: string,
  candidateOrder: number,
  signal?: AbortSignal,
  allowTimeoutRetry = true,
) {
  const maxAttempts = allowTimeoutRetry ? ARTICLE_FETCH_RETRY_MAX_ATTEMPTS : 1;
  let attempt = 1;
  let timeoutMs = ARTICLE_FETCH_TIMEOUT_MS;

  while (attempt <= maxAttempts) {
    if (signal?.aborted) {
      throw appError('HTTP_REQUEST_FAILED', {
        status: 'ABORTED',
        statusText: 'Request aborted',
        url: candidateUrl,
      });
    }

    const stage = attempt === 1 ? `candidate#${candidateOrder}` : `candidate#${candidateOrder}:retry${attempt - 1}`;
    try {
      return await fetchHtml(candidateUrl, {
        timeoutMs,
        traceId,
        stage,
        signal,
      });
    } catch (error) {
      if (isAbortedRequestError(error)) {
        throw error;
      }

      const canRetry = allowTimeoutRetry && isTimeoutRequestError(error) && attempt < maxAttempts;
      if (!canRetry) {
        throw error;
      }

      const nextAttempt = attempt + 1;
      const nextTimeoutMs = Math.max(timeoutMs, ARTICLE_FETCH_RETRY_TIMEOUT_MS);
      timingLog(traceId, 'candidate:retry_scheduled', {
        candidateOrder,
        attempt,
        nextAttempt,
        timeoutMs,
        nextTimeoutMs,
        allowTimeoutRetry,
        backoffMs: ARTICLE_FETCH_RETRY_BACKOFF_MS,
        url: shortenForLog(candidateUrl),
      });

      if (ARTICLE_FETCH_RETRY_BACKOFF_MS > 0) {
        await sleep(ARTICLE_FETCH_RETRY_BACKOFF_MS);
      }

      attempt = nextAttempt;
      timeoutMs = nextTimeoutMs;
    }
  }

  throw appError('HTTP_REQUEST_FAILED', {
    status: 'RETRY_EXHAUSTED',
    statusText: 'Candidate fetch retries exhausted',
    url: candidateUrl,
  });
}

async function attemptHomepageNetworkHtml(
  homepageUrl: string,
  traceId: string,
  stage: string,
  benchmarkStage: string | null = null,
): Promise<HomepageNetworkAttemptResult> {
  const startedAt = Date.now();

  try {
    const html = await fetchHtml(homepageUrl, {
      timeoutMs: HOMEPAGE_FETCH_TIMEOUT_MS,
      traceId,
      stage,
    });

    if (benchmarkStage) {
      timingLog(traceId, benchmarkStage, {
        outcome: 'ok',
        ms: elapsedMs(startedAt),
        size: html.length,
        url: shortenForLog(homepageUrl),
      });
    }

    return {
      ok: true,
      html,
    };
  } catch (error) {
    if (benchmarkStage) {
      timingLog(traceId, benchmarkStage, {
        outcome: 'failed',
        ms: elapsedMs(startedAt),
        message: describeError(error),
        url: shortenForLog(homepageUrl),
      });
    }

    return {
      ok: false,
      error,
    };
  }
}

async function resolveHomepageHtml(
  homepageUrl: string,
  traceId: string,
  options: FetchLatestArticlesOptions,
): Promise<HomepageHtmlResult> {
  const requestedMode = options.homepageSourceMode ?? 'network';
  const previewSnapshot = options.homepagePreviewSnapshots?.get(homepageUrl) ?? null;
  const effectiveMode: HomepageSourceMode = previewSnapshot ? requestedMode : 'network';
  const networkStage = effectiveMode === 'compare' ? 'source_homepage_network' : 'source_homepage';
  let networkAttemptPromise: Promise<HomepageNetworkAttemptResult> | null = null;

  const startNetworkAttempt = () => {
    if (!networkAttemptPromise) {
      networkAttemptPromise = attemptHomepageNetworkHtml(
        homepageUrl,
        traceId,
        networkStage,
        effectiveMode === 'compare' ? 'source:homepage_benchmark_done' : null,
      );
    }

    return networkAttemptPromise;
  };

  const useNetwork = async (reason: string) => {
    const result = await startNetworkAttempt();
    if ('error' in result) {
      const scienceChallengeSignal = getScienceChallengeSignal(result.error);
      const scienceValidationFallback = shouldUseScienceValidationRenderFallback({
        homepageUrl,
        error: result.error,
      });
      if (scienceValidationFallback) {
        try {
          const validatedHomepage = await ensureScienceValidationWindow(homepageUrl);
          timingLog(traceId, 'source:science_validation_window_applied', {
            reason,
            url: shortenForLog(homepageUrl),
            finalUrl: shortenForLog(validatedHomepage.finalUrl),
            size: validatedHomepage.html.length,
            sectionCount: validatedHomepage.sectionCount,
            title: validatedHomepage.title,
            readyMs: validatedHomepage.readyMs,
            navigationMode: validatedHomepage.navigationMode,
            validationSource: validatedHomepage.source,
            failedStatus: toErrorStatusCode(result.error) || null,
            scienceChallengeSignal,
          });
          timingLog(traceId, 'source:homepage_selected', {
            selected: 'network',
            reason: `${reason}_science_validation_window`,
            size: validatedHomepage.html.length,
            url: shortenForLog(homepageUrl),
          });
          return {
            html: validatedHomepage.html,
            source: 'network' as const,
            usedRenderFallback: false,
          };
        } catch (validationError) {
          timingLog(traceId, 'source:science_validation_window_failed', {
            reason,
            message: describeError(validationError),
            url: shortenForLog(homepageUrl),
            failedStatus: toErrorStatusCode(result.error) || null,
            scienceValidationFallback,
            scienceChallengeSignal,
          });

          throw validationError;
        }
      }

      if (shouldRenderHomepageAfterError(result.error)) {
        try {
          const renderedHtml = await fetchRenderedHtml(homepageUrl, {
            timeoutMs: HOMEPAGE_RENDER_TIMEOUT_MS,
            traceId,
            stage: 'source_homepage_render_on_error',
          });
          if (isScienceChallengeHtml(renderedHtml)) {
            throw appError('HTTP_REQUEST_FAILED', {
              status: 'SCIENCE_VALIDATION_REQUIRED',
              statusText: 'Complete the Science verification window to continue fetching.',
              url: homepageUrl,
              scienceChallengeSignal: scienceChallengeSignal ?? undefined,
            });
          }
          timingLog(traceId, 'source:homepage_render_fallback_applied', {
            reason,
            size: renderedHtml.length,
            url: shortenForLog(homepageUrl),
            failedStatus: toErrorStatusCode(result.error) || null,
            scienceValidationFallback,
            scienceChallengeSignal,
          });
          timingLog(traceId, 'source:homepage_selected', {
            selected: 'network',
            reason: `${reason}_render_fallback`,
            size: renderedHtml.length,
            url: shortenForLog(homepageUrl),
          });
          return {
            html: renderedHtml,
            source: 'network' as const,
            usedRenderFallback: true,
          };
        } catch (renderError) {
          timingLog(traceId, 'source:homepage_render_fallback_failed', {
            reason,
            message: describeError(renderError),
            url: shortenForLog(homepageUrl),
            failedStatus: toErrorStatusCode(result.error) || null,
            scienceValidationFallback,
            scienceChallengeSignal,
          });
        }
      }

      throw result.error;
    }

    timingLog(traceId, 'source:homepage_selected', {
      selected: 'network',
      reason,
      size: result.html.length,
      url: shortenForLog(homepageUrl),
    });

    return {
      html: result.html,
      source: 'network' as const,
    };
  };

  timingLog(traceId, 'source:homepage_strategy', {
    requestedMode,
    effectiveMode,
    hasPreviewSnapshot: Boolean(previewSnapshot),
    previewCaptureMs: previewSnapshot?.captureMs ?? null,
    previewSize: previewSnapshot?.html.length ?? null,
    previewIsLoading: previewSnapshot?.isLoading ?? null,
  });

  if (!previewSnapshot || effectiveMode === 'network') {
    return useNetwork('network_only');
  }

  if (effectiveMode === 'compare') {
    timingLog(traceId, 'source:homepage_benchmark_started', {
      against: 'network',
      url: shortenForLog(homepageUrl),
    });
    void startNetworkAttempt();
  }

  if (!hasUsablePreviewHomepageHtml(previewSnapshot.html)) {
    timingLog(traceId, 'source:homepage_preview_skipped', {
      reason: 'preview_html_invalid',
      previewUrl: shortenForLog(previewSnapshot.previewUrl),
      captureMs: previewSnapshot.captureMs,
      size: previewSnapshot.html.length,
    });
    return useNetwork('preview_html_invalid');
  }

  if (previewSnapshot.isLoading) {
    timingLog(traceId, 'source:homepage_preview_loading', {
      previewUrl: shortenForLog(previewSnapshot.previewUrl),
      captureMs: previewSnapshot.captureMs,
      size: previewSnapshot.html.length,
    });
  }

  timingLog(traceId, 'source_homepage_preview:ok', {
    ms: previewSnapshot.captureMs,
    size: previewSnapshot.html.length,
    url: shortenForLog(homepageUrl),
    previewUrl: shortenForLog(previewSnapshot.previewUrl),
  });
  timingLog(traceId, 'source:homepage_selected', {
    selected: 'preview',
    reason: effectiveMode,
    size: previewSnapshot.html.length,
    captureMs: previewSnapshot.captureMs,
    url: shortenForLog(homepageUrl),
  });

  return {
    html: previewSnapshot.html,
    source: 'preview',
  };
}

export async function fetchHtml(url: string, options: FetchHtmlOptions = {}) {
  const traceId = cleanText(options.traceId) || 'fetch';
  const stage = cleanText(options.stage) || 'html';
  const timeoutMs = toTimeoutMs(options.timeoutMs, DEFAULT_FETCH_TIMEOUT_MS);
  const requestStartedAt = Date.now();
  const controller = new AbortController();
  let abortedByExternalSignal = false;
  const externalSignal = options.signal;
  const abortFromExternalSignal = () => {
    abortedByExternalSignal = true;
    controller.abort();
  };

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else if (externalSignal) {
    externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { response, transport } = await requestHtmlWithPreferredTransport({
      traceId,
      stage,
      url,
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseHeaders = collectHttpErrorResponseHeaders(response);
      timingLog(traceId, `${stage}:http_error`, {
        ms: elapsedMs(requestStartedAt),
        status: response.status,
        statusText: response.statusText,
        timeoutMs,
        transport,
        url: shortenForLog(url),
        responseHeaders,
      });
      throw appError('HTTP_REQUEST_FAILED', {
        status: response.status,
        statusText: response.statusText,
        url,
        responseHeaders: responseHeaders ?? undefined,
      });
    }

    const html = await response.text();
    timingLog(traceId, `${stage}:ok`, {
      ms: elapsedMs(requestStartedAt),
      status: response.status,
      timeoutMs,
      transport,
      url: shortenForLog(url),
      size: html.length,
    });
    return html;
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    if (isAbortError(error)) {
      if (abortedByExternalSignal) {
        timingLog(traceId, `${stage}:aborted`, {
          ms: elapsedMs(requestStartedAt),
          timeoutMs,
          url: shortenForLog(url),
        });
        throw appError('HTTP_REQUEST_FAILED', {
          status: 'ABORTED',
          statusText: 'Request aborted',
          url,
        });
      }

      timingLog(traceId, `${stage}:timeout`, {
        ms: elapsedMs(requestStartedAt),
        timeoutMs,
        url: shortenForLog(url),
      });
      throw appError('HTTP_REQUEST_FAILED', {
        status: 'TIMEOUT',
        statusText: `Request timed out after ${timeoutMs}ms`,
        url,
      });
    }

    timingLog(traceId, `${stage}:network_error`, {
      ms: elapsedMs(requestStartedAt),
      timeoutMs,
      url: shortenForLog(url),
      message: error instanceof Error ? error.message : String(error),
    });
    throw appError('HTTP_REQUEST_FAILED', {
      status: 'NETWORK_ERROR',
      statusText: error instanceof Error ? error.message : String(error),
      url,
    });
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortFromExternalSignal);
    }
    clearTimeout(timeoutId);
  }
}

export async function fetchArticle(urlValue: unknown, storage: StorageService) {
  const traceId = createFetchTraceId('single');
  const totalStartedAt = Date.now();
  const normalized = normalizeUrl(urlValue);
  timingLog(traceId, 'fetch_article:start', {
    url: shortenForLog(normalized),
  });

  try {
    let html = '';
    let usedRenderedHtml = false;
    try {
      html = await fetchHtml(normalized, {
        traceId,
        stage: 'single_page',
      });
    } catch (error) {
      if (!ENABLE_BROWSER_RENDER_FALLBACK) {
        throw error;
      }

      html = await fetchRenderedHtml(normalized, {
        timeoutMs: ARTICLE_RENDER_TIMEOUT_MS,
        traceId,
        stage: 'single_page_render',
      });
      usedRenderedHtml = true;
    }

    const parseStartedAt = Date.now();
    let article = buildArticleFromHtml(normalized, html);
    if (
      !usedRenderedHtml &&
      shouldConfirmRenderedArticle({
        article,
        candidateUrl: normalized,
      })
    ) {
      try {
        const renderedHtml = await fetchRenderedHtml(normalized, {
          timeoutMs: ARTICLE_RENDER_TIMEOUT_MS,
          traceId,
          stage: 'single_page_render_after_parse',
        });
        const renderedArticle = buildArticleFromHtml(normalized, renderedHtml);
        if (isProbablyArticle(normalized, renderedArticle)) {
          article = renderedArticle;
          usedRenderedHtml = true;
        }
      } catch {
        // Keep the raw article parse if render fallback cannot improve it.
      }
    }
    timingLog(traceId, 'fetch_article:parsed', {
      ms: elapsedMs(parseStartedAt),
      hasTitle: Boolean(article.title),
      hasDoi: Boolean(article.doi),
      hasAbstract: Boolean(article.abstractText),
      authorCount: article.authors.length,
      publishedAt: article.publishedAt,
      rendered: usedRenderedHtml,
    });

    const saveStartedAt = Date.now();
    await storage.saveFetchedArticles([article]);
    timingLog(traceId, 'fetch_article:saved', {
      ms: elapsedMs(saveStartedAt),
      count: 1,
    });
    timingLog(traceId, 'fetch_article:done', {
      totalMs: elapsedMs(totalStartedAt),
    });
    return article;
  } catch (error) {
    timingLog(traceId, 'fetch_article:failed', {
      totalMs: elapsedMs(totalStartedAt),
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function normalizeHomepageSources(payload: FetchLatestArticlesPayload): HomepageSource[] {
  const payloadSources = Array.isArray(payload.sources) ? payload.sources : [];
  const mapped = payloadSources
    .map((item, index) => {
      const homepageUrl = safeNormalizeUrl(cleanText(item?.homepageUrl));
      if (!homepageUrl) return null;

      const normalizedHomepageUrl = normalizeNatureListingHomepageUrl(homepageUrl);

      return {
        sourceId: normalizeSourceId(item?.sourceId, normalizedHomepageUrl, index),
        homepageUrl: normalizedHomepageUrl,
        journalTitle: cleanText(item?.journalTitle),
      } satisfies HomepageSource;
    })
    .filter((source): source is HomepageSource => Boolean(source));
  const deduped = new Map<string, HomepageSource>();

  for (const source of mapped) {
    const existing = deduped.get(source.homepageUrl);
    if (!existing) {
      deduped.set(source.homepageUrl, source);
      continue;
    }

    if (!existing.journalTitle && source.journalTitle) {
      deduped.set(source.homepageUrl, source);
    }
  }

  return [...deduped.values()];
}

async function fetchLatestArticlesFromHomepage(
  sourceId: string,
  homepageUrl: string,
  journalTitle: string,
  perSourceLimit: number,
  sameDomainOnly: boolean,
  dateRange: DateRange,
  traceId: string,
  options: FetchLatestArticlesOptions,
): Promise<Article[]> {
  const sourceStartedAt = Date.now();
  timingLog(traceId, 'source:start', {
    sourceId,
    homepageUrl: shortenForLog(homepageUrl),
    perSourceLimit,
    sameDomainOnly,
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
  });

  try {
    const fetched: Article[] = [];
    const fetchedSourceUrls = new Set<string>();
    const seenHomepageUrls = new Set<string>();
    let homepagePageCount = 0;
    let totalCandidateAttempted = 0;
    let totalCandidateResolved = 0;
    let totalCandidateAccepted = 0;
    let usedHomepageOnly = false;
    let lastHomepageSource: HomepageFetchSource = 'network';
    let currentHomepageUrl: string | null = homepageUrl;

    while (currentHomepageUrl && fetched.length < perSourceLimit && homepagePageCount < MAX_PAGINATED_HOMEPAGE_PAGES) {
      const normalizedHomepageUrl = new URL(currentHomepageUrl).toString();
      if (seenHomepageUrls.has(normalizedHomepageUrl)) {
        timingLog(traceId, 'source:pagination_loop_detected', {
          homepagePageCount,
          homepageUrl: shortenForLog(normalizedHomepageUrl),
        });
        break;
      }

      seenHomepageUrls.add(normalizedHomepageUrl);
      homepagePageCount += 1;

      const pageResult = await fetchLatestArticlesFromHomepagePage({
        sourceId,
        homepageUrl: normalizedHomepageUrl,
        journalTitle,
        remainingLimit: perSourceLimit - fetched.length,
        sameDomainOnly,
        dateRange,
        traceId,
        options,
        fetchedSourceUrls,
        seenHomepageUrls,
        pageNumber: homepagePageCount,
      });

      lastHomepageSource = pageResult.homepageSource;
      totalCandidateAttempted += pageResult.candidateAttempted;
      totalCandidateResolved += pageResult.candidateResolved;
      totalCandidateAccepted += pageResult.candidateAccepted;
      usedHomepageOnly = usedHomepageOnly || pageResult.usedHomepageOnly;

      for (const article of pageResult.articles) {
        if (fetched.length >= perSourceLimit) break;
        fetched.push(article);
      }

      if (fetched.length >= perSourceLimit) {
        break;
      }

      if (!pageResult.nextPageUrl) {
        break;
      }

      timingLog(traceId, 'source:pagination_continue', {
        currentPageNumber: homepagePageCount,
        nextHomepageUrl: shortenForLog(pageResult.nextPageUrl),
        fetchedCount: fetched.length,
      });
      currentHomepageUrl = pageResult.nextPageUrl;
    }

    if (homepagePageCount >= MAX_PAGINATED_HOMEPAGE_PAGES && currentHomepageUrl && fetched.length < perSourceLimit) {
      timingLog(traceId, 'source:pagination_page_limit_reached', {
        homepagePageCount,
        maxHomepagePages: MAX_PAGINATED_HOMEPAGE_PAGES,
        fetchedCount: fetched.length,
      });
    }

    timingLog(traceId, 'source:done', {
      totalMs: elapsedMs(sourceStartedAt),
      homepageSource: lastHomepageSource,
      homepagePageCount,
      fetchedCount: fetched.length,
      candidateAttempted: totalCandidateAttempted,
      candidateResolved: totalCandidateResolved,
      candidateAccepted: totalCandidateAccepted,
      usedHomepageOnly,
      paginated: homepagePageCount > 1,
    });
    return fetched;
  } catch (error) {
    timingLog(traceId, 'source:failed', {
      totalMs: elapsedMs(sourceStartedAt),
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function fetchLatestArticles(
  payload: FetchLatestArticlesPayload = {},
  storage: StorageService,
  options: FetchLatestArticlesOptions = {},
) {
  const traceId = createFetchTraceId('batch');
  const totalStartedAt = Date.now();
  const homepageSources = normalizeHomepageSources(payload);
  if (homepageSources.length === 0) {
    throw appError('BATCH_HOMEPAGE_URLS_EMPTY');
  }

  const configuredUserLimit = await resolveConfiguredUserBatchLimit(storage);
  // Per-source cap comes only from persisted user settings.
  const perSourceLimit = configuredUserLimit;
  const sameDomainOnly = payload.sameDomainOnly !== false;
  const dateRange = parseDateRange(payload.startDate ?? null, payload.endDate ?? null);
  const fetched: Article[] = [];
  const seenSourceUrls = new Set<string>();
  const failedSources: Array<Record<string, unknown>> = [];
  let rawFetchedCount = 0;
  timingLog(traceId, 'batch:start', {
    sourceCount: homepageSources.length,
    perSourceLimit,
    configuredUserLimit,
    systemLimit: SYSTEM_BATCH_LIMIT_MAX,
    sameDomainOnly,
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
    homepageSourceMode: options.homepageSourceMode ?? 'network',
    previewSnapshotCount: options.homepagePreviewSnapshots?.size ?? 0,
    previewExtractionCount: options.homepagePreviewExtractions?.size ?? 0,
  });

  for (let index = 0; index < homepageSources.length; index += SOURCE_FETCH_CONCURRENCY) {
    const batch = homepageSources.slice(index, index + SOURCE_FETCH_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (source) => {
        try {
          const homepageArticles = await fetchLatestArticlesFromHomepage(
            source.sourceId,
            source.homepageUrl,
            source.journalTitle,
            perSourceLimit,
            sameDomainOnly,
            dateRange,
            `${traceId}:${source.sourceId}`,
            options,
          );

          return {
            ok: true as const,
            source,
            articles: homepageArticles,
          };
        } catch (error) {
          return {
            ok: false as const,
            source,
            error,
          };
        }
      }),
    );

    for (const result of settled) {
      if (result.ok) {
        const { articles } = result;
        rawFetchedCount += articles.length;
        timingLog(traceId, 'batch:source_ok', {
          sourceId: result.source.sourceId,
          sourceUrl: shortenForLog(result.source.homepageUrl),
          fetchedCount: articles.length,
        });
        for (const article of articles) {
          const dedupeKey = `${article.sourceId ?? ''}::${article.sourceUrl}`;
          if (seenSourceUrls.has(dedupeKey)) continue;
          seenSourceUrls.add(dedupeKey);
          fetched.push(article);
        }
        continue;
      }

      const { source, error } = result;
      timingLog(traceId, 'batch:source_failed', {
        sourceId: source.sourceId,
        sourceUrl: shortenForLog(source.homepageUrl),
        message: error instanceof Error ? error.message : String(error),
      });
      if (isAppError(error)) {
        failedSources.push({
          sourceId: source.sourceId,
          homepageUrl: source.homepageUrl,
          code: error.code,
          details: error.details,
        });
      } else {
        failedSources.push({
          sourceId: source.sourceId,
          homepageUrl: source.homepageUrl,
          code: 'UNKNOWN_ERROR',
          details: { message: error instanceof Error ? error.message : String(error) },
        });
      }
    }
  }

  if (fetched.length === 0) {
    timingLog(traceId, 'batch:failed_no_articles', {
      totalMs: elapsedMs(totalStartedAt),
      failedSourceCount: failedSources.length,
      dateStart: dateRange.start,
      dateEnd: dateRange.end,
    });
    if (failedSources.length > 0) {
      throw appError('BATCH_SOURCE_FETCH_FAILED', { failedSources });
    }

    if (dateRange.start || dateRange.end) {
      throw appError('BATCH_NO_MATCH_IN_DATE_RANGE', {
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
    }

    throw appError('BATCH_NO_VALID_ARTICLES');
  }

  const saveStartedAt = Date.now();
  await storage.saveFetchedArticles(fetched);
  timingLog(traceId, 'batch:save_done', {
    ms: elapsedMs(saveStartedAt),
    count: fetched.length,
  });
  timingLog(traceId, 'batch:done', {
    totalMs: elapsedMs(totalStartedAt),
    sourceCount: homepageSources.length,
    rawFetchedCount,
    dedupedCount: fetched.length,
    dedupeDropped: Math.max(0, rawFetchedCount - fetched.length),
    failedSourceCount: failedSources.length,
  });
  return fetched;
}
