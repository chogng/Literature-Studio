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
  toDocumentLang,
  type Locale,
} from './language/i18n';
import * as TitlebarModule from './titlebar';
import { ToastContainer, toast } from './components/Toast';
import ReaderView from './views/ReaderView';
import SettingsView from './views/SettingsView';
import { buildDefaultBatchDateRange } from './utils/dateRange';
import { fetchLatestArticlesBatch, type Article } from './services/articleFetch';

type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';

const TitlebarView =
  ((TitlebarModule as { Titlebar?: ComponentType<any>; default?: ComponentType<any> }).Titlebar ??
    (TitlebarModule as { default?: ComponentType<any> }).default ??
    (() => null)) as ComponentType<any>;

type PdfDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type StoredAppSettingsPayload = {
  defaultDownloadDir: string | null;
  defaultBatchHomepageUrls: string[];
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
  locale: Locale;
};

type AppSettingsPayload = StoredAppSettingsPayload & {
  configPath?: string;
};

type DesktopInvokeArgs = Record<string, unknown> | undefined;

const defaultArticleUrl = '';
const defaultBatchHomepageUrl = 'https://arxiv.org/list/cs/new';
const defaultBatchHomepageUrls = [defaultBatchHomepageUrl];
const defaultBatchLimit = 5;
const defaultSameDomainOnly = true;

function normalizeBatchLimit(input: unknown, fallback: number = defaultBatchLimit): number {
  const parsed = Number.parseInt(String(input), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(20, Math.max(1, parsed));
}

function sanitizeBatchHomepageUrls(input: unknown): string[] {
  const values = Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function normalizeBatchHomepageUrls(
  input: unknown,
  fallback: string[] = defaultBatchHomepageUrls,
): string[] {
  const normalized = sanitizeBatchHomepageUrls(input);
  return normalized.length > 0 ? normalized : [...fallback];
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
  const [batchHomepageUrls, setBatchHomepageUrls] = useState<string[]>(defaultBatchHomepageUrls);
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
      throw new Error('Desktop invoke bridge is unavailable.');
    },
    [],
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
    document.documentElement.lang = toDocumentLang(locale);
  }, [locale]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);

      try {
        const applyLoadedSettings = (loaded: Partial<AppSettingsPayload>) => {
          const loadedLocale = loaded.locale === 'zh' || loaded.locale === 'en' ? loaded.locale : null;
          const loadedConfigPath = typeof loaded.configPath === 'string' ? loaded.configPath : '';

          setPdfDownloadDir(typeof loaded.defaultDownloadDir === 'string' ? loaded.defaultDownloadDir : '');
          setBatchHomepageUrls(normalizeBatchHomepageUrls(loaded.defaultBatchHomepageUrls));
          setBatchLimit(normalizeBatchLimit(loaded.defaultBatchLimit, defaultBatchLimit));
          setSameDomainOnly(
            typeof loaded.defaultSameDomainOnly === 'boolean'
              ? loaded.defaultSameDomainOnly
              : defaultSameDomainOnly,
          );
          setConfigPath(loadedConfigPath);
          if (loadedLocale) {
            setLocale(loadedLocale);
          }
        };

        if (desktopRuntime) {
          const loaded = await invokeDesktop<AppSettingsPayload>('load_settings');
          applyLoadedSettings(loaded);
          return;
        }

        applyLoadedSettings({});
      } catch (loadError) {
        toast.error(formatLocalized(ui.toastLoadSettingsFailed, { error: errorMessage(loadError) }));
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

  const handleBatchHomepageUrlChange = useCallback((index: number, nextUrl: string) => {
    setBatchHomepageUrls((current) =>
      current.map((url, urlIndex) => (urlIndex === index ? nextUrl : url)),
    );
  }, []);

  const handleAddBatchHomepageUrl = useCallback(() => {
    setBatchHomepageUrls((current) => [...current, '']);
  }, []);

  const handleRemoveBatchHomepageUrl = useCallback((index: number) => {
    setBatchHomepageUrls((current) => {
      if (current.length <= 1) {
        return [''];
      }

      return current.filter((_, urlIndex) => urlIndex !== index);
    });
  }, []);

  const handleLocaleChange = useCallback(
    (nextLocale: Locale) => {
      setLocale(nextLocale);

      if (!desktopRuntime) return;

      void invokeDesktop<AppSettingsPayload>('save_settings', {
        settings: { locale: nextLocale },
      }).catch((saveError) => {
        toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: errorMessage(saveError) }));
      });
    },
    [desktopRuntime, invokeDesktop, ui],
  );

  const handleSaveSettings = async () => {
    setIsSettingsSaving(true);

    const nextDir = pdfDownloadDir.trim();
    const nextHomepageUrls = normalizeBatchHomepageUrls(batchHomepageUrls);
    const nextBatchLimit = normalizeBatchLimit(batchLimit, defaultBatchLimit);
    const payload: StoredAppSettingsPayload = {
      defaultDownloadDir: nextDir || null,
      defaultBatchHomepageUrls: nextHomepageUrls,
      defaultBatchLimit: nextBatchLimit,
      defaultSameDomainOnly: sameDomainOnly,
      locale,
    };

    try {
      if (desktopRuntime) {
        const saved = await invokeDesktop<AppSettingsPayload>('save_settings', { settings: payload });
        setPdfDownloadDir(saved.defaultDownloadDir ?? '');
        setBatchHomepageUrls(normalizeBatchHomepageUrls(saved.defaultBatchHomepageUrls));
        setBatchLimit(normalizeBatchLimit(saved.defaultBatchLimit, defaultBatchLimit));
        setSameDomainOnly(saved.defaultSameDomainOnly);
        setConfigPath(typeof saved.configPath === 'string' ? saved.configPath : configPath);
        setLocale(saved.locale);
      } else {
        setPdfDownloadDir(nextDir);
        setBatchHomepageUrls(nextHomepageUrls);
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
    setIsBatchLoading(true);

    try {
      const fetchHomepageUrls = sanitizeBatchHomepageUrls(batchHomepageUrls);

      const result = await fetchLatestArticlesBatch({
        desktopRuntime,
        homepageUrls: fetchHomepageUrls,
        limit: batchLimit,
        sameDomainOnly,
        startDate: batchStartDate || null,
        endDate: batchEndDate || null,
        normalizeUrl,
        invokeDesktop,
      });

      if (!result.ok) {
        if (result.reason === 'desktop_unsupported') {
          toast.info(ui.toastDesktopBatchFetchOnly);
          return;
        }
        if (result.reason === 'empty_homepage_url') {
          toast.error(ui.toastEnterHomepageUrl);
          return;
        }
        if (result.reason === 'invalid_date_range') {
          toast.error(ui.toastDateRangeInvalid);
          return;
        }
        toast.error(formatLocalized(ui.toastBatchFetchFailed, { error: result.error ?? ui.unknown }));
        return;
      }

      setArticles((prev) => mergeArticles(result.articles, prev));
      toast.success(formatLocalized(ui.toastBatchFetchSucceeded, { count: result.articles.length }));
      if (result.articles[0]) {
        setWebUrl(result.articles[0].sourceUrl);
        setBrowserUrl(result.articles[0].sourceUrl);
      }
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
            backLabel: ui.titlebarBack,
            forwardLabel: ui.titlebarForward,
            refreshLabel: ui.titlebarRefresh,
            downloadPdfLabel: ui.titlebarDownloadPdf,
            desktopOnlyLabel: ui.titlebarDesktopOnly,
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
              settingsHomepageUrl: ui.settingsHomepageUrl,
              settingsHomepageUrlHint: ui.settingsHomepageUrlHint,
              homepageUrlPlaceholder: ui.homepageUrlPlaceholder,
              addBatchUrl: ui.addBatchUrl,
              removeBatchUrl: ui.removeBatchUrl,
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
            batchHomepageUrls={batchHomepageUrls}
            onBatchHomepageUrlChange={handleBatchHomepageUrlChange}
            onAddBatchHomepageUrl={handleAddBatchHomepageUrl}
            onRemoveBatchHomepageUrl={handleRemoveBatchHomepageUrl}
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

