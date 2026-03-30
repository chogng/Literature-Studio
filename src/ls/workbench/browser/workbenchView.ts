import { jsx, jsxs } from "react/jsx-runtime";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  detectInitialLocale,
  getLocaleMessages,
  toDocumentLang,
  type Locale,
} from "../../../language/i18n";
import {
  connectWorkbenchWindowControls,
  getWindowStateSnapshot,
  hasWorkbenchWindowControlsProvider,
  performWorkbenchWindowControl,
  subscribeWindowState,
} from "./window";
import { ToastContainer } from "../../base/browser/ui/toast/toast";
import type { Article } from "../services/article/articleFetch";
import { normalizeUrl } from "../common/url";
import {
  getConfigBatchSourceSeed,
  normalizeBatchLimit,
} from "../services/config/configSchema";
import MenuOverlayWindow from "./menuOverlayWindow";
import ArticleDetailsModalWindow from "./articleDetailsModalWindow";
import {
  createAssistantModel,
  type AssistantModelSnapshot,
} from "./assistantModel";
import {
  createLibraryModel,
  type LibraryModelSnapshot,
} from "./libraryModel";
import ToastOverlayWindow from "./toastOverlayWindow";
import { createBatchFetchController } from "./batchFetchModel";
import { createDocumentActionsController } from "./documentActionsModel";
import {
  reduceQuickAccessAction,
  type QuickAccessAction,
  type QuickAccessCommand,
} from "../services/quickAccess/quickAccessService";
import {
  createWorkbenchPartRef,
  getWorkbenchLayoutStateSnapshot,
  getWorkbenchShellClassName,
  WORKBENCH_PART_IDS,
  setAuxiliarySidebarVisible,
  setSidebarVisible,
  setWorkbenchSidebarKind,
  subscribeWorkbenchLayoutState,
  toggleSidebarVisibility,
  toggleAuxiliarySidebarVisibility,
} from "./layout";
import { createEditorPartController } from "./parts/editor/editorPart";
import type { EditorPartProps } from "./parts/editor/editorPartView";
import {
  createSettingsPartProps,
  SettingsPartView,
} from "./parts/settings/settingsPart";
import { createSecondarySidebarPartProps } from "./parts/sidebar/secondarySidebarPart";
import { createTitlebarPartProps } from "./parts/titlebar/titlebarPart";
import { subscribeTitlebarUiActions } from "./parts/titlebar/titlebarActions";
import { TitlebarView } from "./parts/titlebar/titlebarView";
import { StatusbarPart } from "./parts/statusbar/statusbarPart";
import {
  getStatusbarStateSnapshot,
  subscribeStatusbarState,
} from "./parts/statusbar/statusbarModel";
import { PreviewNavigationModel } from "./previewNavigationModel";
import {
  resolvePreviewSourceUrl,
} from "./previewSurfaceState";
import { useEditorPreviewTabsModel } from "./editorPreviewTabsModel";
import {
  getReaderStateSnapshot,
  selectReaderDerivedState,
  setBatchEndDate,
  setBatchStartDate,
  subscribeReaderState,
} from "./readerState";
import ReaderView from "./readerView";
import { createSettingsController } from "./parts/settings/settingsModel";
import {
  getWorkbenchStateSnapshot,
  subscribeWorkbenchState,
  toggleWorkbenchSettings,
} from "./workbench";
import "./media/workbench.css";

type DesktopInvokeArgs = Record<string, unknown> | undefined;
type ActivePage = ReturnType<typeof getWorkbenchStateSnapshot>["activePage"];
type SelectionModePhase = "off" | "multi" | "all";

type ActivePageViewConfig = {
  activePage: ActivePage;
  isSidebarVisible: boolean;
  activeSidebarKind: ReturnType<
    typeof getWorkbenchLayoutStateSnapshot
  >["activeSidebarKind"];
  isAuxiliarySidebarVisible: boolean;
  secondarySidebarProps: ReturnType<typeof createSecondarySidebarPartProps>;
  primarySidebarProps: {
    librarySnapshot: LibraryModelSnapshot["librarySnapshot"];
    isLibraryLoading: boolean;
    onRefreshLibrary: () => void;
    onDownloadPdf: () => void;
    onCreateDraftTab: () => void;
  };
  auxiliarySidebarProps: {
    isKnowledgeBaseModeEnabled: boolean;
    librarySnapshot: LibraryModelSnapshot["librarySnapshot"];
    question: string;
    onQuestionChange: (value: string) => void;
    messages: AssistantModelSnapshot["messages"];
    result: AssistantModelSnapshot["result"];
    isAsking: boolean;
    errorMessage: string | null;
    onAsk: () => void;
    availableArticleCount: number;
    conversations: AssistantModelSnapshot["conversations"];
    activeConversationId: AssistantModelSnapshot["activeConversationId"];
    isHistoryOpen: AssistantModelSnapshot["isHistoryOpen"];
    isMoreMenuOpen: AssistantModelSnapshot["isMoreMenuOpen"];
    onCreateConversation: () => void;
    onActivateConversation: (conversationId: string) => void;
    onCloseConversation: (conversationId: string) => void;
    onCloseAuxiliarySidebar: () => void;
    onToggleHistory: () => void;
    onToggleMoreMenu: () => void;
  };
  editorPartProps: EditorPartProps;
  settingsPartRef: ReturnType<typeof createWorkbenchPartRef>;
  settingsPartProps: ReturnType<typeof createSettingsPartProps>;
};

type WorkbenchShellConfig = {
  workbenchContainerRef: ReturnType<typeof createWorkbenchPartRef>;
  electronRuntime: boolean;
  useMica: boolean;
  titlebarPartRef: ReturnType<typeof createWorkbenchPartRef>;
  titlebarProps: ReturnType<typeof createTitlebarPartProps>;
  statusbarPartRef: ReturnType<typeof createWorkbenchPartRef>;
  statusbarVisible: boolean;
  activePage: ActivePage;
  activePageView: ReactNode;
  toastCloseLabel: string;
};

const DEFAULT_ARTICLE_URL = "";
const INITIAL_BATCH_SOURCES = getConfigBatchSourceSeed();

function getArticleSelectionKey(
  article: Pick<Article, "sourceUrl" | "fetchedAt">
) {
  return `${article.sourceUrl}::${article.fetchedAt}`;
}

function buildSelectedArticleOrderLookup(
  selectedArticleKeysInOrder: readonly string[]
) {
  return new Map(
    selectedArticleKeysInOrder.map((key, index) => [key, index + 1])
  );
}

function detectNativeModalKind() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("nativeModal");
}

function detectNativeOverlayKind() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("nativeOverlay");
}

function resolveRuntimeState() {
  const electronRuntime =
    typeof window !== "undefined" &&
    typeof window.electronAPI?.invoke === "function";
  const previewRuntime =
    typeof window !== "undefined" &&
    typeof window.electronAPI?.preview?.navigate === "function";

  return {
    electronRuntime,
    previewRuntime,
    desktopRuntime: electronRuntime,
  };
}

function renderActivePageView({
  activePage,
  isSidebarVisible,
  activeSidebarKind,
  isAuxiliarySidebarVisible,
  secondarySidebarProps,
  primarySidebarProps,
  auxiliarySidebarProps,
  editorPartProps,
  settingsPartRef,
  settingsPartProps,
}: ActivePageViewConfig) {
  if (activePage === "reader") {
    return jsx(ReaderView, {
      isSidebarVisible,
      activeSidebarKind,
      isAuxiliarySidebarVisible,
      secondarySidebarProps,
      primarySidebarProps,
      auxiliarySidebarProps,
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
  statusbarPartRef,
  statusbarVisible,
  activePage,
  activePageView,
  toastCloseLabel,
}: WorkbenchShellConfig) {
  return jsxs("div", {
    ref: workbenchContainerRef,
    className: [
      "app-window",
      electronRuntime && useMica ? "is-mica-enabled" : "",
      statusbarVisible ? "has-statusbar" : "",
    ]
      .filter(Boolean)
      .join(" "),
    children: [
      electronRuntime
        ? jsx(TitlebarView, { partRef: titlebarPartRef, ...titlebarProps })
        : null,
      jsxs("div", {
        className: getWorkbenchShellClassName({ activePage }),
        children: [
          activePageView,
          jsx(ToastContainer, { closeLabel: toastCloseLabel }),
        ],
      }),
      statusbarVisible
        ? jsx("section", {
            ref: statusbarPartRef,
          })
        : null,
    ],
  });
}

function WorkbenchContentView() {
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const [webUrl, setWebUrl] = useState(DEFAULT_ARTICLE_URL);
  const [fetchSeedUrl, setFetchSeedUrl] = useState(DEFAULT_ARTICLE_URL);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectionModePhase, setSelectionModePhase] =
    useState<SelectionModePhase>("off");
  const [selectedArticleKeysInOrder, setSelectedArticleKeysInOrder] = useState<
    string[]
  >([]);
  const isSelectionModeEnabled = selectionModePhase !== "off";

  const workbenchState = useSyncExternalStore(
    subscribeWorkbenchState,
    getWorkbenchStateSnapshot,
    getWorkbenchStateSnapshot
  );
  const workbenchLayoutState = useSyncExternalStore(
    subscribeWorkbenchLayoutState,
    getWorkbenchLayoutStateSnapshot,
    getWorkbenchLayoutStateSnapshot
  );

  const { activePage } = workbenchState;
  const { isSidebarVisible, activeSidebarKind, isAuxiliarySidebarVisible } =
    workbenchLayoutState;

  const workbenchContainerRef = createWorkbenchPartRef(
    WORKBENCH_PART_IDS.container
  );
  const titlebarPartRef = createWorkbenchPartRef(WORKBENCH_PART_IDS.titlebar);
  const statusbarPartDomRef = createWorkbenchPartRef(WORKBENCH_PART_IDS.statusbar);
  const settingsPartRef = createWorkbenchPartRef(WORKBENCH_PART_IDS.settings);
  const statusbarPartRef = useRef<StatusbarPart | null>(null);
  const bindStatusbarPartRef = useCallback(
    (element: HTMLElement | null) => {
      statusbarPartDomRef(element);
      statusbarPartRef.current?.dispose();
      statusbarPartRef.current = element ? new StatusbarPart(element) : null;
    },
    [statusbarPartDomRef]
  );
  const statusbarState = useSyncExternalStore(
    subscribeStatusbarState,
    getStatusbarStateSnapshot,
    getStatusbarStateSnapshot
  );
  const { electronRuntime, previewRuntime, desktopRuntime } =
    resolveRuntimeState();
  const hasWindowControlsProvider = hasWorkbenchWindowControlsProvider();
  useEffect(() => {
    return connectWorkbenchWindowControls(
      electronRuntime && hasWindowControlsProvider
    );
  }, [electronRuntime, hasWindowControlsProvider]);
  const { isMaximized: isWindowMaximized } = useSyncExternalStore(
    subscribeWindowState,
    getWindowStateSnapshot,
    getWindowStateSnapshot
  );
  const handleWindowControl = performWorkbenchWindowControl;
  const ui = useMemo(() => getLocaleMessages(locale), [locale]);

  useEffect(() => {
    statusbarPartRef.current?.render(statusbarState);
  }, [statusbarState]);

  useEffect(() => {
    return () => {
      statusbarPartRef.current?.dispose();
      statusbarPartRef.current = null;
    };
  }, []);

  const invokeDesktop = useCallback(
    async <T>(command: string, args?: DesktopInvokeArgs): Promise<T> => {
      if (window.electronAPI?.invoke) {
        return window.electronAPI.invoke<T>(command, args);
      }

      throw new Error("Desktop invoke bridge is unavailable.");
    },
    []
  );
  const [settingsController] = useState(() =>
    createSettingsController({
      desktopRuntime,
      invokeDesktop,
      ui,
      locale,
      applyLocale: setLocale,
      initialBatchSources: INITIAL_BATCH_SOURCES,
    })
  );
  useEffect(() => {
    settingsController.setContext({
      desktopRuntime,
      invokeDesktop,
      ui,
      locale,
      applyLocale: setLocale,
    });
  }, [desktopRuntime, invokeDesktop, locale, setLocale, settingsController, ui]);
  useEffect(() => {
    settingsController.start();
    return () => {
      settingsController.dispose();
    };
  }, [settingsController]);
  const {
    batchSources,
    batchLimit,
    sameDomainOnly,
    useMica,
    ragEnabled,
    autoIndexDownloadedPdf,
    libraryStorageMode,
    libraryDirectory,
    maxConcurrentIndexJobs,
    activeRagProvider,
    ragProviders,
    retrievalCandidateCount,
    retrievalTopK,
    pdfDownloadDir,
    pdfFileNameUseSelectionOrder,
    activeLlmProvider,
    llmProviders,
    activeTranslationProvider,
    translationProviders,
    configPath,
    isSettingsLoading,
    isSettingsSaving,
    isTestingRagConnection,
    isTestingLlmConnection,
    isTestingTranslationConnection,
  } = useSyncExternalStore(
    settingsController.subscribe,
    settingsController.getSnapshot,
    settingsController.getSnapshot
  );
  const {
    setBatchLimit,
    setSameDomainOnly,
    setUseMica,
    setRagEnabled,
    setAutoIndexDownloadedPdf,
    setLibraryStorageMode,
    setLibraryDirectory,
    setMaxConcurrentIndexJobs,
    setRagProviderApiKey,
    setRagProviderBaseUrl,
    setRagProviderEmbeddingModel,
    setRagProviderRerankerModel,
    setRagProviderEmbeddingPath,
    setRagProviderRerankPath,
    setRetrievalCandidateCount,
    setRetrievalTopK,
    setPdfDownloadDir,
    setPdfFileNameUseSelectionOrder,
    setActiveLlmProvider,
    setLlmProviderApiKey,
    setLlmProviderModel,
    setActiveTranslationProvider,
    setTranslationProviderApiKey,
    handleChoosePdfDownloadDir,
    handleChooseLibraryDirectory,
    handleOpenConfigLocation,
    handleLocaleChange,
    handleTestRagConnection,
    handleTestLlmConnection,
    handleTestTranslationConnection,
    handleResetDownloadDir,
    handleBatchSourceUrlChange,
    handleBatchSourceJournalTitleChange,
    handleAddBatchSource,
    handleRemoveBatchSource,
    handleMoveBatchSource,
  } = settingsController;
  const libraryModel = useMemo(
    () =>
      createLibraryModel({
        desktopRuntime,
        invokeDesktop,
      }),
    []
  );
  useEffect(() => {
    libraryModel.setContext({
      desktopRuntime,
      invokeDesktop,
    });
  }, [desktopRuntime, invokeDesktop, libraryModel]);
  const { librarySnapshot, isLibraryLoading } = useSyncExternalStore(
    libraryModel.subscribe,
    libraryModel.getSnapshot,
    libraryModel.getSnapshot
  );
  useEffect(() => {
    libraryModel.start();
    return () => {
      libraryModel.dispose();
    };
  }, [libraryModel]);
  const refreshLibrary = useCallback(() => {
    void libraryModel.refresh();
  }, [libraryModel]);
  const knowledgeBaseModeEnabled = ragEnabled;

  useEffect(() => {
    setWorkbenchSidebarKind(knowledgeBaseModeEnabled ? "primary" : "secondary");
    setSidebarVisible(true);
    setAuxiliarySidebarVisible(knowledgeBaseModeEnabled);
  }, [knowledgeBaseModeEnabled]);

  const readerStateSnapshot = useSyncExternalStore(
    subscribeReaderState,
    getReaderStateSnapshot,
    getReaderStateSnapshot
  );
  const {
    batchStartDate,
    batchEndDate,
    filteredArticles,
    hasData,
  } = useMemo(
    () => ({
      batchStartDate: readerStateSnapshot.batchStartDate,
      batchEndDate: readerStateSnapshot.batchEndDate,
      ...selectReaderDerivedState(readerStateSnapshot, articles),
    }),
    [articles, readerStateSnapshot]
  );
  const currentLlmSettings = useMemo(
    () => ({
      activeProvider: activeLlmProvider,
      providers: llmProviders,
    }),
    [activeLlmProvider, llmProviders]
  );
  const currentRagSettings = useMemo(
    () => ({
      enabled: knowledgeBaseModeEnabled,
      knowledgeBaseModeEnabled,
      autoIndexDownloadedPdf,
      libraryStorageMode,
      libraryDirectory: libraryDirectory.trim() || null,
      maxConcurrentIndexJobs,
      activeProvider: activeRagProvider,
      providers: ragProviders,
      retrievalCandidateCount,
      retrievalTopK,
    }),
    [
      activeRagProvider,
      autoIndexDownloadedPdf,
      knowledgeBaseModeEnabled,
      libraryDirectory,
      libraryStorageMode,
      maxConcurrentIndexJobs,
      ragProviders,
      retrievalCandidateCount,
      retrievalTopK,
    ]
  );
  const previewNavigationModel = useMemo(
    () => new PreviewNavigationModel(),
    []
  );
  const previewNavigationSnapshot = useSyncExternalStore(
    previewNavigationModel.subscribe,
    previewNavigationModel.getSnapshot,
    previewNavigationModel.getSnapshot
  );
  const { browserUrl, previewState } =
    previewNavigationSnapshot;
  const viewPartProps = useMemo(() => {
    return {
      browserUrl,
      electronRuntime,
      previewRuntime,
      labels: {
        emptyState: ui.emptyState,
        previewUnavailable: ui.previewUnavailable,
      },
    };
  }, [browserUrl, electronRuntime, previewRuntime, ui]);
  const [editorPartController] = useState(() =>
    createEditorPartController({
      ui,
      viewPartProps,
      browserUrl,
      webUrl,
    })
  );
  useEffect(() => {
    editorPartController.setContext({
      ui,
      viewPartProps,
      browserUrl,
      webUrl,
    });
  }, [browserUrl, editorPartController, ui, viewPartProps, webUrl]);
  useEffect(() => {
    return () => {
      editorPartController.dispose();
    };
  }, [editorPartController]);
  const {
    tabs: editorTabs,
    activateTab: activateEditorTab,
    closeTab: closeEditorTab,
    draftBody,
    createDraftTab: handleCreateDraftTab,
    createWebTab: handleCreateWebTab,
    previewSurfaceSnapshot,
    updateActivePreviewTabUrl,
    editorPartProps,
  } = {
    ...useSyncExternalStore(
      editorPartController.subscribe,
      editorPartController.getSnapshot,
      editorPartController.getSnapshot
    ),
    activateTab: editorPartController.onActivateTab,
    closeTab: editorPartController.onCloseTab,
    createDraftTab: editorPartController.createDraftTab,
    createWebTab: editorPartController.createWebTab,
    updateActivePreviewTabUrl: editorPartController.updateActivePreviewTabUrl,
  };
  const [assistantModel] = useState(() =>
      createAssistantModel({
        desktopRuntime,
        invokeDesktop,
        ui,
        isKnowledgeBaseModeEnabled: knowledgeBaseModeEnabled,
        articles: filteredArticles,
        llmSettings: currentLlmSettings,
        ragSettings: currentRagSettings,
        fallbackWritingContext: draftBody,
      })
  );
  useEffect(() => {
    assistantModel.setContext({
      desktopRuntime,
      invokeDesktop,
      ui,
      isKnowledgeBaseModeEnabled: knowledgeBaseModeEnabled,
      articles: filteredArticles,
      llmSettings: currentLlmSettings,
      ragSettings: currentRagSettings,
      fallbackWritingContext: draftBody,
    });
  }, [
    assistantModel,
    currentLlmSettings,
    currentRagSettings,
    desktopRuntime,
    draftBody,
    filteredArticles,
    invokeDesktop,
    knowledgeBaseModeEnabled,
    ui,
  ]);
  const {
    question: assistantQuestion,
    messages: assistantMessages,
    result: assistantResult,
    isAsking: isAssistantAsking,
    errorMessage: assistantErrorMessage,
    conversations: assistantConversations,
    activeConversationId: activeAssistantConversationId,
    isHistoryOpen: isAssistantHistoryOpen,
    isMoreMenuOpen: isAssistantMoreMenuOpen,
  } = useSyncExternalStore(
    assistantModel.subscribe,
    assistantModel.getSnapshot,
    assistantModel.getSnapshot
  );
  const setAssistantQuestion = assistantModel.setQuestion;
  const handleAssistantAsk = assistantModel.handleAsk;
  const handleAssistantCreateConversation =
    assistantModel.handleCreateConversation;
  const handleAssistantActivateConversation =
    assistantModel.handleActivateConversation;
  const handleAssistantCloseConversation =
    assistantModel.handleCloseConversation;
  const handleAssistantToggleHistory = assistantModel.handleToggleHistory;
  const handleAssistantToggleMoreMenu = assistantModel.handleToggleMoreMenu;
  const filteredArticleKeysInOrder = useMemo(
    () => filteredArticles.map((article) => getArticleSelectionKey(article)),
    [filteredArticles]
  );

  useEffect(() => {
    setSelectedArticleKeysInOrder((previousKeys) => {
      if (selectionModePhase === "all") {
        if (
          previousKeys.length === filteredArticleKeysInOrder.length &&
          previousKeys.every(
            (key, index) => key === filteredArticleKeysInOrder[index]
          )
        ) {
          return previousKeys;
        }

        return filteredArticleKeysInOrder;
      }

      if (previousKeys.length === 0) {
        return previousKeys;
      }

      const visibleKeys = new Set(filteredArticleKeysInOrder);
      const nextKeys = previousKeys.filter((key) => visibleKeys.has(key));

      return nextKeys.length === previousKeys.length ? previousKeys : nextKeys;
    });
  }, [filteredArticleKeysInOrder, selectionModePhase]);

  const selectedArticleKeys = useMemo(
    () => new Set(selectedArticleKeysInOrder),
    [selectedArticleKeysInOrder]
  );

  const selectedArticleOrderLookup = useMemo(
    () => buildSelectedArticleOrderLookup(selectedArticleKeysInOrder),
    [selectedArticleKeysInOrder]
  );

  const exportableArticles = useMemo(() => {
    if (selectedArticleKeysInOrder.length === 0) {
      return [];
    }

    const filteredArticleMap = new Map(
      filteredArticles.map(
        (article) => [getArticleSelectionKey(article), article] as const
      )
    );

    return selectedArticleKeysInOrder
      .map((key) => filteredArticleMap.get(key))
      .filter((article): article is Article => Boolean(article));
  }, [filteredArticles, selectedArticleKeysInOrder]);

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
    ]
  );

  const handleNavigateWeb = useCallback(() => {
    navigateToAddressBarUrl(webUrl, true);
  }, [navigateToAddressBarUrl, webUrl]);

  const [documentActionsController] = useState(() =>
    createDocumentActionsController({
      desktopRuntime,
      invokeDesktop,
      locale,
      ui,
      pdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      isSelectionModeEnabled,
      selectedArticleOrderLookup,
      exportableArticles,
      onLibraryUpdated: refreshLibrary,
    })
  );
  useEffect(() => {
    documentActionsController.setContext({
      desktopRuntime,
      invokeDesktop,
      locale,
      ui,
      pdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      isSelectionModeEnabled,
      selectedArticleOrderLookup,
      exportableArticles,
      onLibraryUpdated: refreshLibrary,
    });
  }, [
    desktopRuntime,
    documentActionsController,
    exportableArticles,
    invokeDesktop,
    isSelectionModeEnabled,
    locale,
    pdfDownloadDir,
    pdfFileNameUseSelectionOrder,
    refreshLibrary,
    selectedArticleOrderLookup,
    ui,
  ]);
  useEffect(() => {
    return () => {
      documentActionsController.dispose();
    };
  }, [documentActionsController]);
  const { canExportDocx } = useSyncExternalStore(
    documentActionsController.subscribe,
    documentActionsController.getSnapshot,
    documentActionsController.getSnapshot
  );
  const handleSharedPdfDownload =
    documentActionsController.handleSharedPdfDownload;
  const handleOpenArticleDetails =
    documentActionsController.handleOpenArticleDetails;
  const handleExportArticlesDocx =
    documentActionsController.handleExportArticlesDocx;
  const handleSidebarPdfDownload = useCallback(() => {
    const sourceUrl = resolvePreviewSourceUrl(
      previewSurfaceSnapshot,
      browserUrl,
      webUrl
    );
    if (!sourceUrl) {
      return;
    }

    const matchedArticle = filteredArticles.find(
      (article) => normalizeUrl(article.sourceUrl) === normalizeUrl(sourceUrl),
    );

    void handleSharedPdfDownload({
      title: matchedArticle?.title ?? "",
      sourceUrl,
      fetchedAt: matchedArticle?.fetchedAt ?? new Date().toISOString(),
      journalTitle: matchedArticle?.journalTitle ?? null,
      doi: matchedArticle?.doi ?? null,
      authors: matchedArticle?.authors ?? [],
      publishedAt: matchedArticle?.publishedAt ?? null,
      sourceId: matchedArticle?.sourceId ?? null,
    });
  }, [
    browserUrl,
    filteredArticles,
    handleSharedPdfDownload,
    previewSurfaceSnapshot,
    webUrl,
  ]);
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

  const addressBarSourceOptions = useMemo(
    () => previewNavigationModel.createAddressBarSourceOptions(batchSources),
    [batchSources, previewNavigationModel]
  );
  const selectedAddressBarSourceId = useMemo(() => {
    return previewNavigationModel.resolveSelectedAddressBarSourceId(
      fetchSeedUrl,
      webUrl,
      batchSources
    );
  }, [batchSources, fetchSeedUrl, previewNavigationModel, webUrl]);

  const executeQuickAccessCommand = useCallback(
    (command: QuickAccessCommand | null) => {
      if (!command) {
        return;
      }

      if (command.type === "UPDATE_URL_INPUT") {
        previewNavigationModel.handleWebUrlChange(
          command.url,
          setWebUrl,
          setFetchSeedUrl
        );
        return;
      }

      const normalizedUrl = normalizeUrl(command.url);
      if (!normalizedUrl) {
        return;
      }

      if (command.openInEditorTab) {
        handleCreateWebTab(normalizedUrl);
        return;
      }

      const didNavigate = navigateToAddressBarUrl(normalizedUrl, false);
      if (!didNavigate) {
        return;
      }
    },
    [
      handleCreateWebTab,
      navigateToAddressBarUrl,
      previewNavigationModel,
      setFetchSeedUrl,
      setWebUrl,
    ]
  );

  const dispatchQuickAccessAction = useCallback(
    (action: QuickAccessAction) => {
      executeQuickAccessCommand(
        reduceQuickAccessAction(
          {
            addressBarSourceOptions,
            selectedAddressBarSourceId,
            openQuickSourceInEditorTab: true,
          },
          action,
        ),
      );
    },
    [
      addressBarSourceOptions,
      executeQuickAccessCommand,
      selectedAddressBarSourceId,
    ]
  );

  const { editorPartProps: previewAwareEditorPartProps } =
    useEditorPreviewTabsModel({
      browserUrl,
      tabs: editorTabs,
      activateTab: activateEditorTab,
      closeTab: closeEditorTab,
      editorPartProps,
      previewNavigationModel,
      previewSurfaceSnapshot,
      navigateToAddressBarUrl,
      setWebUrl,
      setFetchSeedUrl,
      updateActivePreviewTabUrl,
    });

  useEffect(() => {
    if (typeof window === "undefined") {
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

  const [batchFetchController] = useState(() =>
    createBatchFetchController({
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
    })
  );
  useEffect(() => {
    batchFetchController.setContext({
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
  }, [
    batchEndDate,
    batchFetchController,
    batchSources,
    batchStartDate,
    desktopRuntime,
    fetchSeedUrl,
    handleBatchFetchStart,
    handleBatchFetchSuccess,
    invokeDesktop,
    sameDomainOnly,
    ui,
    webUrl,
  ]);
  useEffect(() => {
    batchFetchController.start();
    return () => {
      batchFetchController.dispose();
    };
  }, [batchFetchController]);
  const { isBatchLoading } = useSyncExternalStore(
    batchFetchController.subscribe,
    batchFetchController.getSnapshot,
    batchFetchController.getSnapshot
  );
  const handleFetchLatestBatch = batchFetchController.handleFetchLatestBatch;

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionModePhase((previousPhase) => {
      if (previousPhase === "off") {
        setSelectedArticleKeysInOrder([]);
        return "multi";
      }

      if (previousPhase === "multi") {
        setSelectedArticleKeysInOrder(filteredArticleKeysInOrder);
        return "all";
      }

      setSelectedArticleKeysInOrder([]);
      return "off";
    });
  }, [filteredArticleKeysInOrder]);

  const handleToggleArticleSelected = useCallback(
    (article: Article) => {
      if (selectionModePhase === "off") {
        return;
      }

      const articleKey = getArticleSelectionKey(article);

      setSelectedArticleKeysInOrder((previousKeys) => {
        if (previousKeys.includes(articleKey)) {
          return previousKeys.filter((key) => key !== articleKey);
        }

        return [...previousKeys, articleKey];
      });
    },
    [selectionModePhase]
  );

  const handleToggleSidebar = useCallback(() => {
    toggleSidebarVisibility();
  }, []);

  const handleToggleAuxiliarySidebar = useCallback(() => {
    toggleAuxiliarySidebarVisibility();
  }, []);
  const handleCloseAuxiliarySidebar = useCallback(() => {
    setAuxiliarySidebarVisible(false);
  }, []);

  useEffect(() => {
    return subscribeTitlebarUiActions((action) => {
      if (action.type === "TOGGLE_SIDEBAR") {
        toggleSidebarVisibility();
        return;
      }

      if (action.type === "TOGGLE_AUXILIARY_SIDEBAR") {
        toggleAuxiliarySidebarVisibility();
        return;
      }

      if (action.type === "NAVIGATE_BACK") {
        handlePreviewBack();
        return;
      }

      if (action.type === "NAVIGATE_FORWARD") {
        handlePreviewForward();
        return;
      }

      if (action.type === "NAVIGATE_WEB") {
        handleNavigateWeb();
        return;
      }

      if (action.type === "TOGGLE_SETTINGS") {
        toggleWorkbenchSettings();
        return;
      }

      if (action.type === "EXPORT_DOCX") {
        void handleExportArticlesDocx();
      }
    });
  }, [
    handleExportArticlesDocx,
    handleNavigateWeb,
    handlePreviewBack,
    handlePreviewForward,
  ]);

  const secondarySidebarProps = useMemo(
    () =>
      createSecondarySidebarPartProps({
        state: {
          ui,
          locale,
          articles: filteredArticles,
          hasData,
          batchStartDate,
          batchEndDate,
          isBatchLoading,
          isSelectionModeEnabled,
          selectionModePhase,
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
      selectionModePhase,
      locale,
      selectedArticleKeys,
      setBatchEndDate,
      setBatchStartDate,
      ui,
    ]
  );

  const primarySidebarProps = useMemo(
    () => ({
      labels: secondarySidebarProps.labels,
      librarySnapshot,
      isLibraryLoading,
      onRefreshLibrary: () => void refreshLibrary(),
      onDownloadPdf: handleSidebarPdfDownload,
      onCreateDraftTab: handleCreateDraftTab,
    }),
    [
      handleCreateDraftTab,
      handleSidebarPdfDownload,
      isLibraryLoading,
      librarySnapshot,
      refreshLibrary,
      secondarySidebarProps.labels,
    ]
  );

  const auxiliarySidebarProps = useMemo(
    () => ({
      labels: secondarySidebarProps.labels,
      isKnowledgeBaseModeEnabled: knowledgeBaseModeEnabled,
      librarySnapshot,
      question: assistantQuestion,
      onQuestionChange: setAssistantQuestion,
      messages: assistantMessages,
      result: assistantResult,
      isAsking: isAssistantAsking,
      errorMessage: assistantErrorMessage,
      onAsk: () => void handleAssistantAsk(),
      availableArticleCount: filteredArticles.length,
      conversations: assistantConversations,
      activeConversationId: activeAssistantConversationId,
      isHistoryOpen: isAssistantHistoryOpen,
      isMoreMenuOpen: isAssistantMoreMenuOpen,
      onCreateConversation: handleAssistantCreateConversation,
      onActivateConversation: handleAssistantActivateConversation,
      onCloseConversation: handleAssistantCloseConversation,
      onCloseAuxiliarySidebar: handleCloseAuxiliarySidebar,
      onToggleHistory: handleAssistantToggleHistory,
      onToggleMoreMenu: handleAssistantToggleMoreMenu,
    }),
    [
      activeAssistantConversationId,
      assistantErrorMessage,
      assistantQuestion,
      assistantConversations,
      handleAssistantActivateConversation,
      handleAssistantCloseConversation,
      assistantMessages,
      handleAssistantCreateConversation,
      handleAssistantToggleHistory,
      handleAssistantToggleMoreMenu,
      assistantResult,
      filteredArticles.length,
      handleAssistantAsk,
      isAssistantAsking,
      isAssistantHistoryOpen,
      isAssistantMoreMenuOpen,
      handleCloseAuxiliarySidebar,
      knowledgeBaseModeEnabled,
      librarySnapshot,
      secondarySidebarProps.labels,
      setAssistantQuestion,
    ]
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
          isKnowledgeBaseModeEnabled: knowledgeBaseModeEnabled,
          isAuxiliarySidebarVisible,
          browserUrl,
          previewState,
          canExportDocx,
          addressBarSourceOptions,
          selectedAddressBarSourceId,
        },
        actions: {
          handleWindowControl,
          handleToggleSidebar,
          handleToggleAuxiliarySidebar,
          handlePreviewBack,
          handlePreviewForward,
          dispatchQuickAccessAction,
        },
      }),
    [
      activePage,
      addressBarSourceOptions,
      browserUrl,
      canExportDocx,
      dispatchQuickAccessAction,
      handlePreviewBack,
      handlePreviewForward,
      handleToggleSidebar,
      handleToggleAuxiliarySidebar,
      handleWindowControl,
      isSidebarVisible,
      isAuxiliarySidebarVisible,
      isWindowMaximized,
      previewState,
      selectedAddressBarSourceId,
      ui,
      webUrl,
    ]
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
          ragEnabled,
          autoIndexDownloadedPdf,
          libraryStorageMode,
          libraryDirectory,
          maxConcurrentIndexJobs,
          activeRagProvider,
          ragProviders,
          retrievalCandidateCount,
          retrievalTopK,
          pdfDownloadDir,
          pdfFileNameUseSelectionOrder,
          activeLlmProvider,
          llmProviders,
          activeTranslationProvider,
          translationProviders,
          desktopRuntime,
          configPath,
          isLibraryLoading,
          libraryDocumentCount: librarySnapshot.totalCount,
          libraryFileCount: librarySnapshot.fileCount,
          libraryQueuedJobCount: librarySnapshot.queuedJobCount,
          libraryDocuments: librarySnapshot.items,
          libraryDbFile: librarySnapshot.libraryDbFile,
          defaultManagedDirectory: librarySnapshot.defaultManagedDirectory,
          ragCacheDir: librarySnapshot.ragCacheDir,
          isSettingsSaving,
          isTestingRagConnection,
          isTestingLlmConnection,
          isTestingTranslationConnection,
        },
        actions: {
          onLocaleChange: handleLocaleChange,
          onBatchSourceUrlChange: handleBatchSourceUrlChange,
          onBatchSourceJournalTitleChange: handleBatchSourceJournalTitleChange,
          onAddBatchSource: handleAddBatchSource,
          onRemoveBatchSource: handleRemoveBatchSource,
          onMoveBatchSource: handleMoveBatchSource,
          onBatchLimitChange: (value) =>
            setBatchLimit(normalizeBatchLimit(value, 1)),
          onSameDomainOnlyChange: setSameDomainOnly,
          onUseMicaChange: setUseMica,
          onRagEnabledChange: setRagEnabled,
          onAutoIndexDownloadedPdfChange: setAutoIndexDownloadedPdf,
          onLibraryStorageModeChange: setLibraryStorageMode,
          onLibraryDirectoryChange: setLibraryDirectory,
          onMaxConcurrentIndexJobsChange: (value) =>
            setMaxConcurrentIndexJobs(
              Math.min(4, Math.max(1, Number.parseInt(String(value), 10) || 1))
            ),
          onRagProviderApiKeyChange: setRagProviderApiKey,
          onRagProviderBaseUrlChange: setRagProviderBaseUrl,
          onRagProviderEmbeddingModelChange: setRagProviderEmbeddingModel,
          onRagProviderRerankerModelChange: setRagProviderRerankerModel,
          onRagProviderEmbeddingPathChange: setRagProviderEmbeddingPath,
          onRagProviderRerankPathChange: setRagProviderRerankPath,
          onRetrievalCandidateCountChange: (value) =>
            setRetrievalCandidateCount(
              Math.min(
                20,
                Math.max(3, Number.parseInt(String(value), 10) || 10)
              )
            ),
          onRetrievalTopKChange: (value) =>
            setRetrievalTopK(
              Math.min(
                retrievalCandidateCount,
                Math.max(1, Number.parseInt(String(value), 10) || 4)
              )
            ),
          onPdfDownloadDirChange: setPdfDownloadDir,
          onPdfFileNameUseSelectionOrderChange: setPdfFileNameUseSelectionOrder,
          onChooseLibraryDirectory: () => void handleChooseLibraryDirectory(),
          onChoosePdfDownloadDir: () => void handleChoosePdfDownloadDir(),
          onActiveLlmProviderChange: setActiveLlmProvider,
          onLlmProviderApiKeyChange: setLlmProviderApiKey,
          onLlmProviderModelChange: setLlmProviderModel,
          onActiveTranslationProviderChange: setActiveTranslationProvider,
          onTranslationProviderApiKeyChange: setTranslationProviderApiKey,
          onTestRagConnection: () => void handleTestRagConnection(),
          onTestLlmConnection: () => void handleTestLlmConnection(),
          onTestTranslationConnection: () =>
            void handleTestTranslationConnection(),
          onOpenConfigLocation: () => void handleOpenConfigLocation(),
          onResetDownloadDir: handleResetDownloadDir,
        },
      }),
    [
      batchLimit,
      batchSources,
      configPath,
      activeRagProvider,
      activeLlmProvider,
      activeTranslationProvider,
      autoIndexDownloadedPdf,
      desktopRuntime,
      handleAddBatchSource,
      handleBatchSourceJournalTitleChange,
      handleBatchSourceUrlChange,
      handleChooseLibraryDirectory,
      handleChoosePdfDownloadDir,
      handleOpenConfigLocation,
      handleLocaleChange,
      handleTestRagConnection,
      handleTestLlmConnection,
      handleTestTranslationConnection,
      handleMoveBatchSource,
      handleRemoveBatchSource,
      handleResetDownloadDir,
      isSettingsLoading,
      isSettingsSaving,
      isTestingRagConnection,
      isTestingLlmConnection,
      isTestingTranslationConnection,
      llmProviders,
      libraryDirectory,
      librarySnapshot,
      ragProviders,
      translationProviders,
      locale,
      maxConcurrentIndexJobs,
      pdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      ragEnabled,
      libraryStorageMode,
      retrievalCandidateCount,
      retrievalTopK,
      isLibraryLoading,
      sameDomainOnly,
      useMica,
      setBatchLimit,
      setAutoIndexDownloadedPdf,
      setActiveLlmProvider,
      setActiveTranslationProvider,
      setLibraryDirectory,
      setLibraryStorageMode,
      setMaxConcurrentIndexJobs,
      setPdfDownloadDir,
      setPdfFileNameUseSelectionOrder,
      setRagProviderApiKey,
      setRagProviderBaseUrl,
      setRagProviderEmbeddingModel,
      setRagProviderRerankerModel,
      setRagProviderEmbeddingPath,
      setRagProviderRerankPath,
      setRetrievalCandidateCount,
      setRetrievalTopK,
      setLlmProviderApiKey,
      setLlmProviderModel,
      setTranslationProviderApiKey,
      setRagEnabled,
      setSameDomainOnly,
      ui,
    ]
  );

  const activePageView = renderActivePageView({
    activePage,
    isSidebarVisible,
    activeSidebarKind,
    isAuxiliarySidebarVisible,
    secondarySidebarProps,
    primarySidebarProps,
    auxiliarySidebarProps,
    editorPartProps: previewAwareEditorPartProps,
    settingsPartRef,
    settingsPartProps,
  });

  return renderWorkbenchShell({
    workbenchContainerRef,
    electronRuntime,
    useMica,
    titlebarPartRef,
    titlebarProps,
    statusbarPartRef: bindStatusbarPartRef,
    statusbarVisible: activePage === "reader",
    activePage,
    activePageView,
    toastCloseLabel: ui.toastClose,
  });
}

export default function WorkbenchView() {
  const nativeOverlayKind = detectNativeOverlayKind();
  const nativeModalKind = detectNativeModalKind();

  if (nativeOverlayKind === "toast") {
    return jsx(ToastOverlayWindow, {});
  }

  if (nativeOverlayKind === "menu") {
    return jsx(MenuOverlayWindow, {});
  }

  if (nativeModalKind === "article-details") {
    return jsx(ArticleDetailsModalWindow, {});
  }

  return jsx(WorkbenchContentView, {});
}
