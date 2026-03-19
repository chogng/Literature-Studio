import type { Locale } from '../../../../language/i18n';
import {
  buildNatureResearchPdfDownloadUrl,
  buildSciencePdfDownloadUrl,
  normalizeUrl,
} from '../../common/url';

export type PreparedPdfDownload = {
  normalizedSourceUrl: string;
  preferredPdfUrl: string;
  isSciencePdfDownload: boolean;
};

export function canExportArticlesDocx(articleCount: number) {
  return articleCount > 0;
}

export function preparePdfDownload(
  sourceUrl: string,
  doi?: string | null,
): PreparedPdfDownload | null {
  const normalizedSourceUrl = normalizeUrl(sourceUrl);
  if (!normalizedSourceUrl) {
    return null;
  }

  const sciencePdfUrl = buildSciencePdfDownloadUrl(normalizedSourceUrl, doi);
  const naturePdfUrl = buildNatureResearchPdfDownloadUrl(normalizedSourceUrl);
  const preferredPdfUrl = sciencePdfUrl || naturePdfUrl || normalizedSourceUrl;

  return {
    normalizedSourceUrl,
    preferredPdfUrl,
    isSciencePdfDownload: Boolean(sciencePdfUrl),
  };
}

export function resolveSciencePdfQueueMessage(locale: Locale) {
  return locale === 'zh'
    ? 'Science PDF 正在顺序下载，当前任务已加入队列。'
    : 'Science PDF downloads run sequentially. This request has been queued.';
}

export function resolvePreferredDirectory(directory: string) {
  const trimmedDirectory = directory.trim();
  return trimmedDirectory || null;
}
