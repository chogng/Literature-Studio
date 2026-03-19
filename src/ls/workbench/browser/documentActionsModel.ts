import { useCallback, useMemo, useRef } from 'react';
import { toast } from '../../base/browser/ui/toast/toast';
import type { Locale } from '../../../language/i18n';
import type { LocaleMessages } from '../../../language/locales';
import type { Article } from '../services/article/articleFetch';
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from '../services/desktop/desktopError';
import {
  markPdfDownloadFailed,
  markPdfDownloadStarted,
  markPdfDownloadSucceeded,
} from '../services/document/pdfDownloadStatus';
import {
  canExportArticlesDocx,
  preparePdfDownload,
  resolvePreferredDirectory,
  resolveSciencePdfQueueMessage,
} from '../services/document/documentActionService';

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

type UseDocumentActionsModelParams = {
  desktopRuntime: boolean;
  invokeDesktop: InvokeDesktop;
  locale: Locale;
  ui: LocaleMessages;
  pdfDownloadDir: string;
  filteredArticles: Article[];
};

export function useDocumentActionsModel({
  desktopRuntime,
  invokeDesktop,
  locale,
  ui,
  pdfDownloadDir,
  filteredArticles,
}: UseDocumentActionsModelParams) {
  const sciencePdfDownloadCountRef = useRef(0);

  const canExportDocx = useMemo(
    () => canExportArticlesDocx(filteredArticles.length),
    [filteredArticles.length],
  );

  const handleSharedPdfDownload = useCallback(
    async (
      sourceUrl: string,
      articleTitle?: string,
      journalTitle?: string | null,
      doi?: string | null,
    ) => {
      const preparedPdfDownload = preparePdfDownload(sourceUrl, doi);
      if (!preparedPdfDownload) {
        toast.error(ui.toastEnterArticleUrl);
        return;
      }

      if (!desktopRuntime) {
        toast.info(ui.toastDesktopPdfDownloadOnly);
        return;
      }

      markPdfDownloadStarted(preparedPdfDownload.normalizedSourceUrl);

      if (preparedPdfDownload.isSciencePdfDownload && sciencePdfDownloadCountRef.current > 0) {
        toast.info(resolveSciencePdfQueueMessage(locale));
      }

      if (preparedPdfDownload.isSciencePdfDownload) {
        sciencePdfDownloadCountRef.current += 1;
      }

      try {
        const result = await invokeDesktop<PdfDownloadResult>('preview_download_pdf', {
          pageUrl: preparedPdfDownload.normalizedSourceUrl,
          downloadUrl: preparedPdfDownload.preferredPdfUrl,
          doi: typeof doi === 'string' ? doi : undefined,
          articleTitle,
          journalTitle: typeof journalTitle === 'string' ? journalTitle : undefined,
          customDownloadDir: resolvePreferredDirectory(pdfDownloadDir),
        });
        markPdfDownloadSucceeded(preparedPdfDownload.normalizedSourceUrl, result);
        toast.success(
          formatLocalized(ui.toastPdfDownloaded, {
            filePath: result.filePath,
            sourceUrl: result.sourceUrl,
          }),
        );
      } catch (downloadError) {
        const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(downloadError));
        markPdfDownloadFailed(preparedPdfDownload.normalizedSourceUrl, localizedError);
        toast.error(formatLocalized(ui.toastPdfDownloadFailed, { error: localizedError }));
      } finally {
        if (preparedPdfDownload.isSciencePdfDownload) {
          sciencePdfDownloadCountRef.current = Math.max(0, sciencePdfDownloadCountRef.current - 1);
        }
      }
    },
    [desktopRuntime, invokeDesktop, locale, pdfDownloadDir, ui],
  );

  const handleExportArticlesDocx = useCallback(async () => {
    if (!desktopRuntime) {
      return;
    }

    if (!canExportArticlesDocx(filteredArticles.length)) {
      toast.info(ui.toastNoExportableArticles);
      return;
    }

    try {
      const result = await invokeDesktop<DocxExportResult | null>('export_articles_docx', {
        articles: filteredArticles,
        preferredDirectory: resolvePreferredDirectory(pdfDownloadDir),
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
