import { appError } from '../../utils/app-error.js';
import {
  persistDownloadedPdf,
  tryBrowserSessionDownloadCandidates,
  tryDownloadPdfCandidates,
  type PdfDownloadAttemptFailure,
} from '../pdf-runtime.js';
import type { PdfDownloadRequest, PdfDownloadStrategy } from './types.js';

const NATURE_PDF_LOG_ENABLED = process.env.READER_FETCH_TIMING !== '0';

function logNaturePdf(stage: string, details: Record<string, unknown>) {
  if (!NATURE_PDF_LOG_ENABLED) return;

  let encodedDetails = '';
  try {
    encodedDetails = JSON.stringify(details);
  } catch {
    encodedDetails = '{"error":"unserializable_log_details"}';
  }

  console.info(`[nature-pdf] ${stage} ${encodedDetails}`);
}

function summarizeNatureFailures(failures: PdfDownloadAttemptFailure[]) {
  return failures.map((failure) => ({
    url: failure.url,
    status: failure.status,
    statusText: failure.statusText,
    contentType: failure.contentType || '',
  }));
}

async function downloadNatureResearchPdf(request: PdfDownloadRequest) {
  logNaturePdf('start', {
    pageUrl: request.pageUrl,
    explicitDownloadUrl: request.explicitDownloadUrl,
    directCandidateUrls: request.natureCandidateUrls,
    downloadDir: request.downloadDir,
  });

  const browserDownloadAttempt = await tryBrowserSessionDownloadCandidates(
    request.natureCandidateUrls,
    request.pageUrl,
    request.downloadDir,
    request.articleTitle,
  );
  if (browserDownloadAttempt.downloaded) {
    logNaturePdf('browser_session_success', {
      pageUrl: request.pageUrl,
      sourceUrl: browserDownloadAttempt.downloaded.sourceUrl,
      filePath: browserDownloadAttempt.downloaded.filePath,
    });
    return browserDownloadAttempt.downloaded;
  }

  const failures: PdfDownloadAttemptFailure[] = [...browserDownloadAttempt.failures];
  if (browserDownloadAttempt.failures.length > 0) {
    logNaturePdf('browser_session_failed', {
      pageUrl: request.pageUrl,
      failures: summarizeNatureFailures(browserDownloadAttempt.failures),
    });
  }

  const directDownloadAttempt =
    request.natureCandidateUrls.length > 0
      ? await tryDownloadPdfCandidates(request.natureCandidateUrls, request.pageUrl)
      : { downloaded: null, failures: [] as PdfDownloadAttemptFailure[] };
  if (directDownloadAttempt.downloaded) {
    logNaturePdf('http_fetch_success', {
      pageUrl: request.pageUrl,
      finalUrl: directDownloadAttempt.downloaded.finalUrl,
    });
    return await persistDownloadedPdf(
      directDownloadAttempt.downloaded,
      request.downloadDir,
      request.articleTitle,
    );
  }

  failures.push(...directDownloadAttempt.failures);
  const latestFailure = failures[failures.length - 1];
  logNaturePdf('failed', {
    pageUrl: request.pageUrl,
    attemptedUrls: request.natureCandidateUrls,
    failures: summarizeNatureFailures(failures),
  });
  throw appError('PDF_DOWNLOAD_FAILED', {
    status: latestFailure?.status ?? 'PDF_LINK_NOT_FOUND',
    statusText:
      latestFailure?.statusText ?? 'Unable to download Nature PDF from known candidate URLs',
    pageUrl: request.pageUrl,
    attemptedUrls: request.natureCandidateUrls,
    failures,
  });
}

export const natureResearchPdfStrategy: PdfDownloadStrategy = {
  id: 'nature-research-preferred',
  disposition: 'preferred',
  matches(request) {
    return request.natureCandidateUrls.length > 0;
  },
  async download(request) {
    return await downloadNatureResearchPdf(request);
  },
};
