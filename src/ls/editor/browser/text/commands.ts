import { Fragment, Slice } from 'prosemirror-model';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import type { Command, Transaction } from 'prosemirror-state';

import { undo, redo, undoDepth, redoDepth } from 'prosemirror-history';
import { lift, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import type { EditorView } from 'prosemirror-view';
import { createEditorNodeId, writingEditorSchema } from 'ls/editor/browser/text/schema';
import type { CitationNodeAttrs } from 'ls/editor/browser/text/schema';

export type WritingEditorCommand = Command;

export type WritingEditorToolbarState = {
  isParagraphActive: boolean;
  activeHeadingLevel: number | null;
  isBoldActive: boolean;
  isItalicActive: boolean;
  isBulletListActive: boolean;
  isOrderedListActive: boolean;
  isBlockquoteActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  availableFigureIds: string[];
};

export type InsertFigurePayload = {
  src: string;
  caption?: string;
  alt?: string;
  title?: string;
  width?: number | null;
  figureId?: string;
};

function isAncestorActive(state: EditorState, nodeName: string) {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeName) {
      return true;
    }
  }

  return false;
}

function getActiveTextblock(state: EditorState) {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.isTextblock) {
      return node;
    }
  }

  return $from.parent;
}

function isMarkActive(state: EditorState, markName: 'strong' | 'em') {
  const markType = writingEditorSchema.marks[markName];
  if (!markType) {
    return false;
  }

  const { from, to, empty } = state.selection;
  if (empty) {
    return Boolean(markType.isInSet(state.storedMarks ?? state.selection.$from.marks()));
  }

  return state.doc.rangeHasMark(from, to, markType);
}

function createInlineNodesFromText(text: string) {
  const hardBreakType = writingEditorSchema.nodes.hard_break;
  const nodes: ProseMirrorNode[] = [];
  const lines = text.split('\n');

  lines.forEach((line, index) => {
    if (line) {
      nodes.push(writingEditorSchema.text(line));
    }

    if (index < lines.length - 1) {
      nodes.push(hardBreakType.create());
    }
  });

  return nodes;
}

function createParagraphNodesFromText(text: string) {
  const paragraphType = writingEditorSchema.nodes.paragraph;
  const normalizedText = text.replace(/\r\n/g, '\n').trim();

  if (!normalizedText) {
    return [];
  }

  return normalizedText
    .split(/\n{2,}/)
    .map((block) =>
      paragraphType.create(
        {
          blockId: createEditorNodeId('block'),
        },
        createInlineNodesFromText(block.trim()),
      ),
    );
}

function createCitationDisplayText(citationIds: string[]) {
  return `[${citationIds.join(', ')}]`;
}

export function getAvailableFigureIds(state: EditorState) {
  const figureIds: string[] = [];

  state.doc.descendants((node) => {
    if (node.type.name === 'figure') {
      const figureId = typeof node.attrs.figureId === 'string' ? node.attrs.figureId.trim() : '';
      if (figureId) {
        figureIds.push(figureId);
      }
    }
  });

  return figureIds;
}

export function getWritingEditorToolbarState(state: EditorState): WritingEditorToolbarState {
  const activeTextblock = getActiveTextblock(state);

  return {
    isParagraphActive: activeTextblock.type.name === 'paragraph',
    activeHeadingLevel:
      activeTextblock.type.name === 'heading' ? Number(activeTextblock.attrs.level) || 1 : null,
    isBoldActive: isMarkActive(state, 'strong'),
    isItalicActive: isMarkActive(state, 'em'),
    isBulletListActive: isAncestorActive(state, 'bullet_list'),
    isOrderedListActive: isAncestorActive(state, 'ordered_list'),
    isBlockquoteActive: isAncestorActive(state, 'blockquote'),
    canUndo: undoDepth(state) > 0,
    canRedo: redoDepth(state) > 0,
    availableFigureIds: getAvailableFigureIds(state),
  };
}

export function setParagraphCommand(): WritingEditorCommand {
  return setBlockType(writingEditorSchema.nodes.paragraph);
}

export function toggleHeadingCommand(level: number): WritingEditorCommand {
  return (state, dispatch) => {
    const activeTextblock = getActiveTextblock(state);
    if (activeTextblock.type.name === 'heading' && Number(activeTextblock.attrs.level) === level) {
      return setParagraphCommand()(state, dispatch);
    }

    return setBlockType(writingEditorSchema.nodes.heading, { level })(state, dispatch);
  };
}

function toggleListCommand(listName: 'bullet_list' | 'ordered_list'): WritingEditorCommand {
  const listType = writingEditorSchema.nodes[listName];
  const listItemType = writingEditorSchema.nodes.list_item;

  return (state, dispatch) => {
    if (isAncestorActive(state, listName)) {
      return liftListItem(listItemType)(state, dispatch);
    }

    return wrapInList(listType)(state, dispatch);
  };
}

export function toggleBulletListCommand(): WritingEditorCommand {
  return toggleListCommand('bullet_list');
}

export function toggleOrderedListCommand(): WritingEditorCommand {
  return toggleListCommand('ordered_list');
}

export function toggleBlockquoteCommand(): WritingEditorCommand {
  return (state, dispatch) => {
    if (isAncestorActive(state, 'blockquote')) {
      return lift(state, dispatch);
    }

    return wrapIn(writingEditorSchema.nodes.blockquote)(state, dispatch);
  };
}

export function toggleBoldCommand(): WritingEditorCommand {
  return toggleMark(writingEditorSchema.marks.strong);
}

export function toggleItalicCommand(): WritingEditorCommand {
  return toggleMark(writingEditorSchema.marks.em);
}

export function undoCommand(): WritingEditorCommand {
  return undo;
}

export function redoCommand(): WritingEditorCommand {
  return redo;
}

export function insertPlainTextCommand(text: string): WritingEditorCommand {
  return (state, dispatch) => {
    const paragraphs = createParagraphNodesFromText(text);
    if (paragraphs.length === 0 || !dispatch) {
      return paragraphs.length > 0;
    }

    const transaction = state.tr.replaceSelection(
      new Slice(Fragment.fromArray(paragraphs), 0, 0),
    );
    dispatch(transaction.scrollIntoView());
    return true;
  };
}

export function insertCitationCommand(
  citationIds: string[],
  displayText = createCitationDisplayText(citationIds),
): WritingEditorCommand {
  return (state, dispatch) => {
    if (citationIds.length === 0 || !dispatch) {
      return citationIds.length > 0;
    }

    const citationNode = writingEditorSchema.nodes.citation.create({
      citationIds,
      displayText,
    } satisfies CitationNodeAttrs);

    dispatch(state.tr.replaceSelectionWith(citationNode, false).scrollIntoView());
    return true;
  };
}

export function insertFigureRefCommand(targetId: string, label = 'Figure'): WritingEditorCommand {
  return (state, dispatch) => {
    const normalizedTargetId = targetId.trim();
    if (!normalizedTargetId || !dispatch) {
      return Boolean(normalizedTargetId);
    }

    const figureRefNode = writingEditorSchema.nodes.figure_ref.create({
      targetId: normalizedTargetId,
      label,
    });

    dispatch(state.tr.replaceSelectionWith(figureRefNode, false).scrollIntoView());
    return true;
  };
}

export function insertFigureCommand({
  src,
  caption = '',
  alt = '',
  title = '',
  width = null,
  figureId,
}: InsertFigurePayload): WritingEditorCommand {
  return (state, dispatch) => {
    const normalizedSrc = src.trim();
    if (!normalizedSrc || !dispatch) {
      return Boolean(normalizedSrc);
    }

    const figcaptionType = writingEditorSchema.nodes.figcaption;
    const figureType = writingEditorSchema.nodes.figure;
    const paragraphType = writingEditorSchema.nodes.paragraph;
    const normalizedCaption = caption.trim();
    const figureNode = figureType.create(
      {
        blockId: createEditorNodeId('block'),
        figureId: figureId?.trim() || createEditorNodeId('figure'),
        src: normalizedSrc,
        alt: alt.trim() || normalizedCaption,
        title: title.trim(),
        width,
      },
      normalizedCaption
        ? [
            figcaptionType.create(
              {
                blockId: createEditorNodeId('block'),
              },
              createInlineNodesFromText(normalizedCaption),
            ),
          ]
        : undefined,
    );
    const trailingParagraph = paragraphType.create({
      blockId: createEditorNodeId('block'),
    });

    dispatch(
      state.tr
        .replaceSelection(new Slice(Fragment.fromArray([figureNode, trailingParagraph]), 0, 0))
        .scrollIntoView(),
    );
    return true;
  };
}

export function runWritingEditorCommand(view: EditorView | null, command: WritingEditorCommand) {
  if (!view) {
    return false;
  }

  const handled = command(view.state, (transaction: Transaction) => view.dispatch(transaction));
  if (handled) {
    view.focus();
  }

  return handled;
}
