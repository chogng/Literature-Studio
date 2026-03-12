import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  detectInitialLocale,
  getLocaleMessages,
  localeStorageKey,
  toDocumentLang,
  type Locale,
} from './language/i18n';
import * as TitlebarModule from './titlebar';
import { ToastContainer, toast } from './components/Toast';
import ReaderView from './views/ReaderView';
import SettingsView from './views/SettingsView';
import { buildDefaultBatchDateRange, isDateRangeValid } from './utils/dateRange';

type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';

const TitlebarView =
  ((TitlebarModule as { Titlebar?: ComponentType<any>; default?: ComponentType<any> }).Titlebar ??
    (TitlebarModule as { default?: ComponentType<any> }).default ??
    (() => null)) as ComponentType<any>;

type Article = {
  title: string;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
};

type PdfDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type AppSettingsPayload = {
  defaultDownloadDir: string | null;
  defaultHomepageUrl: string;
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
};

type DesktopInvokeArgs = Record<string, unknown> | undefined;

const defaultArticleUrl = '';
const defaultHomepageUrl = 'https://arxiv.org/list/cs/new';
const defaultBatchLimit = 5;
const defaultSameDomainOnly = true;

function normalizeBatchLimit(input: unknown, fallback: number = defaultBatchLimit): number {
  const parsed = Number.parseInt(String(input), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(20, Math.max(1, parsed));
}


function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatLocalized(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? '' : String(value);
  });
}

function mergeArticles(incoming: Article[], existing: Article[]): Article[] {
  const seen = new Set<string>();
  const merged: Article[] = [];

  for (const item of [...incoming, ...existing]) {
    const key = `${item.sourceUrl}::${item.fetchedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export default function App() {
  const [activePage, setActivePage] = useState<'reader' | 'settings'>('reader');
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const initialBatchDateRange = useMemo(() => buildDefaultBatchDateRange(), []);
  const [webUrl, setWebUrl] = useState(defaultArticleUrl);
  const [browserUrl, setBrowserUrl] = useState(normalizeUrl(defaultArticleUrl));
  const [homepageUrl, setHomepageUrl] = useState(defaultHomepageUrl);
  const [batchLimit, setBatchLimit] = useState(defaultBatchLimit);
  const [sameDomainOnly, setSameDomainOnly] = useState(defaultSameDomainOnly);
  const [batchStartDate, setBatchStartDate] = useState(initialBatchDateRange.startDate);
  const [batchEndDate, setBatchEndDate] = useState(initialBatchDateRange.endDate);
  const [filterJournal, setFilterJournal] = useState('');
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pdfDownloadDir, setPdfDownloadDir] = useState('');

  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [previewState, setPreviewState] = useState<DesktopPreviewState>({
    url: '',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    visible: false,
  });

  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const electronRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.invoke === 'function';
  const previewRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.preview?.navigate === 'function';
  const desktopRuntime = electronRuntime;
  const ui = useMemo(() => getLocaleMessages(locale), [locale]);
  const invokeDesktop = useCallback(
    async <T,>(command: string, args?: DesktopInvokeArgs): Promise<T> => {
      if (window.electronAPI?.invoke) {
        return window.electronAPI.invoke<T>(command, args);
      }
      throw new Error(ui.desktopInvokeUnsupported);
    },
    [ui],
  );

  const filteredArticles = useMemo(() => {
    const journal = filterJournal.trim().toLowerCase();
    return articles.filter((article) => !journal || article.sourceUrl.toLowerCase().includes(journal));
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
        }
      })
      .catch(() => {});

    const unsubscribe = preview.onStateChange((state) => {
      setPreviewState(state);
      if (state.url) {
        setBrowserUrl(state.url);
        setWebUrl(state.url);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [previewRuntime]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = toDocumentLang(locale);
  }, [locale]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);

      try {
        const applyLoadedSettings = (loaded: Partial<AppSettingsPayload>) => {
          const configuredHomepage =
            typeof loaded.defaultHomepageUrl === 'string' ? loaded.defaultHomepageUrl.trim() : '';

          setPdfDownloadDir(typeof loaded.defaultDownloadDir === 'string' ? loaded.defaultDownloadDir : '');
          setHomepageUrl(configuredHomepage || defaultHomepageUrl);
          setBatchLimit(normalizeBatchLimit(loaded.defaultBatchLimit, defaultBatchLimit));
          setSameDomainOnly(
            typeof loaded.defaultSameDomainOnly === 'boolean'
              ? loaded.defaultSameDomainOnly
              : defaultSameDomainOnly,
          );
        };

        if (desktopRuntime) {
          const loaded = await invokeDesktop<AppSettingsPayload>('load_settings');
          applyLoadedSettings(loaded);
          return;
        }

        const raw = window.localStorage.getItem('journal-reader-settings');
        if (!raw) {
          applyLoadedSettings({});
          return;
        }

        const parsed = JSON.parse(raw) as Partial<AppSettingsPayload>;
        applyLoadedSettings(parsed);
      } catch (loadError) {
        toast.error(formatLocalized(ui.toastLoadSettingsFailed, { error: errorMessage(loadError) }));
      } finally {
        setIsSettingsLoading(false);
      }
    };

    void loadSettings();
  }, [desktopRuntime, invokeDesktop, ui]);

  const handleNavigateWeb = () => {
    const normalized = normalizeUrl(webUrl);
    if (!normalized) {
      toast.error(ui.toastEnterArticleUrl);
      return;
    }

    setBrowserUrl(normalized);
    if (electronRuntime && !previewRuntime) {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
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
      toast.error(formatLocalized(ui.toastPickDirFailed, { error: errorMessage(pickError) }));
    }
  };

  const handleSaveSettings = async () => {
    setIsSettingsSaving(true);

    const nextDir = pdfDownloadDir.trim();
    const nextHomepage = homepageUrl.trim() || defaultHomepageUrl;
    const nextBatchLimit = normalizeBatchLimit(batchLimit, defaultBatchLimit);
    const payload: AppSettingsPayload = {
      defaultDownloadDir: nextDir || null,
      defaultHomepageUrl: nextHomepage,
      defaultBatchLimit: nextBatchLimit,
      defaultSameDomainOnly: sameDomainOnly,
    };

    try {
      if (desktopRuntime) {
        const saved = await invokeDesktop<AppSettingsPayload>('save_settings', { settings: payload });
        setPdfDownloadDir(saved.defaultDownloadDir ?? '');
        setHomepageUrl(saved.defaultHomepageUrl);
        setBatchLimit(normalizeBatchLimit(saved.defaultBatchLimit, defaultBatchLimit));
        setSameDomainOnly(saved.defaultSameDomainOnly);
      } else {
        window.localStorage.setItem('journal-reader-settings', JSON.stringify(payload));
        setPdfDownloadDir(nextDir);
        setHomepageUrl(nextHomepage);
        setBatchLimit(nextBatchLimit);
        setSameDomainOnly(sameDomainOnly);
      }

      toast.success(
        nextDir
          ? formatLocalized(ui.toastSettingsSavedWithDir, { dir: nextDir })
          : ui.toastSettingsSavedUseSystemDownloads,
      );
    } catch (saveError) {
      toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: errorMessage(saveError) }));
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleResetDownloadDir = () => {
    setPdfDownloadDir('');
    toast.info(ui.toastResetDirInput);
  };

  const handlePreviewDownloadPdf = async () => {
    if (!browserUrl) return;

    if (!desktopRuntime) {
      toast.info(ui.toastDesktopPdfDownloadOnly);
      return;
    }

    try {
      const result = await invokeDesktop<PdfDownloadResult>('preview_download_pdf', {
        pageUrl: browserUrl,
        customDownloadDir: pdfDownloadDir.trim() || null,
      });
      toast.success(
        formatLocalized(ui.toastPdfDownloaded, {
          filePath: result.filePath,
          sourceUrl: result.sourceUrl,
        }),
      );
    } catch (downloadError) {
      toast.error(formatLocalized(ui.toastPdfDownloadFailed, { error: errorMessage(downloadError) }));
    }
  };

  const handleFetchLatestBatch = async () => {
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopBatchFetchOnly);
      return;
    }

    const normalized = normalizeUrl(homepageUrl);
    if (!normalized) {
      toast.error(ui.toastEnterHomepageUrl);
      return;
    }

    if (!isDateRangeValid(batchStartDate, batchEndDate)) {
      toast.error(ui.toastDateRangeInvalid);
      return;
    }

    setIsBatchLoading(true);

    try {
      const fetched = await invokeDesktop<Article[]>('fetch_latest_articles', {
        homepageUrl: normalized,
        limit: batchLimit,
        sameDomainOnly,
        startDate: batchStartDate || null,
        endDate: batchEndDate || null,
      });

      setArticles((prev) => mergeArticles(fetched, prev));
      toast.success(formatLocalized(ui.toastBatchFetchSucceeded, { count: fetched.length }));

      if (fetched[0]) {
        setWebUrl(fetched[0].sourceUrl);
        setBrowserUrl(fetched[0].sourceUrl);
      }
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      toast.error(formatLocalized(ui.toastBatchFetchFailed, { error: message }));
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
          }}
          isWindowMaximized={isWindowMaximized}
          onWindowControl={handleWindowControl}
          isSidebarOpen={isSidebarOpen}
          sidebarToggleLabel={
            locale === 'zh'
              ? isSidebarOpen
                ? '收起侧边栏'
                : '展开侧边栏'
              : isSidebarOpen
                ? 'Collapse sidebar'
                : 'Expand sidebar'
          }
          onToggleSidebar={activePage === 'reader' ? () => setIsSidebarOpen((prev) => !prev) : undefined}
          onToggleSettings={() => setActivePage((prev) => (prev === 'settings' ? 'reader' : 'settings'))}
          browserUrl={browserUrl}
          canGoBack={previewState.canGoBack}
          canGoForward={previewState.canGoForward}
          canDownload={!!desktopRuntime}
          onNavigateBack={handlePreviewBack}
          onNavigateForward={handlePreviewForward}
          onRefresh={handleBrowserRefresh}
          onDownloadPdf={() => void handlePreviewDownloadPdf()}
          webUrl={webUrl}
          onWebUrlChange={setWebUrl}
          onNavigateWeb={handleNavigateWeb}
          articleUrlPlaceholder={ui.articleUrlPlaceholder}
        />
      ) : null}

      <div className={`app-shell ${activePage === 'settings' ? 'app-shell-settings' : ''}`.trim()}>
        {activePage === 'reader' ? (
          <ReaderView
            isSidebarOpen={isSidebarOpen}
            filteredArticles={filteredArticles}
            hasData={hasData}
            filterJournal={filterJournal}
            onFilterJournalChange={setFilterJournal}
            batchStartDate={batchStartDate}
            onBatchStartDateChange={setBatchStartDate}
            batchEndDate={batchEndDate}
            onBatchEndDateChange={setBatchEndDate}
            onFetchLatestBatch={() => void handleFetchLatestBatch()}
            isBatchLoading={isBatchLoading}
            onResetFilters={handleResetFilters}
            filteredCount={filteredArticles.length}
            totalCount={articles.length}
            browserUrl={browserUrl}
            previewCurrentUrl={previewState.url}
            iframeReloadKey={iframeReloadKey}
            electronRuntime={electronRuntime}
            previewRuntime={previewRuntime}
            labels={{
              resultPanelTitle: ui.resultPanelTitle,
              untitled: ui.untitled,
              unknown: ui.unknown,
              authors: ui.authors,
              abstract: ui.abstract,
              publishedAt: ui.publishedAt,
              source: ui.source,
              fetchedAt: ui.fetchedAt,
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
              emptyState: '请输入链接后查看网页。',
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
              settingsHomepageUrl: ui.settingsHomepageUrl,
              homepageUrlPlaceholder: ui.homepageUrlPlaceholder,
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
              currentDir: ui.currentDir,
              systemDownloads: ui.systemDownloads,
            }}
            isSettingsLoading={isSettingsLoading}
            locale={locale}
            onLocaleChange={setLocale}
            homepageUrl={homepageUrl}
            onHomepageUrlChange={setHomepageUrl}
            batchLimit={batchLimit}
            onBatchLimitChange={(value) => setBatchLimit(normalizeBatchLimit(value, 1))}
            sameDomainOnly={sameDomainOnly}
            onSameDomainOnlyChange={setSameDomainOnly}
            pdfDownloadDir={pdfDownloadDir}
            onPdfDownloadDirChange={setPdfDownloadDir}
            onChoosePdfDownloadDir={() => void handleChoosePdfDownloadDir()}
            desktopRuntime={desktopRuntime}
            isSettingsSaving={isSettingsSaving}
            onResetDownloadDir={handleResetDownloadDir}
            onSaveSettings={() => void handleSaveSettings()}
          />
        )}
        <ToastContainer />
      </div>
    </div>
  );
}

