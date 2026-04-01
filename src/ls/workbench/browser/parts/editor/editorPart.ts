import type { LocaleMessages } from '../../../../../language/locales';
import { normalizeUrl } from '../../../common/url';
import {
  createWebContentSurfaceSnapshot,
  resolveContentSourceUrl,
  type WebContentSurfaceSnapshot,
} from '../../webContentSurfaceState';
import { preparePdfDownload } from '../../../services/document/documentActionService';
import {
  createWritingEditorModel,
  type WritingEditorDocument,
  type WritingEditorModelSnapshot,
  type WritingWorkspaceTab,
} from '../../writingEditorModel';
import { showWorkbenchTextInputModal } from '../../workbenchEditorModals';
import type { ViewPartProps } from '../views/viewPartView';
import type { EditorPartProps } from './editorPartView';

export type EditorPartState = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
};

export type EditorPartActions = {
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateDraftTab: () => void;
  onCreatePdfTab: () => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
};

export type EditorPartControllerContext = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  browserUrl: string;
  webUrl: string;
};

export type EditorPartControllerSnapshot = Pick<
  WritingEditorModelSnapshot,
  'tabs' | 'activeTabId' | 'activeTab' | 'draftBody'
> & {
  webContentSurfaceSnapshot: WebContentSurfaceSnapshot;
  editorPartProps: EditorPartProps;
};

export type EditorPartModel = EditorPartController;
export type EditorPartChangeReason = 'structure' | 'draftContent' | 'context';

type CreateEditorPartPropsParams = {
  state: EditorPartState;
  actions: EditorPartActions;
};

function toStructuralWorkspaceTab(tab: WritingWorkspaceTab) {
  if (tab.kind === 'draft') {
    return {
      id: tab.id,
      kind: tab.kind,
      title: tab.title,
      viewMode: tab.viewMode,
    };
  }

  return {
    id: tab.id,
    kind: tab.kind,
    title: tab.title,
    url: tab.url,
  };
}

function createEditorPartStructureKey(snapshot: EditorPartControllerSnapshot) {
  return JSON.stringify({
    tabs: snapshot.tabs.map(toStructuralWorkspaceTab),
    activeTabId: snapshot.activeTabId,
    activeTab: snapshot.activeTab ? toStructuralWorkspaceTab(snapshot.activeTab) : null,
    webContentSurfaceSnapshot: snapshot.webContentSurfaceSnapshot,
  });
}

export function createEditorPartProps({
  state: {
    ui,
    viewPartProps,
    tabs,
    activeTabId,
    activeTab,
  },
  actions: {
    onActivateTab,
    onCloseTab,
    onCreateDraftTab,
    onCreatePdfTab,
    onDraftDocumentChange,
  },
}: CreateEditorPartPropsParams): EditorPartProps {
  return {
    labels: {
      draftMode: ui.editorDraftMode,
      sourceMode: ui.editorSourceMode,
      pdfMode: ui.editorPdfMode,
      close: ui.toastClose,
      emptyWorkspaceTitle: ui.editorEmptyWorkspaceTitle,
      emptyWorkspaceBody: ui.editorEmptyWorkspaceBody,
      draftBodyPlaceholder: ui.editorDraftBodyPlaceholder,
      sourceTitle: ui.editorSourceTitle,
      pdfTitle: ui.editorPdfTitle,
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
    },
    viewPartProps,
    tabs,
    activeTabId,
    activeTab,
    onActivateTab,
    onCloseTab,
    onCreateDraftTab,
    onCreatePdfTab,
    onDraftDocumentChange,
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
  writingSnapshot: WritingEditorModelSnapshot,
  actions: EditorPartActions,
): EditorPartControllerSnapshot {
  const { ui, viewPartProps } = context;
  const { tabs, activeTabId, activeTab, draftBody } = writingSnapshot;
  const webContentSurfaceSnapshot = createWebContentSurfaceSnapshot(activeTab);

  return {
    tabs,
    activeTabId,
    activeTab,
    draftBody,
    webContentSurfaceSnapshot,
    editorPartProps: createEditorPartProps({
      state: {
        ui,
        viewPartProps,
        tabs,
        activeTabId,
        activeTab,
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
    previous.viewPartProps.electronRuntime === next.viewPartProps.electronRuntime &&
    previous.viewPartProps.webContentRuntime === next.viewPartProps.webContentRuntime &&
    previous.viewPartProps.labels.emptyState === next.viewPartProps.labels.emptyState &&
    previous.viewPartProps.labels.contentUnavailable ===
      next.viewPartProps.labels.contentUnavailable
  );
}

export class EditorPartController {
  private context: EditorPartControllerContext;
  private readonly writingEditorModel = createWritingEditorModel();
  private snapshot: EditorPartControllerSnapshot;
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
      onCreateDraftTab: this.createDraftTab,
      onCreatePdfTab: this.handleCreatePdfTab,
      onDraftDocumentChange: this.setDraftDocument,
    };
    this.snapshot = createEditorPartControllerSnapshot(
      this.context,
      this.writingEditorModel.getSnapshot(),
      this.actions,
    );
    this.unsubscribeWritingModel = this.writingEditorModel.subscribe(() => {
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
    this.writingEditorModel.dispose();
    this.listeners.clear();
  };

  readonly createDraftTab = () => {
    this.writingEditorModel.createDraftTab();
  };

  readonly createWebTab = (url: string) => {
    this.writingEditorModel.createWebTab(url);
  };

  readonly createPdfTab = (url: string) => {
    this.writingEditorModel.createPdfTab(url);
  };

  readonly updateActiveContentTabUrl = (url: string) => {
    this.writingEditorModel.updateActiveContentTabUrl(url);
  };

  private readonly setDraftDocument = (value: WritingEditorDocument) => {
    this.writingEditorModel.setDraftDocument(value);
  };

  readonly onActivateTab = (tabId: string) => {
    this.writingEditorModel.activateTab(tabId);
  };

  readonly onCloseTab = (tabId: string) => {
    this.writingEditorModel.closeTab(tabId);
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

    this.writingEditorModel.createPdfTab(normalizedPdfUrl);
  };

  private emitChange(reason: EditorPartChangeReason) {
    for (const listener of this.listeners) {
      listener(reason);
    }
  }

  private refreshSnapshot(reason: 'model' | 'context') {
    this.setSnapshot(
      createEditorPartControllerSnapshot(
        this.context,
        this.writingEditorModel.getSnapshot(),
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
      this.emitChange('draftContent');
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
