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

export type DocumentActionsControllerContext = {
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

export type DocumentActionsControllerSnapshot = {
  canExportDocx: boolean;
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

function isScienceValidationWindowClosedCancel(
  error: ReturnType<typeof parseDesktopInvokeError>,
) {
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

function createSnapshot(
  context: DocumentActionsControllerContext,
): DocumentActionsControllerSnapshot {
  return {
    canExportDocx: canExportArticlesDocx(context.exportableArticles.length),
  };
}

export class DocumentActionsController {
  private context: DocumentActionsControllerContext;
  private snapshot: DocumentActionsControllerSnapshot;
  private readonly listeners = new Set<() => void>();
  private sciencePdfDownloadCount = 0;

  constructor(context: DocumentActionsControllerContext) {
    this.context = context;
    this.snapshot = createSnapshot(context);
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setContext = (context: DocumentActionsControllerContext) => {
    this.context = context;
    this.setSnapshot(createSnapshot(context));
  };

  readonly dispose = () => {
    this.listeners.clear();
  };

  readonly handleSharedPdfDownload = async (
    article: Pick<
      Article,
      | 'title'
      | 'sourceUrl'
      | 'fetchedAt'
      | 'journalTitle'
      | 'doi'
      | 'authors'
      | 'publishedAt'
      | 'sourceId'
    >,
  ) => {
    const {
      desktopRuntime,
      invokeDesktop,
      ui,
      pdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      isSelectionModeEnabled,
      selectedArticleOrderLookup,
      onLibraryUpdated,
    } = this.context;

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

    if (preparedPdfDownload.isSciencePdfDownload && this.sciencePdfDownloadCount > 0) {
      toast.info(resolveSciencePdfQueueMessage(ui));
    }

    if (preparedPdfDownload.isSciencePdfDownload) {
      this.sciencePdfDownloadCount += 1;
    }

    try {
      const result = await invokeDesktop('web_content_download_pdf', {
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
        this.sciencePdfDownloadCount = Math.max(0, this.sciencePdfDownloadCount - 1);
      }
    }
  };

  readonly handleOpenArticleDetails = async (
    article: Article,
    labels: ArticleDetailsModalLabels,
  ) => {
    const { desktopRuntime, invokeDesktop, locale } = this.context;

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
  };

  readonly handleExportArticlesDocx = async () => {
    const {
      desktopRuntime,
      invokeDesktop,
      locale,
      ui,
      pdfDownloadDir,
      exportableArticles,
    } = this.context;

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
      const localizedError = localizeDesktopInvokeError(
        ui,
        parseDesktopInvokeError(exportError),
      );
      toast.error(
        formatLocalized(ui.toastDocxExportFailed, { error: localizedError }),
      );
    }
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setSnapshot(nextSnapshot: DocumentActionsControllerSnapshot) {
    if (this.snapshot.canExportDocx === nextSnapshot.canExportDocx) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.emitChange();
  }
}

export function createDocumentActionsController(
  context: DocumentActionsControllerContext,
) {
  return new DocumentActionsController(context);
}
