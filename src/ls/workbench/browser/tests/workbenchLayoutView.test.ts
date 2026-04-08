import assert from 'node:assert/strict';
import test, { after, afterEach, before } from 'node:test';

import { createEmptyWritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import { DEFAULT_EDITOR_GROUP_ID } from 'ls/workbench/browser/editorGroupIdentity';
import {
  EDITOR_FRAME_SLOTS,
  getEditorFrameSlot,
} from 'ls/workbench/browser/parts/editor/editorFrame';

let cleanupDomEnvironment: (() => void) | null = null;
let createWorkbenchLayoutView: typeof import('ls/workbench/browser/workbench').createWorkbenchLayoutView;
let createWorkbenchContentPartViews: typeof import('ls/workbench/browser/workbenchContentPartViews').createWorkbenchContentPartViews;
let getWorkbenchLayoutStateSnapshot: typeof import('ls/workbench/browser/layout').getWorkbenchLayoutStateSnapshot;
let setPrimarySidebarVisible: typeof import('ls/workbench/browser/layout').setPrimarySidebarVisible;
let setAgentSidebarVisible: typeof import('ls/workbench/browser/layout').setAgentSidebarVisible;
let setWorkbenchSidebarSizes: typeof import('ls/workbench/browser/layout').setWorkbenchSidebarSizes;
let setEditorCollapsed: typeof import('ls/workbench/browser/layout').setEditorCollapsed;
let WORKBENCH_CONTENT_LAYOUT_BREAKPOINT: typeof import('ls/workbench/browser/layout').WORKBENCH_CONTENT_LAYOUT_BREAKPOINT;
let SidebarTopbarActionsView: typeof import('ls/workbench/browser/parts/sidebar/sidebarTopbarActions').SidebarTopbarActionsView;
let PrimaryBarFooterActionsView: typeof import('ls/workbench/browser/parts/primarybar/primarybarFooterActions').PrimaryBarFooterActionsView;

type RawWorkbenchLayoutViewProps = {
  mode?: 'content' | 'settings';
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  isLayoutEdgeSnappingEnabled: boolean;
  primarySidebarSize: number;
  agentSidebarSize: number;
  isEditorCollapsed: boolean;
  expandedEditorSize: number;
  settingsNavigationElement?: HTMLElement | null;
  settingsTopbarActionsElement?: HTMLElement | null;
  settingsContentElement?: HTMLElement | null;
  primaryBarProps: any;
  agentBarProps: any;
  sidebarTopbarActionsProps: any;
  sidebarTopbarActionsElement: HTMLElement;
  primaryBarFooterActionsElement: HTMLElement;
  editorTopbarAuxiliaryActionsElement: HTMLElement;
  editorPartProps: any;
  partViews: ReturnType<typeof createWorkbenchContentPartViews> | null;
};

function createSidebarTopbarActionsElement(props: {
  isPrimarySidebarVisible: boolean;
  primarySidebarToggleLabel: string;
  addressBarLabel: string;
  onTogglePrimarySidebar: () => void;
}) {
  const view = new SidebarTopbarActionsView();
  view.setProps(props);
  return view.getElement();
}

function createPrimaryBarFooterActionsElement(props: {
  accountLabel: string;
  settingsLabel: string;
}) {
  const view = new PrimaryBarFooterActionsView();
  view.setProps(props);
  return view.getElement();
}

function createSettingsTopbarActionsElement(backLabel: string) {
  const host = document.createElement('div');
  host.className = 'sidebar-topbar-actions-host';
  const actionbar = document.createElement('div');
  actionbar.className = 'sidebar-topbar-actions actionbar is-horizontal';
  const actions = document.createElement('div');
  actions.className = 'actionbar-actions-container';
  const button = document.createElement('button');
  button.className = 'actionbar-action sidebar-topbar-toggle-btn';
  button.setAttribute('aria-label', backLabel);
  actions.append(button);
  actionbar.append(actions);
  host.append(actionbar);
  return host;
}

function materializeWorkbenchLayoutViewProps(
  props: RawWorkbenchLayoutViewProps,
) {
  setPrimarySidebarVisible(props.isPrimarySidebarVisible);
  setAgentSidebarVisible(props.isAgentSidebarVisible);
  setWorkbenchSidebarSizes({
    primarySidebarSize: props.primarySidebarSize,
    agentSidebarSize: props.agentSidebarSize,
  });
  setEditorCollapsed(props.isEditorCollapsed, props.expandedEditorSize);

  const nextPartViews = props.partViews ?? createWorkbenchContentPartViews({
    mode: props.mode,
    isPrimarySidebarVisible: props.isPrimarySidebarVisible,
    isAgentSidebarVisible: props.isAgentSidebarVisible,
    settingsNavigationElement: props.settingsNavigationElement ?? null,
    settingsTopbarActionsElement: props.settingsTopbarActionsElement ?? null,
    settingsContentElement: props.settingsContentElement ?? null,
    primaryBarProps: props.primaryBarProps,
    agentBarProps: props.agentBarProps,
    editorPartProps: props.editorPartProps,
    sidebarTopbarActionsElement: props.sidebarTopbarActionsElement,
    primaryBarFooterActionsElement: props.primaryBarFooterActionsElement,
    editorTopbarAuxiliaryActionsElement: props.editorTopbarAuxiliaryActionsElement,
  });

  nextPartViews.setProps({
    mode: props.mode,
    isPrimarySidebarVisible: props.isPrimarySidebarVisible,
    isAgentSidebarVisible: props.isAgentSidebarVisible,
    settingsNavigationElement: props.settingsNavigationElement ?? null,
    settingsTopbarActionsElement: props.settingsTopbarActionsElement ?? null,
    settingsContentElement: props.settingsContentElement ?? null,
    primaryBarProps: props.primaryBarProps,
    agentBarProps: props.agentBarProps,
    editorPartProps: props.editorPartProps,
    sidebarTopbarActionsElement: props.sidebarTopbarActionsElement,
    primaryBarFooterActionsElement: props.primaryBarFooterActionsElement,
    editorTopbarAuxiliaryActionsElement: props.editorTopbarAuxiliaryActionsElement,
  });

  props.partViews = nextPartViews;

  return {
    mode: props.mode,
    isPrimarySidebarVisible: props.isPrimarySidebarVisible,
    isAgentSidebarVisible: props.isAgentSidebarVisible,
    isLayoutEdgeSnappingEnabled: props.isLayoutEdgeSnappingEnabled,
    primarySidebarSize: props.primarySidebarSize,
    agentSidebarSize: props.agentSidebarSize,
    isEditorCollapsed: props.isEditorCollapsed,
    expandedEditorSize: props.expandedEditorSize,
    partViews: nextPartViews,
  } as Parameters<typeof createWorkbenchLayoutView>[0];
}

function syncRawPropsWithLayoutState(props: RawWorkbenchLayoutViewProps) {
  const layoutState = getWorkbenchLayoutStateSnapshot();
  props.isPrimarySidebarVisible = layoutState.isPrimarySidebarVisible;
  props.isAgentSidebarVisible = layoutState.isAgentSidebarVisible;
  props.primarySidebarSize = layoutState.primarySidebarSize;
  props.agentSidebarSize = layoutState.agentSidebarSize;
  props.isEditorCollapsed = layoutState.isEditorCollapsed;
  props.expandedEditorSize = layoutState.expandedEditorSize;
  return props;
}

function installResizeObserverSpy() {
  let activeObservers = 0;
  const previousResizeObserver = globalThis.ResizeObserver;
  const instances: Array<{
    observing: boolean;
    disconnectCount: number;
  }> = [];

  class FakeResizeObserver implements ResizeObserver {
    private readonly instanceState = {
      observing: false,
      disconnectCount: 0,
    };

    constructor() {
      instances.push(this.instanceState);
    }

    disconnect() {
      if (!this.instanceState.observing) {
        return;
      }

      this.instanceState.observing = false;
      this.instanceState.disconnectCount += 1;
      activeObservers -= 1;
    }

    observe() {
      if (this.instanceState.observing) {
        return;
      }

      this.instanceState.observing = true;
      activeObservers += 1;
    }

    unobserve() {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: FakeResizeObserver,
  });

  return {
    getActiveObservers() {
      return activeObservers;
    },
    getInstanceCount() {
      return instances.length;
    },
    isObserving(index: number) {
      return instances[index]?.observing ?? false;
    },
    wasDisconnected(index: number) {
      return (instances[index]?.disconnectCount ?? 0) > 0;
    },
    restore() {
      if (previousResizeObserver === undefined) {
        Reflect.deleteProperty(globalThis, 'ResizeObserver');
        return;
      }

      Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: previousResizeObserver,
      });
    },
  };
}

function installAnimationFrameSpy() {
  const previousRequestAnimationFrame = window.requestAnimationFrame;
  const previousCancelAnimationFrame = window.cancelAnimationFrame;
  let nextHandle = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const canceledHandles: number[] = [];

  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const handle = nextHandle;
    nextHandle += 1;
    callbacks.set(handle, callback);
    return handle;
  }) as typeof window.requestAnimationFrame;

  window.cancelAnimationFrame = ((handle: number) => {
    canceledHandles.push(handle);
    callbacks.delete(handle);
  }) as typeof window.cancelAnimationFrame;

  return {
    getCanceledHandles() {
      return [...canceledHandles];
    },
    getPendingHandles() {
      return [...callbacks.keys()];
    },
    flushAll(timestamp = 0) {
      const pendingCallbacks = [...callbacks.entries()];
      callbacks.clear();
      for (const [, callback] of pendingCallbacks) {
        callback(timestamp);
      }
    },
    restore() {
      window.requestAnimationFrame = previousRequestAnimationFrame;
      window.cancelAnimationFrame = previousCancelAnimationFrame;
    },
  };
}

function setWindowInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function bindWorkbenchContentSize(
  view: ReturnType<typeof createWorkbenchLayoutView>,
  initialWidth: number,
  initialHeight: number,
) {
  let width = initialWidth;
  let height = initialHeight;
  const element = (view as unknown as {
    element: HTMLElement;
    mainElement: HTMLElement;
  }).element;
  const mainElement = (view as unknown as {
    element: HTMLElement;
    mainElement: HTMLElement;
  }).mainElement;

  const defineDimension = (
    target: HTMLElement,
    dimension: 'clientWidth' | 'clientHeight',
  ) => {
    Object.defineProperty(target, dimension, {
      configurable: true,
      get: () => (dimension === 'clientWidth' ? width : height),
    });
  };

  defineDimension(element, 'clientWidth');
  defineDimension(element, 'clientHeight');
  defineDimension(mainElement, 'clientWidth');
  defineDimension(mainElement, 'clientHeight');

  return {
    setSize(nextWidth: number, nextHeight: number) {
      width = nextWidth;
      height = nextHeight;
    },
  };
}

function getEventEmitterListenerCount(
  owner: Record<string, unknown>,
  fieldName: string,
) {
  const emitter = owner[fieldName] as { listeners?: Set<unknown> } | undefined;
  return emitter?.listeners?.size ?? 0;
}

function createWorkbenchLayoutViewProps() {
  const auxiliaryEditorTopbarActionsElement = document.createElement('div');
  auxiliaryEditorTopbarActionsElement.className = 'sidebar-topbar-actions actionbar is-horizontal';
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'actionbar-actions-container';
  const toggleButton = document.createElement('button');
  toggleButton.className = 'actionbar-action editor-topbar-toggle-editor-btn';
  toggleButton.setAttribute('aria-label', 'Expand editor');
  actionsContainer.append(toggleButton);
  auxiliaryEditorTopbarActionsElement.append(actionsContainer);
  const sidebarLabels = {
    untitled: 'Untitled',
    unknown: 'Unknown',
    articleType: 'Type',
    authors: 'Authors',
    abstract: 'Abstract',
    description: 'Description',
    publishedAt: 'Published',
    source: 'Source',
    fetchedAt: 'Fetched',
    controlsAriaLabel: 'Controls',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
    emptyFiltered: 'No results',
    emptyAll: 'No articles',
    emptyAllInputLinkAction: 'Input link',
    emptyAllInputLinkSuffix: 'suffix',
    startDate: 'Start date',
    endDate: 'End date',
    fetchLatestBusy: 'Fetching',
    fetchLatest: 'Fetch latest',
    fetchTitle: 'Literature fetch',
    selectionModeEnterMulti: 'Select multiple',
    selectionModeSelectAll: 'Select all',
    selectionModeExit: 'Exit selection',
    loading: 'Loading',
    refresh: 'Refresh',
    libraryTitle: 'Library',
    libraryAction: 'Refresh library',
    pdfDownloadAction: 'Download pdf',
    writingAction: 'Create draft',
    libraryEmpty: 'No library data',
    libraryDocuments: 'Documents',
    libraryFiles: 'Files',
    libraryQueuedJobs: 'Queued jobs',
    libraryDbFile: 'DB file',
    libraryFilesDir: 'Files dir',
    libraryCacheDir: 'Cache dir',
    libraryStatusRegistered: 'Registered',
    libraryStatusQueued: 'Queued',
    libraryStatusRunning: 'Running',
    libraryStatusFailed: 'Failed',
    contextRename: 'Rename',
    contextEditSourceUrl: 'Edit source',
    contextDelete: 'Delete',
    assistantTitle: 'Assistant',
    assistantDescriptionEnabled: 'Enabled',
    assistantDescriptionDisabled: 'Disabled',
    assistantModeOn: 'On',
    assistantModeOff: 'Off',
    assistantReady: 'Ready',
    assistantPlaceholderEnabled: 'Ask',
    assistantPlaceholderDisabled: 'Disabled',
    assistantVoice: 'Voice',
    assistantImage: 'Image',
    assistantSend: 'Send',
    assistantSendBusy: 'Sending',
    assistantQuestion: 'Question',
    assistantQuestionPlaceholder: 'Type a question',
    assistantContext: 'Context',
    assistantContextPlaceholder: 'Type context',
    assistantAnswerTitle: 'Answer',
    assistantEvidenceTitle: 'Evidence',
    assistantSources: 'Sources',
    assistantNoArticles: 'No articles',
    assistantQuestionRequired: 'Question required',
    assistantRerankOn: 'Rerank on',
    assistantRerankOff: 'Rerank off',
  };
  const fetchPaneProps = {
    articles: [],
    hasData: false,
    locale: 'en' as const,
    labels: sidebarLabels,
    onFocusWebUrlInput: () => {},
    fetchStartDate: '',
    onFetchStartDateChange: () => {},
    fetchEndDate: '',
    onFetchEndDateChange: () => {},
    onFetch: () => {},
    onDownloadPdf: async () => {},
    onOpenArticleDetails: () => {},
    isFetchLoading: false,
    isSelectionModeEnabled: false,
    selectionModePhase: 'off' as const,
    selectedArticleKeys: new Set<string>(),
    onToggleSelectionMode: () => {},
    onToggleArticleSelected: () => {},
  };
  return {
    mode: 'content' as const,
    isPrimarySidebarVisible: false,
    isAgentSidebarVisible: false,
    isLayoutEdgeSnappingEnabled: false,
    primarySidebarSize: 320,
    agentSidebarSize: 360,
    isEditorCollapsed: false,
    expandedEditorSize: 220,
    settingsNavigationElement: null,
    settingsTopbarActionsElement: null,
    settingsContentElement: null,
    fetchPaneProps,
    primaryBarProps: {
      labels: sidebarLabels,
      fetchPaneProps,
      librarySnapshot: {
        items: [],
        totalCount: 0,
        fileCount: 0,
        queuedJobCount: 0,
        libraryDbFile: '',
        defaultManagedDirectory: '',
        ragCacheDir: '',
      },
      isLibraryLoading: false,
    },
    agentBarProps: {
      labels: {
        assistantHistory: 'History',
        assistantNewConversation: 'New conversation',
        assistantMore: 'More',
        assistantCloseSidebar: 'Close sidebar',
        assistantModel: 'Model',
        assistantModelSettings: 'Model settings',
        assistantQuestion: 'Question',
        assistantQuestionPlaceholder: 'Type a question',
        assistantSend: 'Send',
        assistantSendBusy: 'Sending',
        assistantVoice: 'Voice',
        assistantImage: 'Image',
        assistantContext: 'Context',
        assistantContextPlaceholder: 'Type context',
        assistantReady: 'Ready',
        assistantDescriptionEnabled: 'Enabled',
        assistantDescriptionDisabled: 'Disabled',
        assistantNoArticles: 'No articles',
        assistantApplyPatch: 'Apply patch',
      },
      isKnowledgeBaseModeEnabled: false,
      messages: [],
      question: '',
      onQuestionChange: () => {},
      isAsking: false,
      errorMessage: null,
      onAsk: () => {},
      onApplyPatch: () => {},
      availableArticleCount: 0,
      conversations: [
        {
          id: 'conversation-1',
          title: 'Conversation 1',
          messages: [],
        },
      ],
      activeConversationId: 'conversation-1',
      llmModelOptions: [],
      activeLlmModelOptionValue: '',
      onCreateConversation: () => {},
      onActivateConversation: () => {},
      onCloseConversation: () => {},
      onCloseAgentBar: () => {},
      onSelectLlmModel: () => {},
      onOpenModelSettings: () => {},
    },
    sidebarTopbarActionsProps: {
      isPrimarySidebarVisible: false,
      primarySidebarToggleLabel: 'Show primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    },
    sidebarTopbarActionsElement: createSidebarTopbarActionsElement({
      isPrimarySidebarVisible: false,
      primarySidebarToggleLabel: 'Show primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    }),
    primaryBarFooterActionsElement: createPrimaryBarFooterActionsElement({
      accountLabel: 'Account',
      settingsLabel: 'Settings',
    }),
    partViews: null,
    editorTopbarAuxiliaryActionsElement: auxiliaryEditorTopbarActionsElement,
    editorPartProps: {
      labels: {
        topbarAddAction: 'Add',
        createDraft: 'Draft',
        createBrowser: 'Browser',
        createFile: 'File',
        toolbarSources: 'Source menu',
        toolbarBack: 'Back',
        toolbarForward: 'Forward',
        toolbarRefresh: 'Refresh',
        toolbarFavorite: 'Favorite',
        toolbarMore: 'More',
        toolbarHardReload: 'Hard reload',
        toolbarCopyCurrentUrl: 'Copy current URL',
        toolbarClearBrowsingHistory: 'Clear browsing history',
        toolbarClearCookies: 'Clear cookies',
        toolbarClearCache: 'Clear cache',
        toolbarAddressBar: 'Address bar',
        toolbarAddressPlaceholder: 'Search or enter URL',
        browserLibraryPanelTitle: 'Source menu',
        browserLibraryPanelRecentTitle: 'Today',
        browserLibraryPanelFavoritesTitle: 'Favorites',
        browserLibraryPanelEmptyState: 'No links yet',
        draftMode: 'Draft',
        sourceMode: 'Source',
        pdfMode: 'PDF',
        close: 'Close',
        expandEditor: 'Expand editor',
        collapseEditor: 'Collapse editor',
        emptyWorkspaceTitle: 'Empty workspace',
        emptyWorkspaceBody: 'Create a draft to start.',
        draftBodyPlaceholder: 'Start writing',
        pdfTitle: 'PDF',
        textGroup: 'Text',
        formatGroup: 'Format',
        insertGroup: 'Insert',
        historyGroup: 'History',
        paragraph: 'Paragraph',
        heading1: 'Heading 1',
        heading2: 'Heading 2',
        heading3: 'Heading 3',
        bold: 'Bold',
        italic: 'Italic',
        underline: 'Underline',
        fontFamily: 'Font family',
        fontSize: 'Font size',
        defaultTextStyle: 'Default',
        alignLeft: 'Align left',
        alignCenter: 'Align center',
        alignRight: 'Align right',
        clearInlineStyles: 'Clear styles',
        bulletList: 'Bullet list',
        orderedList: 'Ordered list',
        blockquote: 'Blockquote',
        undo: 'Undo',
        redo: 'Redo',
        insertCitation: 'Insert citation',
        insertFigure: 'Insert figure',
        insertFigureRef: 'Insert figure ref',
        citationPrompt: 'Citation prompt',
        figureUrlPrompt: 'Figure url prompt',
        figureCaptionPrompt: 'Figure caption prompt',
        figureRefPrompt: 'Figure ref prompt',
        fontFamilyPrompt: 'Font family prompt',
        fontSizePrompt: 'Font size prompt',
        status: {
          statusbarAriaLabel: 'Editor status',
          words: 'Words',
          characters: 'Characters',
          paragraphs: 'Paragraphs',
          selection: 'Selection',
          block: 'Block',
          line: 'Line',
          column: 'Column',
          url: 'URL',
          blockFigure: 'Figure',
          ready: 'Ready',
        },
      },
      viewPartProps: {
        browserUrl: '',
        electronRuntime: false,
        webContentRuntime: false,
        labels: {
          emptyState: 'Empty',
          contentUnavailable: 'Unavailable',
        },
      },
      groupId: DEFAULT_EDITOR_GROUP_ID,
      tabs: [],
      dirtyDraftTabIds: [],
      activeTabId: null,
      activeTab: null,
      viewStateEntries: [],
      onActivateTab: () => {},
      onCloseTab: () => {},
      onCreateDraftTab: () => {},
      onCreateBrowserTab: () => {},
      onCreatePdfTab: () => {},
      onOpenAddressBarSourceMenu: () => {},
      onToolbarNavigateBack: () => {},
      onToolbarNavigateForward: () => {},
      onToolbarNavigateRefresh: () => {},
      onToolbarHardReload: () => {},
      onToolbarCopyCurrentUrl: () => {},
      onToolbarClearBrowsingHistory: () => {},
      onToolbarClearCookies: () => {},
      onToolbarClearCache: () => {},
      onToolbarAddressChange: () => {},
      onToolbarAddressSubmit: () => {},
      onToolbarNavigateToUrl: () => {},
      onDraftDocumentChange: () => {},
      onSetEditorViewState: () => {},
      onDeleteEditorViewState: () => {},
    },
  } as RawWorkbenchLayoutViewProps;
}

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createWorkbenchLayoutView } = await import('ls/workbench/browser/workbench'));
  ({ createWorkbenchContentPartViews } = await import('ls/workbench/browser/workbenchContentPartViews'));
  ({
    getWorkbenchLayoutStateSnapshot,
    setPrimarySidebarVisible,
    setAgentSidebarVisible,
    setWorkbenchSidebarSizes,
    setEditorCollapsed,
    WORKBENCH_CONTENT_LAYOUT_BREAKPOINT,
  } = await import('ls/workbench/browser/layout'));
  ({ SidebarTopbarActionsView } = await import('ls/workbench/browser/parts/sidebar/sidebarTopbarActions'));
  ({ PrimaryBarFooterActionsView } = await import('ls/workbench/browser/parts/primarybar/primarybarFooterActions'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

afterEach(() => {
  document.body.replaceChildren();
});

test('WorkbenchLayoutView mounts primary topbar actions into auxiliary topbar when the primary sidebar is hidden', () => {
  const props = createWorkbenchLayoutViewProps();
  props.isPrimarySidebarVisible = true;
  props.isAgentSidebarVisible = true;
  props.sidebarTopbarActionsProps = {
    ...props.sidebarTopbarActionsProps,
    isPrimarySidebarVisible: true,
    primarySidebarToggleLabel: 'Hide primary sidebar',
    addressBarLabel: 'Address bar',
    onTogglePrimarySidebar: () => {},
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    let primaryTopbarActionsHost = view
      .getElement()
      .querySelector('.primarybar-topbar .sidebar-topbar-actions-host');
    assert(primaryTopbarActionsHost instanceof HTMLElement);
    assert.equal(
      view
        .getElement()
        .querySelector('.agentbar-topbar .sidebar-topbar-actions-host'),
      null,
    );

    const nextProps = {
      ...props,
      isPrimarySidebarVisible: false,
      sidebarTopbarActionsProps: {
        ...props.sidebarTopbarActionsProps,
        isPrimarySidebarVisible: false,
        primarySidebarToggleLabel: 'Show primary sidebar',
      },
      sidebarTopbarActionsElement: createSidebarTopbarActionsElement({
        isPrimarySidebarVisible: false,
        primarySidebarToggleLabel: 'Show primary sidebar',
        addressBarLabel: 'Address bar',
        onTogglePrimarySidebar: () => {},
      }),
    };
    view.setProps(materializeWorkbenchLayoutViewProps(nextProps));

    primaryTopbarActionsHost = view
      .getElement()
      .querySelector('.agentbar-topbar .sidebar-topbar-actions-host');
    assert(primaryTopbarActionsHost instanceof HTMLElement);
    assert.equal(
      view
        .getElement()
        .querySelector('.agentbar-topbar .sidebar-topbar-toggle-btn')
        ?.getAttribute('aria-label'),
      'Show primary sidebar',
    );
    assert.equal(
      view
        .getElement()
        .querySelector('.primarybar-topbar .sidebar-topbar-actions-host'),
      null,
    );
  } finally {
    view.dispose();
  }
});

test('WorkbenchLayoutView mounts the editor collapse action into auxiliary topbar when the editor is collapsed', () => {
  const props = createWorkbenchLayoutViewProps();
  props.isPrimarySidebarVisible = false;
  props.isAgentSidebarVisible = true;
  props.sidebarTopbarActionsProps = {
    ...props.sidebarTopbarActionsProps,
    isPrimarySidebarVisible: false,
    primarySidebarToggleLabel: 'Show primary sidebar',
    addressBarLabel: 'Address bar',
    onTogglePrimarySidebar: () => {},
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const editorToggleButton = view
      .getElement()
      .querySelector('.editor-topbar .editor-topbar-toggle-editor-btn');
    assert(editorToggleButton instanceof HTMLButtonElement);
    assert.equal(editorToggleButton.getAttribute('aria-label'), 'Collapse editor');

    editorToggleButton.click();
    view.setProps(materializeWorkbenchLayoutViewProps(syncRawPropsWithLayoutState(props)));

    const auxiliaryToggleButton = view
      .getElement()
      .querySelector('.agentbar-topbar .editor-topbar-toggle-editor-btn');
    assert(auxiliaryToggleButton instanceof HTMLButtonElement);
    assert.equal(auxiliaryToggleButton.getAttribute('aria-label'), 'Expand editor');
    assert.equal(
      view
        .getElement()
        .querySelector('.editor-topbar .editor-topbar-toggle-editor-btn'),
      null,
    );
  } finally {
    view.dispose();
  }
});

test('WorkbenchLayoutView applies editor topbar leading inset only when sidebars are hidden', () => {
  const props = createWorkbenchLayoutViewProps();
  props.isPrimarySidebarVisible = false;
  props.isAgentSidebarVisible = false;

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const hiddenSidebarsTopbar = view
      .getElement()
      .querySelector('.editor-topbar');
    assert(hiddenSidebarsTopbar instanceof HTMLElement);
    assert.equal(
      hiddenSidebarsTopbar.classList.contains('has-leading-window-controls-inset'),
      true,
    );

    const primaryVisibleProps = {
      ...props,
      isPrimarySidebarVisible: true,
      isAgentSidebarVisible: false,
    };
    view.setProps(materializeWorkbenchLayoutViewProps(primaryVisibleProps));
    const primaryVisibleTopbar = view
      .getElement()
      .querySelector('.editor-topbar');
    assert(primaryVisibleTopbar instanceof HTMLElement);
    assert.equal(
      primaryVisibleTopbar.classList.contains('has-leading-window-controls-inset'),
      false,
    );

    const agentVisibleProps = {
      ...props,
      isPrimarySidebarVisible: false,
      isAgentSidebarVisible: true,
    };
    view.setProps(materializeWorkbenchLayoutViewProps(agentVisibleProps));
    const agentVisibleTopbar = view
      .getElement()
      .querySelector('.editor-topbar');
    assert(agentVisibleTopbar instanceof HTMLElement);
    assert.equal(
      agentVisibleTopbar.classList.contains('has-leading-window-controls-inset'),
      false,
    );
  } finally {
    view.dispose();
  }
});

test('WorkbenchLayoutView switches from content mode to settings mode using dedicated slots', () => {
  const props = createWorkbenchLayoutViewProps();
  props.mode = 'content';
  props.isPrimarySidebarVisible = true;
  props.isAgentSidebarVisible = false;
  props.sidebarTopbarActionsProps = {
    ...props.sidebarTopbarActionsProps,
    isPrimarySidebarVisible: true,
    primarySidebarToggleLabel: 'Hide primary sidebar',
    addressBarLabel: 'Address bar',
    onTogglePrimarySidebar: () => {},
  };
  props.sidebarTopbarActionsElement = createSidebarTopbarActionsElement({
    isPrimarySidebarVisible: true,
    primarySidebarToggleLabel: 'Hide primary sidebar',
    addressBarLabel: 'Address bar',
    onTogglePrimarySidebar: () => {},
  });

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const initialTopbarActionsHost = view
      .getElement()
      .querySelector('.primarybar-topbar .sidebar-topbar-actions-host');
    assert.equal(initialTopbarActionsHost, props.sidebarTopbarActionsElement);
    assert(
      view
        .getElement()
        .querySelector('.primarybar-content .pane-view') instanceof HTMLElement,
    );
    assert(
      view
        .getElement()
        .querySelector('.workbench-content-slot-editor .editor-frame') instanceof HTMLElement,
    );

    const settingsNavigationElement = document.createElement('aside');
    settingsNavigationElement.className = 'settings-navigation';
    settingsNavigationElement.textContent = 'Settings navigation';
    const settingsContentElement = document.createElement('div');
    settingsContentElement.className = 'settings-content';
    settingsContentElement.textContent = 'Settings content';
    const settingsTopbarActionsElement = createSettingsTopbarActionsElement('Back');

    const nextProps = {
      ...props,
      mode: 'settings' as const,
      isPrimarySidebarVisible: true,
      isAgentSidebarVisible: false,
      settingsNavigationElement,
      settingsTopbarActionsElement,
      settingsContentElement,
    };
    view.setProps(materializeWorkbenchLayoutViewProps(nextProps));

    const mountedTopbarActionsHost = view
      .getElement()
      .querySelector('.primarybar-topbar .sidebar-topbar-actions-host');
    assert.equal(mountedTopbarActionsHost, settingsTopbarActionsElement);
    assert.equal(
      view
        .getElement()
        .querySelector('.primarybar-topbar .sidebar-topbar-toggle-btn')
        ?.getAttribute('aria-label'),
      'Back',
    );
    assert.equal(
      view
        .getElement()
        .querySelector('.primarybar-content > .settings-navigation'),
      settingsNavigationElement,
    );
    assert.equal(
      view
        .getElement()
        .querySelector('.primarybar-content .pane-view'),
      null,
    );
    assert.equal(
      view
        .getElement()
        .querySelector('.workbench-content-slot-editor > .settings-content'),
      settingsContentElement,
    );
    assert.equal(
      view
        .getElement()
        .querySelector('.workbench-content-slot-agent .agentbar-panel'),
      null,
    );
    assert.equal(view.getElement().contains(props.sidebarTopbarActionsElement), false);
  } finally {
    view.dispose();
  }
});

test('WorkbenchLayoutView keeps primary width when switching back from settings mode', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.mode = 'content';
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = true;
    props.isEditorCollapsed = false;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    };
    props.sidebarTopbarActionsElement = createSidebarTopbarActionsElement({
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    });

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    animationFrameSpy.flushAll();

    const initialGridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(initialGridView);
    const primarySizeBefore = initialGridView.getViewSize([0]);

    const settingsNavigationElement = document.createElement('aside');
    settingsNavigationElement.className = 'settings-navigation';
    settingsNavigationElement.textContent = 'Settings navigation';
    const settingsContentElement = document.createElement('div');
    settingsContentElement.className = 'settings-content';
    settingsContentElement.textContent = 'Settings content';
    const settingsTopbarActionsElement = createSettingsTopbarActionsElement('Back');

    const settingsProps = {
      ...props,
      mode: 'settings' as const,
      isPrimarySidebarVisible: true,
      isAgentSidebarVisible: false,
      settingsNavigationElement,
      settingsTopbarActionsElement,
      settingsContentElement,
    };
    view.setProps(materializeWorkbenchLayoutViewProps(settingsProps));
    animationFrameSpy.flushAll();

    const backToContentProps = {
      ...props,
      mode: 'content' as const,
      isPrimarySidebarVisible: true,
      isAgentSidebarVisible: true,
      settingsNavigationElement: null,
      settingsTopbarActionsElement: null,
      settingsContentElement: null,
    };
    view.setProps(materializeWorkbenchLayoutViewProps(backToContentProps));
    animationFrameSpy.flushAll();

    const finalGridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(finalGridView);
    assert.equal(finalGridView.getViewSize([0]), primarySizeBefore);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView renders an add dropdown before the collapse action and dispatches create handlers', async () => {
  const calls: string[] = [];
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    onCreateDraftTab: () => calls.push('draft'),
    onCreateBrowserTab: () => calls.push('browser'),
    onCreatePdfTab: () => calls.push('file'),
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const actionButtons = Array.from(
      view.getElement().querySelectorAll('.editor-topbar .actionbar-action'),
    );
    assert.equal(actionButtons.length >= 2, true);
    assert.equal(actionButtons[0]?.classList.contains('editor-topbar-add-btn'), true);
    assert.equal(
      actionButtons[1]?.classList.contains('editor-topbar-toggle-editor-btn'),
      true,
    );

    const addButton = view
      .getElement()
      .querySelector('.editor-topbar .editor-topbar-add-btn');
    assert(addButton instanceof HTMLButtonElement);
    assert.equal(addButton.getAttribute('aria-label'), 'Add');

    for (const [label, expectedCall] of [
      ['Draft', 'draft'],
      ['Browser', 'browser'],
      ['File', 'file'],
    ] as const) {
      addButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const menu = document.body.querySelector('.dropdown-menu');
      assert(menu instanceof HTMLElement);
      assert.equal(menu.getAttribute('data-menu'), 'editor-topbar-add');
      const menuItem = Array.from(menu.querySelectorAll('.dropdown-menu-item')).find(
        (node) => node.textContent?.includes(label),
      );
      assert(menuItem instanceof HTMLElement);
      menuItem.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(calls.at(-1), expectedCall);
    }

    assert.deepEqual(calls, ['draft', 'browser', 'file']);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView add dropdown supports search header filtering', async () => {
  const props = createWorkbenchLayoutViewProps();
  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const addButton = view
      .getElement()
      .querySelector('.editor-topbar .editor-topbar-add-btn');
    assert(addButton instanceof HTMLButtonElement);

    addButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const menu = document.body.querySelector('.dropdown-menu[data-menu=\"editor-topbar-add\"]');
    assert(menu instanceof HTMLElement);
    const searchInput = menu.querySelector('.ls-menu-header .dropdown-menu-search-input .input');
    assert(searchInput instanceof HTMLInputElement);

    searchInput.value = 'bro';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const menuItemLabels = Array.from(
      menu.querySelectorAll('.dropdown-menu-item .dropdown-menu-item-content'),
    ).map((node) => node.textContent?.trim());
    assert.deepEqual(menuItemLabels, ['Browser']);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView renders the browser toolbar below the editor topbar', () => {
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'browser-tab-1',
        kind: 'browser',
        title: 'Example',
        url: 'https://example.com/current',
      },
    ],
    activeTabId: 'browser-tab-1',
    activeTab: {
      id: 'browser-tab-1',
      kind: 'browser',
      title: 'Example',
      url: 'https://example.com/current',
    },
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: 'https://example.com/current',
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const editorFrame = view.getElement().querySelector('.editor-frame');
    assert(editorFrame instanceof HTMLElement);

    const topbar = editorFrame.querySelector('.editor-topbar');
    assert(topbar instanceof HTMLElement);
    const toolbarHost = editorFrame.querySelector(':scope > .editor-toolbar');
    assert(toolbarHost instanceof HTMLElement);
    assert.equal(toolbarHost.hidden, false);
    assert.equal(getEditorFrameSlot(toolbarHost), EDITOR_FRAME_SLOTS.toolbar);
    assert.equal(toolbarHost.dataset.toolbarMode, 'browser');

    const toolbar = editorFrame.querySelector('.editor-toolbar .editor-browser-toolbar');
    assert(toolbar instanceof HTMLElement);
    assert.equal(topbar.nextElementSibling, toolbar.parentElement);

    const leadingButtons = Array.from(
      toolbar.querySelectorAll('.editor-browser-toolbar-leading .editor-browser-toolbar-btn'),
    );
    assert.deepEqual(
      leadingButtons.map((button) => button.getAttribute('aria-label')),
      ['Source menu', 'Back', 'Forward', 'Refresh', 'Favorite'],
    );

    const addressInput = toolbar.querySelector('.editor-browser-toolbar-address-input input');
    assert(addressInput instanceof HTMLInputElement);
    assert.equal(addressInput.getAttribute('aria-label'), 'Address bar');
    assert.equal(addressInput.value, 'https://example.com/current');

    const trailingButtons = Array.from(
      toolbar.querySelectorAll('.editor-browser-toolbar-trailing .editor-browser-toolbar-btn'),
    );
    assert.deepEqual(
      trailingButtons.map((button) => button.getAttribute('aria-label')),
      ['More'],
    );
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView shows browser library panel entries and navigates when a favorite is selected', async () => {
  const BROWSER_LIBRARY_STORAGE_KEY = 'ls.editor.browser.library.v1';
  const addressChanges: string[] = [];
  let navigateCount = 0;
  window.localStorage?.removeItem(BROWSER_LIBRARY_STORAGE_KEY);

  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'browser-tab-history',
        kind: 'browser',
        title: 'Example',
        url: 'https://example.com/current',
      },
    ],
    activeTabId: 'browser-tab-history',
    activeTab: {
      id: 'browser-tab-history',
      kind: 'browser',
      title: 'Example',
      url: 'https://example.com/current',
    },
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: 'https://example.com/current',
      browserPageTitle: 'Example Current Page',
      browserFaviconUrl: 'https://example.com/favicon.ico',
      electronRuntime: true,
      webContentRuntime: true,
    },
    onToolbarAddressChange: (value: string) => {
      addressChanges.push(value);
    },
    onToolbarNavigateToUrl: (value: string) => {
      addressChanges.push(value);
      navigateCount += 1;
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const favoriteButton = view
      .getElement()
      .querySelector('.editor-browser-toolbar-leading [aria-label="Favorite"]');
    assert(favoriteButton instanceof HTMLButtonElement);
    favoriteButton.click();

    const sourcesButton = view
      .getElement()
      .querySelector('.editor-browser-toolbar-leading [aria-label="Source menu"]');
    assert(sourcesButton instanceof HTMLButtonElement);
    sourcesButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = document.body.querySelector('.editor-browser-library-panel');
    assert(panel instanceof HTMLElement);
    assert.equal(panel.classList.contains('is-open'), true);
    assert.equal(
      panel.classList.contains('is-desktop-overlay'),
      true,
    );
    const panelBackdrop = document.body.querySelector(
      '.editor-browser-library-panel-backdrop',
    );
    assert(panelBackdrop instanceof HTMLElement);
    assert.equal(panelBackdrop.classList.contains('is-open'), true);

    const favoriteItems = Array.from(
      panel.querySelectorAll('.editor-browser-library-item.is-favorite'),
    );
    assert.equal(favoriteItems.length, 1);
    const sectionTitles = Array.from(
      panel.querySelectorAll('.editor-browser-library-section-title'),
    );
    assert.deepEqual(sectionTitles.map((node) => node.textContent), ['Favorites']);
    const favoriteFavicon = favoriteItems[0]?.querySelector(
      '.editor-browser-library-item-favicon',
    );
    assert(favoriteFavicon instanceof HTMLElement);
    assert.equal(favoriteFavicon.tagName, 'IMG');
    assert.equal(favoriteFavicon.getAttribute('src'), 'https://example.com/favicon.ico');
    const favoriteTitle = favoriteItems[0]?.querySelector(
      '.editor-browser-library-item-title',
    );
    assert(favoriteTitle instanceof HTMLElement);
    assert.equal(favoriteTitle.textContent, 'Example Current Page');

    const [sourceItem] = favoriteItems;
    assert(sourceItem instanceof HTMLButtonElement);
    sourceItem.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(addressChanges.at(-1), 'https://example.com/current');
    assert.equal(navigateCount, 1);
    assert.equal(panel.classList.contains('is-open'), false);
    assert.equal(
      panel.classList.contains('is-desktop-overlay'),
      true,
    );
    assert.equal(panelBackdrop.classList.contains('is-open'), false);
  } finally {
    view.dispose();
    document.body.replaceChildren();
    window.localStorage?.removeItem(BROWSER_LIBRARY_STORAGE_KEY);
  }
});

test('WorkbenchLayoutView removes a recent browser library entry without triggering navigation', async () => {
  const BROWSER_LIBRARY_STORAGE_KEY = 'ls.editor.browser.library.v1';
  const RECENT_ENTRY_URL = 'https://example.com/recent-delete-target';
  const RECENT_ENTRY_TITLE = 'Recent Delete Target';
  const addressChanges: string[] = [];
  let navigateCount = 0;
  window.localStorage?.removeItem(BROWSER_LIBRARY_STORAGE_KEY);

  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'browser-tab-recent-delete',
        kind: 'browser',
        title: 'Example',
        url: RECENT_ENTRY_URL,
      },
    ],
    activeTabId: 'browser-tab-recent-delete',
    activeTab: {
      id: 'browser-tab-recent-delete',
      kind: 'browser',
      title: 'Example',
      url: RECENT_ENTRY_URL,
    },
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: RECENT_ENTRY_URL,
      browserPageTitle: RECENT_ENTRY_TITLE,
      browserFaviconUrl: 'https://example.com/favicon.ico',
      electronRuntime: true,
      webContentRuntime: true,
    },
    onToolbarAddressChange: (value: string) => {
      addressChanges.push(value);
    },
    onToolbarNavigateToUrl: (value: string) => {
      addressChanges.push(value);
      navigateCount += 1;
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const sourcesButton = view
      .getElement()
      .querySelector('.editor-browser-toolbar-leading [aria-label="Source menu"]');
    assert(sourcesButton instanceof HTMLButtonElement);
    sourcesButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = document.body.querySelector('.editor-browser-library-panel');
    assert(panel instanceof HTMLElement);
    assert.equal(panel.classList.contains('is-open'), true);
    const recentItem = Array.from(
      panel.querySelectorAll('.editor-browser-library-item'),
    ).find((node) => {
      const titleElement = node.querySelector('.editor-browser-library-item-title');
      return titleElement?.textContent === RECENT_ENTRY_TITLE;
    });
    assert(recentItem instanceof HTMLButtonElement);
    const deleteButton = recentItem.parentElement?.querySelector(
      '.editor-browser-library-item-delete-btn',
    );
    assert(deleteButton instanceof HTMLButtonElement);
    deleteButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(navigateCount, 0);
    assert.deepEqual(addressChanges, []);
    const remainingItemTitles = Array.from(
      panel.querySelectorAll('.editor-browser-library-item-title'),
    ).map((node) => node.textContent ?? '');
    assert.equal(remainingItemTitles.includes(RECENT_ENTRY_TITLE), false);
    const serializedState = window.localStorage?.getItem(BROWSER_LIBRARY_STORAGE_KEY);
    assert(serializedState);
    const parsedState = JSON.parse(serializedState) as {
      recentUrls?: string[];
    };
    assert.equal((parsedState.recentUrls ?? []).includes(RECENT_ENTRY_URL), false);
  } finally {
    view.dispose();
    document.body.replaceChildren();
    window.localStorage?.removeItem(BROWSER_LIBRARY_STORAGE_KEY);
  }
});

test('WorkbenchLayoutView keeps browser library titles scoped to each URL across tab-close metadata lag', async () => {
  const BROWSER_LIBRARY_STORAGE_KEY = 'ls.editor.browser.library.v1';
  const tabA = {
    id: 'browser-tab-history-a',
    kind: 'browser' as const,
    title: 'History Page A',
    url: 'https://example.com/history-a',
  };
  const tabB = {
    id: 'browser-tab-history-b',
    kind: 'browser' as const,
    title: 'History Page B',
    url: 'https://example.com/history-b',
  };
  const blankTab = {
    id: 'browser-tab-history-blank',
    kind: 'browser' as const,
    title: '',
    url: 'about:blank',
  };

  window.localStorage?.removeItem(BROWSER_LIBRARY_STORAGE_KEY);

  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [tabA, tabB],
    activeTabId: tabB.id,
    activeTab: tabB,
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: tabB.url,
      browserPageTitle: tabB.title,
      browserFaviconUrl: 'https://example.com/history-b.ico',
      electronRuntime: true,
      webContentRuntime: true,
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    // Simulate a close-transition frame where URL has switched but page title is still stale.
    view.setProps(
      materializeWorkbenchLayoutViewProps({
        ...props,
        editorPartProps: {
          ...props.editorPartProps,
          tabs: [tabA],
          activeTabId: tabA.id,
          activeTab: tabA,
          viewPartProps: {
            ...props.editorPartProps.viewPartProps,
            browserUrl: tabA.url,
            browserPageTitle: tabB.title,
            browserFaviconUrl: 'https://example.com/history-a.ico',
            electronRuntime: true,
            webContentRuntime: true,
          },
        },
      }),
    );

    view.setProps(
      materializeWorkbenchLayoutViewProps({
        ...props,
        editorPartProps: {
          ...props.editorPartProps,
          tabs: [],
          activeTabId: null,
          activeTab: null,
          viewPartProps: {
            ...props.editorPartProps.viewPartProps,
            browserUrl: tabA.url,
            browserPageTitle: tabB.title,
            browserFaviconUrl: '',
            electronRuntime: true,
            webContentRuntime: true,
          },
        },
      }),
    );

    view.setProps(
      materializeWorkbenchLayoutViewProps({
        ...props,
        editorPartProps: {
          ...props.editorPartProps,
          tabs: [blankTab],
          activeTabId: blankTab.id,
          activeTab: blankTab,
          viewPartProps: {
            ...props.editorPartProps.viewPartProps,
            browserUrl: blankTab.url,
            browserPageTitle: '',
            browserFaviconUrl: '',
            electronRuntime: true,
            webContentRuntime: true,
          },
        },
      }),
    );

    const sourcesButton = view
      .getElement()
      .querySelector('.editor-browser-toolbar-leading [aria-label="Source menu"]');
    assert(sourcesButton instanceof HTMLButtonElement);
    sourcesButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = document.body.querySelector('.editor-browser-library-panel');
    assert(panel instanceof HTMLElement);
    const itemTitlesByUrl = new Map(
      Array.from(panel.querySelectorAll('.editor-browser-library-item')).flatMap((node) => {
        if (!(node instanceof HTMLButtonElement)) {
          return [];
        }
        const title = node
          .querySelector('.editor-browser-library-item-title')
          ?.textContent
          ?.trim() ?? '';
        return [[node.title, title] as const];
      }),
    );

    assert.equal(itemTitlesByUrl.get(tabA.url), tabA.title);
    assert.equal(itemTitlesByUrl.get(tabB.url), tabB.title);
  } finally {
    view.dispose();
    document.body.replaceChildren();
    window.localStorage?.removeItem(BROWSER_LIBRARY_STORAGE_KEY);
  }
});

test('WorkbenchLayoutView opens the browser toolbar more menu and dispatches handlers', async () => {
  const calls: string[] = [];
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'browser-tab-1',
        kind: 'browser',
        title: 'Example',
        url: 'https://example.com/current',
      },
    ],
    activeTabId: 'browser-tab-1',
    activeTab: {
      id: 'browser-tab-1',
      kind: 'browser',
      title: 'Example',
      url: 'https://example.com/current',
    },
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: 'https://example.com/current',
      electronRuntime: true,
      webContentRuntime: true,
    },
    onToolbarHardReload: () => {
      calls.push('hardReload');
    },
    onToolbarCopyCurrentUrl: () => {
      calls.push('copy');
    },
    onToolbarClearBrowsingHistory: () => {
      calls.push('clearHistory');
    },
    onToolbarClearCookies: () => {
      calls.push('clearCookies');
    },
    onToolbarClearCache: () => {
      calls.push('clearCache');
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const moreButton = view
      .getElement()
      .querySelector('.editor-browser-toolbar-trailing [aria-label="More"]');
    assert(moreButton instanceof HTMLElement);

    for (const label of [
      ['Hard reload', 'hardReload'],
      ['Copy current URL', 'copy'],
      ['Clear browsing history', 'clearHistory'],
      ['Clear cookies', 'clearCookies'],
      ['Clear cache', 'clearCache'],
    ].map(([entryLabel]) => entryLabel)) {
      moreButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const menu = document.body.querySelector('.dropdown-menu');
      assert(menu instanceof HTMLElement);
      assert.equal(menu.getAttribute('data-menu'), 'editor-browser-toolbar-more');
      const menuItem = Array.from(menu.querySelectorAll('.dropdown-menu-item')).find(
        (node) => node.textContent?.includes(label),
      );
      assert(menuItem instanceof HTMLElement);
      menuItem.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    assert.deepEqual(calls, [
      'hardReload',
      'copy',
      'clearHistory',
      'clearCookies',
      'clearCache',
    ]);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView hides about:blank in the browser toolbar address input', () => {
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'browser-tab-blank',
        kind: 'browser',
        title: '',
        url: 'about:blank',
      },
    ],
    activeTabId: 'browser-tab-blank',
    activeTab: {
      id: 'browser-tab-blank',
      kind: 'browser',
      title: '',
      url: 'about:blank',
    },
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: 'about:blank',
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const addressInput = view.getElement().querySelector(
      '.editor-browser-toolbar-address-input input',
    );
    assert(addressInput instanceof HTMLInputElement);
    assert.equal(addressInput.value, '');
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView syncs focused browser address input when it has not been edited', () => {
  const initialUrl = 'https://example.com/current';
  const updatedUrl = 'https://example.com/next';
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'browser-tab-sync',
        kind: 'browser',
        title: 'Example',
        url: initialUrl,
      },
    ],
    activeTabId: 'browser-tab-sync',
    activeTab: {
      id: 'browser-tab-sync',
      kind: 'browser',
      title: 'Example',
      url: initialUrl,
    },
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: initialUrl,
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const initialAddressInput = view.getElement().querySelector(
      '.editor-browser-toolbar-address-input input',
    );
    assert(initialAddressInput instanceof HTMLInputElement);
    assert.equal(initialAddressInput.value, initialUrl);
    initialAddressInput.focus();

    view.setProps(
      materializeWorkbenchLayoutViewProps({
        ...props,
        editorPartProps: {
          ...props.editorPartProps,
          tabs: [
            {
              id: 'browser-tab-sync',
              kind: 'browser',
              title: 'Example',
              url: updatedUrl,
            },
          ],
          activeTabId: 'browser-tab-sync',
          activeTab: {
            id: 'browser-tab-sync',
            kind: 'browser',
            title: 'Example',
            url: updatedUrl,
          },
          viewPartProps: {
            ...props.editorPartProps.viewPartProps,
            browserUrl: updatedUrl,
          },
        },
      }),
    );

    const updatedAddressInput = view.getElement().querySelector(
      '.editor-browser-toolbar-address-input input',
    );
    assert(updatedAddressInput instanceof HTMLInputElement);
    assert.equal(updatedAddressInput.value, updatedUrl);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView keeps typed browser address input while focused during onChange rerenders', () => {
  const pastedUrl = 'https://example.com/pasted';
  let latestAddressValue = '';
  let view: ReturnType<typeof createWorkbenchLayoutView> | null = null;
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'browser-tab-blank',
        kind: 'browser',
        title: '',
        url: 'about:blank',
      },
    ],
    activeTabId: 'browser-tab-blank',
    activeTab: {
      id: 'browser-tab-blank',
      kind: 'browser',
      title: '',
      url: 'about:blank',
    },
    viewPartProps: {
      ...props.editorPartProps.viewPartProps,
      browserUrl: 'about:blank',
    },
    onToolbarAddressChange: (value: string) => {
      latestAddressValue = value;
      if (!view) {
        return;
      }

      view.setProps(
        materializeWorkbenchLayoutViewProps({
          ...props,
          editorPartProps: {
            ...props.editorPartProps,
            viewPartProps: {
              ...props.editorPartProps.viewPartProps,
              browserUrl: 'about:blank',
            },
          },
        }),
      );
    },
  };

  view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const addressInput = view.getElement().querySelector(
      '.editor-browser-toolbar-address-input input',
    );
    assert(addressInput instanceof HTMLInputElement);

    addressInput.focus();
    addressInput.value = pastedUrl;
    addressInput.dispatchEvent(new Event('input', { bubbles: true }));

    assert.equal(latestAddressValue, pastedUrl);
    assert.equal(addressInput.value, pastedUrl);

    addressInput.blur();
    assert.equal(addressInput.value, '');
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView shows the active-tab toolbar for draft tabs and pdf tabs', () => {
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'draft-tab-1',
        kind: 'draft',
        title: 'Draft',
        document: createEmptyWritingEditorDocument(),
        viewMode: 'draft',
      },
    ],
    activeTabId: 'draft-tab-1',
    activeTab: {
      id: 'draft-tab-1',
      kind: 'draft',
      title: 'Draft',
      document: createEmptyWritingEditorDocument(),
      viewMode: 'draft',
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const toolbarHost = view.getElement().querySelector('.editor-frame > .editor-toolbar');
    assert(toolbarHost instanceof HTMLElement);
    assert.equal(toolbarHost.hidden, false);
    assert.equal(toolbarHost.dataset.toolbarMode, 'draft');
    const contentHost = view.getElement().querySelector('.editor-frame > .editor-content');
    assert(contentHost instanceof HTMLElement);
    assert.equal(getEditorFrameSlot(contentHost), EDITOR_FRAME_SLOTS.content);
    assert.equal(
      view.getElement().querySelector('.editor-toolbar .editor-browser-toolbar'),
      null,
    );
    const draftToolbar = view.getElement().querySelector('.editor-toolbar .editor-draft-toolbar');
    assert(draftToolbar instanceof HTMLElement);

    const nextProps = {
      ...props,
      editorPartProps: {
        ...props.editorPartProps,
        tabs: [
          {
            id: 'pdf-tab-1',
            kind: 'pdf',
            title: 'Paper.pdf',
            url: 'https://example.com/paper.pdf',
          },
        ],
        activeTabId: 'pdf-tab-1',
        activeTab: {
          id: 'pdf-tab-1',
          kind: 'pdf',
          title: 'Paper.pdf',
          url: 'https://example.com/paper.pdf',
        },
      },
    };
    view.setProps(materializeWorkbenchLayoutViewProps(nextProps));

    const pdfToolbar = view.getElement().querySelector('.editor-toolbar .editor-pdf-toolbar');
    assert.equal(toolbarHost.hidden, false);
    assert.equal(toolbarHost.dataset.toolbarMode, 'pdf');
    assert(pdfToolbar instanceof HTMLElement);
    assert.equal(
      view.getElement().querySelector('.editor-toolbar .editor-draft-toolbar'),
      null,
    );
    assert.match(pdfToolbar.textContent ?? '', /PDF toolbar coming soon/i);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView mounts the draft editor content hierarchy inside editor-frame', () => {
  const props = createWorkbenchLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    tabs: [
      {
        id: 'draft-tab-1',
        kind: 'draft',
        title: 'Draft',
        document: createEmptyWritingEditorDocument(),
        viewMode: 'draft',
      },
    ],
    activeTabId: 'draft-tab-1',
    activeTab: {
      id: 'draft-tab-1',
      kind: 'draft',
      title: 'Draft',
      document: createEmptyWritingEditorDocument(),
      viewMode: 'draft',
    },
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const editorFrame = view.getElement().querySelector('.editor-frame');
    assert(editorFrame instanceof HTMLElement);
    assert.deepEqual(
      Array.from(editorFrame.children).map((child) =>
        getEditorFrameSlot(child as HTMLElement) ?? '',
      ),
      [
        EDITOR_FRAME_SLOTS.topbar,
        EDITOR_FRAME_SLOTS.toolbar,
        EDITOR_FRAME_SLOTS.content,
      ],
    );

    const editorContent = editorFrame.querySelector(':scope > .editor-content.is-mode-draft');
    assert(editorContent instanceof HTMLElement);

    const draftPane = editorContent.querySelector(':scope > .editor-draft-pane');
    assert(draftPane instanceof HTMLElement);

    const proseMirrorSurface = draftPane.querySelector(':scope > .pm-editor-surface');
    assert(proseMirrorSurface instanceof HTMLElement);

    const proseMirrorRoot = proseMirrorSurface.querySelector('.ProseMirror');
    assert(proseMirrorRoot instanceof HTMLElement);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchLayoutView mounts the editor collapse action into agentbar topbar even when the primary sidebar is visible', () => {
  const props = createWorkbenchLayoutViewProps();
  props.isPrimarySidebarVisible = true;
  props.isAgentSidebarVisible = true;
  props.sidebarTopbarActionsProps = {
    ...props.sidebarTopbarActionsProps,
    isPrimarySidebarVisible: true,
    primarySidebarToggleLabel: 'Hide primary sidebar',
    addressBarLabel: 'Address bar',
    onTogglePrimarySidebar: () => {},
  };

  const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
  document.body.append(view.getElement());

  try {
    const editorToggleButton = view
      .getElement()
      .querySelector('.editor-topbar .editor-topbar-toggle-editor-btn');
    assert(editorToggleButton instanceof HTMLButtonElement);
    assert.equal(editorToggleButton.getAttribute('aria-label'), 'Collapse editor');

    editorToggleButton.click();
    view.setProps(materializeWorkbenchLayoutViewProps(syncRawPropsWithLayoutState(props)));

    const auxiliaryToggleButton = view
      .getElement()
      .querySelector('.agentbar-topbar .editor-topbar-toggle-editor-btn');
    assert(auxiliaryToggleButton instanceof HTMLButtonElement);
    assert.equal(auxiliaryToggleButton.getAttribute('aria-label'), 'Expand editor');
    assert(
      view
        .getElement()
        .querySelector('.primarybar-topbar .sidebar-topbar-actions-host')
        instanceof HTMLElement,
    );
    assert.equal(
      view
        .getElement()
        .querySelector('.primarybar-topbar .editor-topbar-toggle-editor-btn'),
      null,
    );
  } finally {
    view.dispose();
  }
});

test('WorkbenchLayoutView keeps primary width fixed and expands agentbar when the editor is collapsed', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = true;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    };

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    animationFrameSpy.flushAll();

    const gridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(gridView);

    const primarySizeBefore = gridView.getViewSize([0]);
    const agentSizeBefore = gridView.getViewSize([1]);

    const editorToggleButton = view
      .getElement()
      .querySelector('.editor-topbar .editor-topbar-toggle-editor-btn');
    assert(editorToggleButton instanceof HTMLButtonElement);
    editorToggleButton.click();
    view.setProps(materializeWorkbenchLayoutViewProps(syncRawPropsWithLayoutState(props)));
    animationFrameSpy.flushAll();

    const nextGridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(nextGridView);

    assert.equal(nextGridView.getViewSize([0]), primarySizeBefore);
    assert(nextGridView.getViewSize([1]) > agentSizeBefore);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView keeps editor width fixed and expands agentbar when the primary sidebar is hidden', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = true;
    props.isEditorCollapsed = false;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    };

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    animationFrameSpy.flushAll();

    const gridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(gridView);

    const editorSizeBefore = gridView.getViewSize([2]);
    const agentSizeBefore = gridView.getViewSize([1]);

    props.isPrimarySidebarVisible = false;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: false,
      primarySidebarToggleLabel: 'Show primary sidebar',
    };
    props.sidebarTopbarActionsElement = createSidebarTopbarActionsElement({
      isPrimarySidebarVisible: false,
      primarySidebarToggleLabel: 'Show primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    });
    view.setProps(materializeWorkbenchLayoutViewProps(props));
    animationFrameSpy.flushAll();

    const nextGridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(nextGridView);

    assert.equal(nextGridView.getViewSize([2]), editorSizeBefore);
    assert(nextGridView.getViewSize([1]) > agentSizeBefore);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView clamps sidebar sizes with content layout orientation instead of window orientation', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(WORKBENCH_CONTENT_LAYOUT_BREAKPOINT + 320);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = true;

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(
      view,
      WORKBENCH_CONTENT_LAYOUT_BREAKPOINT - 80,
      720,
    );
    document.body.append(view.getElement());
    animationFrameSpy.flushAll();

    setWorkbenchSidebarSizes({
      primarySidebarSize: 0,
      agentSidebarSize: 0,
    });
    syncRawPropsWithLayoutState(props);

    assert.equal(props.primarySidebarSize, 160);
    assert.equal(props.agentSidebarSize, 160);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView measures the pre-toggle editor size before the first animation frame when agentbar becomes visible', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = false;
    props.isEditorCollapsed = false;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    };

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());

    props.isAgentSidebarVisible = true;
    view.setProps(materializeWorkbenchLayoutViewProps(props));
    animationFrameSpy.flushAll();

    const gridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(gridView);

    const editorSize = gridView.getViewSize([2]);
    const agentSize = gridView.getViewSize([1]);
    assert(editorSize > props.expandedEditorSize);
    assert(editorSize > agentSize);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView keeps primary width fixed when agentbar becomes visible in collapsed mode', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = false;
    props.isEditorCollapsed = true;
    props.expandedEditorSize = 600;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    };

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    animationFrameSpy.flushAll();

    const gridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(gridView);

    props.isAgentSidebarVisible = true;
    view.setProps(materializeWorkbenchLayoutViewProps(props));
    animationFrameSpy.flushAll();

    const nextGridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(nextGridView);

    assert.equal(nextGridView.getViewSize([0]), props.primarySidebarSize);
    assert(nextGridView.getViewSize([1]) > props.agentSidebarSize);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView keeps primary width fixed and expands editor when agentbar becomes hidden', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = true;
    props.isEditorCollapsed = false;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    };

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    animationFrameSpy.flushAll();

    const gridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(gridView);

    const primarySizeBefore = gridView.getViewSize([0]);
    const editorSizeBefore = gridView.getViewSize([2]);

    props.isAgentSidebarVisible = false;
    view.setProps(materializeWorkbenchLayoutViewProps(props));
    animationFrameSpy.flushAll();

    const nextGridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(nextGridView);

    assert.equal(nextGridView.getViewSize([0]), primarySizeBefore);
    assert(nextGridView.getViewSize([2]) > editorSizeBefore);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView auto-expands editor when agentbar is hidden from collapsed mode', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = true;
    props.isEditorCollapsed = true;
    props.expandedEditorSize = 600;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      addressBarLabel: 'Address bar',
      onTogglePrimarySidebar: () => {},
    };

    const view = createWorkbenchLayoutView(materializeWorkbenchLayoutViewProps(props));
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    animationFrameSpy.flushAll();

    const gridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(gridView);

    const primarySizeBefore = gridView.getViewSize([0]);

    setAgentSidebarVisible(false);
    syncRawPropsWithLayoutState(props);
    assert.equal(props.isAgentSidebarVisible, false);
    assert.equal(props.isEditorCollapsed, false);
    view.setProps(materializeWorkbenchLayoutViewProps(props));
    animationFrameSpy.flushAll();

    const nextGridView = (view as unknown as {
      gridView: {
        getViewSize: (location: readonly number[]) => number;
      } | null;
    }).gridView;
    assert(nextGridView);

    assert.equal(nextGridView.getViewSize([0]), primarySizeBefore);
    assert(nextGridView.getViewSize([2]) > 0);

    view.dispose();
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView dispose cancels a pending layout animation frame', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const view = createWorkbenchLayoutView(
      materializeWorkbenchLayoutViewProps(createWorkbenchLayoutViewProps()),
    );
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    const layoutAnimationFrame = (view as unknown as {
      layoutAnimationFrame: { value: unknown };
    }).layoutAnimationFrame;
    const canceledHandleCountBeforeDispose =
      animationFrameSpy.getCanceledHandles().length;
    assert(layoutAnimationFrame.value);

    view.dispose();

    assert.equal(layoutAnimationFrame.value, undefined);
    assert(
      animationFrameSpy.getCanceledHandles().length > canceledHandleCountBeforeDispose,
    );
    assert.equal(view.getElement().childElementCount, 0);
  } finally {
    animationFrameSpy.restore();
  }
});

test('WorkbenchLayoutView dispose disconnects its resize observer', () => {
  const resizeObserverSpy = installResizeObserverSpy();
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const view = createWorkbenchLayoutView(
      materializeWorkbenchLayoutViewProps(createWorkbenchLayoutViewProps()),
    );
    const observerIndex = resizeObserverSpy.getInstanceCount() - 1;
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    const resizeObserverState = (view as unknown as {
      resizeObserver: { value: unknown };
    }).resizeObserver;
    assert(resizeObserverState.value);
    assert.equal(resizeObserverSpy.isObserving(observerIndex), true);

    view.dispose();

    assert.equal(resizeObserverState.value, undefined);
    assert.equal(resizeObserverSpy.isObserving(observerIndex), false);
    assert.equal(resizeObserverSpy.wasDisconnected(observerIndex), true);
  } finally {
    animationFrameSpy.restore();
    resizeObserverSpy.restore();
  }
});

test('WorkbenchLayoutView falls back to a disposable window resize listener without ResizeObserver', () => {
  const previousResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  const animationFrameSpy = installAnimationFrameSpy();
  const addedResizeListeners: EventListenerOrEventListenerObject[] = [];
  const removedResizeListeners: EventListenerOrEventListenerObject[] = [];
  const originalAddEventListener = window.addEventListener.bind(window);
  const originalRemoveEventListener = window.removeEventListener.bind(window);

  Reflect.deleteProperty(globalThis, 'ResizeObserver');
  window.addEventListener = ((...args: Parameters<typeof window.addEventListener>) => {
    const [type, listener] = args;
    if (type === 'resize') {
      addedResizeListeners.push(listener);
    }
    return originalAddEventListener(...args);
  }) as typeof window.addEventListener;
  window.removeEventListener = ((...args: Parameters<typeof window.removeEventListener>) => {
    const [type, listener] = args;
    if (type === 'resize') {
      removedResizeListeners.push(listener);
    }
    return originalRemoveEventListener(...args);
  }) as typeof window.removeEventListener;
  setWindowInnerWidth(1280);

  try {
    const view = createWorkbenchLayoutView(
      materializeWorkbenchLayoutViewProps(createWorkbenchLayoutViewProps()),
    );
    bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());
    const handleWindowResize = (view as unknown as {
      handleWindowResize: EventListenerOrEventListenerObject;
    }).handleWindowResize;

    assert.equal(
      addedResizeListeners.filter((listener) => listener === handleWindowResize).length,
      1,
    );

    view.dispose();

    assert.equal(
      removedResizeListeners.filter((listener) => listener === handleWindowResize).length,
      1,
    );
  } finally {
    animationFrameSpy.restore();
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    if (previousResizeObserver) {
      Object.defineProperty(globalThis, 'ResizeObserver', previousResizeObserver);
    } else {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    }
  }
});

test('WorkbenchLayoutView replaces grid event subscriptions when the split orientation changes', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const view = createWorkbenchLayoutView(
      materializeWorkbenchLayoutViewProps(createWorkbenchLayoutViewProps()),
    );
    const size = bindWorkbenchContentSize(view, 1280, 720);
    document.body.append(view.getElement());

    const firstGridView = (view as unknown as {
      gridView: Record<string, unknown> | null;
    }).gridView;
    assert(firstGridView);
    assert.equal(getEventEmitterListenerCount(firstGridView, 'onDidSashSnapEmitter'), 1);
    assert.equal(getEventEmitterListenerCount(firstGridView, 'onDidSashEndEmitter'), 1);

    size.setSize(720, 720);
    view.layout();

    const secondGridView = (view as unknown as {
      gridView: Record<string, unknown> | null;
    }).gridView;
    assert(secondGridView);
    assert.notEqual(secondGridView, firstGridView);
    assert.equal(getEventEmitterListenerCount(firstGridView, 'onDidSashSnapEmitter'), 0);
    assert.equal(getEventEmitterListenerCount(firstGridView, 'onDidSashEndEmitter'), 0);
    assert.equal(getEventEmitterListenerCount(secondGridView, 'onDidSashSnapEmitter'), 1);
    assert.equal(getEventEmitterListenerCount(secondGridView, 'onDidSashEndEmitter'), 1);

    view.dispose();
    assert.equal(getEventEmitterListenerCount(secondGridView, 'onDidSashSnapEmitter'), 0);
    assert.equal(getEventEmitterListenerCount(secondGridView, 'onDidSashEndEmitter'), 0);
    animationFrameSpy.flushAll();
  } finally {
    animationFrameSpy.restore();
  }
});
