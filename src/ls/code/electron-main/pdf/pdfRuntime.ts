import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { DownloadItem, Session } from 'electron';

import { buildPdfFileName } from '../utils/pdf-file-name.js';
import { cleanText } from '../utils/text.js';
import { appError, isAppError } from '../utils/app-error.js';
import { READER_SHARED_WEB_PARTITION } from '../browserPartitions.js';

const PDF_FETCH_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const PDF_FETCH_ACCEPT = 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8';

export type BrowserPdfFetch = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  partition: string;
};

export type PdfDownloadAttemptFailure = {
  url: string;
  status: string | number;
  statusText: string;
  contentType?: string;
};

export type PdfDownloadAttemptSuccess = {
  finalUrl: string;
  buffer: Buffer;
  contentDisposition: string;
};

export type BrowserSessionDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

export type BrowserSessionDownloadEvent = {
  preventDefault: () => void;
  readonly defaultPrevented: boolean;
};

let browserPdfFetchPromise: Promise<BrowserPdfFetch | null> | null = null;
let browserPdfFetchUnsupported = false;

export function toAbsoluteHttpUrl(rawUrl: string, pageUrl: string) {
  try {
    const resolved = new URL(rawUrl, pageUrl);
    if (!/^https?:$/i.test(resolved.protocol)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

export function normalizeComparableDownloadUrl(value: string) {
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

export function resolveDownloadItemFinalUrl(item: DownloadItem, fallbackUrl: string) {
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

function isPdfBuffer(buffer: Buffer) {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

export async function assertDownloadedFileIsPdf({
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

async function resolveBrowserDownloadSession() {
  try {
    const electronModule = (await import('electron')) as {
      app?: { isReady?: () => boolean };
      session?: {
        fromPartition?: (partition: string) => Session;
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

export async function resolveReaderSharedSession() {
  try {
    const electronModule = (await import('electron')) as {
      app?: { isReady?: () => boolean };
      session?: {
        fromPartition?: (partition: string) => Session;
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

export async function attemptPdfDownloadWithFetcher(
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

export async function tryDownloadPdfCandidates(candidateUrls: string[], pageUrl: string) {
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

export function toPdfDownloadFailure(url: string, status: string | number, statusText: string): PdfDownloadAttemptFailure {
  return {
    url,
    status,
    statusText,
  };
}

export function toPdfDownloadFailureFromError(url: string, error: unknown): PdfDownloadAttemptFailure {
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
      if (normalizeComparableDownloadUrl(item.getURL()) !== normalizeComparableDownloadUrl(downloadUrl)) {
        const urlChain = typeof item.getURLChain === 'function' ? item.getURLChain() : [];
        const matchedChain = urlChain.some(
          (entry) => normalizeComparableDownloadUrl(entry) === normalizeComparableDownloadUrl(downloadUrl),
        );
        if (!matchedChain) {
          return;
        }
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

export async function tryBrowserSessionDownloadCandidates(
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

export async function persistDownloadedPdf(
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

