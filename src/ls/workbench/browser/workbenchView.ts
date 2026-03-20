import { jsx, jsxs } from 'react/jsx-runtime';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { detectInitialLocale, getLocaleMessages, toDocumentLang, type Locale } from '../../../language/i18n';
import { hasWorkbenchWindowControlsProvider, useWindowControls } from './window';
import { ToastContainer } from '../../base/browser/ui/toast/toast';
import type { Article } from '../services/article/articleFetch';
import {
  getConfigBatchSourceSeed,
  normalizeBatchLimit,
} from '../services/config/configSchema';
import ArticleDetailsModalWindow from './articleDetailsModalWindow';
import { useBatchFetchModel } from './batchFetchModel';
import { useDocumentActionsModel } from './documentActionsModel';
import {
  getWorkbenchLayoutStateSnapshot,
  getWorkbenchShellClassName,
  WORKBENCH_PART_IDS,
  subscribeWorkbenchLayoutState,
  toggleSidebarVisibility,
  useWorkbenchPartRef,
} from './layout';
import { createEditorPartProps } from './parts/editor/editorPart';
import { createSettingsPartProps, SettingsPartView } from './parts/settings/settingsPart';
import { createSidebarPartProps } from './parts/sidebar/sidebarPart';
import { createTitlebarPartProps } from './parts/titlebar/titlebarPart';
import { subscribeTitlebarUiActions } from './parts/titlebar/titlebarActions';
import { TitlebarView } from './parts/titlebar/titlebarView';
import { PreviewNavigationModel } from './previewNavigationModel';
import { useReaderState } from './readerState';
import ReaderView from './readerView';
import { useSettingsModel } from './parts/settings/settingsModel';
import {
  getWorkbenchStateSnapshot,
  subscribeWorkbenchState,
  toggleWorkbenchSettings,
} from './workbench';
import './media/workbench.css';

type DesktopInvokeArgs = Record<string, unknown> | undefined;
type ActivePage = ReturnType<typeof getWorkbenchStateSnapshot>['activePage'];

type ActivePageViewConfig = {
  activePage: ActivePage;
  isSidebarVisible: boolean;
  sidebarProps: ReturnType<typeof createSidebarPartProps>;
  editorPartProps: ReturnType<typeof createEditorPartProps>;
  settingsPartRef: ReturnType<typeof useWorkbenchPartRef>;
  settingsPartProps: ReturnType<typeof createSettingsPartProps>;
};

type WorkbenchShellConfig = {
  workbenchContainerRef: ReturnType<typeof useWorkbenchPartRef>;
  electronRuntime: boolean;
  useMica: boolean;
  titlebarPartRef: ReturnType<typeof useWorkbenchPartRef>;
  titlebarProps: ReturnType<typeof createTitlebarPartProps>;
  activePage: ActivePage;
  activePageView: ReactNode;
  toastCloseLabel: string;
};

const DEFAULT_ARTICLE_URL = '';
const INITIAL_BATCH_SOURCES = getConfigBatchSourceSeed();

function getArticleSelectionKey(article: Pick<Article, 'sourceUrl' | 'fetchedAt'>) {
  return `${article.sourceUrl}::${article.fetchedAt}`;
}

function detectNativeModalKind() {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('nativeModal');
}

function resolveRuntimeState() {
  const electronRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.invoke === 'function';
  const previewRuntime =
    typeof window !== 'undefined' && typeof window.electronAPI?.preview?.navigate === 'function';

  return {
    electronRuntime,
    previewRuntime,
    desktopRuntime: electronRuntime,
  };
}

function shouldShowDevelopmentUi(desktopRuntime: boolean) {
  if (!desktopRuntime || typeof window === 'undefined') {
    return false;
  }

  return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
}

function renderActivePageView({
  activePage,
  isSidebarVisible,
  sidebarProps,
  editorPartProps,
  settingsPartRef,
  settingsPartProps,
}: ActivePageViewConfig) {
  if (activePage === 'reader') {
    return jsx(ReaderView, {
      isSidebarVisible,
      sidebarProps,
      editorPartProps,
    });
  }

  return jsx(SettingsPartView, {
    partRef: settingsPartRef,
    ...settingsPartProps,
  });
}

function renderWorkbenchShell({
  workbenchContainerRef,
  electronRuntime,
  useMica,
  titlebarPartRef,
  titlebarProps,
  activePage,
  activePageView,
  toastCloseLabel,
}: WorkbenchShellConfig) {
  return jsxs('div', {
    ref: workbenchContainerRef,
    className: `app-window ${electronRuntime && useMica ? 'is-mica-enabled' : ''}`.trim(),
    children: [
      electronRuntime ? jsx(TitlebarView, { partRef: titlebarPartRef, ...titlebarProps }) : null,
      jsxs('div', {
        className: getWorkbenchShellClassName({ activePage }),
        children: [activePageView, jsx(ToastContainer, { closeLabel: toastCloseLabel })],
      }),
    ],
  });
}

function WorkbenchContentView() {
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const [webUrl, setWebUrl] = useState(DEFAULT_ARTICLE_URL);
  const [fetchSeedUrl, setFetchSeedUrl] = useState(DEFAULT_ARTICLE_URL);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isSelectionModeEnabled, setIsSelectionModeEnabled] = useState(false);
  const [selectedArticleKeys, setSelectedArticleKeys] = useState<Set<string>>(() => new Set());

  const workbenchState = useSyncExternalStore(
    subscribeWorkbenchState,
    getWorkbenchStateSnapshot,
    getWorkbenchStateSnapshot,
  );
  const workbenchLayoutState = useSyncExternalStore(
    subscribeWorkbenchLayoutState,
    getWorkbenchLayoutStateSnapshot,
    getWorkbenchLayoutStateSnapshot,
  );

  const { activePage } = workbenchState;
  const { isSidebarVisible } = workbenchLayoutState;

  const workbenchContainerRef = useWorkbenchPartRef(WORKBENCH_PART_IDS.container);
  const titlebarPartRef = useWorkbenchPartRef(WORKBENCH_PART_IDS.titlebar);
  const settingsPartRef = useWorkbenchPartRef(WORKBENCH_PART_IDS.settings);
  const { electronRuntime, previewRuntime, desktopRuntime } = resolveRuntimeState();
  const showDevelopmentUi = shouldShowDevelopmentUi(desktopRuntime);
  const hasWindowControlsProvider = hasWorkbenchWindowControlsProvider();
  const { isWindowMaximized, handleWindowControl } = useWindowControls({
    electronRuntime: electronRuntime && hasWindowControlsProvider,
  });
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
    useMica,
    setUseMica,
    pdfDownloadDir,
    setPdfDownloadDir,
    activeLlmProvider,
    setActiveLlmProvider,
    llmProviders,
    setLlmProviderApiKey,
    setLlmProviderModel,
    configPath,
    isSettingsLoading,
    isSettingsSaving,
    isTestingLlmConnection,
    handleChoosePdfDownloadDir,
    handleOpenConfigLocation,
    handleLocaleChange,
    handleSaveSettings,
    handleTestLlmConnection,
    handleResetDownloadDir,
    handleBatchSourceUrlChange,
    handleBatchSourceJournalTitleChange,
    handleAddBatchSource,
    handleRemoveBatchSource,
    handleMoveBatchSource,
  } = useSettingsModel({
    desktopRuntime,
    invokeDesktop,
    ui,
    locale,
    setLocale,
    initialBatchSources: INITIAL_BATCH_SOURCES,
  });

  const {
    batchStartDate,
    setBatchStartDate,
    batchEndDate,
    setBatchEndDate,
    filteredArticles,
    hasData,
  } = useReaderState({ articles });

  useEffect(() => {
    setSelectedArticleKeys((previousKeys) => {
      if (previousKeys.size === 0) {
        return previousKeys;
      }

      const visibleKeys = new Set(filteredArticles.map((article) => getArticleSelectionKey(article)));
      const nextKeys = new Set([...previousKeys].filter((key) => visibleKeys.has(key)));

      return nextKeys.size === previousKeys.size ? previousKeys : nextKeys;
    });
  }, [filteredArticles]);

  const previewNavigationModel = useMemo(() => new PreviewNavigationModel(), []);
  const previewNavigationSnapshot = useSyncExternalStore(
    previewNavigationModel.subscribe,
    previewNavigationModel.getSnapshot,
    previewNavigationModel.getSnapshot,
  );
  const { browserUrl, iframeReloadKey, previewState } = previewNavigationSnapshot;

  useEffect(() => {
    return previewNavigationModel.connectPreviewState({
      previewRuntime,
      setWebUrl,
      setFetchSeedUrl,
    });
  }, [previewNavigationModel, previewRuntime, setFetchSeedUrl, setWebUrl]);

  const navigateToAddressBarUrl = useCallback(
    (nextUrl: string, showToast: boolean = true) => {
      return previewNavigationModel.navigateToAddressBarUrl({
        nextUrl,
        showToast,
        electronRuntime,
        previewRuntime,
        ui,
        setWebUrl,
        setFetchSeedUrl,
      });
    },
    [
      electronRuntime,
      previewNavigationModel,
      previewRuntime,
      setFetchSeedUrl,
      setWebUrl,
      ui,
    ],
  );

  const handleNavigateWeb = useCallback(() => {
    navigateToAddressBarUrl(webUrl, true);
  }, [navigateToAddressBarUrl, webUrl]);

  const handlePreviewBack = useCallback(() => {
    previewNavigationModel.handlePreviewBack({
      previewRuntime,
      ui,
    });
  }, [previewNavigationModel, previewRuntime, ui]);

  const handlePreviewForward = useCallback(() => {
    previewNavigationModel.handlePreviewForward({
      previewRuntime,
      ui,
    });
  }, [previewNavigationModel, previewRuntime, ui]);

  const handleAddressBarSourceMenuOpenChange = useCallback(
    (isOpen: boolean) => {
      previewNavigationModel.handleAddressBarSourceMenuOpenChange(
        {
          previewRuntime,
          browserUrl,
        },
        isOpen,
      );
    },
    [browserUrl, previewNavigationModel, previewRuntime],
  );

  const handleAddressBarSourceMenuDispose = useCallback(() => {
    previewNavigationModel.handleAddressBarSourceMenuDispose({
      previewRuntime,
      browserUrl,
    });
  }, [browserUrl, previewNavigationModel, previewRuntime]);

  const addressBarSourceOptions = useMemo(
    () => previewNavigationModel.createAddressBarSourceOptions(batchSources),
    [batchSources, previewNavigationModel],
  );
  const selectedAddressBarSourceId = useMemo(() => {
    return previewNavigationModel.resolveSelectedAddressBarSourceId(
      fetchSeedUrl,
      webUrl,
      batchSources,
    );
  }, [batchSources, fetchSeedUrl, previewNavigationModel, webUrl]);

  const handleWebUrlChange = useCallback(
    (nextUrl: string) => {
      previewNavigationModel.handleWebUrlChange(nextUrl, setWebUrl, setFetchSeedUrl);
    },
    [previewNavigationModel, setFetchSeedUrl, setWebUrl],
  );

  const handleSelectAddressBarSource = useCallback(
    (sourceId: string) => {
      previewNavigationModel.handleSelectAddressBarSource({
        sourceId,
        addressBarSourceOptions,
        navigateToUrl: navigateToAddressBarUrl,
      });
    },
    [addressBarSourceOptions, navigateToAddressBarUrl, previewNavigationModel],
  );

  const handleCycleAddressBarSource = useCallback(
    (direction: 'prev' | 'next') => {
      previewNavigationModel.handleCycleAddressBarSource({
        direction,
        addressBarSourceOptions,
        selectedAddressBarSourceId,
        navigateToUrl: navigateToAddressBarUrl,
      });
    },
    [
      addressBarSourceOptions,
      navigateToAddressBarUrl,
      previewNavigationModel,
      selectedAddressBarSourceId,
    ],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

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
  } = useBatchFetchModel({
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
    handleOpenArticleDetails,
    handleExportArticlesDocx,
  } =
    useDocumentActionsModel({
      desktopRuntime,
      invokeDesktop,
      locale,
      ui,
      pdfDownloadDir,
      exportableArticles: filteredArticles.filter((article) =>
        selectedArticleKeys.has(getArticleSelectionKey(article)),
      ),
    });

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionModeEnabled((previousValue) => !previousValue);
  }, []);

  const handleToggleArticleSelected = useCallback((article: Article) => {
    const articleKey = getArticleSelectionKey(article);

    setSelectedArticleKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);

      if (nextKeys.has(articleKey)) {
        nextKeys.delete(articleKey);
      } else {
        nextKeys.add(articleKey);
      }

      return nextKeys;
    });
  }, []);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebarVisibility();
  }, []);

  useEffect(() => {
    return subscribeTitlebarUiActions((action) => {
      if (action.type === 'TOGGLE_SIDEBAR') {
        toggleSidebarVisibility();
        return;
      }

      if (action.type === 'NAVIGATE_BACK') {
        handlePreviewBack();
        return;
      }

      if (action.type === 'NAVIGATE_FORWARD') {
        handlePreviewForward();
        return;
      }

      if (action.type === 'NAVIGATE_WEB') {
        handleNavigateWeb();
        return;
      }

      if (action.type === 'TOGGLE_SETTINGS') {
        toggleWorkbenchSettings();
        return;
      }

      if (action.type === 'EXPORT_DOCX') {
        void handleExportArticlesDocx();
      }
    });
  }, [
    handleExportArticlesDocx,
    handleNavigateWeb,
    handlePreviewBack,
    handlePreviewForward,
  ]);

  const sidebarProps = useMemo(
    () =>
      createSidebarPartProps({
        state: {
          ui,
          locale,
          articles: filteredArticles,
          hasData,
          batchStartDate,
          batchEndDate,
          isBatchLoading,
          isSelectionModeEnabled,
          selectedArticleKeys,
        },
        actions: {
          onBatchStartDateChange: setBatchStartDate,
          onBatchEndDateChange: setBatchEndDate,
          onFetchLatestBatch: () => void handleFetchLatestBatch(),
          onDownloadPdf: handleSharedPdfDownload,
          onOpenArticleDetails: handleOpenArticleDetails,
          onToggleSelectionMode: handleToggleSelectionMode,
          onToggleArticleSelected: handleToggleArticleSelected,
        },
      }),
    [
      batchEndDate,
      batchStartDate,
      filteredArticles,
      handleFetchLatestBatch,
      handleOpenArticleDetails,
      handleSharedPdfDownload,
      handleToggleArticleSelected,
      handleToggleSelectionMode,
      hasData,
      isBatchLoading,
      isSelectionModeEnabled,
      locale,
      selectedArticleKeys,
      setBatchEndDate,
      setBatchStartDate,
      ui,
    ],
  );

  const titlebarProps = useMemo(
    () =>
      createTitlebarPartProps({
        state: {
          activePage,
          ui,
          webUrl,
          isWindowMaximized,
          isSidebarVisible,
          browserUrl,
          previewState,
          canExportDocx,
          addressBarSourceOptions,
          selectedAddressBarSourceId,
          fetchStatus,
          titlebarFetchSourceText: showDevelopmentUi ? titlebarFetchSourceText : '',
          titlebarFetchSourceTitle: showDevelopmentUi ? titlebarFetchSourceTitle : '',
          titlebarFetchStopText: showDevelopmentUi ? titlebarFetchStopText : '',
          titlebarFetchStopTitle: showDevelopmentUi ? titlebarFetchStopTitle : '',
        },
        actions: {
          handleWindowControl,
          handleToggleSidebar,
          handlePreviewBack,
          handlePreviewForward,
          handleAddressBarSourceMenuOpenChange,
          handleAddressBarSourceMenuDispose,
          handleWebUrlChange,
          handleSelectAddressBarSource,
          handleCycleAddressBarSource,
        },
      }),
    [
      activePage,
      addressBarSourceOptions,
      browserUrl,
      canExportDocx,
      fetchStatus,
      handleAddressBarSourceMenuDispose,
      handleAddressBarSourceMenuOpenChange,
      handleCycleAddressBarSource,
      handlePreviewBack,
      handlePreviewForward,
      handleSelectAddressBarSource,
      handleToggleSidebar,
      handleWebUrlChange,
      handleWindowControl,
      isSidebarVisible,
      isWindowMaximized,
      previewState,
      selectedAddressBarSourceId,
      titlebarFetchSourceText,
      titlebarFetchSourceTitle,
      titlebarFetchStopText,
      titlebarFetchStopTitle,
      showDevelopmentUi,
      ui,
      webUrl,
    ],
  );

  const viewPartProps = useMemo(() => {
    return {
      browserUrl,
      iframeReloadKey,
      electronRuntime,
      previewRuntime,
      labels: {
        emptyState: ui.emptyState,
        previewUnavailable: ui.previewUnavailable,
        webPreviewTitle: ui.webPreviewTitle,
      },
    };
  }, [browserUrl, electronRuntime, iframeReloadKey, previewRuntime, ui]);

  const editorPartProps = useMemo(
    () =>
      createEditorPartProps({
        state: {
          viewPartProps,
        },
      }),
    [viewPartProps],
  );

  const settingsPartProps = useMemo(
    () =>
      createSettingsPartProps({
        state: {
          ui,
          isSettingsLoading,
          locale,
          batchSources,
          batchLimit,
          sameDomainOnly,
          useMica,
          pdfDownloadDir,
          activeLlmProvider,
          llmProviders,
          desktopRuntime,
          configPath,
          isSettingsSaving,
          isTestingLlmConnection,
        },
        actions: {
          onLocaleChange: handleLocaleChange,
          onBatchSourceUrlChange: handleBatchSourceUrlChange,
          onBatchSourceJournalTitleChange: handleBatchSourceJournalTitleChange,
          onAddBatchSource: handleAddBatchSource,
          onRemoveBatchSource: handleRemoveBatchSource,
          onMoveBatchSource: handleMoveBatchSource,
          onBatchLimitChange: (value) => setBatchLimit(normalizeBatchLimit(value, 1)),
          onSameDomainOnlyChange: setSameDomainOnly,
          onUseMicaChange: setUseMica,
          onPdfDownloadDirChange: setPdfDownloadDir,
          onChoosePdfDownloadDir: () => void handleChoosePdfDownloadDir(),
          onActiveLlmProviderChange: setActiveLlmProvider,
          onLlmProviderApiKeyChange: setLlmProviderApiKey,
          onLlmProviderModelChange: setLlmProviderModel,
          onTestLlmConnection: () => void handleTestLlmConnection(),
          onOpenConfigLocation: () => void handleOpenConfigLocation(),
          onResetDownloadDir: handleResetDownloadDir,
          onSaveSettings: () => void handleSaveSettings(),
        },
      }),
    [
      batchLimit,
      batchSources,
      configPath,
      activeLlmProvider,
      desktopRuntime,
      handleAddBatchSource,
      handleBatchSourceJournalTitleChange,
      handleBatchSourceUrlChange,
      handleChoosePdfDownloadDir,
      handleOpenConfigLocation,
      handleLocaleChange,
      handleTestLlmConnection,
      handleMoveBatchSource,
      handleRemoveBatchSource,
      handleResetDownloadDir,
      handleSaveSettings,
      isSettingsLoading,
      isSettingsSaving,
      isTestingLlmConnection,
      llmProviders,
      locale,
      pdfDownloadDir,
      sameDomainOnly,
      useMica,
      setBatchLimit,
      setActiveLlmProvider,
      setPdfDownloadDir,
      setLlmProviderApiKey,
      setLlmProviderModel,
      setSameDomainOnly,
      ui,
    ],
  );

  const activePageView = renderActivePageView({
    activePage,
    isSidebarVisible,
    sidebarProps,
    editorPartProps,
    settingsPartRef,
    settingsPartProps,
  });

  return renderWorkbenchShell({
    workbenchContainerRef,
    electronRuntime,
    useMica,
    titlebarPartRef,
    titlebarProps,
    activePage,
    activePageView,
    toastCloseLabel: ui.toastClose,
  });
}

export default function WorkbenchView() {
  const nativeModalKind = detectNativeModalKind();

  if (nativeModalKind === 'article-details') {
    return jsx(ArticleDetailsModalWindow, {});
  }

  return jsx(WorkbenchContentView, {});
}

