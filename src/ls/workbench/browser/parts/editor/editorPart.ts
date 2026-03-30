import type { LocaleMessages } from '../../../../../language/locales';
import { normalizeUrl } from '../../../common/url';
import {
  createPreviewSurfaceSnapshot,
  resolvePreviewSourceUrl,
  type PreviewSurfaceSnapshot,
} from '../../previewSurfaceState';
import { preparePdfDownload } from '../../../services/document/documentActionService';
import {
  createWritingEditorModel,
  type WritingEditorDocument,
  type WritingEditorModelSnapshot,
  type WritingWorkspaceTab,
} from '../../writingEditorModel';
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
  previewSurfaceSnapshot: PreviewSurfaceSnapshot;
  editorPartProps: EditorPartProps;
};

export type EditorPartModel = EditorPartController;

type CreateEditorPartPropsParams = {
  state: EditorPartState;
  actions: EditorPartActions;
};

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
  const previewSurfaceSnapshot = createPreviewSurfaceSnapshot(activeTab);

  return {
    tabs,
    activeTabId,
    activeTab,
    draftBody,
    previewSurfaceSnapshot,
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

export class EditorPartController {
  private context: EditorPartControllerContext;
  private readonly writingEditorModel = createWritingEditorModel();
  private snapshot: EditorPartControllerSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly actions: EditorPartActions;
  private readonly unsubscribeWritingModel: () => void;

  constructor(context: EditorPartControllerContext) {
    this.context = context;
    this.actions = {
      onActivateTab: this.activateTab,
      onCloseTab: this.closeTab,
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
      this.refreshSnapshot();
    });
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setContext = (context: EditorPartControllerContext) => {
    this.context = context;
    this.refreshSnapshot();
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

  readonly updateActivePreviewTabUrl = (url: string) => {
    this.writingEditorModel.updateActivePreviewTabUrl(url);
  };

  private readonly setDraftDocument = (value: WritingEditorDocument) => {
    this.writingEditorModel.setDraftDocument(value);
  };

  private readonly activateTab = (tabId: string) => {
    this.writingEditorModel.activateTab(tabId);
  };

  private readonly closeTab = (tabId: string) => {
    this.writingEditorModel.closeTab(tabId);
  };

  private readonly handleCreatePdfTab = () => {
    const { browserUrl, webUrl, ui } = this.context;
    const { previewSurfaceSnapshot } = this.snapshot;
    const seedUrl = resolvePreviewSourceUrl(
      previewSurfaceSnapshot,
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
      ? window.prompt(ui.editorPdfUrlPrompt, defaultPdfUrl || 'https://') ?? ''
      : defaultPdfUrl;
    const normalizedPdfUrl = normalizeUrl(nextInput);
    if (!normalizedPdfUrl) {
      return;
    }

    this.writingEditorModel.createPdfTab(normalizedPdfUrl);
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private refreshSnapshot() {
    this.setSnapshot(
      createEditorPartControllerSnapshot(
        this.context,
        this.writingEditorModel.getSnapshot(),
        this.actions,
      ),
    );
  }

  private setSnapshot(nextSnapshot: EditorPartControllerSnapshot) {
    if (Object.is(this.snapshot, nextSnapshot)) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.emitChange();
  }
}

export function createEditorPartController(
  context: EditorPartControllerContext,
) {
  return new EditorPartController(context);
}
