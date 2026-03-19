import { jsx, jsxs } from 'react/jsx-runtime';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  detectInitialLocale,
  getLocaleMessages,
  toDocumentLang,
  type Locale,
} from '../../../language/i18n';
import type { LocaleMessages } from '../../../language/locales';
import { useWindowControls } from './window';
import { toast, ToastContainer } from '../../base/browser/ui/toast/toast';
import type { Article } from '../services/article/articleFetch';
import {
  getConfigBatchSourceSeed,
  normalizeBatchLimit,
  type BatchSource,
} from '../services/config/configSchema';
import { formatLocalized } from '../services/desktop/desktopError';
import {
  EMPTY_PREVIEW_STATE,
  resolvePreviewNavigation,
  resolvePreviewRefreshMode,
  resolvePreviewStateUrlUpdate,
} from '../services/preview/previewNavigationService';
import {
  applyQuickAccessUrlInput,
  createQuickAccessSourceOptions,
  findQuickAccessSourceOption,
  resolveNextQuickAccessSourceOption,
  resolveQuickAccessSourceId,
  type QuickAccessCycleDirection,
} from '../services/quickAccess/quickAccessService';
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
import { createSettingsPartProps } from './parts/settings/settingsPart';
import SettingsView from './parts/settings/settingsView';
import { createSidebarPartProps } from './parts/sidebar/sidebarPart';
import { createTitlebarPartProps } from './parts/titlebar/titlebarPart';
import { TitlebarView } from './parts/titlebar/titlebarView';
import { useReaderState } from './readerState';
import ReaderView from './readerView';
import { useSettingsModel } from './settingsModel';
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
  titlebarPartRef: ReturnType<typeof useWorkbenchPartRef>;
  titlebarProps: ReturnType<typeof createTitlebarPartProps>;
  activePage: ActivePage;
  activePageView: ReactNode;
  toastCloseLabel: string;
};

type UsePreviewNavigationModelParams = {
  electronRuntime: boolean;
  previewRuntime: boolean;
  ui: LocaleMessages;
  webUrl: string;
  fetchSeedUrl: string;
  batchSources: BatchSource[];
  setWebUrl: Dispatch<SetStateAction<string>>;
  setFetchSeedUrl: Dispatch<SetStateAction<string>>;
};

type UseAddressBarSourceParams = {
  webUrl: string;
  fetchSeedUrl: string;
  batchSources: BatchSource[];
  setWebUrl: Dispatch<SetStateAction<string>>;
  setFetchSeedUrl: Dispatch<SetStateAction<string>>;
  navigateToUrl: (url: string, showToast: boolean) => unknown;
};

const DEFAULT_ARTICLE_URL = '';
const INITIAL_BATCH_SOURCES = getConfigBatchSourceSeed();

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

function useAddressBarSource({
  webUrl,
  fetchSeedUrl,
  batchSources,
  setWebUrl,
  setFetchSeedUrl,
  navigateToUrl,
}: UseAddressBarSourceParams) {
  const addressBarSourceOptions = useMemo(
    () => createQuickAccessSourceOptions(batchSources),
    [batchSources],
  );

  const selectedAddressBarSourceId = useMemo(() => {
    return resolveQuickAccessSourceId(fetchSeedUrl, webUrl, batchSources);
  }, [batchSources, fetchSeedUrl, webUrl]);

  const handleWebUrlChange = useCallback(
    (nextUrl: string) => {
      applyQuickAccessUrlInput(nextUrl, setWebUrl, setFetchSeedUrl);
    },
    [setFetchSeedUrl, setWebUrl],
  );

  const handleSelectAddressBarSource = useCallback(
    (sourceId: string) => {
      const selectedSource = findQuickAccessSourceOption(addressBarSourceOptions, sourceId);
      if (!selectedSource) {
        return;
      }

      navigateToUrl(selectedSource.url, false);
    },
    [addressBarSourceOptions, navigateToUrl],
  );

  const handleCycleAddressBarSource = useCallback(
    (direction: QuickAccessCycleDirection) => {
      const nextSource = resolveNextQuickAccessSourceOption(
        addressBarSourceOptions,
        selectedAddressBarSourceId,
        direction,
      );
      if (!nextSource) {
        return;
      }

      navigateToUrl(nextSource.url, false);
    },
    [addressBarSourceOptions, navigateToUrl, selectedAddressBarSourceId],
  );

  return {
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    handleWebUrlChange,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  };
}

function usePreviewNavigationModel({
  electronRuntime,
  previewRuntime,
  ui,
  webUrl,
  fetchSeedUrl,
  batchSources,
  setWebUrl,
  setFetchSeedUrl,
}: UsePreviewNavigationModelParams) {
  const [browserUrl, setBrowserUrl] = useState('');
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [previewState, setPreviewState] = useState<DesktopPreviewState>(EMPTY_PREVIEW_STATE);

  const applyPreviewState = useCallback(
    (state: DesktopPreviewState) => {
      setPreviewState(state);

      const previewStateUrlUpdate = resolvePreviewStateUrlUpdate(state);
      if (!previewStateUrlUpdate) {
        return;
      }

      setBrowserUrl(previewStateUrlUpdate.browserUrl);
      setWebUrl(previewStateUrlUpdate.webUrl);
      setFetchSeedUrl((current) => current || previewStateUrlUpdate.fetchSeedUrl);
    },
    [setFetchSeedUrl, setWebUrl],
  );

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      setPreviewState(EMPTY_PREVIEW_STATE);
      return;
    }

    let mounted = true;
    const preview = window.electronAPI.preview;

    void preview
      .getState()
      .then((state) => {
        if (!mounted) {
          return;
        }

        applyPreviewState(state);
      })
      .catch(() => {});

    const unsubscribe = preview.onStateChange((state) => {
      applyPreviewState(state);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applyPreviewState, previewRuntime]);

  const navigateToAddressBarUrl = useCallback(
    (nextUrl: string, showToast: boolean = true) => {
      const previewNavigation = resolvePreviewNavigation(
        nextUrl,
        electronRuntime,
        previewRuntime,
      );

      if (previewNavigation.kind === 'invalid-url') {
        toast.error(ui.toastEnterArticleUrl);
        return false;
      }

      setWebUrl(previewNavigation.normalizedUrl);
      setBrowserUrl(previewNavigation.normalizedUrl);
      setFetchSeedUrl(previewNavigation.normalizedUrl);

      if (previewNavigation.kind === 'preview-runtime-unavailable') {
        toast.error(ui.toastPreviewRuntimeUnavailable);
        return false;
      }

      if (previewNavigation.kind === 'native-preview' && window.electronAPI?.preview) {
        void window.electronAPI.preview.navigate(previewNavigation.normalizedUrl).catch(() => {
          window.electronAPI?.preview?.setVisible(false);
        });
      }

      if (showToast) {
        toast.success(formatLocalized(ui.toastNavigatingTo, { url: previewNavigation.normalizedUrl }));
      }

      return true;
    },
    [electronRuntime, previewRuntime, setFetchSeedUrl, setWebUrl, ui],
  );

  const handleNavigateWeb = useCallback(() => {
    navigateToAddressBarUrl(webUrl, true);
  }, [navigateToAddressBarUrl, webUrl]);

  const handleBrowserRefresh = useCallback(() => {
    const previewRefreshMode = resolvePreviewRefreshMode(electronRuntime, previewRuntime);

    if (previewRefreshMode === 'preview-runtime-unavailable') {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
    }

    if (previewRefreshMode === 'native-preview' && window.electronAPI?.preview) {
      window.electronAPI.preview.reload();
      return;
    }

    setIframeReloadKey((current) => current + 1);
  }, [electronRuntime, previewRuntime, ui]);

  const handlePreviewBack = useCallback(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewBackUnsupported);
      return;
    }

    window.electronAPI.preview.goBack();
  }, [previewRuntime, ui]);

  const handlePreviewForward = useCallback(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewForwardUnsupported);
      return;
    }

    window.electronAPI.preview.goForward();
  }, [previewRuntime, ui]);

  const {
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    handleWebUrlChange,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  } = useAddressBarSource({
    webUrl,
    fetchSeedUrl,
    batchSources,
    setWebUrl,
    setFetchSeedUrl,
    navigateToUrl: navigateToAddressBarUrl,
  });

  return {
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
  };
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

  return jsx(SettingsView, {
    partRef: settingsPartRef,
    ...settingsPartProps,
  });
}

function renderWorkbenchShell({
  workbenchContainerRef,
  electronRuntime,
  titlebarPartRef,
  titlebarProps,
  activePage,
  activePageView,
  toastCloseLabel,
}: WorkbenchShellConfig) {
  return jsxs('div', {
    ref: workbenchContainerRef,
    className: 'app-window',
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
  } = usePreviewNavigationModel({
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

  const { canExportDocx, handleSharedPdfDownload, handleExportArticlesDocx } =
    useDocumentActionsModel({
      desktopRuntime,
      invokeDesktop,
      locale,
      ui,
      pdfDownloadDir,
      filteredArticles,
    });

  const handleToggleSettings = useCallback(() => {
    toggleWorkbenchSettings();
  }, []);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebarVisibility();
  }, []);

  const handleTitlebarExportDocx = useCallback(() => {
    void handleExportArticlesDocx();
  }, [handleExportArticlesDocx]);

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
        },
        actions: {
          onBatchStartDateChange: setBatchStartDate,
          onBatchEndDateChange: setBatchEndDate,
          onFetchLatestBatch: () => void handleFetchLatestBatch(),
          onDownloadPdf: handleSharedPdfDownload,
        },
      }),
    [
      batchEndDate,
      batchStartDate,
      filteredArticles,
      handleFetchLatestBatch,
      handleSharedPdfDownload,
      hasData,
      isBatchLoading,
      locale,
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
          titlebarFetchSourceText,
          titlebarFetchSourceTitle,
          titlebarFetchStopText,
          titlebarFetchStopTitle,
        },
        actions: {
          handleWindowControl,
          handleToggleSidebar,
          handleToggleSettings,
          handlePreviewBack,
          handlePreviewForward,
          handleBrowserRefresh,
          handleExportDocx: handleTitlebarExportDocx,
          handleWebUrlChange,
          handleNavigateWeb,
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
      handleBrowserRefresh,
      handleCycleAddressBarSource,
      handleNavigateWeb,
      handlePreviewBack,
      handlePreviewForward,
      handleSelectAddressBarSource,
      handleTitlebarExportDocx,
      handleToggleSettings,
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
          pdfDownloadDir,
          desktopRuntime,
          configPath,
          isSettingsSaving,
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
          onPdfDownloadDirChange: setPdfDownloadDir,
          onChoosePdfDownloadDir: () => void handleChoosePdfDownloadDir(),
          onResetDownloadDir: handleResetDownloadDir,
          onSaveSettings: () => void handleSaveSettings(),
        },
      }),
    [
      batchLimit,
      batchSources,
      configPath,
      desktopRuntime,
      handleAddBatchSource,
      handleBatchSourceJournalTitleChange,
      handleBatchSourceUrlChange,
      handleChoosePdfDownloadDir,
      handleLocaleChange,
      handleMoveBatchSource,
      handleRemoveBatchSource,
      handleResetDownloadDir,
      handleSaveSettings,
      isSettingsLoading,
      isSettingsSaving,
      locale,
      pdfDownloadDir,
      sameDomainOnly,
      setBatchLimit,
      setPdfDownloadDir,
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

