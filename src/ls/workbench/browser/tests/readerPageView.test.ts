import assert from 'node:assert/strict';
import test, { after, afterEach, before } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let createReaderPageView: typeof import('ls/workbench/browser/readerPageView').createReaderPageView;
let resolveLeadingGroupPaneSizes: typeof import('ls/workbench/browser/readerLayoutSizing').resolveLeadingGroupPaneSizes;

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

function bindReaderLayoutSize(
  view: ReturnType<typeof createReaderPageView>,
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

function createReaderPageViewProps() {
  return {
    isFetchSidebarVisible: false,
    isPrimarySidebarVisible: false,
    isAuxiliarySidebarVisible: false,
    isLayoutEdgeSnappingEnabled: false,
    fetchSidebarSize: 280,
    primarySidebarSize: 320,
    auxiliarySidebarSize: 360,
    secondarySidebarProps: {
      articles: [],
      hasData: false,
      locale: 'en',
      labels: {
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
      },
      batchStartDate: '',
      onBatchStartDateChange: () => {},
      batchEndDate: '',
      onBatchEndDateChange: () => {},
      onFetchLatestBatch: () => {},
      onDownloadPdf: async () => {},
      onOpenArticleDetails: () => {},
      isBatchLoading: false,
      isSelectionModeEnabled: false,
      selectionModePhase: 'off',
      selectedArticleKeys: new Set<string>(),
      onToggleSelectionMode: () => {},
      onToggleArticleSelected: () => {},
    },
    primaryBarProps: {
      labels: {
        libraryAction: 'Refresh library',
        pdfDownloadAction: 'Download pdf',
        writingAction: 'Create draft',
        empty: 'No library data',
        documents: 'Documents',
        files: 'Files',
        queuedJobs: 'Queued jobs',
        dbFile: 'DB file',
        filesDir: 'Files dir',
        cacheDir: 'Cache dir',
        statusRegistered: 'Registered',
        statusQueued: 'Queued',
        statusRunning: 'Running',
        statusFailed: 'Failed',
        contextRename: 'Rename',
        contextEditSourceUrl: 'Edit source',
        contextDelete: 'Delete',
      },
      librarySnapshot: {
        documents: [],
        filesCount: 0,
        queueCount: 0,
        dbFilePath: '',
        filesDirectoryPath: '',
        cacheDirectoryPath: '',
      },
      isLibraryLoading: false,
    },
    auxiliarySidebarProps: {
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
      onCloseAuxiliarySidebar: () => {},
      onSelectLlmModel: () => {},
      onOpenModelSettings: () => {},
    },
    editorPartProps: {
      labels: {
        draftMode: 'Draft',
        sourceMode: 'Source',
        pdfMode: 'PDF',
        close: 'Close',
        emptyWorkspaceTitle: 'Empty workspace',
        emptyWorkspaceBody: 'Create a draft to start.',
        draftBodyPlaceholder: 'Start writing',
        sourceTitle: 'Source',
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
      tabs: [],
      activeTabId: null,
      activeTab: null,
      onActivateTab: () => {},
      onCloseTab: () => {},
      onCreateDraftTab: () => {},
      onCreatePdfTab: () => {},
      onDraftDocumentChange: () => {},
    },
  } as unknown as Parameters<typeof createReaderPageView>[0];
}

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createReaderPageView } = await import('ls/workbench/browser/readerPageView'));
  ({ resolveLeadingGroupPaneSizes } = await import('ls/workbench/browser/readerLayoutSizing'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

afterEach(() => {
  document.body.replaceChildren();
});

test('leading group growth keeps primary bar width and expands secondary sidebar', () => {
  const sizes = resolveLeadingGroupPaneSizes({
    totalSize: 660,
    isFetchSidebarVisible: true,
    isPrimarySidebarVisible: true,
    primarySidebarSize: 320,
    fetchSidebarConstraints: {
      minimum: 248,
      maximum: 420,
    },
    primarySidebarConstraints: {
      minimum: 280,
      maximum: 420,
    },
  });

  assert.deepEqual(sizes, {
    fetchSize: 330,
    primarySize: 320,
  });
});

test('leading group resolves the actual primary size under tighter active constraints', () => {
  const sizes = resolveLeadingGroupPaneSizes({
    totalSize: 660,
    isFetchSidebarVisible: true,
    isPrimarySidebarVisible: true,
    primarySidebarSize: 420,
    fetchSidebarConstraints: {
      minimum: 140,
      maximum: 320,
    },
    primarySidebarConstraints: {
      minimum: 160,
      maximum: 360,
    },
  });

  assert.deepEqual(sizes, {
    fetchSize: 290,
    primarySize: 360,
  });
});

test('ReaderPageView dispose cancels a pending layout animation frame', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const view = createReaderPageView(createReaderPageViewProps());
    bindReaderLayoutSize(view, 1280, 720);
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

test('ReaderPageView dispose disconnects its resize observer', () => {
  const resizeObserverSpy = installResizeObserverSpy();
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const observerIndex = resizeObserverSpy.getInstanceCount();
    const view = createReaderPageView(createReaderPageViewProps());
    bindReaderLayoutSize(view, 1280, 720);
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

test('ReaderPageView falls back to a disposable window resize listener without ResizeObserver', () => {
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
    const view = createReaderPageView(createReaderPageViewProps());
    bindReaderLayoutSize(view, 1280, 720);
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

test('ReaderPageView replaces grid event subscriptions when the split orientation changes', () => {
  const animationFrameSpy = installAnimationFrameSpy();
  setWindowInnerWidth(1280);

  try {
    const view = createReaderPageView(createReaderPageViewProps());
    const size = bindReaderLayoutSize(view, 1280, 720);
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
