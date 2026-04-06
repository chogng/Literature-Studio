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
let createWorkbenchContentLayoutView: typeof import('ls/workbench/browser/workbenchContentLayoutView').createWorkbenchContentLayoutView;
let SidebarTopbarActionsView: typeof import('ls/workbench/browser/parts/sidebar/sidebarTopbarActions').SidebarTopbarActionsView;
let PrimaryBarFooterActionsView: typeof import('ls/workbench/browser/parts/primarybar/primarybarFooterActions').PrimaryBarFooterActionsView;

function createSidebarTopbarActionsElement(props: {
  isPrimarySidebarVisible: boolean;
  primarySidebarToggleLabel: string;
  commandPaletteLabel: string;
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
  view: ReturnType<typeof createWorkbenchContentLayoutView>,
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

function createWorkbenchContentLayoutViewProps() {
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
    emptyAllQuickSourceAction: 'Quick source',
    emptyAllConnector: 'or',
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
    isPrimarySidebarVisible: false,
    isAgentSidebarVisible: false,
    isLayoutEdgeSnappingEnabled: false,
    primarySidebarSize: 320,
    agentSidebarSize: 360,
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
      commandPaletteLabel: 'Quick access',
      onTogglePrimarySidebar: () => {},
    },
    sidebarTopbarActionsElement: createSidebarTopbarActionsElement({
      isPrimarySidebarVisible: false,
      primarySidebarToggleLabel: 'Show primary sidebar',
      commandPaletteLabel: 'Quick access',
      onTogglePrimarySidebar: () => {},
    }),
    primaryBarFooterActionsElement: createPrimaryBarFooterActionsElement({
      accountLabel: 'Account',
      settingsLabel: 'Settings',
    }),
    editorTopbarAuxiliaryActionsElement: auxiliaryEditorTopbarActionsElement,
    editorPartProps: {
      labels: {
        topbarAddAction: 'Add',
        createWrite: 'Write',
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
      onDraftDocumentChange: () => {},
      onSetEditorViewState: () => {},
      onDeleteEditorViewState: () => {},
    },
  } as unknown as Parameters<typeof createWorkbenchContentLayoutView>[0];
}

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createWorkbenchContentLayoutView } = await import('ls/workbench/browser/workbenchContentLayoutView'));
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

test('WorkbenchContentLayoutView mounts primary topbar actions into auxiliary topbar when the primary sidebar is hidden', () => {
  const props = createWorkbenchContentLayoutViewProps();
  props.isPrimarySidebarVisible = true;
  props.isAgentSidebarVisible = true;
  props.sidebarTopbarActionsProps = {
    ...props.sidebarTopbarActionsProps,
    isPrimarySidebarVisible: true,
    primarySidebarToggleLabel: 'Hide primary sidebar',
    commandPaletteLabel: 'Quick access',
    onTogglePrimarySidebar: () => {},
  };

  const view = createWorkbenchContentLayoutView(props);
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

    view.setProps({
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
        commandPaletteLabel: 'Quick access',
        onTogglePrimarySidebar: () => {},
      }),
    });

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

test('WorkbenchContentLayoutView mounts the editor collapse action into auxiliary topbar when the editor is collapsed', () => {
  const props = createWorkbenchContentLayoutViewProps();
  props.isPrimarySidebarVisible = false;
  props.isAgentSidebarVisible = true;
  props.sidebarTopbarActionsProps = {
    ...props.sidebarTopbarActionsProps,
    isPrimarySidebarVisible: false,
    primarySidebarToggleLabel: 'Show primary sidebar',
    commandPaletteLabel: 'Quick access',
    onTogglePrimarySidebar: () => {},
  };

  const view = createWorkbenchContentLayoutView(props);
  document.body.append(view.getElement());

  try {
    const editorToggleButton = view
      .getElement()
      .querySelector('.editor-topbar .editor-topbar-toggle-editor-btn');
    assert(editorToggleButton instanceof HTMLButtonElement);
    assert.equal(editorToggleButton.getAttribute('aria-label'), 'Collapse editor');

    editorToggleButton.click();

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

test('WorkbenchContentLayoutView renders an add dropdown before the collapse action and dispatches create handlers', async () => {
  const calls: string[] = [];
  const props = createWorkbenchContentLayoutViewProps();
  props.editorPartProps = {
    ...props.editorPartProps,
    onCreateDraftTab: () => calls.push('write'),
    onCreateBrowserTab: () => calls.push('browser'),
    onCreatePdfTab: () => calls.push('file'),
  };

  const view = createWorkbenchContentLayoutView(props);
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
      ['Write', 'write'],
      ['Browser', 'browser'],
      ['File', 'file'],
    ] as const) {
      addButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const menu = document.body.querySelector('.dropdown-menu');
      assert(menu instanceof HTMLElement);
      const menuItem = Array.from(menu.querySelectorAll('.dropdown-menu-item')).find(
        (node) => node.textContent?.includes(label),
      );
      assert(menuItem instanceof HTMLElement);
      menuItem.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(calls.at(-1), expectedCall);
    }

    assert.deepEqual(calls, ['write', 'browser', 'file']);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchContentLayoutView renders the browser toolbar below the editor topbar', () => {
  const props = createWorkbenchContentLayoutViewProps();
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

  const view = createWorkbenchContentLayoutView(props);
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

test('WorkbenchContentLayoutView opens the browser toolbar more menu and dispatches handlers', async () => {
  const calls: string[] = [];
  const props = createWorkbenchContentLayoutViewProps();
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

  const view = createWorkbenchContentLayoutView(props);
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

test('WorkbenchContentLayoutView hides about:blank in the browser toolbar address input', () => {
  const props = createWorkbenchContentLayoutViewProps();
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

  const view = createWorkbenchContentLayoutView(props);
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

test('WorkbenchContentLayoutView hides the top toolbar for draft tabs and shows a placeholder toolbar for pdf tabs', () => {
  const props = createWorkbenchContentLayoutViewProps();
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

  const view = createWorkbenchContentLayoutView(props);
  document.body.append(view.getElement());

  try {
    const toolbarHost = view.getElement().querySelector('.editor-frame > .editor-toolbar');
    assert(toolbarHost instanceof HTMLElement);
    assert.equal(toolbarHost.hidden, true);
    const contentHost = view.getElement().querySelector('.editor-frame > .editor-content');
    assert(contentHost instanceof HTMLElement);
    assert.equal(getEditorFrameSlot(contentHost), EDITOR_FRAME_SLOTS.content);
    assert.equal(
      view.getElement().querySelector('.editor-toolbar .editor-browser-toolbar'),
      null,
    );
    assert.equal(
      view.getElement().querySelector('.editor-toolbar .editor-pdf-toolbar'),
      null,
    );

    view.setProps({
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
    });

    const pdfToolbar = view.getElement().querySelector('.editor-toolbar .editor-pdf-toolbar');
    assert.equal(toolbarHost.hidden, false);
    assert(pdfToolbar instanceof HTMLElement);
    assert.match(pdfToolbar.textContent ?? '', /PDF toolbar coming soon/i);
  } finally {
    view.dispose();
    document.body.replaceChildren();
  }
});

test('WorkbenchContentLayoutView mounts the draft editor content hierarchy inside editor-frame', () => {
  const props = createWorkbenchContentLayoutViewProps();
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

  const view = createWorkbenchContentLayoutView(props);
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

test('WorkbenchContentLayoutView mounts the editor collapse action into agentbar topbar even when the primary sidebar is visible', () => {
  const props = createWorkbenchContentLayoutViewProps();
  props.isPrimarySidebarVisible = true;
  props.isAgentSidebarVisible = true;
  props.sidebarTopbarActionsProps = {
    ...props.sidebarTopbarActionsProps,
    isPrimarySidebarVisible: true,
    primarySidebarToggleLabel: 'Hide primary sidebar',
    commandPaletteLabel: 'Quick access',
    onTogglePrimarySidebar: () => {},
  };

  const view = createWorkbenchContentLayoutView(props);
  document.body.append(view.getElement());

  try {
    const editorToggleButton = view
      .getElement()
      .querySelector('.editor-topbar .editor-topbar-toggle-editor-btn');
    assert(editorToggleButton instanceof HTMLButtonElement);
    assert.equal(editorToggleButton.getAttribute('aria-label'), 'Collapse editor');

    editorToggleButton.click();

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

test('WorkbenchContentLayoutView keeps primary width fixed and expands agentbar when the editor is collapsed', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const props = createWorkbenchContentLayoutViewProps();
    props.isPrimarySidebarVisible = true;
    props.isAgentSidebarVisible = true;
    props.primarySidebarSize = 320;
    props.agentSidebarSize = 360;
    props.sidebarTopbarActionsProps = {
      ...props.sidebarTopbarActionsProps,
      isPrimarySidebarVisible: true,
      primarySidebarToggleLabel: 'Hide primary sidebar',
      commandPaletteLabel: 'Quick access',
      onTogglePrimarySidebar: () => {},
    };

    const view = createWorkbenchContentLayoutView(props);
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

test('WorkbenchContentLayoutView dispose cancels a pending layout animation frame', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const view = createWorkbenchContentLayoutView(createWorkbenchContentLayoutViewProps());
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

test('WorkbenchContentLayoutView dispose disconnects its resize observer', () => {
  const resizeObserverSpy = installResizeObserverSpy();
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const observerIndex = resizeObserverSpy.getInstanceCount();
    const view = createWorkbenchContentLayoutView(createWorkbenchContentLayoutViewProps());
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

test('WorkbenchContentLayoutView falls back to a disposable window resize listener without ResizeObserver', () => {
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
    const view = createWorkbenchContentLayoutView(createWorkbenchContentLayoutViewProps());
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

test('WorkbenchContentLayoutView replaces grid event subscriptions when the split orientation changes', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const view = createWorkbenchContentLayoutView(createWorkbenchContentLayoutViewProps());
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
