import { jsx, jsxs } from 'react/jsx-runtime';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
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

type WritingEditorSurfaceProps = {
  document: WritingEditorDocument;
  placeholder: string;
  labels: WritingEditorSurfaceLabels;
  statusLabels: {
    blockFigure: string;
  };
  onDocumentChange: (document: WritingEditorDocument) => void;
  onStatusChange?: (status: DraftEditorRuntimeState) => void;
};

const emptyToolbarState = {
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

export const ProseMirrorEditor = forwardRef<WritingEditorSurfaceHandle, WritingEditorSurfaceProps>(
  function ProseMirrorEditor(
    { document, placeholder, labels, statusLabels, onDocumentChange, onStatusChange },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const labelsRef = useRef(labels);
    const statusLabelsRef = useRef(statusLabels);
    const onDocumentChangeRef = useRef(onDocumentChange);
    const onStatusChangeRef = useRef(onStatusChange);
    const [surfaceVersion, setSurfaceVersion] = useState(0);
    const documentKey = JSON.stringify(document);
    const normalizedDocument = useMemo(
      () => normalizeWritingEditorDocument(document),
      [documentKey],
    );
    const normalizedDocumentKey = JSON.stringify(normalizedDocument);

    onDocumentChangeRef.current = onDocumentChange;
    onStatusChangeRef.current = onStatusChange;
    labelsRef.current = labels;
    statusLabelsRef.current = statusLabels;

    const emitStatusChange = (nextState: EditorState) => {
      const currentLabels = labelsRef.current;
      const currentStatusLabels = statusLabelsRef.current;

      onStatusChangeRef.current?.(
        createDraftEditorRuntimeState(nextState, {
          paragraph: currentLabels.paragraph,
          heading1: currentLabels.heading1,
          heading2: currentLabels.heading2,
          heading3: currentLabels.heading3,
          bulletList: currentLabels.bulletList,
          orderedList: currentLabels.orderedList,
          blockquote: currentLabels.blockquote,
          blockFigure: currentStatusLabels.blockFigure,
        }),
      );
    };

    useEffect(() => {
      const mountNode = hostRef.current;
      if (!mountNode) {
        return undefined;
      }

      let editorView: EditorView;

      editorView = new EditorView(
        { mount: mountNode },
        {
          state: createWritingEditorState(normalizedDocument, placeholder),
          dispatchTransaction(transaction) {
            const nextState = editorView.state.apply(transaction);
            editorView.updateState(nextState);
            // Citation and figure-ref ordinals are derived UI state, so we repaint them from the
            // latest document instead of storing rendered numbers in the serialized JSON.
            syncWritingEditorDerivedLabels(editorView.dom, nextState.doc);
            onDocumentChangeRef.current(nextState.doc.toJSON() as WritingEditorDocument);
            emitStatusChange(nextState);
            setSurfaceVersion((value) => value + 1);
          },
        },
      );

      viewRef.current = editorView;
      syncWritingEditorDerivedLabels(editorView.dom, editorView.state.doc);
      emitStatusChange(editorView.state);
      setSurfaceVersion((value) => value + 1);

      return () => {
        editorView.destroy();
        viewRef.current = null;
      };
    }, []);

    useEffect(() => {
      const editorView = viewRef.current;
      if (!editorView) {
        return;
      }

      const currentDocumentKey = JSON.stringify(editorView.state.doc.toJSON());
      if (currentDocumentKey === normalizedDocumentKey) {
        return;
      }

      // External resets or storage restores should replace the whole editor state once,
      // instead of replaying local transactions back into the view.
      editorView.updateState(createWritingEditorState(normalizedDocument, placeholder));
      syncWritingEditorDerivedLabels(editorView.dom, editorView.state.doc);
      emitStatusChange(editorView.state);
      setSurfaceVersion((value) => value + 1);
    }, [normalizedDocument, normalizedDocumentKey, placeholder]);

    const toolbarState = useMemo(
      () => (viewRef.current ? getWritingEditorToolbarState(viewRef.current.state) : emptyToolbarState),
      [surfaceVersion],
    );

    const handleInsertCitation = () => {
      const input = normalizePromptValue(window.prompt(labels.citationPrompt, 'cite_1'));
      if (!input) {
        return;
      }

      const citationIds = input.split(/[,\s]+/).filter(Boolean);
      runWritingEditorCommand(viewRef.current, insertCitationCommand(citationIds));
    };

    const handleInsertFigure = () => {
      const src = normalizePromptValue(window.prompt(labels.figureUrlPrompt, 'https://'));
      if (!src) {
        return;
      }

      const caption = normalizePromptValue(window.prompt(labels.figureCaptionPrompt, ''));
      runWritingEditorCommand(
        viewRef.current,
        insertFigureCommand({
          src,
          caption,
        }),
      );
    };

    const handleInsertFigureRef = () => {
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

      runWritingEditorCommand(viewRef.current, insertFigureRefCommand(targetId));
    };

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          viewRef.current?.focus();
        },
        insertPlainText(text: string) {
          return runWritingEditorCommand(viewRef.current, insertPlainTextCommand(text));
        },
        insertCitation(citationIds: string[]) {
          return runWritingEditorCommand(viewRef.current, insertCitationCommand(citationIds));
        },
        insertFigure(payload: InsertFigurePayload) {
          return runWritingEditorCommand(viewRef.current, insertFigureCommand(payload));
        },
        insertFigureRef(targetId: string) {
          return runWritingEditorCommand(viewRef.current, insertFigureRefCommand(targetId));
        },
      }),
      [],
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
                  label: labels.paragraph,
                  isActive: toolbarState.isParagraphActive,
                  onClick: () => runWritingEditorCommand(viewRef.current, setParagraphCommand()),
                }),
                createToolbarButton({
                  label: labels.heading1,
                  isActive: toolbarState.activeHeadingLevel === 1,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleHeadingCommand(1)),
                }),
                createToolbarButton({
                  label: labels.heading2,
                  isActive: toolbarState.activeHeadingLevel === 2,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleHeadingCommand(2)),
                }),
                createToolbarButton({
                  label: labels.heading3,
                  isActive: toolbarState.activeHeadingLevel === 3,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleHeadingCommand(3)),
                }),
              ],
            }),
            jsxs('div', {
              className: 'pm-toolbar-group',
              children: [
                createToolbarButton({
                  label: labels.bold,
                  isActive: toolbarState.isBoldActive,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleBoldCommand()),
                }),
                createToolbarButton({
                  label: labels.italic,
                  isActive: toolbarState.isItalicActive,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleItalicCommand()),
                }),
                createToolbarButton({
                  label: labels.bulletList,
                  isActive: toolbarState.isBulletListActive,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleBulletListCommand()),
                }),
                createToolbarButton({
                  label: labels.orderedList,
                  isActive: toolbarState.isOrderedListActive,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleOrderedListCommand()),
                }),
                createToolbarButton({
                  label: labels.blockquote,
                  isActive: toolbarState.isBlockquoteActive,
                  onClick: () => runWritingEditorCommand(viewRef.current, toggleBlockquoteCommand()),
                }),
              ],
            }),
            jsxs('div', {
              className: 'pm-toolbar-group',
              children: [
                createToolbarButton({
                  label: labels.undo,
                  onClick: () => runWritingEditorCommand(viewRef.current, undoCommand()),
                  disabled: !toolbarState.canUndo,
                }),
                createToolbarButton({
                  label: labels.redo,
                  onClick: () => runWritingEditorCommand(viewRef.current, redoCommand()),
                  disabled: !toolbarState.canRedo,
                }),
              ],
            }),
            jsxs('div', {
              className: 'pm-toolbar-group',
              children: [
                createToolbarButton({
                  label: labels.insertCitation,
                  onClick: handleInsertCitation,
                }),
                createToolbarButton({
                  label: labels.insertFigure,
                  onClick: handleInsertFigure,
                }),
                createToolbarButton({
                  label: labels.insertFigureRef,
                  onClick: handleInsertFigureRef,
                }),
              ],
            }),
          ],
        }),
        jsx('div', {
          className: 'pm-editor-host',
          children: jsx('div', {
            ref: hostRef,
            className: 'pm-editor-root',
          }),
        }),
      ],
    });
  },
);

ProseMirrorEditor.displayName = 'ProseMirrorEditor';

export default ProseMirrorEditor;
