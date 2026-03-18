import {
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
import { ToastContainer } from './components/Toast';
import ReaderView from './views/ReaderView';
import SettingsView from './views/SettingsView';
import ArticleDetailsModalWindow from './views/ArticleDetailsModalWindow';
import { type Article } from './services/article-fetch';
import {
  getConfigBatchSourceSeed,
  normalizeBatchLimit,
} from './services/config-schema';
import { useBatchFetch } from './hooks/use-batch-fetch';
import { usePreviewNavigation } from './hooks/use-preview-navigation';
import { useReaderState } from './hooks/use-reader-state';
import { useSettingsState } from './hooks/use-settings-state';
import { useDocumentActions } from './hooks/use-document-actions';
import {
  Titlebar as TitlebarView,
  useTitlebarController,
  useTitlebarControllerConfig,
  useWindowControls,
} from './titlebar/index';

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
  const [webUrl, setWebUrl] = useState(defaultArticleUrl);
  const [fetchSeedUrl, setFetchSeedUrl] = useState(defaultArticleUrl);
  const [articles, setArticles] = useState<Article[]>([]);

  const electronRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.invoke === 'function';
  const previewRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.preview?.navigate === 'function';
  const desktopRuntime = electronRuntime;
  const { isWindowMaximized, handleWindowControl } = useWindowControls({ electronRuntime });
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
  const {
    batchSources,
    batchLimit,
    setBatchLimit,
    sameDomainOnly,
    setSameDomainOnly,
    pdfDownloadDir,
    setPdfDownloadDir,
    configPath,
    isSettingsLoading,
    isSettingsSaving,
    handleChoosePdfDownloadDir,
    handleLocaleChange,
    handleSaveSettings,
    handleResetDownloadDir,
    handleBatchSourceUrlChange,
    handleBatchSourceJournalTitleChange,
    handleAddBatchSource,
    handleRemoveBatchSource,
    handleMoveBatchSource,
  } = useSettingsState({
    desktopRuntime,
    invokeDesktop,
    ui,
    locale,
    setLocale,
    initialBatchSources,
  });

  const {
    batchStartDate,
    setBatchStartDate,
    batchEndDate,
    setBatchEndDate,
    filterJournal,
    setFilterJournal,
    isSidebarOpen,
    filteredArticles,
    hasData,
    handleResetFilters,
    handleToggleSidebar,
  } = useReaderState({ articles });
  const {
    browserUrl,
    iframeReloadKey,
    previewState,
    handleNavigateWeb,
    handleBrowserRefresh,
    handlePreviewBack,
    handlePreviewForward,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    handleWebUrlChange,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  } = usePreviewNavigation({
    electronRuntime,
    previewRuntime,
    ui,
    webUrl,
    fetchSeedUrl,
    batchSources,
    setWebUrl,
    setFetchSeedUrl,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.lang = toDocumentLang(locale);
  }, [locale]);

  const handleBatchFetchStart = useCallback(() => {
    setArticles([]);
  }, []);

  const handleBatchFetchSuccess = useCallback((nextArticles: Article[]) => {
    setArticles(nextArticles);
  }, []);

  const {
    isBatchLoading,
    handleFetchLatestBatch,
    fetchStatus,
    titlebarFetchSourceText,
    titlebarFetchSourceTitle,
    titlebarFetchStopText,
    titlebarFetchStopTitle,
  } = useBatchFetch({
    desktopRuntime,
    addressBarUrl: fetchSeedUrl || webUrl,
    batchSources,
    sameDomainOnly,
    batchStartDate,
    batchEndDate,
    invokeDesktop,
    ui,
    onBeforeFetch: handleBatchFetchStart,
    onFetchSuccess: handleBatchFetchSuccess,
  });

  const {
    canExportDocx,
    handleSharedPdfDownload,
    handleExportArticlesDocx,
  } = useDocumentActions({
    desktopRuntime,
    invokeDesktop,
    locale,
    ui,
    pdfDownloadDir,
    filteredArticles,
  });
  const titlebarConfig = useTitlebarControllerConfig({
    activePage,
    setActivePage,
    ui,
    webUrl,
    isWindowMaximized,
    handleWindowControl,
    isSidebarOpen,
    handleToggleSidebar,
    browserUrl,
    previewState,
    canExportDocx,
    handlePreviewBack,
    handlePreviewForward,
    handleBrowserRefresh,
    handleExportArticlesDocx,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    handleWebUrlChange,
    handleNavigateWeb,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
    fetchStatus,
    titlebarFetchSourceText,
    titlebarFetchSourceTitle,
    titlebarFetchStopText,
    titlebarFetchStopTitle,
  });
  useTitlebarController(titlebarConfig);

  return (
    <div className="app-window">
      {electronRuntime ? <TitlebarView /> : null}

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
              description: locale === 'zh' ? '描述：' : 'Description:',
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

