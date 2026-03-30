import { jsx, jsxs } from 'react/jsx-runtime';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useSyncExternalStore,
} from 'react';
import { EditorState } from 'prosemirror-state';
import { baseKeymap } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { EditorView } from 'prosemirror-view';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { Button } from '../../../../../base/browser/ui/button/button';
import {
  createDraftEditorRuntimeState,
  type DraftEditorRuntimeState,
} from '../editorStatus';
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
} from './document';
import {
  createWritingEditorDocumentIdentityPlugin,
  createWritingEditorInputRules,
  createWritingEditorPlaceholderPlugin,
  writingEditorSchema,
} from './schema';
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
};

type WritingEditorSurfaceStatusLabels = {
  blockFigure: string;
};

type WritingEditorSurfaceProps = {
  document: WritingEditorDocument;
  placeholder: string;
  labels: WritingEditorSurfaceLabels;
  statusLabels: WritingEditorSurfaceStatusLabels;
  onDocumentChange: (document: WritingEditorDocument) => void;
  onStatusChange?: (status: DraftEditorRuntimeState) => void;
};

type WritingEditorSurfaceSnapshot = {
  toolbarState: WritingEditorToolbarState;
};

const emptyToolbarState: WritingEditorToolbarState = {
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

function normalizePromptValue(value: string | null) {
  return value?.trim() ?? '';
}

function createToolbarButton({
  label,
  isActive,
  onClick,
  disabled,
}: {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return jsx(Button, {
    type: 'button',
    size: 'sm',
    variant: isActive ? 'primary' : 'secondary',
    className: 'pm-toolbar-btn',
    disabled,
    onClick,
    children: label,
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

class WritingEditorSurface {
  private context: WritingEditorSurfaceProps;
  private hostNode: HTMLDivElement | null = null;
  private view: EditorView | null = null;
  private snapshot: WritingEditorSurfaceSnapshot = {
    toolbarState: emptyToolbarState,
  };
  private readonly listeners = new Set<() => void>();

  constructor(context: WritingEditorSurfaceProps) {
    this.context = context;
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setContext = (context: WritingEditorSurfaceProps) => {
    const previousContext = this.context;
    this.context = context;

    const editorView = this.view;
    if (!editorView) {
      return;
    }

    const currentDocumentKey = JSON.stringify(editorView.state.doc.toJSON());
    const nextDocumentKey = createNormalizedDocumentKey(context.document);
    const shouldReplaceState =
      currentDocumentKey !== nextDocumentKey ||
      previousContext.placeholder !== context.placeholder;

    if (shouldReplaceState) {
      // External resets or storage restores should replace the whole editor state once,
      // instead of replaying local transactions back into the view.
      editorView.updateState(
        createWritingEditorState(context.document, context.placeholder),
      );
      this.syncEditorViewState(editorView.state, false);
      return;
    }

    this.emitStatusChange(editorView.state);
    this.refreshToolbarSnapshot(editorView.state);
  };

  readonly attachHost = (hostNode: HTMLDivElement | null) => {
    if (hostNode === this.hostNode) {
      return;
    }

    this.destroyView();
    this.hostNode = hostNode;
    if (!hostNode) {
      return;
    }

    let editorView: EditorView;

    editorView = new EditorView(
      { mount: hostNode },
      {
        state: createWritingEditorState(
          this.context.document,
          this.context.placeholder,
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
  };

  readonly dispose = () => {
    this.destroyView();
    this.listeners.clear();
  };

  readonly focus = () => {
    this.view?.focus();
  };

  readonly insertPlainText = (text: string) => {
    return runWritingEditorCommand(this.view, insertPlainTextCommand(text));
  };

  readonly insertCitation = (citationIds: string[]) => {
    return runWritingEditorCommand(this.view, insertCitationCommand(citationIds));
  };

  readonly insertFigure = (payload: InsertFigurePayload) => {
    return runWritingEditorCommand(this.view, insertFigureCommand(payload));
  };

  readonly insertFigureRef = (targetId: string) => {
    return runWritingEditorCommand(this.view, insertFigureRefCommand(targetId));
  };

  readonly setParagraph = () => {
    return this.runCommand(setParagraphCommand());
  };

  readonly toggleHeading = (level: number) => {
    return this.runCommand(toggleHeadingCommand(level));
  };

  readonly toggleBold = () => {
    return this.runCommand(toggleBoldCommand());
  };

  readonly toggleItalic = () => {
    return this.runCommand(toggleItalicCommand());
  };

  readonly toggleBulletList = () => {
    return this.runCommand(toggleBulletListCommand());
  };

  readonly toggleOrderedList = () => {
    return this.runCommand(toggleOrderedListCommand());
  };

  readonly toggleBlockquote = () => {
    return this.runCommand(toggleBlockquoteCommand());
  };

  readonly undo = () => {
    return this.runCommand(undoCommand());
  };

  readonly redo = () => {
    return this.runCommand(redoCommand());
  };

  readonly promptInsertCitation = () => {
    const input = normalizePromptValue(
      window.prompt(this.context.labels.citationPrompt, 'cite_1'),
    );
    if (!input) {
      return;
    }

    const citationIds = input.split(/[,\s]+/).filter(Boolean);
    this.insertCitation(citationIds);
  };

  readonly promptInsertFigure = () => {
    const src = normalizePromptValue(
      window.prompt(this.context.labels.figureUrlPrompt, 'https://'),
    );
    if (!src) {
      return;
    }

    const caption = normalizePromptValue(
      window.prompt(this.context.labels.figureCaptionPrompt, ''),
    );
    this.insertFigure({
      src,
      caption,
    });
  };

  readonly promptInsertFigureRef = () => {
    const { labels } = this.context;
    const toolbarState = this.snapshot.toolbarState;
    const optionsHint =
      toolbarState.availableFigureIds.length > 0
        ? ` (${toolbarState.availableFigureIds.join(', ')})`
        : '';
    const targetId = normalizePromptValue(
      window.prompt(
        `${labels.figureRefPrompt}${optionsHint}`,
        toolbarState.availableFigureIds[0] ?? 'figure_1',
      ),
    );
    if (!targetId) {
      return;
    }

    this.insertFigureRef(targetId);
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private runCommand(command: WritingEditorCommand) {
    return runWritingEditorCommand(this.view, command);
  }

  private destroyView() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }

    this.hostNode = null;
    if (!areToolbarStatesEqual(this.snapshot.toolbarState, emptyToolbarState)) {
      this.snapshot = {
        toolbarState: emptyToolbarState,
      };
      this.emitChange();
    }
  }

  private emitStatusChange(nextState: EditorState) {
    const { labels, statusLabels, onStatusChange } = this.context;

    onStatusChange?.(
      createDraftEditorRuntimeState(nextState, {
        paragraph: labels.paragraph,
        heading1: labels.heading1,
        heading2: labels.heading2,
        heading3: labels.heading3,
        bulletList: labels.bulletList,
        orderedList: labels.orderedList,
        blockquote: labels.blockquote,
        blockFigure: statusLabels.blockFigure,
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
    this.emitChange();
  }

  private syncEditorViewState(nextState: EditorState, emitDocumentChange: boolean) {
    const editorView = this.view;
    if (!editorView) {
      return;
    }

    // Citation and figure-ref ordinals are derived UI state, so we repaint them from the
    // latest document instead of storing rendered numbers in the serialized JSON.
    syncWritingEditorDerivedLabels(editorView.dom, nextState.doc);
    if (emitDocumentChange) {
      this.context.onDocumentChange(
        nextState.doc.toJSON() as WritingEditorDocument,
      );
    }
    this.emitStatusChange(nextState);
    this.refreshToolbarSnapshot(nextState);
  }
}

export const ProseMirrorEditor = forwardRef<
  WritingEditorSurfaceHandle,
  WritingEditorSurfaceProps
>(function ProseMirrorEditor(props, ref) {
  const [surface] = useState(() => new WritingEditorSurface(props));
  const { toolbarState } = useSyncExternalStore(
    surface.subscribe,
    surface.getSnapshot,
    surface.getSnapshot,
  );

  useEffect(() => {
    surface.setContext(props);
  }, [props, surface]);

  useEffect(() => {
    return () => {
      surface.dispose();
    };
  }, [surface]);

  useImperativeHandle(
    ref,
    () => ({
      focus: surface.focus,
      insertPlainText: surface.insertPlainText,
      insertCitation: surface.insertCitation,
      insertFigure: surface.insertFigure,
      insertFigureRef: surface.insertFigureRef,
    }),
    [surface],
  );

  return jsxs('div', {
    className: 'pm-editor-shell',
    children: [
      jsxs('div', {
        className: 'pm-toolbar',
        children: [
          jsxs('div', {
            className: 'pm-toolbar-group',
            children: [
              createToolbarButton({
                label: props.labels.paragraph,
                isActive: toolbarState.isParagraphActive,
                onClick: surface.setParagraph,
              }),
              createToolbarButton({
                label: props.labels.heading1,
                isActive: toolbarState.activeHeadingLevel === 1,
                onClick: () => surface.toggleHeading(1),
              }),
              createToolbarButton({
                label: props.labels.heading2,
                isActive: toolbarState.activeHeadingLevel === 2,
                onClick: () => surface.toggleHeading(2),
              }),
              createToolbarButton({
                label: props.labels.heading3,
                isActive: toolbarState.activeHeadingLevel === 3,
                onClick: () => surface.toggleHeading(3),
              }),
            ],
          }),
          jsxs('div', {
            className: 'pm-toolbar-group',
            children: [
              createToolbarButton({
                label: props.labels.bold,
                isActive: toolbarState.isBoldActive,
                onClick: surface.toggleBold,
              }),
              createToolbarButton({
                label: props.labels.italic,
                isActive: toolbarState.isItalicActive,
                onClick: surface.toggleItalic,
              }),
              createToolbarButton({
                label: props.labels.bulletList,
                isActive: toolbarState.isBulletListActive,
                onClick: surface.toggleBulletList,
              }),
              createToolbarButton({
                label: props.labels.orderedList,
                isActive: toolbarState.isOrderedListActive,
                onClick: surface.toggleOrderedList,
              }),
              createToolbarButton({
                label: props.labels.blockquote,
                isActive: toolbarState.isBlockquoteActive,
                onClick: surface.toggleBlockquote,
              }),
            ],
          }),
          jsxs('div', {
            className: 'pm-toolbar-group',
            children: [
              createToolbarButton({
                label: props.labels.undo,
                onClick: surface.undo,
                disabled: !toolbarState.canUndo,
              }),
              createToolbarButton({
                label: props.labels.redo,
                onClick: surface.redo,
                disabled: !toolbarState.canRedo,
              }),
            ],
          }),
          jsxs('div', {
            className: 'pm-toolbar-group',
            children: [
              createToolbarButton({
                label: props.labels.insertCitation,
                onClick: surface.promptInsertCitation,
              }),
              createToolbarButton({
                label: props.labels.insertFigure,
                onClick: surface.promptInsertFigure,
              }),
              createToolbarButton({
                label: props.labels.insertFigureRef,
                onClick: surface.promptInsertFigureRef,
              }),
            ],
          }),
        ],
      }),
      jsx('div', {
        className: 'pm-editor-host',
        children: jsx('div', {
          ref: surface.attachHost,
          className: 'pm-editor-root',
        }),
      }),
    ],
  });
});

ProseMirrorEditor.displayName = 'ProseMirrorEditor';

export default ProseMirrorEditor;
