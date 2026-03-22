import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { PdfDownloadResult } from '../../../base/parts/sandbox/common/desktopTypes.js';
import { cleanText } from '../../../base/common/strings.js';
import { appError } from '../../../base/common/errors.js';
import { buildPdfFileName } from '../../../platform/download/common/pdfFileName.js';
import {
  getPreviewState,
  navigatePreviewForPrint,
  printCurrentPreviewToPdf,
  waitForPreviewPrintLayout,
} from '../../../platform/windows/electron-main/previewView.js';

const WEB_PAGE_PDF_LOG_ENABLED = process.env.READER_FETCH_TIMING !== '0';
const WEB_PAGE_PDF_STABILIZE_MS = 1200;

function logWebPagePdf(stage: string, details: Record<string, unknown>) {
  if (!WEB_PAGE_PDF_LOG_ENABLED) return;

  let encodedDetails = '';
  try {
    encodedDetails = JSON.stringify(details);
  } catch {
    encodedDetails = '{"error":"unserializable_log_details"}';
  }

  console.info(`[web-page-pdf] ${stage} ${encodedDetails}`);
}

function normalizeComparableUrl(value: string) {
  const normalized = cleanText(value);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return normalized;
  }
}

async function navigatePreviewForPdf(pageUrl: string) {
  await navigatePreviewForPrint(pageUrl);
  const currentPreviewUrl = cleanText(getPreviewState().url);
  if (normalizeComparableUrl(currentPreviewUrl) === normalizeComparableUrl(pageUrl)) {
    logWebPagePdf('preview_navigate_abort_ignored', {
      pageUrl,
      currentPreviewUrl,
      message: 'Navigation gate accepted once preview URL and main content were ready.',
    });
  }
}

export async function printWebPageToPdf({
  pageUrl,
  articleTitle = '',
  downloadDir,
}: {
  pageUrl: string;
  articleTitle?: string;
  downloadDir: string;
}): Promise<PdfDownloadResult> {
  const startedAt = Date.now();
  try {
    await fs.mkdir(downloadDir, { recursive: true });

    const navigateStartedAt = Date.now();
    logWebPagePdf('preview_navigate_start', {
      pageUrl,
      previousPreviewUrl: cleanText(getPreviewState().url),
      downloadDir,
    });

    if (cleanText(getPreviewState().url) !== pageUrl) {
      await navigatePreviewForPdf(pageUrl);
    }

    logWebPagePdf('preview_navigate_done', {
      pageUrl,
      currentPreviewUrl: cleanText(getPreviewState().url),
      elapsedMs: Date.now() - navigateStartedAt,
    });

    const waitStartedAt = Date.now();
    await waitForPreviewPrintLayout(WEB_PAGE_PDF_STABILIZE_MS);
    logWebPagePdf('wait_main_ready_done', {
      pageUrl,
      currentPreviewUrl: cleanText(getPreviewState().url),
      elapsedMs: Date.now() - waitStartedAt,
    });

    const printStartedAt = Date.now();
    logWebPagePdf('before_print_to_pdf', {
      pageUrl,
      currentPreviewUrl: cleanText(getPreviewState().url),
    });

    const pdfBuffer = await printCurrentPreviewToPdf();
    logWebPagePdf('print_to_pdf_done', {
      pageUrl,
      currentPreviewUrl: cleanText(getPreviewState().url),
      elapsedMs: Date.now() - printStartedAt,
      pdfBytes: pdfBuffer.byteLength,
    });

    const targetUrl = cleanText(getPreviewState().url) || pageUrl;
    const fallbackName = (() => {
      try {
        return path.basename(new URL(targetUrl).pathname) || '';
      } catch {
        return '';
      }
    })();
    const fileName = buildPdfFileName(articleTitle, fallbackName);
    const filePath = path.join(downloadDir, fileName);
    const writeStartedAt = Date.now();
    await fs.writeFile(filePath, pdfBuffer);
    logWebPagePdf('file_write_done', {
      pageUrl,
      filePath,
      elapsedMs: Date.now() - writeStartedAt,
    });

    logWebPagePdf('print_success', {
      pageUrl,
      finalUrl: targetUrl,
      filePath,
      restorePreview: false,
      totalElapsedMs: Date.now() - startedAt,
    });

    return {
      filePath,
      sourceUrl: targetUrl,
    };
  } catch (error) {
    logWebPagePdf('print_failed', {
      pageUrl,
      currentPreviewUrl: cleanText(getPreviewState().url),
      message: error instanceof Error ? error.message : String(error),
    });
    throw appError('PDF_DOWNLOAD_FAILED', {
      status: 'PRINT_TO_PDF_FAILED',
      statusText: error instanceof Error ? error.message : String(error),
      pageUrl,
    });
  }
}
