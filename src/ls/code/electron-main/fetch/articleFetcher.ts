import { load } from 'cheerio';

import type {
  Article,
  FetchChannel,
  FetchLatestArticlesPayload,
  FetchStatus,
  WebContentReuseMode,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { DateRange } from '../../../base/common/date.js';
import type { StorageService } from '../../../platform/storage/common/storage.js';
import { normalizeNatureMainSiteListingUrl } from '../../../base/common/url.js';
import { collectCandidateDescriptorsFromSeeds as collectListingCandidateDescriptorsFromSeeds } from './listing/candidates.js';
import { planCandidateFetch } from './listing/planning.js';
import { buildArticleFromHtml } from './parser.js';
import { hasStrongArticleSignals, isProbablyArticle } from './acceptance.js';
import {
  applyCandidateArticleType,
  buildArticleFromCandidate,
  type CandidateArticleSnapshot,
} from './merge.js';
import { hasArticlePathSignal } from './articleUrlRules.js';
import { isWithinDateRange, parseDateRange } from '../../../base/common/date.js';
import { parseDateHintFromText } from '../../../base/common/date.js';
import { cleanText } from '../../../base/common/strings.js';
import { normalizeUrl } from '../../../base/common/url.js';
import { READER_SHARED_WEB_PARTITION } from '../../../platform/native/electron-main/sharedWebSession.js';
import {
  renderHtmlWithBrowserWindow,
  requestWithPreferredTransport,
} from '../../../platform/request/electron-main/requestMainService.js';
import {
  batchLimitMax,
  batchLimitMin,
  defaultBatchLimit,
} from '../../../platform/config/common/defaultBatchSources.js';
import { createFetchTraceId, elapsedMs, shortenForLog, timingLog } from '../fetchTiming.js';
import {
  buildPageHtmlFetchPlan,
  buildWebContentExtractionFetchPlan,
  normalizeFetchStrategy,
  type FetchStrategy,
  type WebContentExtractionSnapshot,
  type WebContentSnapshot,
} from './fetchStrategy.js';
import {
  attemptNetworkHtml,
  resolveNetworkAttemptResult,
  type NetworkAttemptResult,
} from './networkChannel.js';
import {
  findListingCandidateExtractor,
  type ListingCandidateExtraction,
  type ListingCandidateExtractor,
  type ListingPaginationStopEvaluation,
  type ListingCandidateSeed,
  normalizeListingCandidateSeeds,
} from './sourceExtractors/index.js';
import { appError, isAppError } from '../../../base/common/errors.js';

const SYSTEM_BATCH_LIMIT_MAX = batchLimitMax;
const USER_BATCH_LIMIT_MIN = batchLimitMin;
const DEFAULT_USER_BATCH_LIMIT = defaultBatchLimit;
const DEFAULT_FETCH_TIMEOUT_MS = 12000;
const PAGE_FETCH_TIMEOUT_MS = 12000;
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
const PAGE_RENDER_TIMEOUT_MS = 4500;
const BROWSER_RENDER_DOM_SETTLE_MS = 180;
const RENDER_FALLBACK_MAX_ORDER = 8;
const EXTRACTOR_RENDER_FALLBACK_MAX_ORDER = 10;
const RENDER_FALLBACK_HTTP_STATUS = new Set(['401', '403', '408', '409', '423', '425', '429', '451']);
const MAX_PAGINATED_PAGE_COUNT = 20;

type FetchHtmlOptions = {
  timeoutMs?: number;
  traceId?: string;
  stage?: string;
  signal?: AbortSignal;
};

type PageSource = {
  sourceId: string;
  pageUrl: string;
  journalTitle: string;
  preferredExtractorId: string | null;
};

export type FetchLatestArticlesOptions = {
  previewExtractions?: ReadonlyMap<string, WebContentExtractionSnapshot>;
  previewSnapshots?: ReadonlyMap<string, WebContentSnapshot>;
  fetchStrategy?: FetchStrategy;
  onFetchStatus?: (status: FetchStatus) => void;
};

type PageHtmlResult = {
  html: string;
  source: 'network' | 'web-content';
  usedRenderFallback?: boolean;
};

type CheerioAcceptedNode = Parameters<ReturnType<typeof load>>[0];

type CandidateDescriptor = CandidateArticleSnapshot & {
  score: number;
  order: number;
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
  paginationStopEvaluation: ListingPaginationStopEvaluation | null;
};

type PageFetchResult = {
  fetchChannel: FetchChannel;
  webContentReuseMode: WebContentReuseMode | null;
  articles: Article[];
  candidateAttempted: number;
  candidateResolved: number;
  candidateAccepted: number;
  usedPageOnly: boolean;
  nextPageUrl: string | null;
  stoppedByDateHint: boolean;
};

function describeFetchDetail(fetchChannel: FetchChannel, webContentReuseMode: WebContentReuseMode | null) {
  if (fetchChannel === 'web-content') {
    return webContentReuseMode === 'live-extract' ? 'live-web-content-dom' : 'web-content-dom-snapshot';
  }

  return 'network-fetch';
}

function normalizeSourceId(input: unknown, index: number) {
  const cleaned = cleanText(input);
  if (cleaned) return cleaned;

  return String(index + 1);
}

function safeNormalizeUrl(value: string) {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

function resolvePayloadSourcePageUrl(source: { pageUrl?: unknown } | null | undefined) {
  return safeNormalizeUrl(cleanText(source?.pageUrl ?? ''));
}

function isLikelyArticleDetailPagePath(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  return /^(?:\/(?:article|articles|paper|papers|doi|abs|content)\/[^/]+)$/i.test(normalizedPathname);
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

function hasUsableWebContentPageHtml(html: string) {
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
}) {
  return requestWithPreferredTransport({
    url,
    signal,
    headers: buildHtmlFetchHeaders(),
    browser: {
      enabled: PREFER_BROWSER_FETCH,
      partition: BROWSER_FETCH_PARTITION,
      onFallback: ({ partition, message }) => {
        timingLog(traceId, `${stage}:browser_fallback`, {
          url: shortenForLog(url),
          partition,
          message,
        });
      },
    },
  });
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

function shouldRenderPageAfterError(error: unknown) {
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
  const weakMetadata =
    !article.doi && !article.publishedAt && !article.abstractText && !article.descriptionText;
  const genericTitle = title.length < 12 || /^(?:shell|loading|article|home)$/i.test(title);
  return weakMetadata && genericTitle;
}

async function fetchRenderedHtml(url: string, options: FetchHtmlOptions = {}) {
  const traceId = cleanText(options.traceId) || 'fetch';
  const stage = cleanText(options.stage) || 'html_render';
  const timeoutMs = toTimeoutMs(options.timeoutMs, ARTICLE_RENDER_TIMEOUT_MS);
  const requestStartedAt = Date.now();

  try {
    const rendered = await renderHtmlWithBrowserWindow({
      url,
      partition: BROWSER_FETCH_PARTITION,
      timeoutMs,
      settleMs: BROWSER_RENDER_DOM_SETTLE_MS,
      signal: options.signal,
      userAgent: HTML_FETCH_USER_AGENT,
      acceptHeader: HTML_FETCH_ACCEPT,
      onDidFailLoad: (details) => {
        logBrowserLoadFailure({
          traceId,
          stage,
          ...details,
        });
      },
    });

    timingLog(traceId, `${stage}:ok`, {
      ms: elapsedMs(requestStartedAt),
      timeoutMs,
      transport: 'browser-render',
      url: shortenForLog(url),
      finalUrl: shortenForLog(rendered.finalUrl),
      size: rendered.html.length,
    });
    return rendered.html;
  } catch (error) {
    if (isAppError(error)) {
      const details = error.details as { status?: unknown; statusText?: unknown } | undefined;
      const status = cleanText(details?.status);
      if (status === 'ABORTED') {
        timingLog(traceId, `${stage}:aborted`, {
          ms: elapsedMs(requestStartedAt),
          timeoutMs,
          transport: 'browser-render',
          url: shortenForLog(url),
        });
      } else if (status === 'TIMEOUT') {
        timingLog(traceId, `${stage}:timeout`, {
          ms: elapsedMs(requestStartedAt),
          timeoutMs,
          transport: 'browser-render',
          url: shortenForLog(url),
        });
      } else if (status === 'NETWORK_ERROR') {
        timingLog(traceId, `${stage}:network_error`, {
          ms: elapsedMs(requestStartedAt),
          timeoutMs,
          transport: 'browser-render',
          url: shortenForLog(url),
          message: cleanText(details?.statusText) || error.message,
        });
      }

      throw error;
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
  }
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
  return normalizeListingCandidateSeeds(
    $('a[href]')
      .toArray()
      .map((node, order) => ({
        href: cleanText($(node).attr('href')),
        order,
        dateHint: extractCandidateDateHint($, node),
      })),
  );
}

function collectCandidateDescriptorsFromSeeds(
  page: URL,
  pageUrl: string,
  sameDomainOnly: boolean,
  dateRange: DateRange,
  seeds: ListingCandidateSeed[],
): CandidateCollectionResult {
  const result = collectListingCandidateDescriptorsFromSeeds(
    page,
    pageUrl,
    sameDomainOnly,
    dateRange,
    normalizeListingCandidateSeeds(seeds),
    {
      inRangeDateHintScoreBoost: IN_RANGE_DATE_HINT_SCORE_BOOST,
      minSortedDateHintsForEarlyStop: MIN_SORTED_DATE_HINTS_FOR_EARLY_STOP,
      minConsecutiveOlderDateHintsForEarlyStop:
        MIN_CONSECUTIVE_OLDER_DATE_HINTS_FOR_EARLY_STOP,
    },
  );

  return {
    ...result,
    extractorId: null,
    extractorDiagnostics: null,
    paginationStopEvaluation: null,
  };
}

function evaluateExtractorPaginationStop({
  extractor,
  page,
  pageUrl,
  pageNumber,
  dateRange,
  extraction,
}: {
  extractor: ListingCandidateExtractor;
  page: URL;
  pageUrl: string;
  pageNumber: number;
  dateRange: DateRange;
  extraction: ListingCandidateExtraction;
}) {
  if (!extractor.evaluatePaginationStop) {
    return null;
  }

  return (
    extractor.evaluatePaginationStop({
      page,
      pageUrl,
      pageNumber,
      dateRange,
      extraction,
    }) ?? null
  );
}

async function collectListingCandidateDescriptors(
  page: URL,
  pageUrl: string,
  $: ReturnType<typeof load>,
  extractor: ListingCandidateExtractor | null,
  sameDomainOnly: boolean,
  dateRange: DateRange,
  traceId: string,
  pageNumber: number,
): Promise<CandidateCollectionResult> {
  if (extractor) {
    let extracted = extractor.extract({
      page,
      pageUrl,
      $,
    });
    if (extracted && extracted.candidates.length > 0 && extractor.refineExtraction) {
      const refined = await extractor.refineExtraction({
        page,
        pageUrl,
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
        page,
        pageUrl,
        pageNumber,
        dateRange,
        extraction: extracted,
      });
      const result = collectCandidateDescriptorsFromSeeds(
        page,
        pageUrl,
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
    page,
    pageUrl,
    sameDomainOnly,
    dateRange,
    buildGenericCandidateSeeds($),
  );
}

async function collectListingCandidateDescriptorsFromWebContentExtraction({
  page,
  pageUrl,
  extractor,
  sameDomainOnly,
  dateRange,
  traceId,
  pageNumber,
  previewExtraction,
}: {
  page: URL;
  pageUrl: string;
  extractor: ListingCandidateExtractor;
  sameDomainOnly: boolean;
  dateRange: DateRange;
  traceId: string;
  pageNumber: number;
  previewExtraction: WebContentExtractionSnapshot;
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
      page,
      pageUrl,
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
    page,
    pageUrl,
    sameDomainOnly,
    dateRange,
    extracted.candidates,
  );
  const paginationStopEvaluation = evaluateExtractorPaginationStop({
    extractor,
    page,
    pageUrl,
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
      webContentUrl: previewExtraction.webContentUrl,
      source: 'web-content',
      webContentReuseMode: 'live-extract',
    },
    paginationStopEvaluation,
  };
}

async function fetchLatestArticlesFromPageOnce({
  sourceId,
  pageUrl,
  journalTitle,
  preferredExtractorId,
  remainingLimit,
  sameDomainOnly,
  dateRange,
  traceId,
  options,
  fetchedSourceUrls,
  seenPageUrls,
  pageNumber,
}: {
  sourceId: string;
  pageUrl: string;
  journalTitle: string;
  preferredExtractorId: string | null;
  remainingLimit: number;
  sameDomainOnly: boolean;
  dateRange: DateRange;
  traceId: string;
  options: FetchLatestArticlesOptions;
  fetchedSourceUrls: Set<string>;
  seenPageUrls: ReadonlySet<string>;
  pageNumber: number;
}): Promise<PageFetchResult> {
  const page = new URL(pageUrl);
  const extractor = findListingCandidateExtractor(page, preferredExtractorId);
  const fetched: Article[] = [];
  const pagePathname = page.pathname.toLowerCase();
  const isLikelyArticleDetailSource = isLikelyArticleDetailPagePath(pagePathname);
  const hasArticlePath = hasArticlePathSignal(pagePathname);
  let fetchChannel: FetchChannel = 'network';
  let webContentReuseMode: WebContentReuseMode | null = null;
  let candidateCollection: CandidateCollectionResult | null = null;
  let $: ReturnType<typeof load> | null = null;
  let webContentNextPageUrl: string | null = null;
  let fetchStatusReported = false;
  const emitFetchStatus = (overrides: Partial<FetchStatus> = {}) => {
    const reporter = options.onFetchStatus;
    if (typeof reporter !== 'function') return;

    reporter({
      sourceId,
      pageUrl,
      pageNumber,
      fetchChannel,
      fetchDetail: describeFetchDetail(fetchChannel, webContentReuseMode),
      webContentReuseMode,
      extractorId: extractor?.id ?? null,
      ...overrides,
    });
  };
  const reportFetchStatus = () => {
    if (fetchStatusReported) return;
    emitFetchStatus();
    fetchStatusReported = true;
  };

  const webContentExtraction = options.previewExtractions?.get(pageUrl) ?? null;
  const webContentExtractionPlan = buildWebContentExtractionFetchPlan({
    fetchStrategy: options.fetchStrategy,
    hasWebContentExtraction: Boolean(webContentExtraction),
    hasExtractor: Boolean(extractor),
    pageNumber,
    isLikelyArticleDetailPage: isLikelyArticleDetailSource || hasArticlePath,
  });

  if (webContentExtraction && !webContentExtractionPlan.shouldAttempt) {
    timingLog(traceId, 'source:page_web_content_extract_skipped', {
      pageNumber,
      reason: webContentExtractionPlan.reason,
      requestedStrategy: webContentExtractionPlan.requestedStrategy,
      webContentUrl: shortenForLog(webContentExtraction.webContentUrl),
      extractorId: extractor?.id ?? null,
    });
  }

  if (webContentExtractionPlan.shouldAttempt && webContentExtraction && extractor) {
    candidateCollection = await collectListingCandidateDescriptorsFromWebContentExtraction({
      page,
      pageUrl,
      extractor,
      sameDomainOnly,
      dateRange,
      traceId,
      pageNumber,
      previewExtraction: webContentExtraction,
    });
    if (candidateCollection && candidateCollection.candidates.length > 0) {
      fetchChannel = 'web-content';
      webContentReuseMode = webContentExtractionPlan.webContentReuseMode;
      webContentNextPageUrl = webContentExtraction.nextPageUrl;
      timingLog(traceId, 'source:page_web_content_extract_applied', {
        pageNumber,
        extractorId: webContentExtraction.extractorId,
        requestedStrategy: webContentExtractionPlan.requestedStrategy,
        candidateCount: candidateCollection.candidates.length,
        captureMs: webContentExtraction.captureMs,
        nextPageUrl: shortenForLog(webContentNextPageUrl ?? ''),
        webContentUrl: shortenForLog(webContentExtraction.webContentUrl),
        reuseMode: 'live-web-content-dom',
        historicalCache: false,
      });
    }
  }

  if (!candidateCollection) {
    const pageResult = await resolvePageHtml(pageUrl, traceId, options);
    fetchChannel = pageResult.source;
    webContentReuseMode = pageResult.source === 'web-content' ? 'snapshot' : null;
    reportFetchStatus();
    let html = pageResult.html;
    const pageParseStartedAt = Date.now();
    let pageArticle = buildArticleFromHtml(pageUrl, html);
    $ = load(html);
    timingLog(traceId, 'source:page_parsed', {
      pageNumber,
      ms: elapsedMs(pageParseStartedAt),
      fetchChannel: pageResult.source,
      webContentReuseMode,
      hasTitle: Boolean(pageArticle.title),
      hasDoi: Boolean(pageArticle.doi),
      hasAbstract: Boolean(pageArticle.abstractText),
      hasDescription: Boolean(pageArticle.descriptionText),
      publishedAt: pageArticle.publishedAt,
    });

    if (
      hasArticlePath &&
      hasStrongArticleSignals(pageUrl, pageArticle) &&
      isWithinDateRange(pageArticle.publishedAt, dateRange)
    ) {
      pageArticle.sourceId = sourceId;
      if (journalTitle) {
        pageArticle.journalTitle = journalTitle;
      }
      fetchedSourceUrls.add(pageArticle.sourceUrl);
      fetched.push(pageArticle);
      timingLog(traceId, 'source:page_accepted', {
        pageNumber,
        sourceUrl: shortenForLog(pageArticle.sourceUrl),
      });
      if (fetched.length >= remainingLimit) {
        return {
          fetchChannel,
          webContentReuseMode,
          articles: fetched,
          candidateAttempted: 0,
          candidateResolved: 0,
          candidateAccepted: 0,
          usedPageOnly: true,
          nextPageUrl: null,
          stoppedByDateHint: false,
        };
      }
    }

    if (isLikelyArticleDetailSource) {
      timingLog(traceId, 'source:page_detail_only', {
        pageNumber,
        sourceUrl: shortenForLog(pageUrl),
        pageAccepted: fetched.length > 0,
      });
      return {
        fetchChannel,
        webContentReuseMode,
        articles: fetched,
        candidateAttempted: 0,
        candidateResolved: 0,
        candidateAccepted: 0,
        usedPageOnly: true,
        nextPageUrl: null,
        stoppedByDateHint: false,
      };
    }

    candidateCollection = await collectListingCandidateDescriptors(
      page,
      pageUrl,
      $,
      extractor,
      sameDomainOnly,
      dateRange,
      traceId,
      pageNumber,
    );
    if (
      candidateCollection.candidates.length === 0 &&
      pageResult.source === 'network' &&
      !pageResult.usedRenderFallback &&
      ENABLE_BROWSER_RENDER_FALLBACK
    ) {
      try {
        const renderedPageHtml = await fetchRenderedHtml(pageUrl, {
          timeoutMs: PAGE_RENDER_TIMEOUT_MS,
          traceId,
          stage: 'source_page_render',
        });
        html = renderedPageHtml;
        pageArticle = buildArticleFromHtml(pageUrl, html);
        $ = load(html);
        candidateCollection = await collectListingCandidateDescriptors(
          page,
          pageUrl,
          $,
          extractor,
          sameDomainOnly,
          dateRange,
          traceId,
          pageNumber,
        );
        timingLog(traceId, 'source:page_render_applied', {
          pageNumber,
          candidateCount: candidateCollection.candidates.length,
          hasTitle: Boolean(pageArticle.title),
          hasAbstract: Boolean(pageArticle.abstractText),
          hasDescription: Boolean(pageArticle.descriptionText),
          publishedAt: pageArticle.publishedAt,
        });
      } catch (error) {
        timingLog(traceId, 'source:page_render_skipped', {
          pageNumber,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  reportFetchStatus();

  const resolvedCandidateCollection =
    candidateCollection ??
    collectCandidateDescriptorsFromSeeds(page, pageUrl, sameDomainOnly, dateRange, []);

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
    emitFetchStatus({
      paginationStopped: true,
      paginationStopReason: paginationStopEvaluation?.reason ?? 'extractor_policy',
    });
    timingLog(traceId, 'source:pagination_policy_stop', {
      pageNumber,
      reason: paginationStopEvaluation?.reason ?? 'extractor_policy',
      ...(paginationStopEvaluation?.diagnostics ?? {}),
    });
  }

  const candidatePlan = planCandidateFetch(candidates, {
    extractorId,
    remainingLimit,
    datedCandidateCount,
    inRangeDateHintCount,
    hasDateRangeFilter: Boolean(dateRange.start || dateRange.end),
    minCandidateAttempts: MIN_CANDIDATE_ATTEMPTS,
    attemptsPerLimit: ATTEMPTS_PER_LIMIT,
    extractorAttemptsMultiplier: EXTRACTOR_ATTEMPTS_MULTIPLIER,
    extractorAttemptsMinBuffer: EXTRACTOR_ATTEMPTS_MIN_BUFFER,
    fastExtractorAttemptsMultiplier: EXTRACTOR_FAST_ATTEMPTS_MULTIPLIER,
    fastExtractorAttemptsMinBuffer: EXTRACTOR_FAST_ATTEMPTS_MIN_BUFFER,
    dateHintHighCoverageThreshold: DATE_HINT_HIGH_COVERAGE_THRESHOLD,
    extractorCandidateFetchConcurrency: EXTRACTOR_CANDIDATE_FETCH_CONCURRENCY,
    candidateFetchConcurrency: CANDIDATE_FETCH_CONCURRENCY,
    retryPriorityMinOrder: RETRY_PRIORITY_MIN_ORDER,
    retryPriorityLimitMultiplier: RETRY_PRIORITY_LIMIT_MULTIPLIER,
  });
  const maxAttempts = candidatePlan.candidatesToFetch.length;
  const candidateSlotsRemaining = Math.max(remainingLimit - fetched.length, 0);
  timingLog(traceId, 'source:candidates_ready', {
    pageNumber,
    linkCount,
    candidateCount: candidates.length,
    prioritizedCount: candidatePlan.prioritizedCandidates.length,
    attemptBudget: candidatePlan.attemptBudget,
    attemptBudgetMode: candidatePlan.attemptBudgetMode,
    defaultAttemptBudget: candidatePlan.defaultAttemptBudget,
    extractorAttemptBudget: candidatePlan.extractorAttemptBudget,
    fastExtractorAttemptBudget: candidatePlan.fastExtractorAttemptBudget,
    datedCandidateCount,
    inRangeDateHintCount,
    dateHintCoverageRatio: candidatePlan.dateHintCoverageRatio,
    dateFilteredCount,
    stoppedByDateHint,
    sortedDateHintsObserved,
    consecutiveOlderDateHints,
    retryEligibleMaxOrder: candidatePlan.retryEligibleMaxOrder,
    candidateFetchConcurrency: candidatePlan.candidateFetchConcurrency,
  });

  let candidateAttempted = 0;
  let candidateResolved = 0;
  let candidateAccepted = 0;
  let candidateSettled = 0;
  let acceptedSinceLastBatchLog = 0;
  let nextCandidateIndex = 0;
  let nextBatchLogAt = Math.min(candidatePlan.candidateFetchConcurrency, maxAttempts);
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

    const lastBatchUpperBound = Math.max(0, nextBatchLogAt - candidatePlan.candidateFetchConcurrency);
    const canLogRegularBatch = candidateSettled >= nextBatchLogAt;
    const canLogPartialBatch = force && candidateSettled > lastBatchUpperBound;
    if (!canLogRegularBatch && !canLogPartialBatch) return;

    const batchStartOrder = lastBatchUpperBound + 1;
    const batchSize = Math.min(candidatePlan.candidateFetchConcurrency, candidateSettled - lastBatchUpperBound);
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
      nextBatchLogAt += candidatePlan.candidateFetchConcurrency;
    }
  };

  const workerCount = Math.min(candidatePlan.candidateFetchConcurrency, maxAttempts);
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
        const candidate = candidatePlan.candidatesToFetch[currentIndex];
        let accepted = false;
        const requestController = new AbortController();
        inFlightControllers.set(candidateOrder, requestController);

        try {
          const candidateArticle = buildArticleFromCandidate(candidate);
          if (candidateArticle && isProbablyArticle(candidate.url, candidateArticle)) {
            timingLog(traceId, 'candidate:parsed', {
              pageNumber,
              candidateOrder,
              ms: 0,
              score: candidate.score,
              url: shortenForLog(candidate.url),
              hasTitle: Boolean(candidateArticle.title),
              hasDoi: Boolean(candidateArticle.doi),
              hasAbstract: Boolean(candidateArticle.abstractText),
              hasDescription: Boolean(candidateArticle.descriptionText),
              publishedAt: candidateArticle.publishedAt,
              rendered: false,
              prefetched: true,
            });
            candidateResolved += 1;

            if (!isWithinDateRange(candidateArticle.publishedAt, dateRange)) {
              continue;
            }
            if (fetchedSourceUrls.has(candidateArticle.sourceUrl)) {
              continue;
            }

            candidateArticle.sourceId = sourceId;
            if (journalTitle) {
              candidateArticle.journalTitle = journalTitle;
            }

            fetchedSourceUrls.add(candidateArticle.sourceUrl);
            acceptedCandidates.push({
              candidateOrder,
              article: candidateArticle,
            });
            accepted = true;
            candidateAccepted += 1;
            continue;
          }

          const allowTimeoutRetry = Boolean(
            extractorId ||
              (candidateOrder <= candidatePlan.retryEligibleMaxOrder && candidate.dateHint === null),
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
          if (candidate.descriptionText) {
            article.descriptionText = candidate.descriptionText;
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
            hasDescription: Boolean(article.descriptionText),
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
      ? webContentNextPageUrl && !seenPageUrls.has(webContentNextPageUrl)
        ? webContentNextPageUrl
        : extractor?.findNextPageUrl && $
          ? extractor.findNextPageUrl({
              page,
              pageUrl,
              $,
              seenPageUrls,
            })
          : null
      : null;

  return {
    fetchChannel,
    webContentReuseMode,
    articles: fetched,
    candidateAttempted,
    candidateResolved,
    candidateAccepted,
    usedPageOnly: false,
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

async function resolvePageHtml(
  pageUrl: string,
  traceId: string,
  options: FetchLatestArticlesOptions,
): Promise<PageHtmlResult> {
  const webContentSnapshot = options.previewSnapshots?.get(pageUrl) ?? null;
  const pageHtmlFetchPlan = buildPageHtmlFetchPlan({
    fetchStrategy: options.fetchStrategy,
    hasWebContentSnapshot: Boolean(webContentSnapshot),
  });
  let networkAttemptPromise: Promise<NetworkAttemptResult> | null = null;

  const startNetworkAttempt = () => {
    if (!networkAttemptPromise) {
      networkAttemptPromise = attemptNetworkHtml(
        {
          pageUrl,
          traceId,
          stage: pageHtmlFetchPlan.networkStage,
          benchmarkStage: pageHtmlFetchPlan.shouldStartNetworkBenchmark ? 'source:page_benchmark_done' : null,
          pageFetchTimeoutMs: PAGE_FETCH_TIMEOUT_MS,
        },
        {
          fetchHtml,
          describeError,
        },
      );
    }

    return networkAttemptPromise;
  };

  const useNetwork = async (reason: string) => {
    const attemptResult = await startNetworkAttempt();
    return resolveNetworkAttemptResult(
      {
        pageUrl,
        traceId,
        reason,
        attemptResult,
        renderStage: 'source_page_render_on_error',
        pageRenderTimeoutMs: PAGE_RENDER_TIMEOUT_MS,
      },
      {
        fetchRenderedHtml,
        shouldRenderPageAfterError,
        describeError,
        toErrorStatusCode,
      },
    );
  };

  timingLog(traceId, 'source:page_strategy', {
    requestedStrategy: pageHtmlFetchPlan.requestedStrategy,
    effectiveStrategy: pageHtmlFetchPlan.effectiveStrategy,
    hasWebContentSnapshot: Boolean(webContentSnapshot),
    webContentCaptureMs: webContentSnapshot?.captureMs ?? null,
    webContentSize: webContentSnapshot?.html.length ?? null,
    webContentIsLoading: webContentSnapshot?.isLoading ?? null,
  });

  if (pageHtmlFetchPlan.selectedChannel === 'network' || !webContentSnapshot) {
    return useNetwork('network_only');
  }

  if (pageHtmlFetchPlan.shouldStartNetworkBenchmark) {
    timingLog(traceId, 'source:page_benchmark_started', {
      against: 'network',
      url: shortenForLog(pageUrl),
    });
    void startNetworkAttempt();
  }

  if (!hasUsableWebContentPageHtml(webContentSnapshot.html)) {
    timingLog(traceId, 'source:page_web_content_skipped', {
      reason: 'web_content_html_invalid',
      webContentUrl: shortenForLog(webContentSnapshot.webContentUrl),
      captureMs: webContentSnapshot.captureMs,
      size: webContentSnapshot.html.length,
    });
    return useNetwork('web_content_html_invalid');
  }

  if (webContentSnapshot.isLoading) {
    timingLog(traceId, 'source:page_web_content_loading', {
      webContentUrl: shortenForLog(webContentSnapshot.webContentUrl),
      captureMs: webContentSnapshot.captureMs,
      size: webContentSnapshot.html.length,
    });
  }

  timingLog(traceId, 'source_page_web_content:ok', {
    ms: webContentSnapshot.captureMs,
    size: webContentSnapshot.html.length,
    url: shortenForLog(pageUrl),
    webContentUrl: shortenForLog(webContentSnapshot.webContentUrl),
  });
  timingLog(traceId, 'source:page_selected', {
    selected: 'web-content',
    reason: pageHtmlFetchPlan.effectiveStrategy,
    size: webContentSnapshot.html.length,
    captureMs: webContentSnapshot.captureMs,
    url: shortenForLog(pageUrl),
  });

  return {
    html: webContentSnapshot.html,
    source: 'web-content',
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
      hasDescription: Boolean(article.descriptionText),
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

function normalizePageSources(payload: FetchLatestArticlesPayload): PageSource[] {
  const payloadSources = Array.isArray(payload.sources) ? payload.sources : [];
  const mapped = payloadSources
    .map((item, index) => {
      const pageUrl = resolvePayloadSourcePageUrl(item);
      if (!pageUrl) return null;

      const normalizedPageUrl = normalizeNatureMainSiteListingUrl(pageUrl);

      return {
        sourceId: normalizeSourceId(item?.sourceId, index),
        pageUrl: normalizedPageUrl,
        journalTitle: cleanText(item?.journalTitle),
        preferredExtractorId: cleanText(item?.preferredExtractorId) || null,
      } satisfies PageSource;
    })
    .filter((source): source is PageSource => Boolean(source));
  const deduped = new Map<string, PageSource>();

  for (const source of mapped) {
    const existing = deduped.get(source.pageUrl);
    if (!existing) {
      deduped.set(source.pageUrl, source);
      continue;
    }

    if (!existing.journalTitle && source.journalTitle) {
      deduped.set(source.pageUrl, source);
      continue;
    }

    if (!existing.preferredExtractorId && source.preferredExtractorId) {
      deduped.set(source.pageUrl, source);
    }
  }

  return [...deduped.values()];
}

async function fetchLatestArticlesFromPage(
  sourceId: string,
  pageUrl: string,
  journalTitle: string,
  preferredExtractorId: string | null,
  perSourceLimit: number,
  sameDomainOnly: boolean,
  dateRange: DateRange,
  traceId: string,
  options: FetchLatestArticlesOptions,
): Promise<Article[]> {
  const sourceStartedAt = Date.now();
  timingLog(traceId, 'source:start', {
    sourceId,
    pageUrl: shortenForLog(pageUrl),
    preferredExtractorId,
    perSourceLimit,
    sameDomainOnly,
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
  });

  try {
    const fetched: Article[] = [];
    const fetchedSourceUrls = new Set<string>();
    const seenPageUrls = new Set<string>();
    let pageCount = 0;
    let totalCandidateAttempted = 0;
    let totalCandidateResolved = 0;
    let totalCandidateAccepted = 0;
    let usedPageOnly = false;
    let lastFetchChannel: FetchChannel = 'network';
    let lastPreviewReuseMode: WebContentReuseMode | null = null;
    let currentPageUrl: string | null = pageUrl;

    while (currentPageUrl && fetched.length < perSourceLimit && pageCount < MAX_PAGINATED_PAGE_COUNT) {
      const normalizedPageUrl = new URL(currentPageUrl).toString();
      if (seenPageUrls.has(normalizedPageUrl)) {
        timingLog(traceId, 'source:pagination_loop_detected', {
          pageCount,
          pageUrl: shortenForLog(normalizedPageUrl),
        });
        break;
      }

      seenPageUrls.add(normalizedPageUrl);
      pageCount += 1;

      const pageResult = await fetchLatestArticlesFromPageOnce({
        sourceId,
        pageUrl: normalizedPageUrl,
        journalTitle,
        preferredExtractorId,
        remainingLimit: perSourceLimit - fetched.length,
        sameDomainOnly,
        dateRange,
        traceId,
        options,
        fetchedSourceUrls,
        seenPageUrls,
        pageNumber: pageCount,
      });

      lastFetchChannel = pageResult.fetchChannel;
      lastPreviewReuseMode = pageResult.webContentReuseMode;
      totalCandidateAttempted += pageResult.candidateAttempted;
      totalCandidateResolved += pageResult.candidateResolved;
      totalCandidateAccepted += pageResult.candidateAccepted;
      usedPageOnly = usedPageOnly || pageResult.usedPageOnly;

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
        currentPageNumber: pageCount,
        nextPageUrl: shortenForLog(pageResult.nextPageUrl),
        fetchedCount: fetched.length,
      });
      currentPageUrl = pageResult.nextPageUrl;
    }

    if (pageCount >= MAX_PAGINATED_PAGE_COUNT && currentPageUrl && fetched.length < perSourceLimit) {
      timingLog(traceId, 'source:pagination_page_limit_reached', {
        pageCount,
        maxPageCount: MAX_PAGINATED_PAGE_COUNT,
        fetchedCount: fetched.length,
      });
    }

    timingLog(traceId, 'source:done', {
      totalMs: elapsedMs(sourceStartedAt),
      fetchChannel: lastFetchChannel,
      webContentReuseMode: lastPreviewReuseMode,
      pageCount,
      fetchedCount: fetched.length,
      candidateAttempted: totalCandidateAttempted,
      candidateResolved: totalCandidateResolved,
      candidateAccepted: totalCandidateAccepted,
      usedPageOnly,
      paginated: pageCount > 1,
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
  const pageSources = normalizePageSources(payload);
  if (pageSources.length === 0) {
    throw appError('BATCH_PAGE_URLS_EMPTY');
  }

  const configuredUserLimit = await resolveConfiguredUserBatchLimit(storage);
  // Per-source cap comes only from persisted user settings.
  const perSourceLimit = configuredUserLimit;
  const sameDomainOnly = payload.sameDomainOnly !== false;
  const dateRange = parseDateRange(payload.startDate ?? null, payload.endDate ?? null);
  const fetchStrategy = normalizeFetchStrategy(options.fetchStrategy ?? payload.fetchStrategy);
  const fetched: Article[] = [];
  const seenSourceUrls = new Set<string>();
  const failedSources: Array<Record<string, unknown>> = [];
  let rawFetchedCount = 0;
  timingLog(traceId, 'batch:start', {
    sourceCount: pageSources.length,
    perSourceLimit,
    configuredUserLimit,
    systemLimit: SYSTEM_BATCH_LIMIT_MAX,
    sameDomainOnly,
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
    fetchStrategy,
    previewSnapshotCount: options.previewSnapshots?.size ?? 0,
    previewExtractionCount: options.previewExtractions?.size ?? 0,
  });

  for (let index = 0; index < pageSources.length; index += SOURCE_FETCH_CONCURRENCY) {
    const batch = pageSources.slice(index, index + SOURCE_FETCH_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (source) => {
        try {
          const pageArticles = await fetchLatestArticlesFromPage(
            source.sourceId,
            source.pageUrl,
            source.journalTitle,
            source.preferredExtractorId,
            perSourceLimit,
            sameDomainOnly,
            dateRange,
            `${traceId}:${source.sourceId}`,
            options,
          );

          return {
            ok: true as const,
            source,
            articles: pageArticles,
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
          sourceUrl: shortenForLog(result.source.pageUrl),
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
        sourceUrl: shortenForLog(source.pageUrl),
        message: error instanceof Error ? error.message : String(error),
      });
      if (isAppError(error)) {
        failedSources.push({
          sourceId: source.sourceId,
          pageUrl: source.pageUrl,
          code: error.code,
          details: error.details,
        });
      } else {
        failedSources.push({
          sourceId: source.sourceId,
          pageUrl: source.pageUrl,
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
  void storage
    .saveFetchedArticles(fetched)
    .then(() => {
      timingLog(traceId, 'batch:save_done', {
        ms: elapsedMs(saveStartedAt),
        count: fetched.length,
        deferred: true,
      });
    })
    .catch((error) => {
      timingLog(traceId, 'batch:save_failed', {
        ms: elapsedMs(saveStartedAt),
        count: fetched.length,
        deferred: true,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  timingLog(traceId, 'batch:done', {
    totalMs: elapsedMs(totalStartedAt),
    sourceCount: pageSources.length,
    rawFetchedCount,
    dedupedCount: fetched.length,
    dedupeDropped: Math.max(0, rawFetchedCount - fetched.length),
    failedSourceCount: failedSources.length,
    historySave: 'deferred',
  });
  return fetched;
}
