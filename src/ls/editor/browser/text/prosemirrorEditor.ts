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
  writingEditorSchema,
} from './schema';
import { DraftEditorToolbar } from './draftEditorToolbar';
import './media/prosemirrorEditor.css';

export type WritingEditorSurfaceLabels = {
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

export class ProseMirrorEditor implements WritingEditorSurfaceHandle {
  private props: WritingEditorSurfaceProps;
  private readonly element = createElement('div', 'pm-editor-shell');
  private readonly hostWrapperElement = createElement('div', 'pm-editor-host');
  private readonly editorRootElement = createElement('div', 'pm-editor-root');
  private readonly toolbar: DraftEditorToolbar;
  private view: EditorView | null = null;
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

    const currentDocumentKey = JSON.stringify(this.view.state.doc.toJSON());
    const nextDocumentKey = createNormalizedDocumentKey(props.document);
    const shouldReplaceState =
      currentDocumentKey !== nextDocumentKey ||
      previousProps.placeholder !== props.placeholder;

    if (shouldReplaceState) {
      this.view.updateState(
        createWritingEditorState(props.document, props.placeholder),
      );
      this.syncEditorViewState(this.view.state, false);
      return;
    }

    this.emitStatusChange(this.view.state);
    this.refreshToolbarSnapshot(this.view.state);
    this.toolbar.setProps(this.createToolbarProps());
  }

  dispose() {
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
      { mount: this.editorRootElement },
      {
        state: createWritingEditorState(
          this.props.document,
          this.props.placeholder,
        ),
        dispatchTransaction: (transaction) => {
          const nextState = editorView.state.apply(transaction);
          editorView.updateState(nextState);
          this.syncEditorViewState(nextState, true);
        },
      },
    );

    this.view = editorView;
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

    syncWritingEditorDerivedLabels(this.view.dom, nextState.doc);
    if (emitDocumentChange) {
      this.props.onDocumentChange(nextState.doc.toJSON() as WritingEditorDocument);
    }
    this.emitStatusChange(nextState);
    this.refreshToolbarSnapshot(nextState);
  }
}

export function createProseMirrorEditor(props: WritingEditorSurfaceProps) {
  return new ProseMirrorEditor(props);
}

export default ProseMirrorEditor;
