import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  detectInitialLocale,
  getLocaleMessages,
  toDocumentLang,
  type Locale,
} from './language/i18n';
import * as TitlebarModule from './titlebar';
import { ToastContainer, toast } from './components/Toast';
import ReaderView from './views/ReaderView';
import SettingsView from './views/SettingsView';
import ArticleDetailsModalWindow from './views/ArticleDetailsModalWindow';
import { buildDefaultBatchDateRange } from './utils/dateRange';
import {
  buildNatureResearchPdfDownloadUrl,
  buildSciencePdfDownloadUrl,
  isScienceCurrentTocUrl,
  normalizeUrl,
  sanitizeUrlInput,
} from './utils/url';
import { fetchLatestArticlesBatch, type Article } from './services/article-fetch';
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from './services/desktopError';
import {
  createEmptyBatchSource,
  defaultBatchLimit,
  defaultSameDomainOnly,
  getConfigBatchSourceSeed,
  resolveDefaultJournalTitleFromSourceUrl,
  type BatchSource,
  normalizeBatchLimit,
} from './services/config-schema';
import {
  buildSaveSettingsPayload,
  loadAppSettings,
  resolveSettingsState,
  saveAppSettings,
  saveAppSettingsPartial,
} from './services/settings';
import {
  markPdfDownloadFailed,
  markPdfDownloadStarted,
  markPdfDownloadSucceeded,
  usePdfDownloadStatus,
} from './services/pdfDownloadStatus';

type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';

const TitlebarView =
  ((TitlebarModule as { Titlebar?: ComponentType<any>; default?: ComponentType<any> }).Titlebar ??
    (TitlebarModule as { default?: ComponentType<any> }).default ??
    (() => null)) as ComponentType<any>;

type PdfDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type DocxExportResult = {
  filePath: string;
  articleCount: number;
};

type DesktopInvokeArgs = Record<string, unknown> | undefined;

const defaultArticleUrl = '';
const initialBatchSources = getConfigBatchSourceSeed();

function detectNativeModalKind() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('nativeModal');
}

function MainApp() {
  const [activePage, setActivePage] = useState<'reader' | 'settings'>('reader');
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const initialBatchDateRange = useMemo(() => buildDefaultBatchDateRange(), []);
  const [webUrl, setWebUrl] = useState(defaultArticleUrl);
  const [fetchSeedUrl, setFetchSeedUrl] = useState(defaultArticleUrl);
  const [browserUrl, setBrowserUrl] = useState(normalizeUrl(defaultArticleUrl));
  const [batchSources, setBatchSources] = useState<BatchSource[]>(initialBatchSources);
  const [batchLimit, setBatchLimit] = useState(defaultBatchLimit);
  const [sameDomainOnly, setSameDomainOnly] = useState(defaultSameDomainOnly);
  const [batchStartDate, setBatchStartDate] = useState(initialBatchDateRange.startDate);
  const [batchEndDate, setBatchEndDate] = useState(initialBatchDateRange.endDate);
  const [filterJournal, setFilterJournal] = useState('');
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pdfDownloadDir, setPdfDownloadDir] = useState('');
  const [configPath, setConfigPath] = useState('');

  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isPreviewPdfDownloading, setIsPreviewPdfDownloading] = useState(false);
  const [sciencePdfDownloadCount, setSciencePdfDownloadCount] = useState(0);
  const sciencePdfDownloadCountRef = useRef(0);

  const [articles, setArticles] = useState<Article[]>([]);
  const [previewState, setPreviewState] = useState<DesktopPreviewState>({
    url: '',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    visible: false,
  });
  const [fetchStatus, setFetchStatus] = useState<DesktopFetchStatus | null>(null);

  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const electronRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.invoke === 'function';
  const previewRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.preview?.navigate === 'function';
  const desktopRuntime = electronRuntime;
  const ui = useMemo(() => getLocaleMessages(locale), [locale]);
  const currentPagePdfDownloadStatus = usePdfDownloadStatus(browserUrl);
  const invokeDesktop = useCallback(
    async <T,>(command: string, args?: DesktopInvokeArgs): Promise<T> => {
      if (window.electronAPI?.invoke) {
        return window.electronAPI.invoke<T>(command, args);
      }
      throw new Error('Desktop invoke bridge is unavailable.');
    },
    [],
  );

  const filteredArticles = useMemo(() => {
    const journal = filterJournal.trim().toLowerCase();
    return articles.filter(
      (article) =>
        !journal ||
        article.sourceUrl.toLowerCase().includes(journal) ||
        String(article.journalTitle ?? '')
          .toLowerCase()
          .includes(journal),
    );
  }, [articles, filterJournal]);

  const hasData = articles.length > 0;

  useEffect(() => {
    if (!electronRuntime || !window.electronAPI?.windowControls) {
      setIsWindowMaximized(false);
      return;
    }

    let mounted = true;
    const controls = window.electronAPI.windowControls;

    void controls
      .getState()
      .then((state) => {
        if (mounted) {
          setIsWindowMaximized(Boolean(state.isMaximized));
        }
      })
      .catch(() => {
        if (mounted) {
          setIsWindowMaximized(false);
        }
      });

    const unsubscribe = controls.onStateChange((state) => {
      setIsWindowMaximized(Boolean(state.isMaximized));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [electronRuntime]);

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      setPreviewState({
        url: '',
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        visible: false,
      });
      return;
    }

    let mounted = true;
    const preview = window.electronAPI.preview;

    void preview
      .getState()
      .then((state) => {
        if (!mounted) return;
        setPreviewState(state);
        if (state.url) {
          setBrowserUrl(state.url);
          setWebUrl(state.url);
          setFetchSeedUrl((current) => current || state.url);
        }
      })
      .catch(() => {});

    const unsubscribe = preview.onStateChange((state) => {
      setPreviewState(state);
      if (state.url) {
        setBrowserUrl(state.url);
        setWebUrl(state.url);
        setFetchSeedUrl((current) => current || state.url);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [previewRuntime]);

  useEffect(() => {
    if (!electronRuntime || !window.electronAPI?.fetch) {
      setFetchStatus(null);
      return;
    }

    const unsubscribe = window.electronAPI.fetch.onFetchStatus((status) => {
      setFetchStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, [electronRuntime]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.lang = toDocumentLang(locale);
  }, [locale]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);

      try {
        const loaded = await loadAppSettings(desktopRuntime, invokeDesktop);
        const resolved = resolveSettingsState(loaded);

        setPdfDownloadDir(resolved.pdfDownloadDir);
        setBatchSources(resolved.batchSources);
        setBatchLimit(resolved.batchLimit);
        setSameDomainOnly(resolved.sameDomainOnly);
        setConfigPath(resolved.configPath);
        if (resolved.locale) {
          setLocale(resolved.locale);
        }
      } catch (loadError) {
        const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(loadError));
        toast.error(formatLocalized(ui.toastLoadSettingsFailed, { error: localizedError }));
      } finally {
        setIsSettingsLoading(false);
      }
    };

    void loadSettings();
  }, [desktopRuntime, invokeDesktop]);

  const handleNavigateWeb = () => {
    const normalized = normalizeUrl(webUrl);
    if (!normalized) {
      toast.error(ui.toastEnterArticleUrl);
      return;
    }

    setWebUrl(normalized);
    setBrowserUrl(normalized);
    setFetchSeedUrl(normalized);
    if (electronRuntime && !previewRuntime) {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
    }

    if (previewRuntime && window.electronAPI?.preview) {
      void window.electronAPI.preview.navigate(normalized).catch(() => {
        window.electronAPI?.preview?.setVisible(false);
      });
    }

    toast.success(formatLocalized(ui.toastNavigatingTo, { url: normalized }));
  };

  const handleBrowserRefresh = () => {
    if (electronRuntime && !previewRuntime) {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
    }

    if (previewRuntime && window.electronAPI?.preview) {
      window.electronAPI.preview.reload();
      return;
    }

    setIframeReloadKey((prev) => prev + 1);
  };

  const handlePreviewBack = () => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewBackUnsupported);
      return;
    }

    window.electronAPI.preview.goBack();
  };

  const handlePreviewForward = () => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewForwardUnsupported);
      return;
    }

    window.electronAPI.preview.goForward();
  };

  const handleChoosePdfDownloadDir = async () => {
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopDirPickerOnly);
      return;
    }

    try {
      const selected = await invokeDesktop<string | null>('pick_download_directory');
      if (!selected) {
        toast.info(ui.toastDirNotSelected);
        return;
      }

      setPdfDownloadDir(selected);
      toast.success(formatLocalized(ui.toastDirSelected, { dir: selected }));
    } catch (pickError) {
      const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(pickError));
      toast.error(formatLocalized(ui.toastPickDirFailed, { error: localizedError }));
    }
  };

  const handleBatchSourceUrlChange = useCallback((index: number, nextUrl: string) => {
    const sanitizedUrl = sanitizeUrlInput(nextUrl);
    setBatchSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index
          ? (() => {
              const previousDefaultJournalTitle = resolveDefaultJournalTitleFromSourceUrl(source.url);
              const nextDefaultJournalTitle = resolveDefaultJournalTitleFromSourceUrl(sanitizedUrl);
              const shouldReplaceJournalTitle =
                !source.journalTitle.trim() || source.journalTitle.trim() === previousDefaultJournalTitle;

              return {
                ...source,
                url: sanitizedUrl,
                journalTitle: shouldReplaceJournalTitle ? nextDefaultJournalTitle : source.journalTitle,
              };
            })()
          : source,
      ),
    );
  }, []);

  const handleWebUrlChange = useCallback((nextUrl: string) => {
    const sanitizedUrl = sanitizeUrlInput(nextUrl);
    setWebUrl(sanitizedUrl);
    setFetchSeedUrl(sanitizedUrl);
  }, []);

  const handleBatchSourceJournalTitleChange = useCallback((index: number, nextJournalTitle: string) => {
    setBatchSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index
          ? {
              ...source,
              journalTitle: nextJournalTitle,
            }
          : source,
      ),
    );
  }, []);

  const handleAddBatchSource = useCallback(() => {
    setBatchSources((current) => [...current, createEmptyBatchSource()]);
  }, []);

  const handleRemoveBatchSource = useCallback((index: number) => {
    setBatchSources((current) => {
      if (current.length <= 1) {
        return [createEmptyBatchSource()];
      }

      return current.filter((_, sourceIndex) => sourceIndex !== index);
    });
  }, []);

  const handleMoveBatchSource = useCallback((index: number, direction: 'up' | 'down') => {
    setBatchSources((current) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || index >= current.length || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const currentSource = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = currentSource;
      return next;
    });
  }, []);

  const handleLocaleChange = useCallback(
    (nextLocale: Locale) => {
      setLocale(nextLocale);

      void saveAppSettingsPartial(desktopRuntime, invokeDesktop, {
        locale: nextLocale,
      }).catch((saveError) => {
        const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(saveError));
        toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: localizedError }));
      });
    },
    [desktopRuntime, invokeDesktop, ui],
  );

  const handleSaveSettings = async () => {
    setIsSettingsSaving(true);

    const { nextDir, payload } = buildSaveSettingsPayload({
      pdfDownloadDir,
      batchSources,
      batchLimit,
      sameDomainOnly,
      locale,
    });

    try {
      const saved = await saveAppSettings(desktopRuntime, invokeDesktop, payload);
      const resolved = resolveSettingsState(saved, { fallbackConfigPath: configPath });

      setPdfDownloadDir(resolved.pdfDownloadDir);
      setBatchSources(resolved.batchSources);
      setBatchLimit(resolved.batchLimit);
      setSameDomainOnly(resolved.sameDomainOnly);
      setConfigPath(resolved.configPath);
      if (resolved.locale) {
        setLocale(resolved.locale);
      }

      toast.success(
        nextDir
          ? formatLocalized(ui.toastSettingsSavedWithDir, { dir: nextDir })
          : ui.toastSettingsSavedUseSystemDownloads,
      );
    } catch (saveError) {
      const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(saveError));
      toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: localizedError }));
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleResetDownloadDir = () => {
    setPdfDownloadDir('');
    toast.info(ui.toastResetDirInput);
  };

  const handleSharedPdfDownload = useCallback(
    async (sourceUrl: string, articleTitle?: string, journalTitle?: string | null) => {
      const normalizedSourceUrl = normalizeUrl(sourceUrl);
      if (!normalizedSourceUrl) {
        toast.error(ui.toastEnterArticleUrl);
        return;
      }

      if (!desktopRuntime) {
        toast.info(ui.toastDesktopPdfDownloadOnly);
        return;
      }

      const sciencePdfUrl = buildSciencePdfDownloadUrl(normalizedSourceUrl);
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
        setSciencePdfDownloadCount(sciencePdfDownloadCountRef.current);
      }

      try {
        const result = await invokeDesktop<PdfDownloadResult>('preview_download_pdf', {
          pageUrl: normalizedSourceUrl,
          downloadUrl: preferredPdfUrl,
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
          setSciencePdfDownloadCount(sciencePdfDownloadCountRef.current);
        }
      }
    },
    [desktopRuntime, invokeDesktop, locale, pdfDownloadDir, ui],
  );

  const handlePreviewDownloadPdf = async () => {
    if (!browserUrl) return;

    if (isScienceCurrentTocUrl(browserUrl)) {
      toast.info(
        locale === 'zh'
          ? 'Science 当期目录页请使用左侧文章卡片上的 PDF 按钮下载。'
          : 'For Science current TOC pages, use the article card PDF button.',
      );
      return;
    }

    try {
      setIsPreviewPdfDownloading(true);
      await handleSharedPdfDownload(browserUrl);
    } finally {
      setIsPreviewPdfDownloading(false);
    }
  };

  const handleExportArticlesDocx = async () => {
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
  };

  const handleFetchLatestBatch = async () => {
    setIsBatchLoading(true);
    setFetchStatus(null);
    setArticles([]);

    try {
      const result = await fetchLatestArticlesBatch({
        desktopRuntime,
        addressBarUrl: fetchSeedUrl || webUrl,
        batchSources,
        sameDomainOnly,
        startDate: batchStartDate || null,
        endDate: batchEndDate || null,
        invokeDesktop,
      });

      if (!result.ok) {
        if (result.reason === 'desktop_unsupported') {
          toast.info(ui.toastDesktopBatchFetchOnly);
          return;
        }
        if (result.reason === 'empty_page_url') {
          toast.error(ui.toastEnterPageUrl);
          return;
        }
        if (result.reason === 'invalid_date_range') {
          toast.error(ui.toastDateRangeInvalid);
          return;
        }
        const localizedError = result.error
          ? localizeDesktopInvokeError(ui, result.error)
          : ui.errorUnknown;
        toast.error(formatLocalized(ui.toastBatchFetchFailed, { error: localizedError }));
        return;
      }

      setArticles(result.articles);
      toast.success(formatLocalized(ui.toastBatchFetchSucceeded, { count: result.articles.length }));
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilterJournal('');
  };

  const handleWindowControl = (action: TitlebarAction) => {
    window.electronAPI?.windowControls?.perform(action);
  };

  const isScienceCurrentTocPage = isScienceCurrentTocUrl(browserUrl);
  const isCurrentPageSciencePdf = Boolean(buildSciencePdfDownloadUrl(browserUrl));
  const canDownloadCurrentPage = Boolean(desktopRuntime) && !isScienceCurrentTocPage;
  const currentPageDownloadUnavailableLabel = isScienceCurrentTocPage
    ? locale === 'zh'
      ? 'Science 当期目录页请使用左侧文章卡片上的 PDF 按钮下载。'
      : 'For Science current TOC pages, use the article card PDF button.'
    : ui.titlebarDesktopOnly;

  const titlebarFetchSourceText = useMemo(() => {
    if (!fetchStatus) return '';
    if (fetchStatus.fetchChannel === 'preview' && fetchStatus.previewReuseMode === 'live-extract') {
      return 'Source: live preview DOM';
    }
    if (fetchStatus.fetchChannel === 'preview') return 'Source: preview DOM';
    return 'Source: network';
  }, [fetchStatus]);

  const titlebarFetchSourceTitle = useMemo(() => {
    if (!fetchStatus) return '';
    const sourceDetail = fetchStatus.fetchDetail
      ? ` | ${fetchStatus.fetchDetail}`
      : '';
    return `${fetchStatus.sourceId || 'source'} | page ${fetchStatus.pageNumber}${sourceDetail}`;
  }, [fetchStatus]);

  const titlebarFetchStopText = useMemo(() => {
    if (!fetchStatus?.paginationStopped) return '';
    if (fetchStatus.paginationStopReason === 'tail_dates_before_start_date') {
      return 'Stop: tail-date policy';
    }
    return 'Stop: extractor policy';
  }, [fetchStatus]);

  const titlebarFetchStopTitle = useMemo(() => {
    if (!fetchStatus?.paginationStopped) return '';
    const sourceLabel = fetchStatus.sourceId || 'source';
    const reasonLabel = fetchStatus.paginationStopReason || 'extractor_policy';
    return `${sourceLabel} | page ${fetchStatus.pageNumber} | ${reasonLabel}`;
  }, [fetchStatus]);

  return (
    <div className="app-window">
      {electronRuntime ? (
        <TitlebarView
          appName={ui.appName}
          labels={{
            controlsAriaLabel: ui.titlebarControls,
            settingsLabel: ui.titlebarSettings,
            minimizeLabel: ui.titlebarMinimize,
            maximizeLabel: ui.titlebarMaximize,
            restoreLabel: ui.titlebarRestore,
            closeLabel: ui.titlebarClose,
            backLabel: ui.titlebarBack,
            forwardLabel: ui.titlebarForward,
            refreshLabel: ui.titlebarRefresh,
            downloadPdfLabel: ui.titlebarDownloadPdf,
            exportDocxLabel: ui.titlebarExportDocx,
            noExportableArticlesLabel: ui.titlebarNoExportableArticles,
            desktopOnlyLabel: ui.titlebarDesktopOnly,
            downloadPdfUnavailableLabel: currentPageDownloadUnavailableLabel,
          }}
          isWindowMaximized={isWindowMaximized}
          onWindowControl={handleWindowControl}
          isSidebarOpen={isSidebarOpen}
          sidebarToggleLabel={isSidebarOpen ? ui.sidebarCollapse : ui.sidebarExpand}
          onToggleSidebar={activePage === 'reader' ? () => setIsSidebarOpen((prev) => !prev) : undefined}
          onToggleSettings={() => setActivePage((prev) => (prev === 'settings' ? 'reader' : 'settings'))}
          browserUrl={browserUrl}
          canGoBack={previewState.canGoBack}
          canGoForward={previewState.canGoForward}
          canDownload={canDownloadCurrentPage}
          isDownloadingPdf={isPreviewPdfDownloading || (isCurrentPageSciencePdf && sciencePdfDownloadCount > 0)}
          isDownloadedPdf={currentPagePdfDownloadStatus.hasSucceeded}
          canExportDocx={filteredArticles.length > 0}
          onNavigateBack={handlePreviewBack}
          onNavigateForward={handlePreviewForward}
          onRefresh={handleBrowserRefresh}
          onDownloadPdf={() => void handlePreviewDownloadPdf()}
          onExportDocx={() => void handleExportArticlesDocx()}
          webUrl={webUrl}
          onWebUrlChange={handleWebUrlChange}
          onNavigateWeb={handleNavigateWeb}
          articleUrlPlaceholder={ui.articleUrlPlaceholder}
          fetchChannel={fetchStatus?.fetchChannel ?? null}
          previewReuseMode={fetchStatus?.previewReuseMode ?? null}
          fetchSourceText={titlebarFetchSourceText}
          fetchSourceTitle={titlebarFetchSourceTitle}
          fetchStopText={titlebarFetchStopText}
          fetchStopTitle={titlebarFetchStopTitle}
        />
      ) : null}

      <div className={`app-shell ${activePage === 'settings' ? 'app-shell-settings' : ''}`.trim()}>
        {activePage === 'reader' ? (
          <ReaderView
            isSidebarOpen={isSidebarOpen}
            filteredArticles={filteredArticles}
            hasData={hasData}
            locale={locale}
            filterJournal={filterJournal}
            onFilterJournalChange={setFilterJournal}
            batchStartDate={batchStartDate}
            onBatchStartDateChange={setBatchStartDate}
            batchEndDate={batchEndDate}
            onBatchEndDateChange={setBatchEndDate}
            onFetchLatestBatch={() => void handleFetchLatestBatch()}
            onDownloadPdf={handleSharedPdfDownload}
            isBatchLoading={isBatchLoading}
            onResetFilters={handleResetFilters}
            filteredCount={filteredArticles.length}
            totalCount={articles.length}
            browserUrl={browserUrl}
            iframeReloadKey={iframeReloadKey}
            electronRuntime={electronRuntime}
            previewRuntime={previewRuntime}
            labels={{
              untitled: ui.untitled,
              unknown: ui.unknown,
              authors: ui.authors,
              abstract: ui.abstract,
              publishedAt: ui.publishedAt,
              source: ui.source,
              fetchedAt: ui.fetchedAt,
              close: ui.titlebarClose,
              emptyFiltered: ui.emptyFiltered,
              emptyAll: ui.emptyAll,
              startDate: ui.startDate,
              endDate: ui.endDate,
              journalFilterPlaceholder: ui.journalFilterPlaceholder,
              fetchLatestBusy: ui.fetchLatestBusy,
              fetchLatest: ui.fetchLatest,
              resetFilter: ui.resetFilter,
              showing: ui.showing,
              total: ui.total,
              previewUnavailable: ui.previewUnavailable,
              emptyState: ui.emptyState,
              webPreviewTitle: ui.webPreviewTitle,
            }}
          />
        ) : (
          <SettingsView
            labels={{
              settingsTitle: ui.settingsTitle,
              settingsLoading: ui.settingsLoading,
              settingsLanguage: ui.settingsLanguage,
              languageChinese: ui.languageChinese,
              languageEnglish: ui.languageEnglish,
              settingsLanguageHint: ui.settingsLanguageHint,
              settingsPageUrl: ui.settingsPageUrl,
              settingsPageUrlHint: ui.settingsPageUrlHint,
              pageUrlPlaceholder: ui.pageUrlPlaceholder,
              settingsBatchJournalTitle: ui.settingsBatchJournalTitle,
              batchJournalTitlePlaceholder: ui.batchJournalTitlePlaceholder,
              addBatchUrl: ui.addBatchUrl,
              removeBatchUrl: ui.removeBatchUrl,
              moveBatchUrlUp: ui.moveBatchUrlUp,
              moveBatchUrlDown: ui.moveBatchUrlDown,
              settingsBatchOptions: ui.settingsBatchOptions,
              batchCount: ui.batchCount,
              sameDomainOnly: ui.sameDomainOnly,
              settingsBatchHint: ui.settingsBatchHint,
              defaultPdfDir: ui.defaultPdfDir,
              downloadDirPlaceholder: ui.downloadDirPlaceholder,
              chooseDirectory: ui.chooseDirectory,
              resetDefault: ui.resetDefault,
              saving: ui.saving,
              saveSettings: ui.saveSettings,
              settingsHintPath: ui.settingsHintPath,
              settingsConfigPath: ui.settingsConfigPath,
              currentDir: ui.currentDir,
              systemDownloads: ui.systemDownloads,
            }}
            isSettingsLoading={isSettingsLoading}
            locale={locale}
            onLocaleChange={handleLocaleChange}
            batchSources={batchSources}
            onBatchSourceUrlChange={handleBatchSourceUrlChange}
            onBatchSourceJournalTitleChange={handleBatchSourceJournalTitleChange}
            onAddBatchSource={handleAddBatchSource}
            onRemoveBatchSource={handleRemoveBatchSource}
            onMoveBatchSource={handleMoveBatchSource}
            batchLimit={batchLimit}
            onBatchLimitChange={(value) => setBatchLimit(normalizeBatchLimit(value, 1))}
            sameDomainOnly={sameDomainOnly}
            onSameDomainOnlyChange={setSameDomainOnly}
            pdfDownloadDir={pdfDownloadDir}
            onPdfDownloadDirChange={setPdfDownloadDir}
            onChoosePdfDownloadDir={() => void handleChoosePdfDownloadDir()}
            desktopRuntime={desktopRuntime}
            configPath={configPath}
            isSettingsSaving={isSettingsSaving}
            onResetDownloadDir={handleResetDownloadDir}
            onSaveSettings={() => void handleSaveSettings()}
          />
        )}
        <ToastContainer closeLabel={ui.toastClose} />
      </div>
    </div>
  );
}

export default function App() {
  const nativeModalKind = detectNativeModalKind();

  if (nativeModalKind === 'article-details') {
    return <ArticleDetailsModalWindow />;
  }

  return <MainApp />;
}

