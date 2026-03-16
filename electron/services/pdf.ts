import path from 'node:path';
import { promises as fs } from 'node:fs';
import { load } from 'cheerio';
import type { BrowserWindow, DownloadItem, Session, WebContents } from 'electron';

import type { PreviewDownloadPdfPayload } from '../types.js';
import { buildPdfFileName } from '../utils/pdf-file-name.js';
import { cleanText } from '../utils/text.js';
import { normalizeUrl } from '../utils/url.js';
import { appError, isAppError } from '../utils/app-error.js';
import { fetchHtml } from './article-fetcher.js';
import { READER_SHARED_WEB_PARTITION } from './browser-partitions.js';
import {
  buildNatureResearchPdfDownloadCandidates,
  extractNatureResearchPdfDownloadCandidatesFromHtml,
} from './nature-pdf.js';
import { withValidatedSciencePageWindow } from './science-validation.js';

const PDF_FETCH_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const PDF_FETCH_ACCEPT = 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8';
const SCIENCE_DOI_PATH_RE = /^\/doi\/(?:abs\/|epdf\/|pdf\/)?(.+)$/i;

type BrowserPdfFetch = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  partition: string;
};

type PdfDownloadAttemptFailure = {
  url: string;
  status: string | number;
  statusText: string;
  contentType?: string;
};

type PdfDownloadAttemptSuccess = {
  finalUrl: string;
  buffer: Buffer;
  contentDisposition: string;
};

type BrowserSessionDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type ValidatedSciencePageDownloadOptions = {
  useWindowFetchProbe?: boolean;
};

type BrowserSessionDownloadEvent = {
  preventDefault: () => void;
  readonly defaultPrevented: boolean;
};

const SCIENCE_PDF_LOG_ENABLED = process.env.READER_FETCH_TIMING !== '0';

let browserPdfFetchPromise: Promise<BrowserPdfFetch | null> | null = null;
let browserPdfFetchUnsupported = false;
let sciencePdfDownloadQueueTail: Promise<void> = Promise.resolve();
let sciencePdfDownloadQueueDepth = 0;

function logSciencePdf(stage: string, details: Record<string, unknown>) {
  if (!SCIENCE_PDF_LOG_ENABLED) return;

  let encodedDetails = '';
  try {
    encodedDetails = JSON.stringify(details);
  } catch {
    encodedDetails = '{"error":"unserializable_log_details"}';
  }

  console.info(`[science-pdf] ${stage} ${encodedDetails}`);
}

function summarizeScienceFailures(failures: PdfDownloadAttemptFailure[]) {
  return failures.map((failure) => ({
    url: failure.url,
    status: failure.status,
    statusText: failure.statusText,
    contentType: failure.contentType || '',
  }));
}

async function runSerializedSciencePdfDownload<T>(
  pageUrl: string,
  task: () => Promise<T>,
): Promise<T> {
  const waitForTurn = sciencePdfDownloadQueueTail;
  let releaseTurn = () => {};
  sciencePdfDownloadQueueDepth += 1;
  const queuePosition = sciencePdfDownloadQueueDepth;
  sciencePdfDownloadQueueTail = new Promise<void>((resolve) => {
    releaseTurn = resolve;
  });

  if (queuePosition > 1) {
    logSciencePdf('queued', {
      pageUrl,
      queuePosition,
    });
  }

  await waitForTurn.catch(() => {});
  logSciencePdf('queue_enter', {
    pageUrl,
    queuePosition,
  });

  try {
    return await task();
  } finally {
    sciencePdfDownloadQueueDepth = Math.max(0, sciencePdfDownloadQueueDepth - 1);
    releaseTurn();
    logSciencePdf('queue_exit', {
      pageUrl,
      remainingQueueDepth: sciencePdfDownloadQueueDepth,
    });
  }
}

function pickMetaContent($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr('content'));
    if (value) return value;
  }

  return '';
}

function toAbsoluteHttpUrl(rawUrl: string, pageUrl: string) {
  try {
    const resolved = new URL(rawUrl, pageUrl);
    if (!/^https?:$/i.test(resolved.protocol)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function scorePdfLinkCandidate(
  href: string,
  absoluteUrl: string,
  contextText: string,
  mimeType: string,
  rel: string,
  hasDownloadAttribute: boolean,
) {
  const hrefText = `${href} ${absoluteUrl}`.toLowerCase();
  const context = contextText.toLowerCase();
  const loweredMime = mimeType.toLowerCase();
  const loweredRel = rel.toLowerCase();

  let score = 0;

  if (/\.pdf(?:$|[?#])/i.test(hrefText)) score += 220;
  if (/\bapplication\/pdf\b/i.test(loweredMime)) score += 200;
  if (hasDownloadAttribute) score += 150;

  if (/(?:[?&](?:format|filetype|type|mime)=pdf(?:[&#]|$)|\/e?pdf(?:[/?#]|$))/i.test(hrefText)) {
    score += 140;
  }

  if (/\/doi\/epdf\//i.test(hrefText)) {
    score += 120;
  }

  if (/\b(download|fulltext|full-text|getpdf|viewpdf|pdfviewer)\b/i.test(hrefText)) {
    score += 70;
  }

  if (/\b(pdf|download\s*pdf|view\s*pdf|full\s*text)\b/i.test(context)) {
    score += 90;
  }

  if (/\b(?:btn-pdf|icon-pdf)\b/i.test(context)) {
    score += 60;
  }

  if (/\b(?:alternate|attachment)\b/i.test(loweredRel)) {
    score += 30;
  }

  if (/\b(citation|bibtex|endnote|ris|supplement|dataset|metadata|xml|fig(ure)?s?)\b/i.test(`${hrefText} ${context}`)) {
    score -= 140;
  }

  if (/\.(zip|csv|xml|json|docx?|pptx?|xlsx?)(?:$|[?#])/i.test(hrefText)) {
    score -= 260;
  }

  return score;
}

export function extractPdfUrl(pageUrl: string, html: string) {
  const $ = load(html);
  const fromMeta = pickMetaContent($, [
    'meta[name="citation_pdf_url"]',
    'meta[property="citation_pdf_url"]',
    'meta[name="wkhealth_pdf_url"]',
    'meta[name="pdf_url"]',
    'meta[property="pdf_url"]',
  ]);
  if (fromMeta) {
    return toAbsoluteHttpUrl(fromMeta, pageUrl) ?? fromMeta;
  }

  const scoredCandidates = new Map<string, number>();
  const hrefNodes = $('a[href], link[href], area[href]').toArray();

  for (const node of hrefNodes) {
    const element = $(node);
    const href = cleanText(element.attr('href'));
    if (!href) continue;

    const absoluteUrl = toAbsoluteHttpUrl(href, pageUrl);
    if (!absoluteUrl) continue;

    const textParts = [
      cleanText(element.text()),
      cleanText(element.attr('title')),
      cleanText(element.attr('aria-label')),
      cleanText(element.attr('data-track-action')),
      cleanText(element.attr('data-track-label')),
      cleanText(element.attr('class')),
    ].filter(Boolean);

    const contextText = textParts.join(' ');
    const mimeType = cleanText(element.attr('type'));
    const rel = cleanText(element.attr('rel'));
    const hasDownloadAttribute = element.attr('download') !== undefined;

    const score = scorePdfLinkCandidate(
      href,
      absoluteUrl,
      contextText,
      mimeType,
      rel,
      hasDownloadAttribute,
    );
    const existingScore = scoredCandidates.get(absoluteUrl) ?? Number.NEGATIVE_INFINITY;
    if (score > existingScore) {
      scoredCandidates.set(absoluteUrl, score);
    }
  }

  if (scoredCandidates.size > 0) {
    const best = [...scoredCandidates.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 100) {
      return best[0];
    }
  }

  const hrefCandidates = [...scoredCandidates.keys()];
  for (const href of hrefCandidates) {
    if (!/\.pdf(?:$|[?#])/i.test(href)) continue;

    return href;
  }

  const regexMatch = html.match(/https?:\/\/[^\s"'<>]+\.pdf(?:\?[^\s"'<>]*)?/i);
  return regexMatch ? regexMatch[0] : null;
}

function isScienceHost(hostname: string) {
  const normalizedHost = cleanText(hostname).toLowerCase();
  return normalizedHost === 'science.org' || normalizedHost === 'www.science.org';
}

function normalizeComparableDownloadUrl(value: string) {
  const normalized = cleanText(value);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function extractScienceDoiPath(pathname: string) {
  const normalizedPathname = cleanText(pathname).replace(/\/+$/, '');
  const matched = normalizedPathname.match(SCIENCE_DOI_PATH_RE);
  return cleanText(matched?.[1] ?? '');
}

function buildScienceDirectPdfDownloadCandidates(inputUrl: string) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(inputUrl);
  } catch {
    parsed = null;
  }

  if (!parsed || !isScienceHost(parsed.hostname)) {
    return [];
  }

  const doiPath = extractScienceDoiPath(parsed.pathname);
  if (!doiPath) {
    return [];
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  const addCandidate = (value: string) => {
    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    candidates.push(value);
  };

  const pdfPath = `/doi/pdf/${doiPath}`;
  const downloadUrl = new URL(pdfPath, parsed.origin);
  downloadUrl.searchParams.set('download', 'true');
  addCandidate(downloadUrl.toString());
  addCandidate(new URL(pdfPath, parsed.origin).toString());

  return candidates;
}

function buildScienceEpdfPageUrl(inputUrl: string) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(inputUrl);
  } catch {
    parsed = null;
  }

  if (!parsed || !isScienceHost(parsed.hostname)) {
    return null;
  }

  const doiPath = extractScienceDoiPath(parsed.pathname);
  if (!doiPath) {
    return null;
  }

  return new URL(`/doi/epdf/${doiPath}`, parsed.origin).toString();
}

function buildPdfDownloadCandidates(pdfUrl: string, pageUrl: string) {
  const seen = new Set<string>();
  const candidates: string[] = [];
  const addCandidate = (value: string) => {
    const absolute = toAbsoluteHttpUrl(value, pageUrl);
    if (!absolute || seen.has(absolute)) {
      return;
    }

    seen.add(absolute);
    candidates.push(absolute);
  };

  const absolutePdfUrl = toAbsoluteHttpUrl(pdfUrl, pageUrl) ?? pdfUrl;
  const scienceCandidates = buildScienceDirectPdfDownloadCandidates(absolutePdfUrl);
  if (scienceCandidates.length > 0) {
    for (const scienceCandidate of scienceCandidates) {
      addCandidate(scienceCandidate);
    }

    return candidates;
  }

  const natureCandidates = buildNatureResearchPdfDownloadCandidates(absolutePdfUrl);
  for (const natureCandidate of natureCandidates) {
    addCandidate(natureCandidate);
  }

  addCandidate(absolutePdfUrl);
  return candidates;
}

function buildDirectPdfDownloadCandidatesForUrl(pageUrl: string) {
  return [
    ...new Set([
      ...buildScienceDirectPdfDownloadCandidates(pageUrl),
      ...buildNatureResearchPdfDownloadCandidates(pageUrl),
    ]),
  ];
}

function resolveDownloadItemFinalUrl(item: DownloadItem, fallbackUrl: string) {
  const urlChain = typeof item.getURLChain === 'function' ? item.getURLChain() : [];
  const finalUrl = urlChain[urlChain.length - 1] || item.getURL();
  return cleanText(finalUrl) || fallbackUrl;
}

async function readFilePrefix(filePath: string, length: number) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(Math.max(0, length));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function assertDownloadedFileIsPdf({
  item,
  filePath,
  downloadUrl,
  origin,
}: {
  item: DownloadItem;
  filePath: string;
  downloadUrl: string;
  origin: string;
}) {
  const mimeType = cleanText(
    typeof item.getMimeType === 'function' ? item.getMimeType() : '',
  ).toLowerCase();
  const filePrefix = await readFilePrefix(filePath, 5);
  const isPdfMimeType = /\bapplication\/pdf\b/i.test(mimeType);
  const looksPdf = isPdfMimeType || isPdfBuffer(filePrefix);

  if (looksPdf) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore cleanup failures and surface the original validation failure.
  }

  throw appError('PDF_DOWNLOAD_FAILED', {
    status: 'NOT_PDF_RESPONSE',
    statusText: mimeType
      ? `Unexpected downloaded content-type: ${mimeType}`
      : 'Downloaded file does not look like a PDF file',
    contentType: mimeType,
    downloadUrl,
    filePath,
    origin,
  });
}

function buildScienceContextDownloadTriggerScript(downloadUrl: string) {
  const serializedDownloadUrl = JSON.stringify(downloadUrl);
  return `(() => {
    const resolvedUrl = new URL(${serializedDownloadUrl}, location.href).toString();
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

function matchesDownloadItemUrl(item: DownloadItem, expectedUrl: string) {
  const normalizedExpectedUrl = normalizeComparableDownloadUrl(expectedUrl);
  if (!normalizedExpectedUrl) {
    return true;
  }

  if (normalizeComparableDownloadUrl(item.getURL()) === normalizedExpectedUrl) {
    return true;
  }

  const urlChain = typeof item.getURLChain === 'function' ? item.getURLChain() : [];
  return urlChain.some((entry) => normalizeComparableDownloadUrl(entry) === normalizedExpectedUrl);
}

async function resolveBrowserDownloadSession() {
  try {
    const electronModule = (await import('electron')) as {
      app?: { isReady?: () => boolean };
      session?: {
        fromPartition?: (
          partition: string,
        ) => Session;
      };
    };

    const electronApp = electronModule.app;
    const electronSession = electronModule.session;
    if (!electronApp || typeof electronApp.isReady !== 'function' || !electronApp.isReady()) {
      return null;
    }
    if (!electronSession || typeof electronSession.fromPartition !== 'function') {
      return null;
    }

    const chromiumSession = electronSession.fromPartition(READER_SHARED_WEB_PARTITION);
    if (!chromiumSession || typeof chromiumSession.downloadURL !== 'function') {
      return null;
    }

    return chromiumSession;
  } catch {
    return null;
  }
}

async function resolveReaderSharedSession() {
  try {
    const electronModule = (await import('electron')) as {
      app?: { isReady?: () => boolean };
      session?: {
        fromPartition?: (
          partition: string,
        ) => Session;
      };
    };

    const electronApp = electronModule.app;
    const electronSession = electronModule.session;
    if (!electronApp || typeof electronApp.isReady !== 'function' || !electronApp.isReady()) {
      return null;
    }
    if (!electronSession || typeof electronSession.fromPartition !== 'function') {
      return null;
    }

    return electronSession.fromPartition(READER_SHARED_WEB_PARTITION);
  } catch {
    return null;
  }
}

async function clearScienceSessionState() {
  const readerSession = await resolveReaderSharedSession();
  if (!readerSession) {
    return false;
  }

  const origins = ['https://www.science.org', 'https://science.org'];
  const storages: Array<
    'cookies' | 'localstorage' | 'indexdb' | 'cachestorage' | 'serviceworkers'
  > = [
    'cookies',
    'localstorage',
    'indexdb',
    'cachestorage',
    'serviceworkers',
  ];

  try {
    for (const origin of origins) {
      await readerSession.clearStorageData({
        origin,
        storages,
      });
    }
  } catch {
    // Ignore partial cleanup failures and continue with best-effort reset.
  }

  try {
    await readerSession.clearAuthCache();
  } catch {
    // Ignore auth-cache cleanup failures.
  }

  try {
    await readerSession.clearCache();
  } catch {
    // Ignore HTTP cache cleanup failures.
  }

  return true;
}

async function triggerBrowserSessionDownload(
  downloadUrl: string,
  pageUrl: string,
  downloadDir: string,
  articleTitle = '',
  timeoutMs = 45000,
): Promise<BrowserSessionDownloadResult | null> {
  const session = await resolveBrowserDownloadSession();
  if (!session) {
    return null;
  }

  return await new Promise<BrowserSessionDownloadResult | null>((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      session.removeListener('will-download', handleWillDownload);
    };

    const resolveOnce = (value: BrowserSessionDownloadResult | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const handleWillDownload = (
      _event: BrowserSessionDownloadEvent,
      item: DownloadItem,
    ) => {
      if (!matchesDownloadItemUrl(item, downloadUrl)) {
        return;
      }

      const fallbackName = (() => {
        try {
          return path.basename(new URL(downloadUrl).pathname) || '';
        } catch {
          return '';
        }
      })();
      const fileName = buildPdfFileName(articleTitle, item.getFilename() || fallbackName);
      const filePath = path.join(downloadDir, fileName);
      item.setSavePath(filePath);

      item.once('done', (_doneEvent, state) => {
        void (async () => {
          if (state !== 'completed') {
            rejectOnce(
              appError('PDF_DOWNLOAD_FAILED', {
                status: `DOWNLOAD_${String(state).toUpperCase()}`,
                statusText: `Browser-session download ${state}`,
                downloadUrl,
                filePath,
                sourceUrl: resolveDownloadItemFinalUrl(item, downloadUrl),
              }),
            );
            return;
          }

          await assertDownloadedFileIsPdf({
            item,
            filePath,
            downloadUrl,
            origin: 'browser_session',
          });

          resolveOnce({
            filePath,
            sourceUrl: resolveDownloadItemFinalUrl(item, downloadUrl),
          });
        })().catch((error) => rejectOnce(error));
      });
    };

    timeoutId = setTimeout(() => {
      resolveOnce(null);
    }, Math.max(0, timeoutMs));

    session.on('will-download', handleWillDownload);

    try {
      session.downloadURL(downloadUrl, {
        headers: buildPdfFetchHeaders(pageUrl),
      });
    } catch (error) {
      rejectOnce(error);
    }
  });
}

async function triggerValidatedSciencePageDownload(
  window: BrowserWindow,
  downloadUrl: string,
  downloadDir: string,
  articleTitle = '',
  timeoutMs = 45000,
): Promise<BrowserSessionDownloadResult | null> {
  const webContents = window.webContents;
  if (webContents.isDestroyed()) {
    return null;
  }

  const session = webContents.session;
  return await new Promise<BrowserSessionDownloadResult | null>((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      session.removeListener('will-download', handleWillDownload);
    };

    const resolveOnce = (value: BrowserSessionDownloadResult | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const handleWillDownload = (
      _event: BrowserSessionDownloadEvent,
      item: DownloadItem,
      originatingWebContents?: WebContents,
    ) => {
      if (originatingWebContents && originatingWebContents.id !== webContents.id) {
        return;
      }
      if (!matchesDownloadItemUrl(item, downloadUrl)) {
        return;
      }

      const fallbackName = (() => {
        try {
          return path.basename(new URL(downloadUrl).pathname) || '';
        } catch {
          return '';
        }
      })();
      const fileName = buildPdfFileName(articleTitle, item.getFilename() || fallbackName);
      const filePath = path.join(downloadDir, fileName);
      item.setSavePath(filePath);

      item.once('done', (_doneEvent, state) => {
        void (async () => {
          if (state !== 'completed') {
            rejectOnce(
              appError('PDF_DOWNLOAD_FAILED', {
                status: `DOWNLOAD_${String(state).toUpperCase()}`,
                statusText: `Validated page download ${state}`,
                downloadUrl,
                filePath,
                sourceUrl: resolveDownloadItemFinalUrl(item, downloadUrl),
              }),
            );
            return;
          }

          await assertDownloadedFileIsPdf({
            item,
            filePath,
            downloadUrl,
            origin: 'validated_page',
          });

          resolveOnce({
            filePath,
            sourceUrl: resolveDownloadItemFinalUrl(item, downloadUrl),
          });
        })().catch((error) => rejectOnce(error));
      });
    };

    timeoutId = setTimeout(() => {
      resolveOnce(null);
    }, Math.max(0, timeoutMs));

    session.on('will-download', handleWillDownload);

    webContents
      .executeJavaScript(buildScienceContextDownloadTriggerScript(downloadUrl), true)
      .catch((error) => rejectOnce(error));
  });
}

async function resolveBrowserPdfFetch() {
  if (browserPdfFetchUnsupported) {
    return null;
  }

  if (!browserPdfFetchPromise) {
    browserPdfFetchPromise = (async () => {
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
          browserPdfFetchUnsupported = true;
          return null;
        }
        if (!electronApp.isReady()) {
          return null;
        }
        if (!electronSession || typeof electronSession.fromPartition !== 'function') {
          browserPdfFetchUnsupported = true;
          return null;
        }

        const chromiumSession = electronSession.fromPartition(READER_SHARED_WEB_PARTITION);
        if (!chromiumSession || typeof chromiumSession.fetch !== 'function') {
          browserPdfFetchUnsupported = true;
          return null;
        }

        return {
          fetch: chromiumSession.fetch.bind(chromiumSession),
          partition: READER_SHARED_WEB_PARTITION,
        } satisfies BrowserPdfFetch;
      } catch {
        browserPdfFetchUnsupported = true;
        return null;
      }
    })();
  }

  const resolved = await browserPdfFetchPromise;
  if (!resolved && !browserPdfFetchUnsupported) {
    browserPdfFetchPromise = null;
  }

  return resolved;
}

function buildPdfFetchHeaders(pageUrl: string) {
  const headers: Record<string, string> = {
    'user-agent': PDF_FETCH_USER_AGENT,
    accept: PDF_FETCH_ACCEPT,
  };
  const referer = cleanText(pageUrl);
  if (referer) {
    headers.referer = referer;
  }
  return headers;
}

async function fetchPdfWithPreferredTransport(candidateUrl: string, pageUrl: string) {
  const headers = buildPdfFetchHeaders(pageUrl);
  const browserPdfFetch = await resolveBrowserPdfFetch();
  if (browserPdfFetch) {
    try {
      return await browserPdfFetch.fetch(candidateUrl, {
        headers,
      });
    } catch {
      // Fall back to node fetch when browser-session fetch is unavailable for this request.
    }
  }

  return fetch(candidateUrl, { headers });
}

function isPdfBuffer(buffer: Buffer) {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

async function attemptPdfDownloadWithFetcher(
  fetcher: (url: string, init: RequestInit) => Promise<Response>,
  candidateUrl: string,
  pageUrl: string,
): Promise<
  | {
      ok: true;
      value: PdfDownloadAttemptSuccess;
    }
  | {
      ok: false;
      failure: PdfDownloadAttemptFailure;
    }
> {
  try {
    const response = await fetcher(candidateUrl, {
      headers: buildPdfFetchHeaders(pageUrl),
    });
    if (!response.ok) {
      return {
        ok: false,
        failure: {
          url: candidateUrl,
          status: response.status,
          statusText: response.statusText || 'HTTP request failed',
        },
      };
    }

    const contentType = cleanText(response.headers.get('content-type')).toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    const isPdfContentType = /\bapplication\/pdf\b/i.test(contentType);
    const looksPdf = isPdfContentType || isPdfBuffer(buffer);
    if (!looksPdf) {
      return {
        ok: false,
        failure: {
          url: candidateUrl,
          status: 'NOT_PDF_RESPONSE',
          statusText: contentType
            ? `Unexpected content-type: ${contentType}`
            : 'Response body does not look like a PDF file',
          contentType,
        },
      };
    }

    return {
      ok: true,
      value: {
        finalUrl: cleanText(response.url) || candidateUrl,
        buffer,
        contentDisposition: cleanText(response.headers.get('content-disposition')),
      },
    };
  } catch (error) {
    return {
      ok: false,
      failure: {
        url: candidateUrl,
        status: 'NETWORK_ERROR',
        statusText: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function attemptPdfDownload(
  candidateUrl: string,
  pageUrl: string,
): Promise<
  | {
      ok: true;
      value: PdfDownloadAttemptSuccess;
    }
  | {
      ok: false;
      failure: PdfDownloadAttemptFailure;
    }
> {
  return await attemptPdfDownloadWithFetcher(
    async (url, _init) => await fetchPdfWithPreferredTransport(url, pageUrl),
    candidateUrl,
    pageUrl,
  );
}

async function tryDownloadPdfCandidates(candidateUrls: string[], pageUrl: string) {
  const failures: PdfDownloadAttemptFailure[] = [];
  let downloaded: PdfDownloadAttemptSuccess | null = null;

  for (const candidateUrl of candidateUrls) {
    const attempt = await attemptPdfDownload(candidateUrl, pageUrl);
    if (attempt.ok) {
      downloaded = attempt.value;
      break;
    }

    failures.push(attempt.failure);
  }

  return {
    downloaded,
    failures,
  };
}

function toPdfDownloadFailure(url: string, status: string | number, statusText: string): PdfDownloadAttemptFailure {
  return {
    url,
    status,
    statusText,
  };
}

function shouldRetryScienceDownloadWithCleanSession(failures: PdfDownloadAttemptFailure[]) {
  if (failures.length === 0) {
    return false;
  }

  return failures.some((failure) => {
    const status = String(failure.status).toUpperCase();
    return (
      status === '403' ||
      status === 'NOT_PDF_RESPONSE' ||
      status === 'DOWNLOAD_INTERRUPTED' ||
      status === 'DOWNLOAD_NOT_TRIGGERED' ||
      status === 'SCIENCE_VALIDATION_REQUIRED'
    );
  });
}

function toPdfDownloadFailureFromError(url: string, error: unknown): PdfDownloadAttemptFailure {
  if (isAppError(error)) {
    const details = error.details ?? {};
    return {
      url,
      status: cleanText(details.status) || error.code,
      statusText: cleanText(details.statusText) || error.message || 'Browser-session download failed',
      contentType: cleanText(details.contentType),
    };
  }

  return {
    url,
    status: 'BROWSER_SESSION_ERROR',
    statusText: error instanceof Error ? error.message : String(error),
  };
}

async function tryBrowserSessionDownloadCandidates(
  candidateUrls: string[],
  pageUrl: string,
  downloadDir: string,
  articleTitle = '',
) {
  const failures: PdfDownloadAttemptFailure[] = [];

  for (const downloadUrl of candidateUrls) {
    try {
      const browserDownload = await triggerBrowserSessionDownload(
        downloadUrl,
        pageUrl,
        downloadDir,
        articleTitle,
      );
      if (browserDownload) {
        return {
          downloaded: browserDownload,
          failures,
        };
      }

      failures.push(
        toPdfDownloadFailure(
          downloadUrl,
          'DOWNLOAD_NOT_TRIGGERED',
          'Browser-session download was not triggered',
        ),
      );
    } catch (error) {
      failures.push(toPdfDownloadFailureFromError(downloadUrl, error));
    }
  }

  return {
    downloaded: null,
    failures,
  };
}

function shouldContinueWaitingForValidatedScienceAuthorization(
  failure: PdfDownloadAttemptFailure,
) {
  const status = String(failure.status).toUpperCase();
  return (
    status === '403' ||
    status === 'NOT_PDF_RESPONSE' ||
    status === 'NETWORK_ERROR'
  );
}

async function tryValidatedScienceWindowFetch(
  window: BrowserWindow,
  downloadUrl: string,
  refererUrl: string,
  downloadDir: string,
  articleTitle = '',
  timeoutMs = 12000,
  pollMs = 500,
) {
  const failures: PdfDownloadAttemptFailure[] = [];
  const session = window.webContents.session;
  if (!session || typeof session.fetch !== 'function') {
    return {
      downloaded: null,
      failures: [
        toPdfDownloadFailure(
          downloadUrl,
          'SCIENCE_VALIDATION_FETCH_UNAVAILABLE',
          'Validation window session fetch is unavailable',
        ),
      ],
    };
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const attempt = await attemptPdfDownloadWithFetcher(
      session.fetch.bind(session),
      downloadUrl,
      refererUrl,
    );
    if (attempt.ok) {
      return {
        downloaded: await persistDownloadedPdf(attempt.value, downloadDir, articleTitle),
        failures,
      };
    }

    failures.push(attempt.failure);
    if (!shouldContinueWaitingForValidatedScienceAuthorization(attempt.failure)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return {
    downloaded: null,
    failures,
  };
}

async function tryValidatedSciencePageDownload(
  pageUrl: string,
  downloadUrl: string,
  downloadDir: string,
  articleTitle = '',
  options: ValidatedSciencePageDownloadOptions = {},
) {
  const { useWindowFetchProbe = false } = options;

  try {
    const downloaded = await withValidatedSciencePageWindow(pageUrl, async (window, validation) => {
      const validatedWindowFetchAttempt = useWindowFetchProbe
        ? await tryValidatedScienceWindowFetch(
            window,
            downloadUrl,
            validation.finalUrl || pageUrl,
            downloadDir,
            articleTitle,
          )
        : {
            downloaded: null,
            failures: [] as PdfDownloadAttemptFailure[],
          };
      if (validatedWindowFetchAttempt.downloaded) {
        logSciencePdf('validated_window_fetch_success', {
          pageUrl,
          sourceUrl: validatedWindowFetchAttempt.downloaded.sourceUrl,
          filePath: validatedWindowFetchAttempt.downloaded.filePath,
        });
        return validatedWindowFetchAttempt.downloaded;
      }

      if (useWindowFetchProbe && validatedWindowFetchAttempt.failures.length > 0) {
        logSciencePdf('validated_window_fetch_not_ready', {
          pageUrl,
          failures: summarizeScienceFailures(validatedWindowFetchAttempt.failures),
        });
      }

      const clickedDownload = await triggerValidatedSciencePageDownload(
        window,
        downloadUrl,
        downloadDir,
        articleTitle,
      );
      if (clickedDownload) {
        return clickedDownload;
      }

      if (validatedWindowFetchAttempt.failures.length > 0) {
        const latestFailure =
          validatedWindowFetchAttempt.failures[validatedWindowFetchAttempt.failures.length - 1];
        throw appError('PDF_DOWNLOAD_FAILED', {
          status: latestFailure?.status ?? 'DOWNLOAD_NOT_TRIGGERED',
          statusText:
            latestFailure?.statusText ??
            'Validated Science page became visible before PDF authorization was ready',
          url: downloadUrl,
        });
      }

      return null;
    });

    return {
      downloaded,
      failures: [] as PdfDownloadAttemptFailure[],
    };
  } catch (error) {
    return {
      downloaded: null,
      failures: [toPdfDownloadFailureFromError(downloadUrl, error)],
    };
  }
}

function parseContentDispositionFileName(contentDisposition: string) {
  const normalized = cleanText(contentDisposition);
  if (!normalized) return '';

  const encodedMatch = normalized.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')?([^;]+)/i);
  if (encodedMatch?.[1]) {
    const rawValue = cleanText(encodedMatch[1]).replace(/^"(.*)"$/, '$1');
    try {
      return cleanText(decodeURIComponent(rawValue));
    } catch {
      return rawValue;
    }
  }

  const plainMatch = normalized.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch?.[1]) {
    return cleanText(plainMatch[1]).replace(/^"(.*)"$/, '$1');
  }

  return '';
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function persistDownloadedPdf(
  downloaded: PdfDownloadAttemptSuccess,
  downloadDir: string,
  articleTitle = '',
): Promise<BrowserSessionDownloadResult> {
  const parsed = new URL(downloaded.finalUrl);
  const fallbackName = path.basename(parsed.pathname) || `article-${Date.now()}.pdf`;
  const fileNameFromHeader = parseContentDispositionFileName(downloaded.contentDisposition);
  const fileName = buildPdfFileName(
    articleTitle,
    fileNameFromHeader || safeDecodeURIComponent(fallbackName),
  );
  const filePath = path.join(downloadDir, fileName);
  await fs.writeFile(filePath, downloaded.buffer);

  return {
    filePath,
    sourceUrl: downloaded.finalUrl,
  };
}

function resolveStrictScienceDownloadTargets(
  pageUrl: string,
  explicitDownloadUrl: string | null,
  directCandidateUrls: string[],
) {
  const scienceValidationUrl =
    buildScienceEpdfPageUrl(pageUrl) ||
    (explicitDownloadUrl ? buildScienceEpdfPageUrl(explicitDownloadUrl) : null) ||
    pageUrl ||
    explicitDownloadUrl ||
    directCandidateUrls[0] ||
    '';
  const preferredScienceDownloadUrl = directCandidateUrls[0] || explicitDownloadUrl || '';
  if (!scienceValidationUrl || !preferredScienceDownloadUrl) {
    return null;
  }

  return {
    scienceValidationUrl,
    preferredScienceDownloadUrl,
  };
}

type PreviewPdfDownloadRequest = {
  pageUrl: string;
  explicitDownloadUrl: string | null;
  articleTitle: string;
  downloadDir: string;
  previewPageHtml: string | null;
  strictScienceCandidateUrls: string[];
};

async function previewDownloadStrictSciencePdf({
  pageUrl,
  explicitDownloadUrl,
  articleTitle,
  downloadDir,
  directCandidateUrls,
}: Pick<PreviewPdfDownloadRequest, 'pageUrl' | 'explicitDownloadUrl' | 'articleTitle' | 'downloadDir'> & {
  directCandidateUrls: string[];
}) {
  logSciencePdf('start', {
    pageUrl,
    explicitDownloadUrl,
    directCandidateUrls,
    downloadDir,
    strategy: 'validated-window-primary',
  });

  const failures: PdfDownloadAttemptFailure[] = [];
  const strictTargets = resolveStrictScienceDownloadTargets(
    pageUrl,
    explicitDownloadUrl,
    directCandidateUrls,
  );

  if (strictTargets) {
    logSciencePdf('validated_page_attempt', {
      pageUrl,
      scienceValidationUrl: strictTargets.scienceValidationUrl,
      preferredScienceDownloadUrl: strictTargets.preferredScienceDownloadUrl,
      strategy: 'primary_shared_window',
    });
    const validatedPageDownloadAttempt = await tryValidatedSciencePageDownload(
      strictTargets.scienceValidationUrl,
      strictTargets.preferredScienceDownloadUrl,
      downloadDir,
      articleTitle,
      {
        useWindowFetchProbe: false,
      },
    );
    if (validatedPageDownloadAttempt.downloaded) {
      logSciencePdf('validated_page_success', {
        pageUrl,
        sourceUrl: validatedPageDownloadAttempt.downloaded.sourceUrl,
        filePath: validatedPageDownloadAttempt.downloaded.filePath,
      });
      return validatedPageDownloadAttempt.downloaded;
    }

    failures.push(...validatedPageDownloadAttempt.failures);
    if (validatedPageDownloadAttempt.failures.length > 0) {
      logSciencePdf('validated_page_failed', {
        pageUrl,
        failures: summarizeScienceFailures(validatedPageDownloadAttempt.failures),
      });
    } else {
      failures.push(
        toPdfDownloadFailure(
          strictTargets.preferredScienceDownloadUrl,
          'DOWNLOAD_NOT_TRIGGERED',
          'Validated Science page click did not trigger a download',
        ),
      );
    }

    if (shouldRetryScienceDownloadWithCleanSession(failures)) {
      logSciencePdf('session_reset_retry', {
        pageUrl,
        failures: summarizeScienceFailures(failures),
      });
      await clearScienceSessionState();

      const cleanValidatedPageDownloadAttempt = await tryValidatedSciencePageDownload(
        strictTargets.scienceValidationUrl,
        strictTargets.preferredScienceDownloadUrl,
        downloadDir,
        articleTitle,
        {
          useWindowFetchProbe: false,
        },
      );
      if (cleanValidatedPageDownloadAttempt.downloaded) {
        logSciencePdf('session_reset_validated_page_success', {
          pageUrl,
          sourceUrl: cleanValidatedPageDownloadAttempt.downloaded.sourceUrl,
          filePath: cleanValidatedPageDownloadAttempt.downloaded.filePath,
        });
        return cleanValidatedPageDownloadAttempt.downloaded;
      }

      failures.push(...cleanValidatedPageDownloadAttempt.failures);
      if (cleanValidatedPageDownloadAttempt.failures.length > 0) {
        logSciencePdf('session_reset_validated_page_failed', {
          pageUrl,
          failures: summarizeScienceFailures(cleanValidatedPageDownloadAttempt.failures),
        });
      } else {
        failures.push(
          toPdfDownloadFailure(
            strictTargets.preferredScienceDownloadUrl,
            'DOWNLOAD_NOT_TRIGGERED',
            'Validated Science page click did not trigger a download after session reset',
          ),
        );
      }
    }
  }

  const browserDownloadAttempt = await tryBrowserSessionDownloadCandidates(
    directCandidateUrls,
    pageUrl,
    downloadDir,
    articleTitle,
  );
  if (browserDownloadAttempt.downloaded) {
    logSciencePdf('browser_session_success', {
      pageUrl,
      sourceUrl: browserDownloadAttempt.downloaded.sourceUrl,
      filePath: browserDownloadAttempt.downloaded.filePath,
      strategy: 'fallback_shared_session',
    });
    return browserDownloadAttempt.downloaded;
  }

  failures.push(...browserDownloadAttempt.failures);
  if (browserDownloadAttempt.failures.length > 0) {
    logSciencePdf('direct_attempts_failed', {
      pageUrl,
      failures: summarizeScienceFailures(browserDownloadAttempt.failures),
      strategy: 'fallback_shared_session',
      directCandidateUrls,
    });
  }

  const directDownloadAttempt =
    directCandidateUrls.length > 0
      ? await tryDownloadPdfCandidates(directCandidateUrls, pageUrl)
      : { downloaded: null, failures: [] as PdfDownloadAttemptFailure[] };
  if (directDownloadAttempt.downloaded) {
    logSciencePdf('http_fetch_success', {
      pageUrl,
      finalUrl: directDownloadAttempt.downloaded.finalUrl,
      strategy: 'fallback_http_fetch',
    });
    return await persistDownloadedPdf(directDownloadAttempt.downloaded, downloadDir, articleTitle);
  }

  failures.push(...directDownloadAttempt.failures);
  const latestFailure = failures[failures.length - 1];
  logSciencePdf('failed', {
    pageUrl,
    attemptedUrls: directCandidateUrls,
    failures: summarizeScienceFailures(failures),
  });
  throw appError('PDF_DOWNLOAD_FAILED', {
    status: latestFailure?.status ?? 'NETWORK_ERROR',
    statusText:
      latestFailure?.statusText ?? 'Unable to download Science PDF from shared-session window',
    pageUrl,
    attemptedUrls: directCandidateUrls,
    failures,
  });
}

async function previewDownloadPdfWithResolvedRequest({
  pageUrl,
  explicitDownloadUrl,
  articleTitle,
  downloadDir,
  previewPageHtml,
  strictScienceCandidateUrls,
}: PreviewPdfDownloadRequest) {
  const isStrictScienceDownload = strictScienceCandidateUrls.length > 0;
  const directCandidateUrls = isStrictScienceDownload
    ? strictScienceCandidateUrls
    : [
        ...new Set([
          ...extractNatureResearchPdfDownloadCandidatesFromHtml(pageUrl, previewPageHtml ?? ''),
          ...(explicitDownloadUrl ? buildDirectPdfDownloadCandidatesForUrl(explicitDownloadUrl) : []),
          ...buildDirectPdfDownloadCandidatesForUrl(pageUrl),
          explicitDownloadUrl,
        ].filter((value): value is string => Boolean(value))),
      ];
  if (isStrictScienceDownload) {
    return await previewDownloadStrictSciencePdf({
      pageUrl,
      explicitDownloadUrl,
      articleTitle,
      downloadDir,
      directCandidateUrls,
    });
  }

  const browserDownloadAttempt = await tryBrowserSessionDownloadCandidates(
    directCandidateUrls,
    pageUrl,
    downloadDir,
    articleTitle,
  );
  if (browserDownloadAttempt.downloaded) {
    return browserDownloadAttempt.downloaded;
  }

  const directDownloadAttempt =
    directCandidateUrls.length > 0
      ? await tryDownloadPdfCandidates(directCandidateUrls, pageUrl)
      : { downloaded: null, failures: [] as PdfDownloadAttemptFailure[] };

  let downloaded = directDownloadAttempt.downloaded;
  let detectedPdfUrl = downloaded?.finalUrl ?? '';
  const failures: PdfDownloadAttemptFailure[] = [
    ...browserDownloadAttempt.failures,
    ...directDownloadAttempt.failures,
  ];

  if (!downloaded) {
    let html = typeof previewPageHtml === 'string' && previewPageHtml.trim() ? previewPageHtml : '';
    if (!html) {
      try {
        html = await fetchHtml(pageUrl);
      } catch (error) {
        if (failures.length > 0) {
          const latestFailure = failures[failures.length - 1];
          throw appError('PDF_DOWNLOAD_FAILED', {
            status: latestFailure?.status ?? 'NETWORK_ERROR',
            statusText: latestFailure?.statusText ?? 'Unable to download PDF from detected links',
            pageUrl,
            attemptedUrls: directCandidateUrls,
            failures,
            pageFetchError: error instanceof Error ? error.message : String(error),
          });
        }

        throw error;
      }
    }

    const pdfUrl = extractPdfUrl(pageUrl, html);
    if (!pdfUrl) {
      throw appError('PDF_LINK_NOT_FOUND', { pageUrl });
    }
    detectedPdfUrl = pdfUrl;

    const resolvedCandidateUrls = buildPdfDownloadCandidates(pdfUrl, pageUrl);
    const resolvedDownloadAttempt = await tryDownloadPdfCandidates(resolvedCandidateUrls, pageUrl);
    downloaded = resolvedDownloadAttempt.downloaded;
    failures.push(...resolvedDownloadAttempt.failures);

    if (!downloaded) {
      const latestFailure = failures[failures.length - 1];
      throw appError('PDF_DOWNLOAD_FAILED', {
        status: latestFailure?.status ?? 'NETWORK_ERROR',
        statusText: latestFailure?.statusText ?? 'Unable to download PDF from detected links',
        pdfUrl,
        attemptedUrls: [...new Set([...directCandidateUrls, ...resolvedCandidateUrls])],
        failures,
      });
    }
  }

  const parsed = new URL(downloaded.finalUrl);
  const fallbackName = path.basename(parsed.pathname) || `article-${Date.now()}.pdf`;
  const fileNameFromHeader = parseContentDispositionFileName(downloaded.contentDisposition);
  const fileName = buildPdfFileName(
    articleTitle,
    fileNameFromHeader || safeDecodeURIComponent(fallbackName),
  );
  const filePath = path.join(downloadDir, fileName);
  await fs.writeFile(filePath, downloaded.buffer);

  return {
    filePath,
    sourceUrl: downloaded.finalUrl || detectedPdfUrl,
  };
}

export async function previewDownloadPdf(
  payload: PreviewDownloadPdfPayload = {},
  defaultDownloadDir: string,
  previewPageHtml: string | null = null,
) {
  const pageUrl = normalizeUrl(payload.pageUrl ?? '');
  const explicitDownloadUrl =
    typeof payload.downloadUrl === 'string'
      ? toAbsoluteHttpUrl(payload.downloadUrl, pageUrl)
      : null;
  const articleTitle =
    typeof payload.articleTitle === 'string' ? cleanText(payload.articleTitle) : '';
  const customDownloadDir =
    typeof payload.customDownloadDir === 'string' ? cleanText(payload.customDownloadDir) : '';
  const downloadDir = customDownloadDir || defaultDownloadDir;
  await fs.mkdir(downloadDir, { recursive: true });

  const strictScienceCandidateUrls = [
    ...new Set([
      ...buildScienceDirectPdfDownloadCandidates(pageUrl),
      ...(explicitDownloadUrl ? buildScienceDirectPdfDownloadCandidates(explicitDownloadUrl) : []),
    ]),
  ];
  const request: PreviewPdfDownloadRequest = {
    pageUrl,
    explicitDownloadUrl,
    articleTitle,
    downloadDir,
    previewPageHtml,
    strictScienceCandidateUrls,
  };

  if (strictScienceCandidateUrls.length > 0) {
    return await runSerializedSciencePdfDownload(pageUrl, async () => {
      return await previewDownloadPdfWithResolvedRequest(request);
    });
  }

  return await previewDownloadPdfWithResolvedRequest(request);
}
