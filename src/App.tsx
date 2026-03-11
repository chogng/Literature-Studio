import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import {
  ArrowRight,
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
};

type DesktopInvokeArgs = Record<string, unknown> | undefined;

const defaultArticleUrl = '';
const defaultHomepageUrl = 'https://arxiv.org/list/cs/new';


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
  const [batchLimit, setBatchLimit] = useState(5);
  const [sameDomainOnly, setSameDomainOnly] = useState(true);
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

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const electronRuntime = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return typeof window.electronAPI?.invoke === 'function';
  }, []);
  const desktopRuntime = electronRuntime;
  const invokeDesktop = useCallback(
    async <T,>(command: string, args?: DesktopInvokeArgs): Promise<T> => {
      if (window.electronAPI?.invoke) {
        return window.electronAPI.invoke<T>(command, args);
      }
      throw new Error('当前运行环境不支持该命令');
    },
    [],
  );
  const ui = useMemo(() => getLocaleMessages(locale), [locale]);

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

  const statusBarState = useMemo(() => {
    if (error) {
      return { label: ui.statusError, message: error, className: 'status-bar is-error' };
    }
    if (status) {
      return { label: ui.statusInfo, message: status, className: 'status-bar' };
    }
    return { label: ui.statusInfo, message: ui.statusReady, className: 'status-bar' };
  }, [error, status, ui]);

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
        if (desktopRuntime) {
          const loaded = await invokeDesktop<AppSettingsPayload>('load_settings');
          setPdfDownloadDir(loaded.defaultDownloadDir ?? '');
          return;
        }

        const raw = window.localStorage.getItem('journal-reader-settings');
        if (!raw) {
          setPdfDownloadDir('');
          return;
        }

        const parsed = JSON.parse(raw) as Partial<AppSettingsPayload>;
        setPdfDownloadDir(typeof parsed.defaultDownloadDir === 'string' ? parsed.defaultDownloadDir : '');
      } catch (loadError) {
        setError(`加载设置失败：${errorMessage(loadError)}`);
      } finally {
        setIsSettingsLoading(false);
      }
    };

    void loadSettings();
  }, [desktopRuntime, invokeDesktop]);

  const handleNavigateWeb = () => {
    const normalized = normalizeUrl(webUrl);
    if (!normalized) {
      setError('请先输入文章链接。');
      return;
    }

    setError(null);
    setBrowserUrl(normalized);
  };

  const handleBrowserRefresh = () => {
    setIframeReloadKey((prev) => prev + 1);
  };

  const handleChoosePdfDownloadDir = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式不支持系统目录选择，请在桌面端运行。');
      return;
    }

    setStatus(null);
    setError(null);

    try {
      const selected = await invokeDesktop<string | null>('pick_download_directory');
      if (!selected) {
        setStatus('未选择目录，保持当前设置。');
        return;
      }

      setPdfDownloadDir(selected);
      setStatus(`已选择目录：${selected}（记得点击“保存设置”）`);
    } catch (pickError) {
      setError(`选择目录失败：${errorMessage(pickError)}`);
    }
  };

  const handleSaveSettings = async () => {
    setStatus(null);
    setError(null);
    setIsSettingsSaving(true);

    const nextDir = pdfDownloadDir.trim();
    const payload: AppSettingsPayload = {
      defaultDownloadDir: nextDir || null,
    };

    try {
      if (desktopRuntime) {
        const saved = await invokeDesktop<AppSettingsPayload>('save_settings', { settings: payload });
        setPdfDownloadDir(saved.defaultDownloadDir ?? '');
      } else {
        window.localStorage.setItem('journal-reader-settings', JSON.stringify(payload));
        setPdfDownloadDir(nextDir);
      }

      setStatus(
        nextDir
          ? `设置已保存，默认下载目录：${nextDir}`
          : '设置已保存，默认将使用系统 Downloads 目录',
      );
    } catch (saveError) {
      setError(`保存设置失败：${errorMessage(saveError)}`);
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleResetDownloadDir = () => {
    setPdfDownloadDir('');
    setStatus('已清空目录输入，点击“保存设置”后将恢复系统 Downloads 目录。');
    setError(null);
  };

  const handlePreviewDownloadPdf = async () => {
    if (!browserUrl) return;

    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式不支持本地 PDF 下载，请在桌面端运行。');
      return;
    }

    setStatus(null);
    setError(null);

    try {
      const result = await invokeDesktop<PdfDownloadResult>('preview_download_pdf', {
        pageUrl: browserUrl,
        customDownloadDir: pdfDownloadDir.trim() || null,
      });
      setStatus(`PDF 已下载到：${result.filePath}（来源：${result.sourceUrl}）`);
    } catch (downloadError) {
      setError(`下载 PDF 失败：${errorMessage(downloadError)}`);
    }
  };

  const handleFetchSingle = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式暂不支持抓取（需要桌面端后端命令）。请在桌面端运行或先只用左侧预览调试布局。');
      return;
    }

    const normalized = normalizeUrl(webUrl);
    if (!normalized) {
      setError('请先输入文章链接。');
      return;
    }

    setIsSingleLoading(true);
    setStatus(null);
    setError(null);
    setBrowserUrl(normalized);

    try {
      const fetched = await invokeDesktop<Article>('fetch_article', { url: normalized });
      setArticles((prev) => mergeArticles([fetched], prev));
      setStatus('单篇抓取完成并已写入历史。');
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`单篇抓取失败：${message}`);
    } finally {
      setIsSingleLoading(false);
    }
  };

  const handleFetchLatestBatch = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式暂不支持批量抓取（需要桌面端后端命令）。请在桌面端运行。');
      return;
    }

    const normalized = normalizeUrl(homepageUrl);
    if (!normalized) {
      setError('请先输入期刊首页链接。');
      return;
    }

    if (batchStartDate && batchEndDate && batchStartDate > batchEndDate) {
      setError('开始日期不能晚于结束日期。');
      return;
    }

    setIsBatchLoading(true);
    setStatus(null);
    setError(null);

    try {
      const fetched = await invokeDesktop<Article[]>('fetch_latest_articles', {
        homepageUrl: normalized,
        limit: batchLimit,
        sameDomainOnly,
        startDate: batchStartDate || null,
        endDate: batchEndDate || null,
      });

      setArticles((prev) => mergeArticles(fetched, prev));
      setStatus(`批量抓取完成：${fetched.length} 篇，已写入历史。`);

      if (fetched[0]) {
        setWebUrl(fetched[0].sourceUrl);
        setBrowserUrl(fetched[0].sourceUrl);
      }
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`批量抓取失败：${message}`);
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
          onNavigateBack={() => setStatus('Electron 嵌入预览暂不支持后退。')}
          onNavigateForward={() => setStatus('Electron 嵌入预览暂不支持前进。')}
          onRefresh={handleBrowserRefresh}
          onDownloadPdf={() => void handlePreviewDownloadPdf()}
        />
      ) : null}

      <div className={`app-shell ${activePage === 'settings' ? 'app-shell-settings' : ''}`.trim()}>
        {activePage === 'reader' ? (
          <header className="toolbar">
            <div className="menu-bar">
              <div className="menu-fetch-strip">
                <input
                  className="url-input menu-fetch-input"
                  type="text"
                  value={webUrl}
                  onChange={(event) => setWebUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleNavigateWeb();
                    }
                  }}
                  placeholder={ui.articleUrlPlaceholder}
                />
                <button
                  className="icon-btn"
                  type="button"
                  onClick={handleNavigateWeb}
                  disabled={isSingleLoading || isBatchLoading}
                  title={ui.navigateWeb}
                  aria-label={ui.navigateWeb}
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={handleFetchSingle}
                  disabled={isSingleLoading || isBatchLoading}
                >
                  {isSingleLoading ? ui.fetchCurrentBusy : ui.fetchCurrent}
                </button>
              </div>

              <div className="menu-fetch-strip">
                <input
                  className="url-input menu-fetch-input"
                  type="text"
                  value={homepageUrl}
                  onChange={(event) => setHomepageUrl(event.target.value)}
                  placeholder={ui.homepageUrlPlaceholder}
                />
                <label className="inline-field" htmlFor="batch-limit">
                  {ui.batchCount}
                  <input
                    id="batch-limit"
                    className="number-input"
                    type="number"
                    min={1}
                    max={20}
                    value={batchLimit}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(parsed)) {
                        setBatchLimit(1);
                        return;
                      }
                      setBatchLimit(Math.min(20, Math.max(1, parsed)));
                    }}
                  />
                </label>
                <label className="inline-field checkbox-field" htmlFor="same-domain-only">
                  <Checkbox.Root
                    id="same-domain-only"
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

        <footer className={statusBarState.className} role="status" aria-live="polite">
          <span className="status-bar-label">{statusBarState.label}</span>
          <span className="status-bar-message">{statusBarState.message}</span>
        </footer>
      </div>
    </div>
  );
}

