import path from 'node:path';
import type { BrowserWindow, DownloadItem, WebContents } from 'electron';

import type { PdfDownloadResult } from '../../types.js';
import { buildPdfFileName } from '../../utils/pdf-file-name.js';
import { cleanText } from '../../utils/text.js';
import { appError } from '../../utils/app-error.js';
import {
  assertDownloadedFileIsPdf,
  attemptPdfDownloadWithFetcher,
  persistDownloadedPdf,
  resolveDownloadItemFinalUrl,
  resolveReaderSharedSession,
  toPdfDownloadFailure,
  toPdfDownloadFailureFromError,
  tryBrowserSessionDownloadCandidates,
  tryDownloadPdfCandidates,
  type BrowserSessionDownloadEvent,
  type BrowserSessionDownloadResult,
  type PdfDownloadAttemptFailure,
} from '../pdfRuntime.js';
import { buildScienceEpdfPageUrl } from '../sciencePdf.js';
import { withValidatedSciencePageWindow } from '../scienceValidation.js';
import type { PdfDownloadContext, PdfDownloadStrategy } from './pdfStrategyTypes.js';

type ScienceValidatedPageDownloadOptions = {
  useWindowFetchProbe?: boolean;
};

const SCIENCE_PDF_LOG_ENABLED = process.env.READER_FETCH_TIMING !== '0';

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

function findScienceValidationRequiredFailure(failures: PdfDownloadAttemptFailure[]) {
  return (
    failures.find((failure) => String(failure.status).toUpperCase() === 'SCIENCE_VALIDATION_REQUIRED') ??
    null
  );
}

function throwScienceDownloadFailure(
  request: PdfDownloadContext,
  failures: PdfDownloadAttemptFailure[],
): never {
  const prioritizedFailure =
    findScienceValidationRequiredFailure(failures) ?? failures[failures.length - 1] ?? null;
  throw appError('PDF_DOWNLOAD_FAILED', {
    status: prioritizedFailure?.status ?? 'NETWORK_ERROR',
    statusText:
      prioritizedFailure?.statusText ?? 'Unable to download Science PDF from shared-session window',
    pageUrl: request.pageUrl,
    attemptedUrls: request.sciencePdfCandidateUrls,
    failures,
  });
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

function buildScienceContextDownloadTriggerScript(downloadUrl: string) {
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
    const root = document.body || document.documentElement;
    if (!root) {
      throw new Error('Science download page is not ready.');
    }

    const preferredSelectors = [
      'a.navbar-download[href]',
      'a[data-single-download="true"][href]',
      'a[data-download-files-key="pdf"][href]',
      'a[aria-label*="Download PDF"][href]',
      'a[title*="Download PDF"][href]',
      'a[href*="/doi/pdf/"][href]',
    ];
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

function shouldContinueWaitingForValidatedScienceAuthorization(
  failure: PdfDownloadAttemptFailure,
) {
  const status = String(failure.status).toUpperCase();
  return status === '403' || status === 'NOT_PDF_RESPONSE' || status === 'NETWORK_ERROR';
}

async function tryValidatedScienceWindowFetch(
  window: BrowserWindow,
  downloadUrl: string,
  refererUrl: string,
  downloadDir: string,
  articleTitle = '',
  timeoutMs = 20000,
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
  options: ScienceValidatedPageDownloadOptions = {},
) {
  const { useWindowFetchProbe = true } = options;

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
      status === 'DOWNLOAD_NOT_TRIGGERED'
    );
  });
}

function resolveStrictScienceDownloadTargets(request: PdfDownloadContext) {
  const validationPageUrl =
    buildScienceEpdfPageUrl(request.pageUrl, request.doi) ||
    (request.requestedDownloadUrl
      ? buildScienceEpdfPageUrl(request.requestedDownloadUrl, request.doi)
      : null) ||
    request.pageUrl ||
    request.requestedDownloadUrl ||
    request.sciencePdfCandidateUrls[0] ||
    '';
  const preferredPdfUrl =
    request.sciencePdfCandidateUrls[0] || request.requestedDownloadUrl || '';
  if (!validationPageUrl || !preferredPdfUrl) {
    return null;
  }

  return {
    validationPageUrl,
    preferredPdfUrl,
  };
}

async function downloadSciencePdf(request: PdfDownloadContext): Promise<PdfDownloadResult> {
  return await runSerializedSciencePdfDownload(request.pageUrl, async () => {
    logSciencePdf('start', {
      pageUrl: request.pageUrl,
      requestedDownloadUrl: request.requestedDownloadUrl,
      doi: request.doi,
      directCandidateUrls: request.sciencePdfCandidateUrls,
      downloadDir: request.downloadDir,
      strategy: 'validated-window-primary',
    });

    const failures: PdfDownloadAttemptFailure[] = [];
    const strictDownloadTargets = resolveStrictScienceDownloadTargets(request);

    if (strictDownloadTargets) {
      logSciencePdf('validated_page_attempt', {
        pageUrl: request.pageUrl,
        validationPageUrl: strictDownloadTargets.validationPageUrl,
        preferredPdfUrl: strictDownloadTargets.preferredPdfUrl,
        strategy: 'primary_shared_window',
      });
      const validatedPageDownloadAttempt = await tryValidatedSciencePageDownload(
        strictDownloadTargets.validationPageUrl,
        strictDownloadTargets.preferredPdfUrl,
        request.downloadDir,
        request.articleTitle,
        {
          useWindowFetchProbe: true,
        },
      );
      if (validatedPageDownloadAttempt.downloaded) {
        logSciencePdf('validated_page_success', {
          pageUrl: request.pageUrl,
          sourceUrl: validatedPageDownloadAttempt.downloaded.sourceUrl,
          filePath: validatedPageDownloadAttempt.downloaded.filePath,
        });
        return validatedPageDownloadAttempt.downloaded;
      }

      failures.push(...validatedPageDownloadAttempt.failures);
      if (validatedPageDownloadAttempt.failures.length > 0) {
        logSciencePdf('validated_page_failed', {
          pageUrl: request.pageUrl,
          failures: summarizeScienceFailures(validatedPageDownloadAttempt.failures),
        });
        if (findScienceValidationRequiredFailure(validatedPageDownloadAttempt.failures)) {
          throwScienceDownloadFailure(request, failures);
        }
      } else {
        failures.push(
          toPdfDownloadFailure(
            strictDownloadTargets.preferredPdfUrl,
            'DOWNLOAD_NOT_TRIGGERED',
            'Validated Science page click did not trigger a download',
          ),
        );
      }

      if (shouldRetryScienceDownloadWithCleanSession(failures)) {
        logSciencePdf('session_reset_retry', {
          pageUrl: request.pageUrl,
          failures: summarizeScienceFailures(failures),
        });
        await clearScienceSessionState();

        const cleanValidatedPageDownloadAttempt = await tryValidatedSciencePageDownload(
          strictDownloadTargets.validationPageUrl,
          strictDownloadTargets.preferredPdfUrl,
          request.downloadDir,
          request.articleTitle,
          {
            useWindowFetchProbe: true,
          },
        );
        if (cleanValidatedPageDownloadAttempt.downloaded) {
          logSciencePdf('session_reset_validated_page_success', {
            pageUrl: request.pageUrl,
            sourceUrl: cleanValidatedPageDownloadAttempt.downloaded.sourceUrl,
            filePath: cleanValidatedPageDownloadAttempt.downloaded.filePath,
          });
          return cleanValidatedPageDownloadAttempt.downloaded;
        }

        failures.push(...cleanValidatedPageDownloadAttempt.failures);
        if (cleanValidatedPageDownloadAttempt.failures.length > 0) {
          logSciencePdf('session_reset_validated_page_failed', {
            pageUrl: request.pageUrl,
            failures: summarizeScienceFailures(cleanValidatedPageDownloadAttempt.failures),
          });
        } else {
          failures.push(
            toPdfDownloadFailure(
              strictDownloadTargets.preferredPdfUrl,
              'DOWNLOAD_NOT_TRIGGERED',
              'Validated Science page click did not trigger a download after session reset',
            ),
          );
        }
      }
    }

    const browserDownloadAttempt = await tryBrowserSessionDownloadCandidates(
      request.sciencePdfCandidateUrls,
      request.pageUrl,
      request.downloadDir,
      request.articleTitle,
    );
    if (browserDownloadAttempt.downloaded) {
      logSciencePdf('browser_session_success', {
        pageUrl: request.pageUrl,
        sourceUrl: browserDownloadAttempt.downloaded.sourceUrl,
        filePath: browserDownloadAttempt.downloaded.filePath,
        strategy: 'fallback_shared_session',
      });
      return browserDownloadAttempt.downloaded;
    }

    failures.push(...browserDownloadAttempt.failures);
    if (browserDownloadAttempt.failures.length > 0) {
      logSciencePdf('direct_attempts_failed', {
        pageUrl: request.pageUrl,
        failures: summarizeScienceFailures(browserDownloadAttempt.failures),
        strategy: 'fallback_shared_session',
        directCandidateUrls: request.sciencePdfCandidateUrls,
      });
    }

    const directDownloadAttempt =
      request.sciencePdfCandidateUrls.length > 0
        ? await tryDownloadPdfCandidates(request.sciencePdfCandidateUrls, request.pageUrl)
        : { downloaded: null, failures: [] as PdfDownloadAttemptFailure[] };
    if (directDownloadAttempt.downloaded) {
      logSciencePdf('http_fetch_success', {
        pageUrl: request.pageUrl,
        finalUrl: directDownloadAttempt.downloaded.finalUrl,
        strategy: 'fallback_http_fetch',
      });
      return await persistDownloadedPdf(
        directDownloadAttempt.downloaded,
        request.downloadDir,
        request.articleTitle,
      );
    }

    failures.push(...directDownloadAttempt.failures);
    logSciencePdf('failed', {
      pageUrl: request.pageUrl,
      attemptedUrls: request.sciencePdfCandidateUrls,
      failures: summarizeScienceFailures(failures),
    });
    throwScienceDownloadFailure(request, failures);
  });
}

export const sciencePdfStrategy: PdfDownloadStrategy = {
  id: 'science-exclusive',
  priority: 'exclusive',
  matches(request) {
    return request.sciencePdfCandidateUrls.length > 0;
  },
  async download(request) {
    return await downloadSciencePdf(request);
  },
};




