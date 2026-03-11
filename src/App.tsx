import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import {
  Check,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import {
  detectInitialLocale,
  getLocaleMessages,
  localeStorageKey,
  toDocumentLang,
  type Locale,
} from './language/i18n';
import Sidebar from './sidebar';
import * as TitlebarModule from './titlebar';
import { ToastContainer, toast } from './components/Toast';

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
  const [webUrl, setWebUrl] = useState(defaultArticleUrl);
  const [browserUrl, setBrowserUrl] = useState(normalizeUrl(defaultArticleUrl));
  const [homepageUrl, setHomepageUrl] = useState(defaultHomepageUrl);
  const [batchLimit, setBatchLimit] = useState(defaultBatchLimit);
  const [sameDomainOnly, setSameDomainOnly] = useState(defaultSameDomainOnly);
  const [batchStartDate, setBatchStartDate] = useState('');
  const [batchEndDate, setBatchEndDate] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterJournal, setFilterJournal] = useState('');
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pdfDownloadDir, setPdfDownloadDir] = useState('');

  const [isSingleLoading, setIsSingleLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);

  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const electronRuntime = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return typeof window.electronAPI?.invoke === 'function';
  }, []);
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
    const keyword = filterKeyword.trim().toLowerCase();
    const journal = filterJournal.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesJournal = !journal || article.sourceUrl.toLowerCase().includes(journal);
      if (!matchesJournal) return false;

      if (!keyword) return true;

      const searchable = [
        article.title,
        article.doi ?? '',
        article.authors.join(' '),
        article.abstractText ?? '',
        article.publishedAt ?? '',
        article.sourceUrl,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [articles, filterKeyword, filterJournal]);

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
    toast.success(formatLocalized(ui.toastNavigatingTo, { url: normalized }));
  };

  const handleBrowserRefresh = () => {
    setIframeReloadKey((prev) => prev + 1);
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

  const handleFetchSingle = async () => {
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopFetchOnly);
      return;
    }

    const normalized = normalizeUrl(webUrl);
    if (!normalized) {
      toast.error(ui.toastEnterArticleUrl);
      return;
    }

    setIsSingleLoading(true);
    setBrowserUrl(normalized);

    try {
      const fetched = await invokeDesktop<Article>('fetch_article', { url: normalized });
      setArticles((prev) => mergeArticles([fetched], prev));
      toast.success(ui.toastFetchSingleSucceeded);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      toast.error(formatLocalized(ui.toastFetchSingleFailed, { error: message }));
    } finally {
      setIsSingleLoading(false);
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

    if (batchStartDate && batchEndDate && batchStartDate > batchEndDate) {
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
    setFilterKeyword('');
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
          canDownload={!!desktopRuntime}
          onNavigateBack={() => toast.info(ui.toastPreviewBackUnsupported)}
          onNavigateForward={() => toast.info(ui.toastPreviewForwardUnsupported)}
          onRefresh={handleBrowserRefresh}
          onDownloadPdf={() => void handlePreviewDownloadPdf()}
          webUrl={webUrl}
          onWebUrlChange={setWebUrl}
          onNavigateWeb={handleNavigateWeb}
          onFetchSingle={handleFetchSingle}
          isSingleLoading={isSingleLoading}
          articleUrlPlaceholder={ui.articleUrlPlaceholder}
          fetchLabel={ui.fetchCurrent}
          fetchBusyLabel={ui.fetchCurrentBusy}
        />
      ) : null}

      <div className={`app-shell ${activePage === 'settings' ? 'app-shell-settings' : ''}`.trim()}>
        {activePage === 'reader' ? (
          <header className="toolbar">
            <div className="menu-bar">

              <div className="menu-fetch-strip">
                <span className="menu-fetch-config">
                  {homepageUrl} · {ui.batchCount} {batchLimit} ·{' '}
                  {sameDomainOnly ? ui.sameDomainOnly : ui.crossDomainAllowed}
                </span>
                <label className="inline-field" htmlFor="batch-start-date">
                  {ui.startDate}
                  <input
                    id="batch-start-date"
                    className="date-input"
                    type="date"
                    value={batchStartDate}
                    onChange={(event) => setBatchStartDate(event.target.value)}
                  />
                </label>
                <label className="inline-field" htmlFor="batch-end-date">
                  {ui.endDate}
                  <input
                    id="batch-end-date"
                    className="date-input"
                    type="date"
                    value={batchEndDate}
                    onChange={(event) => setBatchEndDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleFetchLatestBatch}
                  disabled={isSingleLoading || isBatchLoading}
                >
                  {isBatchLoading ? ui.fetchLatestBusy : ui.fetchLatest}
                </button>
              </div>
            </div>


            <div className="toolbar-row">
              <input
                className="filter-input"
                type="text"
                value={filterKeyword}
                onChange={(event) => setFilterKeyword(event.target.value)}
                placeholder={ui.keywordFilterPlaceholder}
              />
              <input
                className="filter-input"
                type="text"
                value={filterJournal}
                onChange={(event) => setFilterJournal(event.target.value)}
                placeholder={ui.journalFilterPlaceholder}
              />
              <button
                className="icon-btn"
                type="button"
                onClick={handleResetFilters}
                disabled={!filterKeyword && !filterJournal}
                title={ui.resetFilter}
                aria-label={ui.resetFilter}
              >
                <RotateCcw size={16} />
              </button>
              <span className="count">
                {ui.showing} {filteredArticles.length} / {ui.total} {articles.length}
              </span>
            </div>
          </header>
        ) : null}

      {activePage === 'reader' ? (
        <main className={`content-grid ${isSidebarOpen ? '' : 'is-sidebar-collapsed'}`.trim()}>
          {isSidebarOpen ? (
            <Sidebar
              articles={filteredArticles}
              hasData={hasData}
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
              }}
            />
          ) : null}

          <section className="panel web-panel">
            <div className="web-frame-container">
              <div className="native-webview-host">
                {browserUrl ? (
                  <iframe
                    key={`${browserUrl}-${iframeReloadKey}`}
                    className="web-frame"
                    src={browserUrl}
                    title="Web Preview"
                    sandbox="allow-forms allow-scripts allow-same-origin"
                    scrolling="yes"
                  />
                ) : (
                  <div className="empty-state">请输入链接后查看网页。</div>
                )}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="settings-page">
          <section className="panel settings-card">
            <div className="panel-title">{ui.settingsTitle}</div>
            <div className="settings-content">
              {isSettingsLoading ? <p className="settings-hint">{ui.settingsLoading}</p> : null}

              <div className="settings-field">
                <span>{ui.settingsLanguage}</span>
                <div className="settings-language-toggle" role="group" aria-label={ui.settingsLanguage}>
                  <button
                    type="button"
                    className={locale === 'zh' ? 'settings-language-btn is-active' : 'settings-language-btn'}
                    onClick={() => setLocale('zh')}
                    aria-pressed={locale === 'zh'}
                  >
                    {ui.languageChinese}
                  </button>
                  <button
                    type="button"
                    className={locale === 'en' ? 'settings-language-btn is-active' : 'settings-language-btn'}
                    onClick={() => setLocale('en')}
                    aria-pressed={locale === 'en'}
                  >
                    {ui.languageEnglish}
                  </button>
                </div>
                <p className="settings-hint">{ui.settingsLanguageHint}</p>
              </div>

              <label className="settings-field">
                {ui.settingsHomepageUrl}
                <input
                  className="settings-input"
                  type="text"
                  value={homepageUrl}
                  onChange={(event) => setHomepageUrl(event.target.value)}
                  placeholder={ui.homepageUrlPlaceholder}
                />
              </label>

              <div className="settings-field">
                <span>{ui.settingsBatchOptions}</span>
                <div className="settings-batch-options">
                  <label className="inline-field" htmlFor="settings-batch-limit">
                    {ui.batchCount}
                    <input
                      id="settings-batch-limit"
                      className="number-input"
                      type="number"
                      min={1}
                      max={20}
                      value={batchLimit}
                      onChange={(event) => setBatchLimit(normalizeBatchLimit(event.target.value, 1))}
                    />
                  </label>
                  <label className="inline-field checkbox-field" htmlFor="settings-same-domain-only">
                    <Checkbox.Root
                      id="settings-same-domain-only"
                      className="radix-checkbox"
                      checked={sameDomainOnly}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        setSameDomainOnly(checked === true)
                      }
                    >
                      <Checkbox.Indicator className="radix-checkbox-indicator">
                        <Check size={12} />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    {ui.sameDomainOnly}
                  </label>
                </div>
                <p className="settings-hint">{ui.settingsBatchHint}</p>
              </div>

              <label className="settings-field">
                {ui.defaultPdfDir}
                <div className="settings-input-row">
                  <input
                    className="settings-input"
                    type="text"
                    value={pdfDownloadDir}
                    onChange={(event) => setPdfDownloadDir(event.target.value)}
                    placeholder={ui.downloadDirPlaceholder}
                  />
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => void handleChoosePdfDownloadDir()}
                    disabled={!desktopRuntime || isSettingsSaving}
                    title={ui.chooseDirectory}
                    aria-label={ui.chooseDirectory}
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
              </label>

              <div className="settings-actions">
                <button
                  type="button"
                  onClick={handleResetDownloadDir}
                  disabled={!pdfDownloadDir.trim() || isSettingsSaving}
                >
                  {ui.resetDefault}
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => void handleSaveSettings()}
                  disabled={isSettingsLoading || isSettingsSaving}
                >
                  {isSettingsSaving ? ui.saving : ui.saveSettings}
                </button>
              </div>

              <p className="settings-hint">{ui.settingsHintPath}</p>
              <p className="settings-hint">
                {ui.currentDir}{pdfDownloadDir.trim() ? pdfDownloadDir.trim() : ui.systemDownloads}
              </p>
            </div>
          </section>
        </main>
      )}
        <ToastContainer />
      </div>
    </div>
  );
}

