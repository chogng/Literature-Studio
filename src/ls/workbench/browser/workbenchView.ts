import { jsx, jsxs } from 'react/jsx-runtime';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  detectInitialLocale,
  getLocaleMessages,
  toDocumentLang,
  type Locale,
} from '../../../language/i18n';
import { useWindowControls } from './window';
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
  titlebarPartRef: ReturnType<typeof useWorkbenchPartRef>;
  titlebarProps: ReturnType<typeof createTitlebarPartProps>;
  activePage: ActivePage;
  activePageView: ReactNode;
  toastCloseLabel: string;
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

function createModalStyleTestArticle(locale: Locale): Article {
  const fetchedAt = new Date().toISOString();
  const publishedAt = fetchedAt.slice(0, 10);

  return {
    title:
      locale === 'zh'
        ? '弹窗样式测试：窗口控件复用验证'
        : 'Modal Style Test: Shared Window Controls',
    articleType: locale === 'zh' ? '样式测试' : 'Style Test',
    doi: '10.0000/modal-style-test',
    authors: locale === 'zh' ? ['开发模式', 'UI 验证'] : ['Dev Mode', 'UI Validation'],
    abstractText:
      locale === 'zh'
        ? '这是一个用于检查文章详情弹窗样式和窗口按钮复用情况的测试样例。'
        : 'This sample verifies article-details modal styling and shared window controls.',
    descriptionText:
      locale === 'zh'
        ? '仅在开发环境 Settings 页显示测试入口，生产环境不会渲染该按钮。'
        : 'The test entry is shown only in Settings during development and hidden in production.',
    publishedAt,
    sourceUrl: 'https://example.com/modal-style-test',
    fetchedAt,
    journalTitle: locale === 'zh' ? '调试来源' : 'Debug Source',
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

  return jsx(SettingsPartView, {
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

  const handleBrowserRefresh = useCallback(() => {
    previewNavigationModel.handleBrowserRefresh({
      electronRuntime,
      previewRuntime,
      ui,
    });
  }, [electronRuntime, previewNavigationModel, previewRuntime, ui]);

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
      filteredArticles,
    });

  const handleToggleSettings = useCallback(() => {
    toggleWorkbenchSettings();
  }, []);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebarVisibility();
  }, []);

  const handleOpenModalStyleTest = useCallback(() => {
    const sampleArticle = createModalStyleTestArticle(locale);
    void handleOpenArticleDetails(sampleArticle, {
      untitled: ui.untitled,
      unknown: ui.unknown,
      articleType: ui.articleType,
      authors: ui.authors,
      abstract: ui.abstract,
      description: ui.description,
      publishedAt: ui.publishedAt,
      source: ui.source,
      fetchedAt: ui.fetchedAt,
      close: ui.titlebarClose,
    });
  }, [handleOpenArticleDetails, locale, ui]);

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
          onOpenArticleDetails: handleOpenArticleDetails,
        },
      }),
    [
      batchEndDate,
      batchStartDate,
      filteredArticles,
      handleFetchLatestBatch,
      handleOpenArticleDetails,
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
          handleAddressBarSourceMenuOpenChange,
          handleAddressBarSourceMenuDispose,
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
      handleAddressBarSourceMenuDispose,
      handleAddressBarSourceMenuOpenChange,
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
          showModalStyleTestButton:
            desktopRuntime &&
            typeof window !== 'undefined' &&
            /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname),
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
          onOpenModalStyleTest: handleOpenModalStyleTest,
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
      handleOpenModalStyleTest,
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

