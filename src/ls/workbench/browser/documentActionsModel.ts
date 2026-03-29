import { useCallback, useMemo, useRef } from 'react';
import { toast } from '../../base/browser/ui/toast/toast';
import type {
  ArticleDetailsModalLabels,
  ElectronInvoke,
} from '../../base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../language/i18n';
import type { LocaleMessages } from '../../../language/locales';
import type { Article } from '../services/article/articleFetch';
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from '../services/desktop/desktopError';
import {
  markPdfDownloadCancelled,
  markPdfDownloadFailed,
  markPdfDownloadStarted,
  markPdfDownloadSucceeded,
} from '../services/document/pdfDownloadStatus';
import {
  canExportArticlesDocx,
  preparePdfDownload,
  resolvePreferredDirectory,
} from '../services/document/documentActionService';

type UseDocumentActionsModelParams = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
  locale: Locale;
  ui: LocaleMessages;
  pdfDownloadDir: string;
  pdfFileNameUseSelectionOrder: boolean;
  isSelectionModeEnabled: boolean;
  selectedArticleOrderLookup: ReadonlyMap<string, number>;
  exportableArticles: Article[];
  onLibraryUpdated?: () => void | Promise<void>;
};

function getArticleSelectionKey(article: Pick<Article, 'sourceUrl' | 'fetchedAt'>) {
  return `${article.sourceUrl}::${article.fetchedAt}`;
}

function buildDownloadArticleTitle(
  article: Pick<Article, 'title' | 'sourceUrl' | 'fetchedAt'>,
  pdfFileNameUseSelectionOrder: boolean,
  isSelectionModeEnabled: boolean,
  selectedArticleOrderLookup: ReadonlyMap<string, number>,
) {
  const articleTitle = typeof article.title === 'string' ? article.title.trim() : '';
  if (!articleTitle) {
    return article.title;
  }

  if (!pdfFileNameUseSelectionOrder || !isSelectionModeEnabled) {
    return article.title;
  }

  const order = selectedArticleOrderLookup.get(getArticleSelectionKey(article));
  return typeof order === 'number' ? `${order}. ${articleTitle}` : article.title;
}

function resolveSciencePdfQueueMessage(ui: LocaleMessages) {
  return ui.toastSciencePdfQueued;
}

function isScienceValidationWindowClosedCancel(error: ReturnType<typeof parseDesktopInvokeError>) {
  return (
    error.code === 'PDF_DOWNLOAD_FAILED' &&
    String(error.details?.status ?? '').toUpperCase() === 'SCIENCE_VALIDATION_REQUIRED' &&
    String(error.details?.statusText ?? '') ===
      'Science validation window was closed before verification completed.'
  );
}

function openArticleSourceUrl(sourceUrl: string) {
  window.open(sourceUrl, '_blank', 'noopener,noreferrer');
}

export function useDocumentActionsModel({
  desktopRuntime,
  invokeDesktop,
  locale,
  ui,
  pdfDownloadDir,
  pdfFileNameUseSelectionOrder,
  isSelectionModeEnabled,
  selectedArticleOrderLookup,
  exportableArticles,
  onLibraryUpdated,
}: UseDocumentActionsModelParams) {
  const sciencePdfDownloadCountRef = useRef(0);

  const canExportDocx = useMemo(
    () => canExportArticlesDocx(exportableArticles.length),
    [exportableArticles.length],
  );

  const handleSharedPdfDownload = useCallback(
    async (
      article: Pick<
        Article,
        'title' | 'sourceUrl' | 'fetchedAt' | 'journalTitle' | 'doi' | 'authors' | 'publishedAt' | 'sourceId'
      >,
    ) => {
      const preparedPdfDownload = preparePdfDownload(article.sourceUrl, article.doi);
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
        toast.info(resolveSciencePdfQueueMessage(ui));
      }

      if (preparedPdfDownload.isSciencePdfDownload) {
        sciencePdfDownloadCountRef.current += 1;
      }

      try {
        const result = await invokeDesktop('preview_download_pdf', {
          pageUrl: preparedPdfDownload.normalizedSourceUrl,
          downloadUrl: preparedPdfDownload.preferredPdfUrl,
          doi: typeof article.doi === 'string' ? article.doi : undefined,
          articleTitle: buildDownloadArticleTitle(
            article,
            pdfFileNameUseSelectionOrder,
            isSelectionModeEnabled,
            selectedArticleOrderLookup,
          ),
          authors: article.authors,
          publishedAt: typeof article.publishedAt === 'string' ? article.publishedAt : null,
          sourceId: typeof article.sourceId === 'string' ? article.sourceId : null,
          journalTitle: typeof article.journalTitle === 'string' ? article.journalTitle : undefined,
          customDownloadDir: resolvePreferredDirectory(pdfDownloadDir),
        });
        markPdfDownloadSucceeded(preparedPdfDownload.normalizedSourceUrl, result);
        void onLibraryUpdated?.();
        toast.success(
          formatLocalized(ui.toastPdfDownloaded, {
            filePath: result.filePath,
            sourceUrl: result.sourceUrl,
          }),
        );
      } catch (downloadError) {
        const parsedError = parseDesktopInvokeError(downloadError);
        if (isScienceValidationWindowClosedCancel(parsedError)) {
          markPdfDownloadCancelled(preparedPdfDownload.normalizedSourceUrl);
          return;
        }

        const localizedError = localizeDesktopInvokeError(ui, parsedError);
        markPdfDownloadFailed(preparedPdfDownload.normalizedSourceUrl, localizedError);
        toast.error(formatLocalized(ui.toastPdfDownloadFailed, { error: localizedError }));
      } finally {
        if (preparedPdfDownload.isSciencePdfDownload) {
          sciencePdfDownloadCountRef.current = Math.max(0, sciencePdfDownloadCountRef.current - 1);
        }
      }
    },
    [
      desktopRuntime,
      invokeDesktop,
      isSelectionModeEnabled,
      locale,
      pdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      selectedArticleOrderLookup,
      ui,
      onLibraryUpdated,
    ],
  );

  const handleOpenArticleDetails = useCallback(
    async (article: Article, labels: ArticleDetailsModalLabels) => {
      if (!article.sourceUrl) {
        return;
      }

      if (!desktopRuntime) {
        openArticleSourceUrl(article.sourceUrl);
        return;
      }

      try {
        await invokeDesktop('open_article_details_modal', {
          article,
          labels,
          locale,
        });
      } catch {
        openArticleSourceUrl(article.sourceUrl);
      }
    },
    [desktopRuntime, invokeDesktop, locale],
  );

  const handleExportArticlesDocx = useCallback(async () => {
    if (!desktopRuntime) {
      return;
    }

    if (!canExportArticlesDocx(exportableArticles.length)) {
      toast.info(ui.toastNoExportableArticles);
      return;
    }

    try {
      const result = await invokeDesktop('export_articles_docx', {
        articles: exportableArticles,
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
  }, [desktopRuntime, exportableArticles, invokeDesktop, locale, pdfDownloadDir, ui]);

  return {
    canExportDocx,
    handleSharedPdfDownload,
    handleOpenArticleDetails,
    handleExportArticlesDocx,
  };
}
