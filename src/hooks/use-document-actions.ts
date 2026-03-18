import { useCallback, useMemo, useRef } from 'react';
import { toast } from '../components/Toast';
import type { Locale } from '../language/i18n';
import type { LocaleMessages } from '../language/locales';
import { type Article } from '../services/article-fetch';
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from '../services/desktopError';
import {
  markPdfDownloadFailed,
  markPdfDownloadStarted,
  markPdfDownloadSucceeded,
} from '../services/pdf-download-status';
import { buildNatureResearchPdfDownloadUrl, buildSciencePdfDownloadUrl, normalizeUrl } from '../utils/url';

type DesktopInvokeArgs = Record<string, unknown> | undefined;
type InvokeDesktop = <T,>(command: string, args?: DesktopInvokeArgs) => Promise<T>;

type PdfDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type DocxExportResult = {
  filePath: string;
  articleCount: number;
};

type UseDocumentActionsParams = {
  desktopRuntime: boolean;
  invokeDesktop: InvokeDesktop;
  locale: Locale;
  ui: LocaleMessages;
  pdfDownloadDir: string;
  filteredArticles: Article[];
};

export function useDocumentActions({
  desktopRuntime,
  invokeDesktop,
  locale,
  ui,
  pdfDownloadDir,
  filteredArticles,
}: UseDocumentActionsParams) {
  const sciencePdfDownloadCountRef = useRef(0);

  const canExportDocx = useMemo(() => filteredArticles.length > 0, [filteredArticles.length]);

  const handleSharedPdfDownload = useCallback(
    async (
      sourceUrl: string,
      articleTitle?: string,
      journalTitle?: string | null,
      doi?: string | null,
    ) => {
      const normalizedSourceUrl = normalizeUrl(sourceUrl);
      if (!normalizedSourceUrl) {
        toast.error(ui.toastEnterArticleUrl);
        return;
      }

      if (!desktopRuntime) {
        toast.info(ui.toastDesktopPdfDownloadOnly);
        return;
      }
      const sciencePdfUrl = buildSciencePdfDownloadUrl(normalizedSourceUrl, doi);
      const naturePdfUrl = buildNatureResearchPdfDownloadUrl(normalizedSourceUrl);
      const preferredPdfUrl = sciencePdfUrl || naturePdfUrl || normalizedSourceUrl;
      const isSciencePdfDownload = Boolean(sciencePdfUrl);
      markPdfDownloadStarted(normalizedSourceUrl);

      if (isSciencePdfDownload && sciencePdfDownloadCountRef.current > 0) {
        toast.info(
          locale === 'zh'
            ? 'Science PDF 正在顺序下载，当前任务已加入队列。'
            : 'Science PDF downloads run sequentially. This request has been queued.',
        );
      }

      if (isSciencePdfDownload) {
        sciencePdfDownloadCountRef.current += 1;
      }

      try {
        const result = await invokeDesktop<PdfDownloadResult>('preview_download_pdf', {
          pageUrl: normalizedSourceUrl,
          downloadUrl: preferredPdfUrl,
          doi: typeof doi === 'string' ? doi : undefined,
          articleTitle,
          journalTitle: typeof journalTitle === 'string' ? journalTitle : undefined,
          customDownloadDir: pdfDownloadDir.trim() || null,
        });
        markPdfDownloadSucceeded(normalizedSourceUrl, result);
        toast.success(
          formatLocalized(ui.toastPdfDownloaded, {
            filePath: result.filePath,
            sourceUrl: result.sourceUrl,
          }),
        );
      } catch (downloadError) {
        const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(downloadError));
        markPdfDownloadFailed(normalizedSourceUrl, localizedError);
        toast.error(formatLocalized(ui.toastPdfDownloadFailed, { error: localizedError }));
      } finally {
        if (isSciencePdfDownload) {
          sciencePdfDownloadCountRef.current = Math.max(0, sciencePdfDownloadCountRef.current - 1);
        }
      }
    },
    [desktopRuntime, invokeDesktop, locale, pdfDownloadDir, ui],
  );

  const handleExportArticlesDocx = useCallback(async () => {
    if (!desktopRuntime) return;

    if (filteredArticles.length === 0) {
      toast.info(ui.toastNoExportableArticles);
      return;
    }

    try {
      const result = await invokeDesktop<DocxExportResult | null>('export_articles_docx', {
        articles: filteredArticles,
        preferredDirectory: pdfDownloadDir.trim() || null,
        locale,
      });

      if (!result) {
        return;
      }

      toast.success(
        formatLocalized(ui.toastDocxExported, {
          count: result.articleCount,
          filePath: result.filePath,
        }),
      );
    } catch (exportError) {
      const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(exportError));
      toast.error(formatLocalized(ui.toastDocxExportFailed, { error: localizedError }));
    }
  }, [desktopRuntime, filteredArticles, invokeDesktop, locale, pdfDownloadDir, ui]);

  return {
    canExportDocx,
    handleSharedPdfDownload,
    handleExportArticlesDocx,
  };
}

