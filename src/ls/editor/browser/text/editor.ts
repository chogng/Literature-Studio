import { EditorState } from 'prosemirror-state';
import { baseKeymap } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { EditorView } from 'prosemirror-view';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import {
  createDraftEditorRuntimeState,
  type DraftEditorRuntimeState,
} from '../shared/editorStatus';
import {
  type InsertFigurePayload,
  getWritingEditorToolbarState,
  insertCitationCommand,
  insertFigureCommand,
  insertFigureRefCommand,
  insertPlainTextCommand,
  redoCommand,
  runWritingEditorCommand,
  setParagraphCommand,
  toggleBlockquoteCommand,
  toggleBoldCommand,
  toggleBulletListCommand,
  toggleHeadingCommand,
  toggleItalicCommand,
  toggleOrderedListCommand,
  undoCommand,
  type WritingEditorCommand,
  type WritingEditorToolbarState,
} from './commands';
import {
  type WritingEditorDocument,
  normalizeWritingEditorDocument,
  syncWritingEditorDerivedLabels,
} from '../../common/writingEditorDocument';
import {
  createWritingEditorDocumentIdentityPlugin,
  createWritingEditorInputRules,
  createWritingEditorPlaceholderPlugin,
  updateWritingEditorPlaceholder,
  writingEditorSchema,
} from './schema';
import { DraftEditorToolbar } from './toolbar';
import { WritingEditorInputSession } from './input';
import { resolveWritingEditorSurfaceSyncPlan } from './sync';
import './media/editor.css';

export type WritingEditorSurfaceLabels = {
  textGroup: string;
  formatGroup: string;
  insertGroup: string;
  historyGroup: string;
  paragraph: string;
  heading1: string;
  heading2: string;
  heading3: string;
  bold: string;
  italic: string;
  bulletList: string;
  orderedList: string;
  blockquote: string;
  undo: string;
  redo: string;
  insertCitation: string;
  insertFigure: string;
  insertFigureRef: string;
  citationPrompt: string;
  figureUrlPrompt: string;
  figureCaptionPrompt: string;
  figureRefPrompt: string;
};

export type WritingEditorSurfaceHandle = {
  focus: () => void;
  insertPlainText: (text: string) => boolean;
  insertCitation: (citationIds: string[]) => boolean;
  insertFigure: (payload: InsertFigurePayload) => boolean;
  insertFigureRef: (targetId: string) => boolean;
  getAvailableFigureIds: () => readonly string[];
};

type WritingEditorSurfaceStatusLabels = {
  blockFigure: string;
};

export type WritingEditorSurfaceProps = {
  document: WritingEditorDocument;
  placeholder: string;
  labels: WritingEditorSurfaceLabels;
  statusLabels: WritingEditorSurfaceStatusLabels;
  onInsertCitation: () => void;
  onInsertFigure: () => void;
  onInsertFigureRef: (availableFigureIds: readonly string[]) => void;
  onDocumentChange: (document: WritingEditorDocument) => void;
  onStatusChange?: (status: DraftEditorRuntimeState) => void;
};

type WritingEditorSurfaceSnapshot = {
  toolbarState: WritingEditorToolbarState;
};

const EMPTY_TOOLBAR_STATE: WritingEditorToolbarState = {
  isParagraphActive: true,
  activeHeadingLevel: null,
  isBoldActive: false,
  isItalicActive: false,
  isBulletListActive: false,
  isOrderedListActive: false,
  isBlockquoteActive: false,
  canUndo: false,
  canRedo: false,
  availableFigureIds: [],
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

function createWritingEditorState(document: WritingEditorDocument, placeholder: string) {
  const listItemType = writingEditorSchema.nodes.list_item;

  return EditorState.create({
    schema: writingEditorSchema,
    doc: writingEditorSchema.nodeFromJSON(normalizeWritingEditorDocument(document)),
    plugins: [
      createWritingEditorDocumentIdentityPlugin(),
      createWritingEditorInputRules(),
      history(),
      keymap({
        'Mod-z': undoCommand(),
        'Shift-Mod-z': redoCommand(),
        'Mod-y': redoCommand(),
        'Mod-b': toggleBoldCommand(),
        'Mod-i': toggleItalicCommand(),
        'Mod-Alt-0': setParagraphCommand(),
        'Mod-Alt-1': toggleHeadingCommand(1),
        'Mod-Alt-2': toggleHeadingCommand(2),
        'Mod-Alt-3': toggleHeadingCommand(3),
        'Mod-Shift-7': toggleOrderedListCommand(),
        'Mod-Shift-8': toggleBulletListCommand(),
        Enter: splitListItem(listItemType),
        Tab: sinkListItem(listItemType),
        'Shift-Tab': liftListItem(listItemType),
      }),
      keymap(baseKeymap),
      gapCursor(),
      dropCursor(),
      createWritingEditorPlaceholderPlugin(placeholder),
    ],
  });
}

function createNormalizedDocumentKey(document: WritingEditorDocument) {
  return JSON.stringify(normalizeWritingEditorDocument(document));
}

function areStringArraysEqual(previous: readonly string[], next: readonly string[]) {
  return (
    previous.length === next.length &&
    previous.every((value, index) => value === next[index])
  );
}

function areToolbarStatesEqual(
  previous: WritingEditorToolbarState,
  next: WritingEditorToolbarState,
) {
  return (
    previous.isParagraphActive === next.isParagraphActive &&
    previous.activeHeadingLevel === next.activeHeadingLevel &&
    previous.isBoldActive === next.isBoldActive &&
    previous.isItalicActive === next.isItalicActive &&
    previous.isBulletListActive === next.isBulletListActive &&
    previous.isOrderedListActive === next.isOrderedListActive &&
    previous.isBlockquoteActive === next.isBlockquoteActive &&
    previous.canUndo === next.canUndo &&
    previous.canRedo === next.canRedo &&
    areStringArraysEqual(previous.availableFigureIds, next.availableFigureIds)
  );
}

function areSurfaceLabelsEqual(
  previous: WritingEditorSurfaceLabels,
  next: WritingEditorSurfaceLabels,
) {
  return (
    previous.textGroup === next.textGroup &&
    previous.formatGroup === next.formatGroup &&
    previous.insertGroup === next.insertGroup &&
    previous.historyGroup === next.historyGroup &&
    previous.paragraph === next.paragraph &&
    previous.heading1 === next.heading1 &&
    previous.heading2 === next.heading2 &&
    previous.heading3 === next.heading3 &&
    previous.bold === next.bold &&
    previous.italic === next.italic &&
    previous.bulletList === next.bulletList &&
    previous.orderedList === next.orderedList &&
    previous.blockquote === next.blockquote &&
    previous.undo === next.undo &&
    previous.redo === next.redo &&
    previous.insertCitation === next.insertCitation &&
    previous.insertFigure === next.insertFigure &&
    previous.insertFigureRef === next.insertFigureRef &&
    previous.citationPrompt === next.citationPrompt &&
    previous.figureUrlPrompt === next.figureUrlPrompt &&
    previous.figureCaptionPrompt === next.figureCaptionPrompt &&
    previous.figureRefPrompt === next.figureRefPrompt
  );
}

export class ProseMirrorEditor implements WritingEditorSurfaceHandle {
  private props: WritingEditorSurfaceProps;
  private readonly element = createElement('div', 'pm-editor-shell');
  private readonly hostWrapperElement = createElement('div', 'pm-editor-host');
  private readonly editorRootElement = createElement('div', 'pm-editor-root');
  private readonly toolbar: DraftEditorToolbar;
  private view: EditorView | null = null;
  // The workbench can rerender before the writing model echoes the latest local document back.
  private readonly inputSession = new WritingEditorInputSession({
    isViewComposing: () => Boolean(this.view?.composing),
    hasViewFocus: () => Boolean(this.view?.hasFocus()),
    focusView: () => {
      this.view?.focus();
    },
  });
  private snapshot: WritingEditorSurfaceSnapshot = {
    toolbarState: EMPTY_TOOLBAR_STATE,
  };

  constructor(props: WritingEditorSurfaceProps) {
    this.props = props;
    this.toolbar = new DraftEditorToolbar(this.createToolbarProps());
    this.hostWrapperElement.append(this.editorRootElement);
    this.element.append(this.toolbar.getElement(), this.hostWrapperElement);
    this.createView();
  }

  getElement() {
    return this.element;
  }

  setProps(props: WritingEditorSurfaceProps) {
    const previousProps = this.props;
    this.props = props;

    if (!this.view) {
      this.createView();
      return;
    }

    const currentDocumentKey = createNormalizedDocumentKey(
      this.view.state.doc.toJSON() as WritingEditorDocument,
    );
    const nextDocumentKey = createNormalizedDocumentKey(props.document);
    const shouldRefreshPlaceholder = previousProps.placeholder !== props.placeholder;
    const shouldRefreshToolbarChrome = !areSurfaceLabelsEqual(
      previousProps.labels,
      props.labels,
    );
    const shouldRestoreFocus =
      this.view.hasFocus() || this.inputSession.shouldKeepFocus();
    const syncPlan = resolveWritingEditorSurfaceSyncPlan({
      currentDocumentKey,
      nextDocumentKey,
      pendingDocumentSyncKey: this.inputSession.getPendingDocumentSyncKey(),
      isComposing: this.view.composing,
      shouldRefreshPlaceholder,
      shouldRefreshToolbarChrome,
    });

    this.applySurfaceSyncPlan(syncPlan, props, shouldRestoreFocus);
  }

  dispose() {
    this.inputSession.dispose();
    this.destroyView();
    this.element.replaceChildren();
  }

  focus() {
    this.view?.focus();
  }

  insertPlainText(text: string) {
    return runWritingEditorCommand(this.view, insertPlainTextCommand(text));
  }

  insertCitation(citationIds: string[]) {
    return runWritingEditorCommand(this.view, insertCitationCommand(citationIds));
  }

  insertFigure(payload: InsertFigurePayload) {
    return runWritingEditorCommand(this.view, insertFigureCommand(payload));
  }

  insertFigureRef(targetId: string) {
    return runWritingEditorCommand(this.view, insertFigureRefCommand(targetId));
  }

  getAvailableFigureIds() {
    return this.snapshot.toolbarState.availableFigureIds;
  }

  setParagraph = () => this.runCommand(setParagraphCommand());
  toggleHeading = (level: number) => this.runCommand(toggleHeadingCommand(level));
  toggleBold = () => this.runCommand(toggleBoldCommand());
  toggleItalic = () => this.runCommand(toggleItalicCommand());
  toggleBulletList = () => this.runCommand(toggleBulletListCommand());
  toggleOrderedList = () => this.runCommand(toggleOrderedListCommand());
  toggleBlockquote = () => this.runCommand(toggleBlockquoteCommand());
  undo = () => this.runCommand(undoCommand());
  redo = () => this.runCommand(redoCommand());

  private createView() {
    this.destroyView();

    let editorView: EditorView;
    editorView = new EditorView(
      this.editorRootElement,
      {
        state: createWritingEditorState(
          this.props.document,
          this.props.placeholder,
        ),
        dispatchTransaction: (transaction) => {
          const nextState = editorView.state.apply(transaction);
          editorView.updateState(nextState);
          this.syncEditorViewState(nextState, transaction.docChanged);
        },
      },
    );

    this.view = editorView;
    this.view.dom.addEventListener('compositionstart', this.handleCompositionStart);
    this.view.dom.addEventListener('compositionend', this.handleCompositionEnd);
    this.view.dom.addEventListener('focus', this.handleFocus);
    this.view.dom.addEventListener('blur', this.handleBlur);
    this.syncEditorViewState(editorView.state, false);
  }

  private createToolbarProps() {
    return {
      labels: this.props.labels,
      toolbarState: this.snapshot.toolbarState,
      actions: {
        setParagraph: this.setParagraph,
        toggleHeading: this.toggleHeading,
        toggleBold: this.toggleBold,
        toggleItalic: this.toggleItalic,
        toggleBulletList: this.toggleBulletList,
        toggleOrderedList: this.toggleOrderedList,
        toggleBlockquote: this.toggleBlockquote,
        undo: this.undo,
        redo: this.redo,
        insertCitation: this.props.onInsertCitation,
        insertFigure: this.props.onInsertFigure,
        insertFigureRef: () =>
          this.props.onInsertFigureRef(this.snapshot.toolbarState.availableFigureIds),
      },
    };
  }

  private runCommand(command: WritingEditorCommand) {
    return runWritingEditorCommand(this.view, command);
  }

  private destroyView() {
    this.inputSession.dispose();
    if (this.view) {
      this.view.dom.removeEventListener('compositionstart', this.handleCompositionStart);
      this.view.dom.removeEventListener('compositionend', this.handleCompositionEnd);
      this.view.dom.removeEventListener('focus', this.handleFocus);
      this.view.dom.removeEventListener('blur', this.handleBlur);
    }
    this.view?.destroy();
    this.view = null;
    this.snapshot = { toolbarState: EMPTY_TOOLBAR_STATE };
    this.editorRootElement.replaceChildren();
    this.toolbar.setProps(this.createToolbarProps());
  }

  private emitStatusChange(nextState: EditorState) {
    this.props.onStatusChange?.(
      createDraftEditorRuntimeState(nextState, {
        paragraph: this.props.labels.paragraph,
        heading1: this.props.labels.heading1,
        heading2: this.props.labels.heading2,
        heading3: this.props.labels.heading3,
        bulletList: this.props.labels.bulletList,
        orderedList: this.props.labels.orderedList,
        blockquote: this.props.labels.blockquote,
        blockFigure: this.props.statusLabels.blockFigure,
      }),
    );
  }

  private refreshToolbarSnapshot(nextState: EditorState) {
    const nextToolbarState = getWritingEditorToolbarState(nextState);
    if (areToolbarStatesEqual(this.snapshot.toolbarState, nextToolbarState)) {
      return;
    }

    this.snapshot = {
      toolbarState: nextToolbarState,
    };
    this.toolbar.setProps(this.createToolbarProps());
  }

  private syncEditorViewState(nextState: EditorState, emitDocumentChange: boolean) {
    if (!this.view) {
      return;
    }

    const shouldRestoreFocus =
      this.view.hasFocus() || this.inputSession.shouldKeepFocus();
    syncWritingEditorDerivedLabels(this.view.dom, nextState.doc);
    if (emitDocumentChange) {
      const nextDocument = nextState.doc.toJSON() as WritingEditorDocument;
      if (this.view.composing) {
        this.inputSession.setPendingComposedDocument(nextDocument);
      } else {
        this.emitDocumentChange(nextDocument, shouldRestoreFocus);
      }
    }
    this.emitStatusChange(nextState);
    this.refreshToolbarSnapshot(nextState);
    this.inputSession.restoreFocusIfNeeded(shouldRestoreFocus);
  }

  private applySurfaceSyncPlan(
    syncPlan: ReturnType<typeof resolveWritingEditorSurfaceSyncPlan>,
    props: WritingEditorSurfaceProps,
    shouldRestoreFocus: boolean,
  ) {
    if (!this.view) {
      return;
    }

    if (syncPlan.shouldClearPendingDocumentSync) {
      this.inputSession.clearPendingDocumentSyncIfMatches(
        createNormalizedDocumentKey(props.document),
      );
    }

    switch (syncPlan.kind) {
      case 'defer-while-composing':
        this.emitStatusChange(this.view.state);
        this.refreshToolbarSnapshot(this.view.state);
        if (syncPlan.shouldRefreshToolbarChrome) {
          this.toolbar.setProps(this.createToolbarProps());
        }
        return;
      case 'preserve-local-state':
        if (syncPlan.shouldRefreshPlaceholder) {
          const updatedPlaceholder = updateWritingEditorPlaceholder(
            this.view,
            props.placeholder,
          );
          if (syncPlan.shouldRefreshToolbarChrome) {
            this.toolbar.setProps(this.createToolbarProps());
          }
          if (updatedPlaceholder) {
            return;
          }
        }

        this.emitStatusChange(this.view.state);
        this.refreshToolbarSnapshot(this.view.state);
        if (syncPlan.shouldRefreshToolbarChrome) {
          this.toolbar.setProps(this.createToolbarProps());
        }
        this.inputSession.restoreFocusIfNeeded(shouldRestoreFocus);
        return;
      case 'refresh-placeholder':
        const updatedPlaceholder = updateWritingEditorPlaceholder(
          this.view,
          props.placeholder,
        );
        if (syncPlan.shouldRefreshToolbarChrome) {
          this.toolbar.setProps(this.createToolbarProps());
        }
        if (!updatedPlaceholder) {
          this.inputSession.restoreFocusIfNeeded(shouldRestoreFocus);
        }
        return;
      case 'replace-state':
        this.view.updateState(
          createWritingEditorState(props.document, props.placeholder),
        );
        this.syncEditorViewState(this.view.state, false);
        if (syncPlan.shouldRefreshToolbarChrome) {
          this.toolbar.setProps(this.createToolbarProps());
        }
        return;
      case 'sync-current-state':
        this.emitStatusChange(this.view.state);
        this.refreshToolbarSnapshot(this.view.state);
        if (syncPlan.shouldRefreshToolbarChrome) {
          this.toolbar.setProps(this.createToolbarProps());
        }
        this.inputSession.restoreFocusIfNeeded(shouldRestoreFocus);
        return;
    }
  }

  private emitDocumentChange(
    nextDocument: WritingEditorDocument,
    shouldRestoreFocus: boolean,
  ) {
    this.inputSession.markDocumentSyncPending(
      createNormalizedDocumentKey(nextDocument),
    );
    if (shouldRestoreFocus) {
      this.inputSession.armFocusRestore();
    } else {
      this.inputSession.clearFocusRestoreState();
    }
    this.inputSession.clearPendingComposedDocument();
    this.props.onDocumentChange(nextDocument);
  }

  private readonly handleCompositionStart = () => {
    this.inputSession.handleCompositionStart();
  };

  private readonly handleCompositionEnd = () => {
    this.inputSession.scheduleCompositionFlush(() => {
      if (!this.view) {
        return;
      }

      const nextDocument =
        this.inputSession.getPendingComposedDocument() ??
        (this.view.state.doc.toJSON() as WritingEditorDocument);
      const nextDocumentKey = createNormalizedDocumentKey(nextDocument);
      const propsDocumentKey = createNormalizedDocumentKey(this.props.document);

      if (nextDocumentKey === propsDocumentKey) {
        this.inputSession.clearPendingComposedDocument();
        return;
      }

      this.emitDocumentChange(
        nextDocument,
        this.view.hasFocus() || this.inputSession.isFocusRestorePending(),
      );
    });
  };

  private readonly handleBlur = () => {
    this.inputSession.handleBlur();
  };

  private readonly handleFocus = () => {
    this.inputSession.handleFocus();
  }
}

export function createProseMirrorEditor(props: WritingEditorSurfaceProps) {
  return new ProseMirrorEditor(props);
}

export default ProseMirrorEditor;
