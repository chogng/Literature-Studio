import {
  type AssistantModel,
  type AssistantModelContext,
  type AssistantModelSnapshot,
  createAssistantModel,
} from './assistantModel';
import {
  type BatchFetchController,
  type BatchFetchControllerContext,
  createBatchFetchController,
} from './batchFetchModel';
import {
  type DocumentActionsController,
  type DocumentActionsControllerContext,
  createDocumentActionsController,
} from './documentActionsModel';
import { type LibraryModel, type LibraryModelContext, type LibraryModelSnapshot, createLibraryModel } from './libraryModel';
import { PreviewNavigationModel } from './previewNavigationModel';
import {
  getWorkbenchLayoutStateSnapshot,
  getWorkbenchShellClassName,
  registerWorkbenchPartDomNode,
  setAuxiliarySidebarVisible,
  setSidebarVisible,
  setWorkbenchSidebarKind,
  subscribeWorkbenchLayoutState,
  toggleAuxiliarySidebarVisibility,
  toggleSidebarVisibility,
  WORKBENCH_PART_IDS,
} from './layout';
import {
  type SettingsController,
  type SettingsControllerContext,
  createSettingsController,
} from './parts/settings/settingsModel';
import {
  type EditorPartControllerContext,
  type EditorPartModel,
  createEditorPartController,
} from './parts/editor/editorPart';
import type { EditorPartProps } from './parts/editor/editorPartView';
import {
  createSettingsPartView,
  createSettingsPartProps,
} from './parts/settings/settingsPart';
import { createSecondarySidebarPartProps } from './parts/sidebar/secondarySidebarPart';
import { createTitlebarPartProps } from './parts/titlebar/titlebarPart';
import { createTitlebarView, type TitlebarView } from './parts/titlebar/titlebarView';
import { createToastOverlayWindowView } from './toastOverlayWindow';
import { createMenuOverlayWindowView } from './menuOverlayWindow';
import { createArticleDetailsModalWindowView } from './articleDetailsModalWindow';
import { createReaderView } from './readerView';
import { createToastHost, type ToastHost } from '../../base/browser/ui/toast/toastHost';
import {
  getWorkbenchLocaleSnapshot,
  setWorkbenchLocale,
  subscribeWorkbenchLocale,
} from './locale';
import {
  getWorkbenchSessionSnapshot,
  setWorkbenchArticles,
  setWorkbenchFetchSeedUrl,
  setWorkbenchSelectedArticleKeysInOrder,
  setWorkbenchSelectionModePhase,
  setWorkbenchWebUrl,
  subscribeWorkbenchSession,
} from './session';
import { setWorkbenchTitlebarCommandHandlers } from './titlebarCommands';
import {
  getWindowStateSnapshot,
  performWorkbenchWindowControl,
  subscribeWindowState,
} from './window';
import {
  getReaderStateSnapshot,
  selectReaderDerivedState,
  setBatchEndDate,
  setBatchStartDate,
  subscribeReaderState,
} from './readerState';
import {
  resolvePreviewSourceUrl,
  shouldSyncActivePreviewTabFromBrowserUrl,
  type PreviewSurfaceSnapshot,
} from './previewSurfaceState';
import { getLocaleMessages } from '../../../language/i18n';
import type { Article } from '../services/article/articleFetch';
import { normalizeUrl } from '../common/url';
import {
  getConfigBatchSourceSeed,
  normalizeBatchLimit,
  type BatchSource,
} from '../services/config/configSchema';
import {
  reduceQuickAccessAction,
  type QuickAccessAction,
  type QuickAccessCommand,
} from '../services/quickAccess/quickAccessService';
import type { WritingWorkspaceTab } from './writingEditorModel';

export type WorkbenchPage = 'reader' | 'settings';

export type WorkbenchStateSnapshot = {
  activePage: WorkbenchPage;
};

export type WorkbenchServicesSyncParams = {
  settingsController: SettingsController;
  settingsContext: SettingsControllerContext;
  libraryModel: LibraryModel;
  libraryContext: LibraryModelContext;
  editorPartController: EditorPartModel;
  editorPartContext: EditorPartControllerContext;
  assistantModel: AssistantModel;
  assistantContext: AssistantModelContext;
  documentActionsController: DocumentActionsController;
  documentActionsContext: DocumentActionsControllerContext;
  batchFetchController: BatchFetchController;
  batchFetchContext: BatchFetchControllerContext;
};

type WorkbenchEvent =
  | {
      type: 'SET_ACTIVE_PAGE';
      page: WorkbenchPage;
    }
  | {
      type: 'TOGGLE_SETTINGS';
    };

type DesktopInvokeArgs = Record<string, unknown> | undefined;

const DEFAULT_WORKBENCH_STATE: WorkbenchStateSnapshot = {
  activePage: 'reader',
};

const INITIAL_BATCH_SOURCES = getConfigBatchSourceSeed();

let workbenchState = DEFAULT_WORKBENCH_STATE;
const workbenchStateListeners = new Set<() => void>();
let settingsController: SettingsController | null = null;
let libraryModel: LibraryModel | null = null;
let previewNavigationModel: PreviewNavigationModel | null = null;
let editorPartController: EditorPartModel | null = null;
let assistantModel: AssistantModel | null = null;
let documentActionsController: DocumentActionsController | null = null;
let batchFetchController: BatchFetchController | null = null;
let activeWorkbenchHost: WorkbenchHost | null = null;
let activeOverlayView:
  | ReturnType<typeof createToastOverlayWindowView>
  | ReturnType<typeof createMenuOverlayWindowView>
  | ReturnType<typeof createArticleDetailsModalWindowView>
  | null = null;

function emitWorkbenchStateChange() {
  for (const listener of workbenchStateListeners) {
    listener();
  }
}

function getArticleSelectionKey(article: Pick<Article, 'sourceUrl' | 'fetchedAt'>) {
  return `${article.sourceUrl}::${article.fetchedAt}`;
}

function buildSelectedArticleOrderLookup(
  selectedArticleKeysInOrder: readonly string[],
) {
  return new Map(
    selectedArticleKeysInOrder.map((key, index) => [key, index + 1]),
  );
}

function resolveRuntimeState() {
  const electronRuntime =
    typeof window !== 'undefined' &&
    typeof window.electronAPI?.invoke === 'function';
  const previewRuntime =
    typeof window !== 'undefined' &&
    typeof window.electronAPI?.preview?.navigate === 'function';

  return {
    electronRuntime,
    previewRuntime,
    desktopRuntime: electronRuntime,
  };
}

function detectNativeModalKind() {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('nativeModal');
}

function detectNativeOverlayKind() {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('nativeOverlay');
}

function reduceWorkbenchState(
  state: WorkbenchStateSnapshot,
  event: WorkbenchEvent,
): WorkbenchStateSnapshot {
  switch (event.type) {
    case 'SET_ACTIVE_PAGE':
      if (state.activePage === event.page) {
        return state;
      }
      return {
        ...state,
        activePage: event.page,
      };
    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        activePage: state.activePage === 'settings' ? 'reader' : 'settings',
      };
    default:
      return state;
  }
}

function isPreviewTab(tab: WritingWorkspaceTab) {
  return tab.kind !== 'draft';
}

function toPreviewTabIdSet(tabs: ReadonlyArray<WritingWorkspaceTab>) {
  return new Set(tabs.filter(isPreviewTab).map((tab) => tab.id));
}

class WorkbenchHost {
  private readonly rootElement: HTMLElement;
  private readonly containerElement: HTMLDivElement;
  private readonly shellElement: HTMLDivElement;
  private readonly pageMount: HTMLDivElement;
  private readonly toastMount: HTMLDivElement;
  private readonly statusbarElement: HTMLElement;
  private readonly toastHost: ToastHost;
  private titlebarView: TitlebarView | null = null;
  private readerView: ReturnType<typeof createReaderView> | null = null;
  private settingsView: ReturnType<typeof createSettingsPartView> | null = null;
  private readonly globalDisposables: Array<() => void> = [];
  private previewStateDisposable: (() => void) | null = null;
  private servicesSubscribed = false;
  private isDisposed = false;
  private isRendering = false;
  private renderPending = false;
  private previewRuntime = false;
  private previousBrowserUrl = '';
  private previousActivePreviewTabId: string | null = null;
  private previousPreviewTargetId: string | null = null;
  private previousPreviewTargetUrl = '';
  private previousPreviewTabIds = new Set<string>();

  constructor(rootElement: HTMLElement) {
    this.rootElement = rootElement;
    this.containerElement = document.createElement('div');
    this.shellElement = document.createElement('div');
    this.pageMount = document.createElement('div');
    this.toastMount = document.createElement('div');
    this.statusbarElement = document.createElement('section');
    this.toastHost = createToastHost(this.toastMount);

    this.rootElement.replaceChildren(this.containerElement);
    this.containerElement.append(this.shellElement);
    this.shellElement.append(this.pageMount, this.toastMount);

    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.container,
      this.containerElement,
    );
  }

  start() {
    this.globalDisposables.push(
      subscribeWorkbenchLocale(this.requestRender),
      subscribeWorkbenchSession(this.requestRender),
      subscribeWorkbenchState(this.requestRender),
      subscribeWorkbenchLayoutState(this.requestRender),
      subscribeWindowState(this.requestRender),
      subscribeReaderState(this.requestRender),
    );

    this.requestRender();
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    this.previewStateDisposable?.();
    this.previewStateDisposable = null;
    while (this.globalDisposables.length > 0) {
      this.globalDisposables.pop()?.();
    }

    setWorkbenchTitlebarCommandHandlers(null);
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.statusbar, null);
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.container, null);

    this.titlebarView?.dispose();
    this.titlebarView = null;
    this.readerView?.dispose();
    this.readerView = null;
    this.settingsView?.dispose();
    this.settingsView = null;
    this.toastHost.dispose();
    this.rootElement.replaceChildren();
  }

  private readonly requestRender = () => {
    if (this.isDisposed) {
      return;
    }

    if (this.isRendering) {
      this.renderPending = true;
      return;
    }

    this.isRendering = true;
    try {
      do {
        this.renderPending = false;
        this.performRender();
      } while (this.renderPending && !this.isDisposed);
    } finally {
      this.isRendering = false;
    }
  };

  private ensureServiceSubscriptions(services: {
    settingsController: SettingsController;
    libraryModel: LibraryModel;
    previewNavigationModel: PreviewNavigationModel;
    editorPartController: EditorPartModel;
    assistantModel: AssistantModel;
    documentActionsController: DocumentActionsController;
    batchFetchController: BatchFetchController;
  }) {
    if (this.servicesSubscribed) {
      return;
    }

    this.servicesSubscribed = true;
    this.globalDisposables.push(
      services.settingsController.subscribe(this.requestRender),
      services.libraryModel.subscribe(this.requestRender),
      services.previewNavigationModel.subscribe(this.requestRender),
      services.editorPartController.subscribe(this.requestRender),
      services.assistantModel.subscribe(this.requestRender),
      services.documentActionsController.subscribe(this.requestRender),
      services.batchFetchController.subscribe(this.requestRender),
    );
  }

  private syncPreviewRuntime(
    previewNavigationModelInstance: PreviewNavigationModel,
    previewRuntime: boolean,
  ) {
    if (this.previewStateDisposable && this.previewRuntime === previewRuntime) {
      return;
    }

    this.previewStateDisposable?.();
    this.previewRuntime = previewRuntime;
    this.previewStateDisposable = previewNavigationModelInstance.connectPreviewState({
      previewRuntime,
      setWebUrl: setWorkbenchWebUrl,
      setFetchSeedUrl: setWorkbenchFetchSeedUrl,
    });
  }

  private syncKnowledgeBaseLayout(isKnowledgeBaseModeEnabled: boolean) {
    setWorkbenchSidebarKind(
      isKnowledgeBaseModeEnabled ? 'primary' : 'secondary',
    );
    setSidebarVisible(true);
    setAuxiliarySidebarVisible(isKnowledgeBaseModeEnabled);
  }

  private syncSelectionState(
    filteredArticleKeysInOrder: string[],
    selectionModePhase: ReturnType<
      typeof getWorkbenchSessionSnapshot
    >['selectionModePhase'],
  ) {
    setWorkbenchSelectedArticleKeysInOrder((previousKeys) => {
      if (selectionModePhase === 'all') {
        if (
          previousKeys.length === filteredArticleKeysInOrder.length &&
          previousKeys.every(
            (key, index) => key === filteredArticleKeysInOrder[index],
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
  }

  private createPreviewAwareEditorPartProps(params: {
    browserUrl: string;
    tabs: WritingWorkspaceTab[];
    activateTab: (tabId: string) => void;
    closeTab: (tabId: string) => void;
    editorPartProps: EditorPartProps;
    previewNavigationModel: PreviewNavigationModel;
    previewSurfaceSnapshot: PreviewSurfaceSnapshot;
    navigateToAddressBarUrl: (nextUrl: string, showToast?: boolean) => boolean;
    updateActivePreviewTabUrl: (url: string) => void;
  }) {
    const {
      browserUrl,
      tabs,
      activateTab,
      closeTab,
      editorPartProps,
      previewNavigationModel: previewNavigation,
      previewSurfaceSnapshot,
      navigateToAddressBarUrl,
      updateActivePreviewTabUrl,
    } = params;

    const syncPreviewTarget = (targetId: string | null, targetUrl: string) => {
      void previewNavigation
        .activateTarget(targetId, {
          setWebUrl: setWorkbenchWebUrl,
          setFetchSeedUrl: setWorkbenchFetchSeedUrl,
        })
        .then((state) => {
          if (!targetId || state?.url || !targetUrl) {
            return;
          }

          navigateToAddressBarUrl(targetUrl, false);
        });
    };

    if (
      this.previousPreviewTargetId !== previewSurfaceSnapshot.activePreviewTabId ||
      this.previousPreviewTargetUrl !== previewSurfaceSnapshot.activePreviewTabUrl
    ) {
      syncPreviewTarget(
        previewSurfaceSnapshot.activePreviewTabId,
        previewSurfaceSnapshot.activePreviewTabUrl,
      );
      this.previousPreviewTargetId = previewSurfaceSnapshot.activePreviewTabId;
      this.previousPreviewTargetUrl = previewSurfaceSnapshot.activePreviewTabUrl;
    }

    const nextPreviewTabIds = toPreviewTabIdSet(tabs);
    for (const previousTabId of this.previousPreviewTabIds) {
      if (!nextPreviewTabIds.has(previousTabId)) {
        previewNavigation.releaseTarget(previousTabId);
      }
    }
    this.previousPreviewTabIds = nextPreviewTabIds;

    if (
      shouldSyncActivePreviewTabFromBrowserUrl(
        previewSurfaceSnapshot,
        browserUrl,
        this.previousBrowserUrl,
        this.previousActivePreviewTabId,
      )
    ) {
      updateActivePreviewTabUrl(browserUrl);
    }

    this.previousBrowserUrl = browserUrl;
    this.previousActivePreviewTabId = previewSurfaceSnapshot.activePreviewTabId;

    return {
      ...editorPartProps,
      onActivateTab: (tabId: string) => {
        const targetTab = tabs.find((tab) => tab.id === tabId) ?? null;
        activateTab(tabId);
        void previewNavigation.activateTarget(
          targetTab && isPreviewTab(targetTab) ? targetTab.id : null,
        );
      },
      onCloseTab: (tabId: string) => {
        closeTab(tabId);
      },
    };
  }

  private syncStatusbarVisibility(statusbarVisible: boolean) {
    if (statusbarVisible) {
      if (!this.statusbarElement.isConnected) {
        this.containerElement.append(this.statusbarElement);
      }
      registerWorkbenchPartDomNode(
        WORKBENCH_PART_IDS.statusbar,
        this.statusbarElement,
      );
      return;
    }

    if (this.statusbarElement.parentElement === this.containerElement) {
      this.containerElement.removeChild(this.statusbarElement);
    }
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.statusbar, null);
  }

  private renderReaderPage(props: {
    isSidebarVisible: boolean;
    activeSidebarKind: ReturnType<
      typeof getWorkbenchLayoutStateSnapshot
    >['activeSidebarKind'];
    isAuxiliarySidebarVisible: boolean;
    secondarySidebarProps: ReturnType<typeof createSecondarySidebarPartProps>;
    primarySidebarProps: {
      labels: ReturnType<typeof createSecondarySidebarPartProps>['labels'];
      librarySnapshot: LibraryModelSnapshot['librarySnapshot'];
      isLibraryLoading: boolean;
      onRefreshLibrary: () => void;
      onDownloadPdf: () => void;
      onCreateDraftTab: () => void;
    };
    auxiliarySidebarProps: {
      labels: ReturnType<typeof createSecondarySidebarPartProps>['labels'];
      isKnowledgeBaseModeEnabled: boolean;
      librarySnapshot: LibraryModelSnapshot['librarySnapshot'];
      question: string;
      onQuestionChange: (value: string) => void;
      messages: AssistantModelSnapshot['messages'];
      result: AssistantModelSnapshot['result'];
      isAsking: boolean;
      errorMessage: string | null;
      onAsk: () => void;
      availableArticleCount: number;
      conversations: AssistantModelSnapshot['conversations'];
      activeConversationId: AssistantModelSnapshot['activeConversationId'];
      isHistoryOpen: AssistantModelSnapshot['isHistoryOpen'];
      isMoreMenuOpen: AssistantModelSnapshot['isMoreMenuOpen'];
      onCreateConversation: () => void;
      onActivateConversation: (conversationId: string) => void;
      onCloseConversation: (conversationId: string) => void;
      onCloseAuxiliarySidebar: () => void;
      onToggleHistory: () => void;
      onToggleMoreMenu: () => void;
    };
    editorPartProps: EditorPartProps;
  }) {
    this.settingsView?.dispose();
    this.settingsView = null;
    if (!this.readerView) {
      this.readerView = createReaderView(props);
    } else {
      this.readerView.setProps(props);
    }

    const readerElement = this.readerView.getElement();
    if (this.pageMount.firstChild !== readerElement) {
      this.pageMount.replaceChildren(readerElement);
    }
  }

  private renderSettingsPage(
    settingsPartProps: ReturnType<typeof createSettingsPartProps>,
  ) {
    this.readerView?.dispose();
    this.readerView = null;
    if (!this.settingsView) {
      this.settingsView = createSettingsPartView(settingsPartProps);
    } else {
      this.settingsView.setProps(settingsPartProps);
    }
    const settingsElement = this.settingsView.getElement();
    if (this.pageMount.firstChild !== settingsElement) {
      this.pageMount.replaceChildren(settingsElement);
    }
  }

  private performRender() {
    const locale = getWorkbenchLocaleSnapshot();
    const ui = getLocaleMessages(locale);
    const {
      webUrl,
      fetchSeedUrl,
      articles,
      selectionModePhase,
      selectedArticleKeysInOrder,
    } = getWorkbenchSessionSnapshot();
    const { activePage } = getWorkbenchStateSnapshot();
    const {
      isSidebarVisible,
      activeSidebarKind,
      isAuxiliarySidebarVisible,
    } = getWorkbenchLayoutStateSnapshot();
    const { electronRuntime, previewRuntime, desktopRuntime } =
      resolveRuntimeState();
    const { isMaximized: isWindowMaximized } = getWindowStateSnapshot();
    const handleWindowControl = performWorkbenchWindowControl;

    const invokeDesktop = async <T>(
      command: string,
      args?: DesktopInvokeArgs,
    ): Promise<T> => {
      if (window.electronAPI?.invoke) {
        return window.electronAPI.invoke<T>(command, args);
      }

      throw new Error('Desktop invoke bridge is unavailable.');
    };

    const settingsControllerInstance = getWorkbenchSettingsController({
      desktopRuntime,
      invokeDesktop,
      ui,
      locale,
      applyLocale: setWorkbenchLocale,
      initialBatchSources: INITIAL_BATCH_SOURCES,
    });
    const settingsSnapshot = settingsControllerInstance.getSnapshot();
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
    } = settingsSnapshot;
    const knowledgeBaseModeEnabled = ragEnabled;
    this.syncKnowledgeBaseLayout(knowledgeBaseModeEnabled);

    const libraryModelInstance = getWorkbenchLibraryModel({
      desktopRuntime,
      invokeDesktop,
    });
    const { librarySnapshot, isLibraryLoading } =
      libraryModelInstance.getSnapshot();
    const refreshLibrary = () => {
      void libraryModelInstance.refresh();
    };

    const readerStateSnapshot = getReaderStateSnapshot();
    const {
      batchStartDate,
      batchEndDate,
      filteredArticles,
      hasData,
    } = {
      batchStartDate: readerStateSnapshot.batchStartDate,
      batchEndDate: readerStateSnapshot.batchEndDate,
      ...selectReaderDerivedState(readerStateSnapshot, articles),
    };
    const currentLlmSettings = {
      activeProvider: activeLlmProvider,
      providers: llmProviders,
    };
    const currentRagSettings = {
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
    };

    const previewNavigationModelInstance = getWorkbenchPreviewNavigationModel();
    this.syncPreviewRuntime(previewNavigationModelInstance, previewRuntime);
    const { browserUrl, previewState } =
      previewNavigationModelInstance.getSnapshot();
    const viewPartProps = {
      browserUrl,
      electronRuntime,
      previewRuntime,
      labels: {
        emptyState: ui.emptyState,
        previewUnavailable: ui.previewUnavailable,
      },
    };
    const editorPartControllerInstance = getWorkbenchEditorPartController({
      ui,
      viewPartProps,
      browserUrl,
      webUrl,
    });
    const editorPartSnapshot = editorPartControllerInstance.getSnapshot();
    const {
      tabs: editorTabs,
      draftBody,
      createDraftTab: handleCreateDraftTab,
      createWebTab: handleCreateWebTab,
      previewSurfaceSnapshot,
      updateActivePreviewTabUrl,
      editorPartProps,
    } = {
      ...editorPartSnapshot,
      createDraftTab: editorPartControllerInstance.createDraftTab,
      createWebTab: editorPartControllerInstance.createWebTab,
      updateActivePreviewTabUrl:
        editorPartControllerInstance.updateActivePreviewTabUrl,
    };

    const assistantModelInstance = getWorkbenchAssistantModel({
      desktopRuntime,
      invokeDesktop,
      ui,
      isKnowledgeBaseModeEnabled: knowledgeBaseModeEnabled,
      articles: filteredArticles,
      llmSettings: currentLlmSettings,
      ragSettings: currentRagSettings,
      fallbackWritingContext: draftBody,
    });
    const assistantSnapshot = assistantModelInstance.getSnapshot();
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
    } = assistantSnapshot;
    const setAssistantQuestion = assistantModelInstance.setQuestion;
    const handleAssistantAsk = assistantModelInstance.handleAsk;
    const handleAssistantCreateConversation =
      assistantModelInstance.handleCreateConversation;
    const handleAssistantActivateConversation =
      assistantModelInstance.handleActivateConversation;
    const handleAssistantCloseConversation =
      assistantModelInstance.handleCloseConversation;
    const handleAssistantToggleHistory =
      assistantModelInstance.handleToggleHistory;
    const handleAssistantToggleMoreMenu =
      assistantModelInstance.handleToggleMoreMenu;

    const filteredArticleKeysInOrder = filteredArticles.map((article) =>
      getArticleSelectionKey(article),
    );
    this.syncSelectionState(filteredArticleKeysInOrder, selectionModePhase);

    const selectedArticleKeys = new Set(selectedArticleKeysInOrder);
    const selectedArticleOrderLookup = buildSelectedArticleOrderLookup(
      selectedArticleKeysInOrder,
    );
    const filteredArticleMap = new Map(
      filteredArticles.map(
        (article) => [getArticleSelectionKey(article), article] as const,
      ),
    );
    const exportableArticles =
      selectedArticleKeysInOrder.length === 0
        ? []
        : selectedArticleKeysInOrder
            .map((key) => filteredArticleMap.get(key))
            .filter((article): article is Article => Boolean(article));

    const navigateToAddressBarUrl = (
      nextUrl: string,
      showToast: boolean = true,
    ) =>
      previewNavigationModelInstance.navigateToAddressBarUrl({
        nextUrl,
        showToast,
        electronRuntime,
        previewRuntime,
        ui,
        setWebUrl: setWorkbenchWebUrl,
        setFetchSeedUrl: setWorkbenchFetchSeedUrl,
      });

    const documentActionsControllerInstance =
      getWorkbenchDocumentActionsController({
        desktopRuntime,
        invokeDesktop,
        locale,
        ui,
        pdfDownloadDir,
        pdfFileNameUseSelectionOrder,
        isSelectionModeEnabled: selectionModePhase !== 'off',
        selectedArticleOrderLookup,
        exportableArticles,
        onLibraryUpdated: refreshLibrary,
      });
    const { canExportDocx } = documentActionsControllerInstance.getSnapshot();
    const handleSharedPdfDownload =
      documentActionsControllerInstance.handleSharedPdfDownload;
    const handleOpenArticleDetails =
      documentActionsControllerInstance.handleOpenArticleDetails;
    const handleExportArticlesDocx =
      documentActionsControllerInstance.handleExportArticlesDocx;

    const handleSidebarPdfDownload = () => {
      const sourceUrl = resolvePreviewSourceUrl(
        previewSurfaceSnapshot,
        browserUrl,
        webUrl,
      );
      if (!sourceUrl) {
        return;
      }

      const matchedArticle = filteredArticles.find(
        (article) => normalizeUrl(article.sourceUrl) === normalizeUrl(sourceUrl),
      );

      void handleSharedPdfDownload({
        title: matchedArticle?.title ?? '',
        sourceUrl,
        fetchedAt: matchedArticle?.fetchedAt ?? new Date().toISOString(),
        journalTitle: matchedArticle?.journalTitle ?? null,
        doi: matchedArticle?.doi ?? null,
        authors: matchedArticle?.authors ?? [],
        publishedAt: matchedArticle?.publishedAt ?? null,
        sourceId: matchedArticle?.sourceId ?? null,
      });
    };

    const handlePreviewBack = () => {
      previewNavigationModelInstance.handlePreviewBack({
        previewRuntime,
        ui,
      });
    };

    const handlePreviewForward = () => {
      previewNavigationModelInstance.handlePreviewForward({
        previewRuntime,
        ui,
      });
    };

    const addressBarSourceOptions =
      previewNavigationModelInstance.createAddressBarSourceOptions(batchSources);
    const selectedAddressBarSourceId =
      previewNavigationModelInstance.resolveSelectedAddressBarSourceId(
        fetchSeedUrl,
        webUrl,
        batchSources,
      );

    const executeQuickAccessCommand = (command: QuickAccessCommand | null) => {
      if (!command) {
        return;
      }

      if (command.type === 'UPDATE_URL_INPUT') {
        previewNavigationModelInstance.handleWebUrlChange(
          command.url,
          setWorkbenchWebUrl,
          setWorkbenchFetchSeedUrl,
        );
        return;
      }

      const normalizedNextUrl = normalizeUrl(command.url);
      if (!normalizedNextUrl) {
        return;
      }

      if (command.openInEditorTab) {
        handleCreateWebTab(normalizedNextUrl);
        return;
      }

      navigateToAddressBarUrl(normalizedNextUrl, false);
    };

    const dispatchQuickAccessAction = (action: QuickAccessAction) => {
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
    };

    const previewAwareEditorPartProps = this.createPreviewAwareEditorPartProps({
      browserUrl,
      tabs: editorTabs,
      activateTab: editorPartControllerInstance.onActivateTab,
      closeTab: editorPartControllerInstance.onCloseTab,
      editorPartProps,
      previewNavigationModel: previewNavigationModelInstance,
      previewSurfaceSnapshot,
      navigateToAddressBarUrl,
      updateActivePreviewTabUrl,
    });

    const handleBatchFetchStart = () => {
      setWorkbenchArticles([]);
    };

    const handleBatchFetchSuccess = (nextArticles: Article[]) => {
      setWorkbenchArticles(nextArticles);
    };

    const batchFetchControllerInstance = getWorkbenchBatchFetchController({
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
    const { isBatchLoading } = batchFetchControllerInstance.getSnapshot();
    const handleFetchLatestBatch =
      batchFetchControllerInstance.handleFetchLatestBatch;

    const handleToggleSelectionMode = () => {
      const previousPhase = getWorkbenchSessionSnapshot().selectionModePhase;
      if (previousPhase === 'off') {
        setWorkbenchSelectedArticleKeysInOrder([]);
        setWorkbenchSelectionModePhase('multi');
        return;
      }

      if (previousPhase === 'multi') {
        setWorkbenchSelectedArticleKeysInOrder(filteredArticleKeysInOrder);
        setWorkbenchSelectionModePhase('all');
        return;
      }

      setWorkbenchSelectedArticleKeysInOrder([]);
      setWorkbenchSelectionModePhase('off');
    };

    const handleToggleArticleSelected = (article: Article) => {
      if (getWorkbenchSessionSnapshot().selectionModePhase === 'off') {
        return;
      }

      const articleKey = getArticleSelectionKey(article);
      setWorkbenchSelectedArticleKeysInOrder((previousKeys) => {
        if (previousKeys.includes(articleKey)) {
          return previousKeys.filter((key) => key !== articleKey);
        }

        return [...previousKeys, articleKey];
      });
    };

    const handleNavigateWeb = () => {
      navigateToAddressBarUrl(webUrl, true);
    };

    const handleCloseAuxiliarySidebar = () => {
      setAuxiliarySidebarVisible(false);
    };

    syncWorkbenchServicesContext({
      settingsController: settingsControllerInstance,
      settingsContext: {
        desktopRuntime,
        invokeDesktop,
        ui,
        locale,
        applyLocale: setWorkbenchLocale,
      },
      libraryModel: libraryModelInstance,
      libraryContext: {
        desktopRuntime,
        invokeDesktop,
      },
      editorPartController: editorPartControllerInstance,
      editorPartContext: {
        ui,
        viewPartProps,
        browserUrl,
        webUrl,
      },
      assistantModel: assistantModelInstance,
      assistantContext: {
        desktopRuntime,
        invokeDesktop,
        ui,
        isKnowledgeBaseModeEnabled: knowledgeBaseModeEnabled,
        articles: filteredArticles,
        llmSettings: currentLlmSettings,
        ragSettings: currentRagSettings,
        fallbackWritingContext: draftBody,
      },
      documentActionsController: documentActionsControllerInstance,
      documentActionsContext: {
        desktopRuntime,
        invokeDesktop,
        locale,
        ui,
        pdfDownloadDir,
        pdfFileNameUseSelectionOrder,
        isSelectionModeEnabled: selectionModePhase !== 'off',
        selectedArticleOrderLookup,
        exportableArticles,
        onLibraryUpdated: refreshLibrary,
      },
      batchFetchController: batchFetchControllerInstance,
      batchFetchContext: {
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
      },
    });

    this.ensureServiceSubscriptions({
      settingsController: settingsControllerInstance,
      libraryModel: libraryModelInstance,
      previewNavigationModel: previewNavigationModelInstance,
      editorPartController: editorPartControllerInstance,
      assistantModel: assistantModelInstance,
      documentActionsController: documentActionsControllerInstance,
      batchFetchController: batchFetchControllerInstance,
    });

    setWorkbenchTitlebarCommandHandlers({
      onToggleSidebar: toggleSidebarVisibility,
      onToggleAuxiliarySidebar: toggleAuxiliarySidebarVisibility,
      onNavigateBack: handlePreviewBack,
      onNavigateForward: handlePreviewForward,
      onNavigateWeb: handleNavigateWeb,
      onToggleSettings: toggleWorkbenchSettings,
      onExportDocx: () => {
        void handleExportArticlesDocx();
      },
    });

    const secondarySidebarProps = createSecondarySidebarPartProps({
      state: {
        ui,
        locale,
        articles: filteredArticles,
        hasData,
        batchStartDate,
        batchEndDate,
        isBatchLoading,
        isSelectionModeEnabled: selectionModePhase !== 'off',
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
    });

    const primarySidebarProps = {
      labels: secondarySidebarProps.labels,
      librarySnapshot,
      isLibraryLoading,
      onRefreshLibrary: () => void refreshLibrary(),
      onDownloadPdf: handleSidebarPdfDownload,
      onCreateDraftTab: handleCreateDraftTab,
    };

    const auxiliarySidebarProps = {
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
    };

    const titlebarProps = createTitlebarPartProps({
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
        handleToggleSidebar: toggleSidebarVisibility,
        handleToggleAuxiliarySidebar: toggleAuxiliarySidebarVisibility,
        handlePreviewBack,
        handlePreviewForward,
        dispatchQuickAccessAction,
      },
    });

    const settingsPartProps = createSettingsPartProps({
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
        onLocaleChange: settingsControllerInstance.handleLocaleChange,
        onBatchSourceUrlChange: settingsControllerInstance.handleBatchSourceUrlChange,
        onBatchSourceJournalTitleChange:
          settingsControllerInstance.handleBatchSourceJournalTitleChange,
        onAddBatchSource: settingsControllerInstance.handleAddBatchSource,
        onRemoveBatchSource: settingsControllerInstance.handleRemoveBatchSource,
        onMoveBatchSource: settingsControllerInstance.handleMoveBatchSource,
        onBatchLimitChange: (value) =>
          settingsControllerInstance.setBatchLimit(normalizeBatchLimit(value, 1)),
        onSameDomainOnlyChange: settingsControllerInstance.setSameDomainOnly,
        onUseMicaChange: settingsControllerInstance.setUseMica,
        onRagEnabledChange: settingsControllerInstance.setRagEnabled,
        onAutoIndexDownloadedPdfChange:
          settingsControllerInstance.setAutoIndexDownloadedPdf,
        onLibraryStorageModeChange:
          settingsControllerInstance.setLibraryStorageMode,
        onLibraryDirectoryChange: settingsControllerInstance.setLibraryDirectory,
        onMaxConcurrentIndexJobsChange: (value) =>
          settingsControllerInstance.setMaxConcurrentIndexJobs(
            Math.min(4, Math.max(1, Number.parseInt(String(value), 10) || 1)),
          ),
        onRagProviderApiKeyChange: settingsControllerInstance.setRagProviderApiKey,
        onRagProviderBaseUrlChange:
          settingsControllerInstance.setRagProviderBaseUrl,
        onRagProviderEmbeddingModelChange:
          settingsControllerInstance.setRagProviderEmbeddingModel,
        onRagProviderRerankerModelChange:
          settingsControllerInstance.setRagProviderRerankerModel,
        onRagProviderEmbeddingPathChange:
          settingsControllerInstance.setRagProviderEmbeddingPath,
        onRagProviderRerankPathChange:
          settingsControllerInstance.setRagProviderRerankPath,
        onRetrievalCandidateCountChange: (value) =>
          settingsControllerInstance.setRetrievalCandidateCount(
            Math.min(
              20,
              Math.max(3, Number.parseInt(String(value), 10) || 10),
            ),
          ),
        onRetrievalTopKChange: (value) =>
          settingsControllerInstance.setRetrievalTopK(
            Math.min(
              retrievalCandidateCount,
              Math.max(1, Number.parseInt(String(value), 10) || 4),
            ),
          ),
        onPdfDownloadDirChange: settingsControllerInstance.setPdfDownloadDir,
        onPdfFileNameUseSelectionOrderChange:
          settingsControllerInstance.setPdfFileNameUseSelectionOrder,
        onChooseLibraryDirectory: () =>
          void settingsControllerInstance.handleChooseLibraryDirectory(),
        onChoosePdfDownloadDir: () =>
          void settingsControllerInstance.handleChoosePdfDownloadDir(),
        onActiveLlmProviderChange: settingsControllerInstance.setActiveLlmProvider,
        onLlmProviderApiKeyChange: settingsControllerInstance.setLlmProviderApiKey,
        onLlmProviderModelChange: settingsControllerInstance.setLlmProviderModel,
        onActiveTranslationProviderChange:
          settingsControllerInstance.setActiveTranslationProvider,
        onTranslationProviderApiKeyChange:
          settingsControllerInstance.setTranslationProviderApiKey,
        onTestRagConnection: () =>
          void settingsControllerInstance.handleTestRagConnection(),
        onTestLlmConnection: () =>
          void settingsControllerInstance.handleTestLlmConnection(),
        onTestTranslationConnection: () =>
          void settingsControllerInstance.handleTestTranslationConnection(),
        onOpenConfigLocation: () =>
          void settingsControllerInstance.handleOpenConfigLocation(),
        onResetDownloadDir: settingsControllerInstance.handleResetDownloadDir,
      },
    });

    this.containerElement.className = [
      'app-window',
      electronRuntime ? 'has-titlebar' : '',
      electronRuntime && useMica ? 'is-mica-enabled' : '',
      activePage === 'reader' ? 'has-statusbar' : '',
    ]
      .filter(Boolean)
      .join(' ');
    this.shellElement.className = getWorkbenchShellClassName({ activePage });
    this.syncStatusbarVisibility(activePage === 'reader');

    if (electronRuntime) {
      if (!this.titlebarView) {
        this.titlebarView = createTitlebarView(titlebarProps);
        this.containerElement.prepend(this.titlebarView.getElement());
        registerWorkbenchPartDomNode(
          WORKBENCH_PART_IDS.titlebar,
          this.titlebarView.getElement(),
        );
      } else {
        this.titlebarView.setProps(titlebarProps);
      }
    } else {
      this.titlebarView?.dispose();
      this.titlebarView = null;
      registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.titlebar, null);
    }
    if (activePage === 'reader') {
      this.renderReaderPage({
        isSidebarVisible,
        activeSidebarKind,
        isAuxiliarySidebarVisible,
        secondarySidebarProps,
        primarySidebarProps,
        auxiliarySidebarProps,
        editorPartProps: previewAwareEditorPartProps,
      });
    } else {
      this.renderSettingsPage(settingsPartProps);
    }
    this.toastHost.render(ui.toastClose);
  }
}

export function subscribeWorkbenchState(listener: () => void) {
  workbenchStateListeners.add(listener);
  return () => {
    workbenchStateListeners.delete(listener);
  };
}

export function getWorkbenchStateSnapshot() {
  return workbenchState;
}

export function dispatchWorkbenchEvent(event: WorkbenchEvent) {
  const nextState = reduceWorkbenchState(workbenchState, event);
  if (Object.is(nextState, workbenchState)) {
    return;
  }

  workbenchState = nextState;
  emitWorkbenchStateChange();
}

export function setWorkbenchActivePage(page: WorkbenchPage) {
  dispatchWorkbenchEvent({
    type: 'SET_ACTIVE_PAGE',
    page,
  });
}

export function toggleWorkbenchSettings() {
  dispatchWorkbenchEvent({
    type: 'TOGGLE_SETTINGS',
  });
}

export function disposeWorkbenchServices() {
  settingsController?.dispose();
  settingsController = null;

  libraryModel?.dispose();
  libraryModel = null;

  editorPartController?.dispose();
  editorPartController = null;

  documentActionsController?.dispose();
  documentActionsController = null;

  batchFetchController?.dispose();
  batchFetchController = null;

  previewNavigationModel = null;
  assistantModel = null;
}

export function getWorkbenchSettingsController(
  context: SettingsControllerContext & { initialBatchSources: BatchSource[] },
) {
  if (!settingsController) {
    settingsController = createSettingsController(context);
    settingsController.start();
  }
  return settingsController;
}

export function getWorkbenchLibraryModel(context: LibraryModelContext) {
  if (!libraryModel) {
    libraryModel = createLibraryModel(context);
    libraryModel.start();
  }
  return libraryModel;
}

export function getWorkbenchPreviewNavigationModel() {
  previewNavigationModel ??= new PreviewNavigationModel();
  return previewNavigationModel;
}

export function getWorkbenchEditorPartController(
  context: EditorPartControllerContext,
) {
  editorPartController ??= createEditorPartController(context);
  return editorPartController;
}

export function getWorkbenchAssistantModel(context: AssistantModelContext) {
  assistantModel ??= createAssistantModel(context);
  return assistantModel;
}

export function getWorkbenchDocumentActionsController(
  context: DocumentActionsControllerContext,
) {
  documentActionsController ??= createDocumentActionsController(context);
  return documentActionsController;
}

export function getWorkbenchBatchFetchController(
  context: BatchFetchControllerContext,
) {
  if (!batchFetchController) {
    batchFetchController = createBatchFetchController(context);
    batchFetchController.start();
  }
  return batchFetchController;
}

export function syncWorkbenchServicesContext({
  settingsController: settingsControllerInstance,
  settingsContext,
  libraryModel: libraryModelInstance,
  libraryContext,
  editorPartController: editorPartControllerInstance,
  editorPartContext,
  assistantModel: assistantModelInstance,
  assistantContext,
  documentActionsController: documentActionsControllerInstance,
  documentActionsContext,
  batchFetchController: batchFetchControllerInstance,
  batchFetchContext,
}: WorkbenchServicesSyncParams) {
  settingsControllerInstance.setContext(settingsContext);
  libraryModelInstance.setContext(libraryContext);
  editorPartControllerInstance.setContext(editorPartContext);
  assistantModelInstance.setContext(assistantContext);
  documentActionsControllerInstance.setContext(documentActionsContext);
  batchFetchControllerInstance.setContext(batchFetchContext);
}

export function renderWorkbench() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element #root was not found.');
  }

  activeWorkbenchHost?.dispose();
  activeWorkbenchHost = null;
  activeOverlayView?.dispose();
  activeOverlayView = null;

  const nativeOverlayKind = detectNativeOverlayKind();
  const nativeModalKind = detectNativeModalKind();

  if (nativeOverlayKind === 'toast') {
    activeOverlayView = createToastOverlayWindowView();
    rootElement.replaceChildren(activeOverlayView.getElement());
    return;
  }

  if (nativeOverlayKind === 'menu') {
    activeOverlayView = createMenuOverlayWindowView();
    rootElement.replaceChildren(activeOverlayView.getElement());
    return;
  }

  if (nativeModalKind === 'article-details') {
    activeOverlayView = createArticleDetailsModalWindowView();
    rootElement.replaceChildren(activeOverlayView.getElement());
    return;
  }

  activeWorkbenchHost = new WorkbenchHost(rootElement);
  activeWorkbenchHost.start();
}
