import type { LocaleMessages } from 'language/locales';
import { normalizeUrl } from 'ls/workbench/common/url';
import {
  EMPTY_BROWSER_TAB_URL,
  toEditorTabInput,
} from 'ls/workbench/browser/parts/editor/editorInput';
import { createWebContentSurfaceSnapshot, resolveContentSourceUrl } from 'ls/workbench/browser/webContentSurfaceState';
import type { WebContentSurfaceSnapshot } from 'ls/workbench/browser/webContentSurfaceState';
import {
  createDirtyDraftTabIdSet,
  isReusableEmptyBrowserTab,
  isReusableEmptyDraftTab,
} from 'ls/workbench/browser/parts/editor/editorTabPolicy';

import { preparePdfDownload } from 'ls/workbench/services/document/documentActionService';
import { createEditorModel } from 'ls/workbench/browser/parts/editor/editorModel';
import type { EditorModelSnapshot, EditorWorkspaceTab, WritingEditorDocument } from 'ls/workbench/browser/parts/editor/editorModel';

import {
  showWorkbenchSaveConfirmModal,
  showWorkbenchTextInputModal,
} from 'ls/workbench/browser/workbenchEditorModals';
import type { ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';
import type { EditorPartBaseProps } from 'ls/workbench/browser/parts/editor/editorPartView';
import type { EditorViewStateKey } from 'ls/workbench/browser/parts/editor/editorViewStateStore';
import type { SerializedEditorViewStateEntry } from 'ls/workbench/browser/parts/editor/editorViewStateStore';

export type EditorPartState = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  groupId: string;
  tabs: EditorWorkspaceTab[];
  dirtyDraftTabIds: readonly string[];
  activeTabId: string | null;
  activeTab: EditorWorkspaceTab | null;
  viewStateEntries: SerializedEditorViewStateEntry[];
};

export type EditorPartActions = {
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => Promise<boolean>;
  onCloseOtherTabs: (tabId: string) => Promise<boolean>;
  onCloseAllTabs: () => Promise<boolean>;
  onRenameTab: (tabId: string) => void | Promise<void>;
  onCreateDraftTab: () => void;
  onCreateBrowserTab: () => void;
  onOpenBrowserPane: () => void;
  onCreatePdfTab: () => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onSetEditorViewState: (key: EditorViewStateKey, state: unknown) => void;
  onDeleteEditorViewState: (key: EditorViewStateKey) => void;
};

export type EditorPartControllerContext = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  browserUrl: string;
  webUrl: string;
};

export type EditorPartControllerSnapshot = Pick<
  EditorModelSnapshot,
  | 'groupId'
  | 'tabs'
  | 'dirtyDraftTabIds'
  | 'activeTabId'
  | 'activeTab'
  | 'viewStateEntries'
> & {
  draftBody: string;
  webContentSurfaceSnapshot: WebContentSurfaceSnapshot;
  editorPartProps: EditorPartBaseProps;
};

export type EditorPartModel = EditorPartController;
export type EditorPartChangeReason = 'structure' | 'context';

type CreateEditorPartPropsParams = {
  state: EditorPartState;
  actions: EditorPartActions;
};

function toStructuralWorkspaceTab(tab: EditorWorkspaceTab) {
  return toEditorTabInput(tab);
}

function createEditorPartStructureKey(snapshot: EditorPartControllerSnapshot) {
  return JSON.stringify({
    groupId: snapshot.groupId,
    tabs: snapshot.tabs.map(toStructuralWorkspaceTab),
    dirtyDraftTabIds: [...snapshot.dirtyDraftTabIds].sort(),
    activeTabId: snapshot.activeTabId,
    activeTab: snapshot.activeTab ? toStructuralWorkspaceTab(snapshot.activeTab) : null,
    webContentSurfaceSnapshot: snapshot.webContentSurfaceSnapshot,
  });
}

export function createEditorPartProps({
  state: {
    ui,
    viewPartProps,
    groupId,
    tabs,
    dirtyDraftTabIds,
    activeTabId,
    activeTab,
    viewStateEntries,
  },
  actions: {
    onActivateTab,
    onCloseTab,
    onCloseOtherTabs,
    onCloseAllTabs,
    onRenameTab,
    onCreateDraftTab,
    onCreateBrowserTab,
    onOpenBrowserPane,
    onCreatePdfTab,
    onDraftDocumentChange,
    onSetEditorViewState,
    onDeleteEditorViewState,
  },
}: CreateEditorPartPropsParams): EditorPartBaseProps {
  return {
    labels: {
      topbarAddAction: ui.editorTopbarAddAction,
      createDraft: ui.editorCreateDraft,
      createBrowser: ui.editorCreateBrowser,
      createFile: ui.editorCreateFile,
      toolbarSources: ui.agentbarToolbarSources,
      toolbarBack: ui.titlebarBack,
      toolbarForward: ui.titlebarForward,
      toolbarRefresh: ui.titlebarRefresh,
      toolbarFavorite: ui.agentbarToolbarFavorite,
      toolbarMore: ui.agentbarToolbarMore,
      toolbarHardReload: ui.editorToolbarHardReload,
      toolbarCopyCurrentUrl: ui.editorToolbarCopyCurrentUrl,
      toolbarClearBrowsingHistory: ui.editorToolbarClearBrowsingHistory,
      toolbarClearCookies: ui.editorToolbarClearCookies,
      toolbarClearCache: ui.editorToolbarClearCache,
      toolbarAddressBar: ui.agentbarToolbarAddressBar,
      toolbarAddressPlaceholder: ui.editorToolbarAddressPlaceholder,
      browserLibraryPanelTitle: ui.agentbarToolbarSources,
      browserLibraryPanelRecentTitle: ui.editorToolbarSourcesRecent,
      browserLibraryPanelFavoritesTitle: ui.editorToolbarSourcesFavorites,
      browserLibraryPanelEmptyState: ui.editorToolbarSourcesEmpty,
      draftMode: ui.editorDraftMode,
      sourceMode: ui.editorSourceMode,
      pdfMode: ui.editorPdfMode,
      close: ui.toastClose,
      closeOthers: ui.editorTabContextCloseOthers,
      closeAll: ui.editorTabContextCloseAll,
      rename: ui.editorTabContextRename,
      expandEditor: ui.editorExpand,
      collapseEditor: ui.editorCollapse,
      emptyWorkspaceTitle: ui.editorEmptyWorkspaceTitle,
      emptyWorkspaceBody: ui.editorEmptyWorkspaceBody,
      draftBodyPlaceholder: ui.editorDraftBodyPlaceholder,
      pdfTitle: ui.editorPdfTitle,
      renameTabTitle: ui.editorTabRenameTitle,
      renameTabLabel: ui.editorTabRenameLabel,
      status: {
        statusbarAriaLabel: ui.editorStatusbarAriaLabel,
        words: ui.editorStatusWords,
        characters: ui.editorStatusCharacters,
        paragraphs: ui.editorStatusParagraphs,
        selection: ui.editorStatusSelection,
        block: ui.editorStatusBlock,
        line: ui.editorStatusLine,
        column: ui.editorStatusColumn,
        url: ui.editorStatusUrl,
        blockFigure: ui.editorStatusFigure,
        ready: ui.statusReady,
      },
      textGroup: ui.editorRibbonText,
      formatGroup: ui.editorRibbonFormat,
      insertGroup: ui.editorRibbonInsert,
      historyGroup: ui.editorRibbonHistory,
      paragraph: ui.editorParagraph,
      heading1: ui.editorHeading1,
      heading2: ui.editorHeading2,
      heading3: ui.editorHeading3,
      bold: ui.editorBold,
      italic: ui.editorItalic,
      underline: ui.editorUnderline,
      fontFamily: ui.editorFontFamily,
      fontSize: ui.editorFontSize,
      defaultTextStyle: ui.editorDefaultTextStyle,
      alignLeft: ui.editorAlignLeft,
      alignCenter: ui.editorAlignCenter,
      alignRight: ui.editorAlignRight,
      clearInlineStyles: ui.editorClearInlineStyles,
      bulletList: ui.editorBulletList,
      orderedList: ui.editorOrderedList,
      blockquote: ui.editorBlockquote,
      undo: ui.editorUndo,
      redo: ui.editorRedo,
      insertCitation: ui.editorInsertCitation,
      insertFigure: ui.editorInsertFigure,
      insertFigureRef: ui.editorInsertFigureRef,
      citationPrompt: ui.editorCitationPrompt,
      figureUrlPrompt: ui.editorFigureUrlPrompt,
      figureCaptionPrompt: ui.editorFigureCaptionPrompt,
      figureRefPrompt: ui.editorFigureRefPrompt,
      fontFamilyPrompt: ui.editorFontFamilyPrompt,
      fontSizePrompt: ui.editorFontSizePrompt,
    },
    viewPartProps,
    groupId,
    tabs,
    dirtyDraftTabIds,
    activeTabId,
    activeTab,
    viewStateEntries,
    onActivateTab,
    onCloseTab,
    onCloseOtherTabs,
    onCloseAllTabs,
    onRenameTab,
    onCreateDraftTab,
    onCreateBrowserTab,
    onOpenBrowserPane,
    onCreatePdfTab,
    onDraftDocumentChange,
    onSetEditorViewState,
    onDeleteEditorViewState,
    showTopbarActions: true,
    showTopbarToolbar: true,
    isEditorCollapsed: false,
    onToggleEditorCollapse: () => {},
  };
}

function looksLikePdfUrl(url: string) {
  const normalized = url.trim().toLowerCase();
  return (
    normalized.includes('.pdf') ||
    normalized.includes('/pdf') ||
    normalized.includes('format=pdf') ||
    normalized.includes('download=pdf')
  );
}

function createEditorPartControllerSnapshot(
  context: EditorPartControllerContext,
  editorModel: ReturnType<typeof createEditorModel>,
  actions: EditorPartActions,
): EditorPartControllerSnapshot {
  const editorSnapshot = editorModel.getSnapshot();
  const { ui, viewPartProps } = context;
  const {
    groupId,
    tabs,
    dirtyDraftTabIds,
    activeTabId,
    activeTab,
    viewStateEntries,
  } = editorSnapshot;
  const draftBody = editorModel.getDraftBody();
  const webContentSurfaceSnapshot = createWebContentSurfaceSnapshot(activeTab);

  return {
    groupId,
    tabs,
    dirtyDraftTabIds,
    activeTabId,
    activeTab,
    viewStateEntries,
    draftBody,
    webContentSurfaceSnapshot,
    editorPartProps: createEditorPartProps({
      state: {
        ui,
        viewPartProps,
        groupId,
        tabs,
        dirtyDraftTabIds,
        activeTabId,
        activeTab,
        viewStateEntries,
      },
      actions,
    }),
  };
}

function areEditorPartControllerContextsEqual(
  previous: EditorPartControllerContext,
  next: EditorPartControllerContext,
) {
  return (
    previous.ui === next.ui &&
    previous.browserUrl === next.browserUrl &&
    previous.webUrl === next.webUrl &&
    previous.viewPartProps.browserUrl === next.viewPartProps.browserUrl &&
    (previous.viewPartProps.browserFaviconUrl ?? '') ===
      (next.viewPartProps.browserFaviconUrl ?? '') &&
    previous.viewPartProps.electronRuntime === next.viewPartProps.electronRuntime &&
    previous.viewPartProps.webContentRuntime === next.viewPartProps.webContentRuntime &&
    previous.viewPartProps.labels.emptyState === next.viewPartProps.labels.emptyState &&
    previous.viewPartProps.labels.contentUnavailable ===
      next.viewPartProps.labels.contentUnavailable
  );
}

export class EditorPartController {
  private context: EditorPartControllerContext;
  private readonly editorModel = createEditorModel();
  private snapshot: EditorPartControllerSnapshot;
  private closeOperationQueue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<
    (reason: EditorPartChangeReason) => void
  >();
  private readonly actions: EditorPartActions;
  private readonly unsubscribeWritingModel: () => void;

  constructor(context: EditorPartControllerContext) {
    this.context = context;
    this.actions = {
      onActivateTab: this.onActivateTab,
      onCloseTab: this.onCloseTab,
      onCloseOtherTabs: this.onCloseOtherTabs,
      onCloseAllTabs: this.onCloseAllTabs,
      onRenameTab: this.onRenameTab,
      onCreateDraftTab: this.createDraftTab,
      onCreateBrowserTab: this.handleCreateBrowserTab,
      onOpenBrowserPane: this.handleOpenBrowserPane,
      onCreatePdfTab: this.handleCreatePdfTab,
      onDraftDocumentChange: this.setDraftDocument,
      onSetEditorViewState: this.setEditorViewState,
      onDeleteEditorViewState: this.deleteEditorViewState,
    };
    this.snapshot = createEditorPartControllerSnapshot(
      this.context,
      this.editorModel,
      this.actions,
    );
    this.unsubscribeWritingModel = this.editorModel.subscribe(() => {
      this.refreshSnapshot('model');
    });
  }

  readonly subscribe = (listener: (reason: EditorPartChangeReason) => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setContext = (context: EditorPartControllerContext) => {
    if (areEditorPartControllerContextsEqual(this.context, context)) {
      return;
    }

    this.context = context;
    this.refreshSnapshot('context');
  };

  readonly dispose = () => {
    this.unsubscribeWritingModel();
    this.editorModel.dispose();
    this.listeners.clear();
  };

  readonly createDraftTab = () => {
    this.createOrRevealEmptyDraftTab();
  };

  readonly createBrowserTab = (url: string) => {
    this.editorModel.createBrowserTab(url);
  };

  readonly openBrowserPane = () => {
    this.createOrRevealEmptyBrowserTab();
  };

  private readonly createOrRevealEmptyDraftTab = () => {
    const { activeTab, tabs, dirtyDraftTabIds } = this.editorModel.getSnapshot();
    const dirtyDraftTabIdSet = createDirtyDraftTabIdSet(dirtyDraftTabIds);
    // Keep the fixed draft entry lightweight: reuse the blank clean draft first.
    const existingEmptyDraftTab = isReusableEmptyDraftTab(
      activeTab,
      dirtyDraftTabIdSet,
    )
      ? activeTab
      : tabs.find((tab) =>
          isReusableEmptyDraftTab(tab, dirtyDraftTabIdSet),
        ) ?? null;
    if (existingEmptyDraftTab) {
      this.editorModel.activateTab(existingEmptyDraftTab.id);
      return existingEmptyDraftTab.id;
    }

    this.editorModel.createDraftTab();
    return this.editorModel.getSnapshot().activeTabId;
  };

  private readonly createOrRevealEmptyBrowserTab = () => {
    const { activeTab, tabs } = this.editorModel.getSnapshot();
    // Mirror draft behavior for browser mode: reveal the existing about:blank tab before creating one.
    const existingEmptyBrowserTab = isReusableEmptyBrowserTab(activeTab)
      ? activeTab
      : tabs.find((tab) => isReusableEmptyBrowserTab(tab)) ?? null;
    if (existingEmptyBrowserTab) {
      this.editorModel.activateTab(existingEmptyBrowserTab.id);
      return existingEmptyBrowserTab.id;
    }

    this.editorModel.createBrowserTab(EMPTY_BROWSER_TAB_URL);
    return this.editorModel.getSnapshot().activeTabId;
  };

  private readonly handleOpenBrowserPane = () => {
    this.openBrowserPane();
  };

  readonly createPdfTab = (url: string) => {
    this.editorModel.createPdfTab(url);
  };

  readonly canSaveActiveDraft = () => this.editorModel.canSaveActiveDraft();

  readonly saveActiveDraft = () => this.editorModel.saveActiveDraft();

  readonly updateActiveContentTabUrl = (url: string) => {
    this.editorModel.updateActiveContentTabUrl(url);
  };

  readonly updateActiveBrowserTabPageTitle = (
    pageTitle: string,
    previousPageTitle?: string,
  ) => {
    this.editorModel.updateActiveBrowserTabPageTitle(pageTitle, previousPageTitle);
  };

  readonly getDraftBody = () => this.editorModel.getDraftBody();
  readonly getDraftDocument = () => this.editorModel.getDraftDocument();
  readonly setDraftDocument = (value: WritingEditorDocument) => {
    this.editorModel.setDraftDocument(value);
  };
  readonly setEditorViewState = (
    key: EditorViewStateKey,
    state: unknown,
  ) => {
    this.editorModel.setEditorViewState(key, state);
  };
  readonly deleteEditorViewState = (key: EditorViewStateKey) => {
    this.editorModel.deleteEditorViewState(key);
  };

  readonly onActivateTab = (tabId: string) => {
    this.editorModel.activateTab(tabId);
  };

  readonly onCloseTab = (tabId: string) =>
    this.enqueueCloseOperation(async () => {
      if (!this.hasTab(tabId)) {
        return false;
      }

      const didConfirm = await this.confirmCloseForTabIds([tabId]);
      if (!didConfirm) {
        return false;
      }

      this.editorModel.closeTab(tabId);
      return true;
    });

  readonly onCloseOtherTabs = (tabId: string) =>
    this.enqueueCloseOperation(async () => {
      if (!this.hasTab(tabId)) {
        return false;
      }

      const tabsToClose = this.editorModel
        .getSnapshot()
        .tabs.filter((tab) => tab.id !== tabId)
        .map((tab) => tab.id);
      const didConfirm = await this.confirmCloseForTabIds(tabsToClose);
      if (!didConfirm) {
        return false;
      }

      this.editorModel.closeOtherTabs(tabId);
      return true;
    });

  readonly onCloseAllTabs = () =>
    this.enqueueCloseOperation(async () => {
      const tabsToClose = this.editorModel.getSnapshot().tabs.map((tab) => tab.id);
      const didConfirm = await this.confirmCloseForTabIds(tabsToClose);
      if (!didConfirm) {
        return false;
      }

      this.editorModel.closeAllTabs();
      return true;
    });

  readonly onRenameTab = async (tabId: string) => {
    const targetTab = this.editorModel
      .getSnapshot()
      .tabs.find((tab) => tab.id === tabId);
    if (!targetTab) {
      return;
    }

    const { ui } = this.context;
    const nextTitle =
      (await showWorkbenchTextInputModal({
        title: ui.editorTabRenameTitle,
        label: ui.editorTabRenameLabel,
        defaultValue: targetTab.title.trim(),
        ui,
      })) ?? '';
    if (!nextTitle) {
      return;
    }

    this.editorModel.renameTab(tabId, nextTitle);
  };

  private readonly handleCreatePdfTab = async () => {
    const { browserUrl, webUrl, ui } = this.context;
    const { webContentSurfaceSnapshot } = this.snapshot;
    const seedUrl = resolveContentSourceUrl(
      webContentSurfaceSnapshot,
      browserUrl,
      webUrl,
    );
    const preparedPdfDownload = seedUrl ? preparePdfDownload(seedUrl) : null;
    const defaultPdfUrl = preparedPdfDownload?.preferredPdfUrl ?? '';
    const shouldPromptForUrl =
      !defaultPdfUrl ||
      (preparedPdfDownload?.normalizedSourceUrl === defaultPdfUrl &&
        !looksLikePdfUrl(defaultPdfUrl));
    const nextInput = shouldPromptForUrl
      ? (await showWorkbenchTextInputModal({
          title: ui.editorPdfTitle,
          label: ui.editorPdfUrlPrompt,
          defaultValue: defaultPdfUrl || 'https://',
          ui,
        })) ?? ''
      : defaultPdfUrl;
    const normalizedPdfUrl = normalizeUrl(nextInput);
    if (!normalizedPdfUrl) {
      return;
    }

    this.editorModel.createPdfTab(normalizedPdfUrl);
  };

  private readonly handleCreateBrowserTab = () => {
    this.createOrRevealEmptyBrowserTab();
  };

  private readonly confirmCloseForTabIds = async (tabIds: readonly string[]) => {
    if (tabIds.length === 0) {
      return true;
    }

    const dirtyDraftTabIds = this.editorModel.getDirtyDraftTabIds(tabIds);
    if (dirtyDraftTabIds.length === 0) {
      return true;
    }

    const { ui } = this.context;
    const dirtyTabs = this.editorModel
      .getSnapshot()
      .tabs.filter(
        (tab): tab is Extract<EditorWorkspaceTab, { kind: 'draft' }> =>
          tab.kind === 'draft' && dirtyDraftTabIds.includes(tab.id),
      );
    const firstDirtyTitle =
      dirtyTabs[0]?.title.trim() || ui.editorDraftMode;
    const confirmation = await showWorkbenchSaveConfirmModal({
      title: ui.editorUnsavedChangesTitle,
      message:
        dirtyDraftTabIds.length === 1
          ? ui.editorUnsavedChangesMessageSingle.replace('{title}', firstDirtyTitle)
          : ui.editorUnsavedChangesMessageMultiple.replace(
              '{count}',
              String(dirtyDraftTabIds.length),
            ),
      saveLabel: ui.editorUnsavedChangesSave,
      discardLabel: ui.editorUnsavedChangesDiscard,
      cancelLabel: ui.editorModalCancel,
      closeLabel: ui.toastClose,
    });

    switch (confirmation) {
      case 'save':
        for (const dirtyTabId of dirtyDraftTabIds) {
          this.editorModel.saveDraftTab(dirtyTabId);
        }
        return true;
      case 'discard':
        return true;
      case 'cancel':
      default:
        return false;
    }
  };

  private hasTab(tabId: string) {
    return this.editorModel
      .getSnapshot()
      .tabs.some((tab) => tab.id === tabId);
  }

  private enqueueCloseOperation<T>(operation: () => Promise<T>) {
    const scheduledOperation = this.closeOperationQueue.then(
      operation,
      operation,
    );
    this.closeOperationQueue = scheduledOperation.then(
      () => undefined,
      () => undefined,
    );
    return scheduledOperation;
  }

  private emitChange(reason: EditorPartChangeReason) {
    for (const listener of this.listeners) {
      listener(reason);
    }
  }

  private refreshSnapshot(reason: 'model' | 'context') {
    this.setSnapshot(
      createEditorPartControllerSnapshot(
        this.context,
        this.editorModel,
        this.actions,
      ),
      reason,
    );
  }

  private setSnapshot(
    nextSnapshot: EditorPartControllerSnapshot,
    reason: 'model' | 'context',
  ) {
    if (Object.is(this.snapshot, nextSnapshot)) {
      return;
    }

    const previousSnapshot = this.snapshot;
    this.snapshot = nextSnapshot;

    if (
      reason === 'model' &&
      createEditorPartStructureKey(previousSnapshot) ===
        createEditorPartStructureKey(nextSnapshot)
    ) {
      return;
    }

    this.emitChange(reason === 'context' ? 'context' : 'structure');
  }
}

export function createEditorPartController(
  context: EditorPartControllerContext,
) {
  return new EditorPartController(context);
}
