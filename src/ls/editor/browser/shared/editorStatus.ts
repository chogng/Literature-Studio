import type { EditorState } from 'prosemirror-state';
import { redoDepth, undoDepth } from 'prosemirror-history';
import type {
  WritingWorkspaceDraftTab,
  WritingWorkspaceTab,
} from 'ls/workbench/browser/writingEditorModel';
import {
  collectWritingEditorDerivedLabels,
  collectWritingEditorStats,
  getWritingEditorNodeText,
} from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorSurfaceLabels } from 'ls/editor/browser/text/editor';

export type EditorStatusLabels = {
  statusbarAriaLabel: string;
  words: string;
  characters: string;
  paragraphs: string;
  selection: string;
  block: string;
  line: string;
  column: string;
  url: string;
  blockFigure: string;
  ready: string;
};

type DraftStatusResolverLabels = Pick<
  WritingEditorSurfaceLabels,
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
> &
  Pick<EditorStatusLabels, 'blockFigure'>;

export type EditorStatusContextLabels = DraftStatusResolverLabels &
  Pick<WritingEditorSurfaceLabels, 'undo' | 'redo'> &
  Pick<
    EditorStatusLabels,
    | 'statusbarAriaLabel'
    | 'words'
    | 'characters'
    | 'paragraphs'
    | 'selection'
    | 'block'
    | 'line'
    | 'column'
    | 'url'
    | 'ready'
  > & {
    draftMode: string;
    sourceMode: string;
    pdfMode: string;
  };

export type DraftEditorRuntimeState = {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  selectionCharacterCount: number;
  activeBlockLabel: string;
  activeBlockIndex: number | null;
  currentLine: number;
  currentColumn: number;
  canUndo: boolean;
  canRedo: boolean;
};

export type EditorStatusItemTone = 'default' | 'accent' | 'muted';

export type EditorStatusItem = {
  id: string;
  label: string;
  value: string;
  tone?: EditorStatusItemTone;
  commandId?: 'undo' | 'redo';
  commandEnabled?: boolean;
};

export type EditorStatusState = {
  ariaLabel: string;
  kind: 'empty' | 'draft' | 'web' | 'pdf';
  modeLabel?: string;
  summary?: string;
  leftItems: readonly EditorStatusItem[];
  rightItems: readonly EditorStatusItem[];
};

const statusTrackedBlockNodeNames = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'bullet_list',
  'ordered_list',
  'figure',
]);

type ActiveTextblockInfo = {
  node: EditorState['selection']['$head']['parent'];
  offset: number;
};

type ActiveBlockInfo = {
  label: string;
  blockId: string | null;
};

function isAncestorActive(state: EditorState, nodeName: string) {
  const { $head } = state.selection;

  for (let depth = $head.depth; depth > 0; depth -= 1) {
    if ($head.node(depth).type.name === nodeName) {
      return true;
    }
  }

  return false;
}

function findAncestorBlockId(state: EditorState, nodeName: string) {
  const { $head } = state.selection;

  for (let depth = $head.depth; depth > 0; depth -= 1) {
    const node = $head.node(depth);
    if (node.type.name === nodeName) {
      const blockId = node.attrs.blockId;
      return typeof blockId === 'string' && blockId.trim() ? blockId : null;
    }
  }

  return null;
}

function getActiveTextblock(state: EditorState): ActiveTextblockInfo {
  const { $head } = state.selection;

  for (let depth = $head.depth; depth >= 0; depth -= 1) {
    const node = $head.node(depth);
    if (node.isTextblock) {
      return {
        node,
        offset: $head.pos - $head.start(depth),
      };
    }
  }

  return {
    node: $head.parent,
    offset: $head.parentOffset,
  };
}

function getBlockIndex(state: EditorState, blockId: string | null) {
  if (!blockId) {
    return null;
  }

  let currentIndex = 0;
  let matchedIndex: number | null = null;

  state.doc.descendants((node) => {
    if (!statusTrackedBlockNodeNames.has(node.type.name)) {
      return;
    }

    currentIndex += 1;
    const candidateBlockId = node.attrs.blockId;
    if (
      matchedIndex === null &&
      typeof candidateBlockId === 'string' &&
      candidateBlockId === blockId
    ) {
      matchedIndex = currentIndex;
    }
  });

  return matchedIndex;
}

function getBlockLocation(state: EditorState) {
  const activeTextblock = getActiveTextblock(state);
  const derivedLabels = collectWritingEditorDerivedLabels(state.doc);
  const textBeforeCursor = getWritingEditorNodeText(
    activeTextblock.node,
    derivedLabels,
    0,
    activeTextblock.offset,
  );
  const lines = textBeforeCursor.split('\n');
  const currentLine = Math.max(lines.length, 1);
  const currentColumn = (lines[lines.length - 1]?.length ?? 0) + 1;

  return {
    currentLine,
    currentColumn,
  };
}

function getSelectionCharacterCount(state: EditorState) {
  let selectionCharacterCount = 0;

  for (const range of state.selection.ranges) {
    const rawSelectionText = state.doc.textBetween(range.$from.pos, range.$to.pos, '\n\n', ' ');
    selectionCharacterCount += rawSelectionText.replace(/\s+/g, '').length;
  }

  return selectionCharacterCount;
}

function getActiveBlockInfo(state: EditorState, labels: DraftStatusResolverLabels): ActiveBlockInfo {
  if (isAncestorActive(state, 'figure')) {
    return {
      label: labels.blockFigure,
      blockId: findAncestorBlockId(state, 'figure'),
    };
  }

  if (isAncestorActive(state, 'ordered_list')) {
    return {
      label: labels.orderedList,
      blockId: findAncestorBlockId(state, 'ordered_list'),
    };
  }

  if (isAncestorActive(state, 'bullet_list')) {
    return {
      label: labels.bulletList,
      blockId: findAncestorBlockId(state, 'bullet_list'),
    };
  }

  if (isAncestorActive(state, 'blockquote')) {
    return {
      label: labels.blockquote,
      blockId: findAncestorBlockId(state, 'blockquote'),
    };
  }

  const activeTextblock = getActiveTextblock(state).node;
  const blockId = activeTextblock.attrs.blockId;
  const normalizedBlockId =
    typeof blockId === 'string' && blockId.trim() ? blockId : null;
  if (activeTextblock.type.name === 'heading') {
    const headingLevel = Number(activeTextblock.attrs.level) || 1;
    if (headingLevel === 1) {
      return {
        label: labels.heading1,
        blockId: normalizedBlockId,
      };
    }
    if (headingLevel === 2) {
      return {
        label: labels.heading2,
        blockId: normalizedBlockId,
      };
    }
    return {
      label: labels.heading3,
      blockId: normalizedBlockId,
    };
  }

  return {
    label: labels.paragraph,
    blockId: normalizedBlockId,
  };
}

function formatBlockValue(runtimeState: DraftEditorRuntimeState) {
  if (!runtimeState.activeBlockIndex) {
    return runtimeState.activeBlockLabel;
  }

  return `${runtimeState.activeBlockLabel} #${runtimeState.activeBlockIndex}`;
}

function createDraftFallbackRuntimeState(
  tab: WritingWorkspaceDraftTab,
  labels: DraftStatusResolverLabels,
): DraftEditorRuntimeState {
  const stats = collectWritingEditorStats(tab.document);

  return {
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
    paragraphCount: stats.paragraphCount,
    selectionCharacterCount: 0,
    activeBlockLabel: labels.paragraph,
    activeBlockIndex: null,
    currentLine: 1,
    currentColumn: 1,
    canUndo: false,
    canRedo: false,
  };
}

function formatStatusUrl(url: string) {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    return `${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return normalizedUrl;
  }
}

function createDraftEditorStatus(
  tab: WritingWorkspaceDraftTab,
  labels: EditorStatusContextLabels,
  draftRuntimeState?: DraftEditorRuntimeState,
): EditorStatusState {
  const runtimeState = draftRuntimeState ?? createDraftFallbackRuntimeState(tab, labels);
  const leftItems: EditorStatusItem[] = [
    {
      id: 'block',
      label: labels.block,
      value: formatBlockValue(runtimeState),
    },
    {
      id: 'line',
      label: labels.line,
      value: String(runtimeState.currentLine),
    },
    {
      id: 'column',
      label: labels.column,
      value: String(runtimeState.currentColumn),
    },
  ];

  if (runtimeState.selectionCharacterCount > 0) {
    leftItems.push({
      id: 'selection',
      label: labels.selection,
      value: String(runtimeState.selectionCharacterCount),
      tone: 'accent',
    });
  }

  return {
    ariaLabel: labels.statusbarAriaLabel,
    kind: 'draft',
    modeLabel: labels.draftMode,
    leftItems,
    rightItems: [
      {
        id: 'words',
        label: labels.words,
        value: String(runtimeState.wordCount),
      },
      {
        id: 'characters',
        label: labels.characters,
        value: String(runtimeState.characterCount),
      },
      {
        id: 'paragraphs',
        label: labels.paragraphs,
        value: String(runtimeState.paragraphCount),
      },
      {
        id: 'undo',
        label: labels.undo,
        value: runtimeState.canUndo ? labels.ready : '-',
        tone: runtimeState.canUndo ? 'accent' : 'muted',
        commandId: 'undo',
        commandEnabled: runtimeState.canUndo,
      },
      {
        id: 'redo',
        label: labels.redo,
        value: runtimeState.canRedo ? labels.ready : '-',
        tone: runtimeState.canRedo ? 'accent' : 'muted',
        commandId: 'redo',
        commandEnabled: runtimeState.canRedo,
      },
    ],
  };
}

function createContentEditorStatus(
  tab: Extract<WritingWorkspaceTab, { kind: 'web' | 'pdf' }>,
  labels: EditorStatusContextLabels,
): EditorStatusState {
  return {
    ariaLabel: labels.statusbarAriaLabel,
    kind: tab.kind === 'pdf' ? 'pdf' : 'web',
    modeLabel: tab.kind === 'pdf' ? labels.pdfMode : labels.sourceMode,
    leftItems: [],
    rightItems: [
      {
        id: 'url',
        label: labels.url,
        value: formatStatusUrl(tab.url),
      },
    ],
  };
}

export function createEditorStatus(
  activeTab: WritingWorkspaceTab | null,
  labels: EditorStatusContextLabels,
  draftRuntimeState?: DraftEditorRuntimeState,
): EditorStatusState {
  if (!activeTab) {
    return {
      ariaLabel: labels.statusbarAriaLabel,
      kind: 'empty',
      summary: labels.ready,
      leftItems: [],
      rightItems: [],
    };
  }

  if (activeTab.kind === 'draft') {
    return createDraftEditorStatus(activeTab, labels, draftRuntimeState);
  }

  return createContentEditorStatus(activeTab, labels);
}

export function createDraftEditorRuntimeState(
  state: EditorState,
  labels: DraftStatusResolverLabels,
): DraftEditorRuntimeState {
  const stats = collectWritingEditorStats(state.doc.toJSON());
  const activeBlock = getActiveBlockInfo(state, labels);
  const blockLocation = getBlockLocation(state);

  return {
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
    paragraphCount: stats.paragraphCount,
    selectionCharacterCount: getSelectionCharacterCount(state),
    activeBlockLabel: activeBlock.label,
    activeBlockIndex: getBlockIndex(state, activeBlock.blockId),
    currentLine: blockLocation.currentLine,
    currentColumn: blockLocation.currentColumn,
    canUndo: undoDepth(state) > 0,
    canRedo: redoDepth(state) > 0,
  };
}

export function areDraftEditorRuntimeStatesEqual(
  previous: DraftEditorRuntimeState | undefined,
  next: DraftEditorRuntimeState,
) {
  if (!previous) {
    return false;
  }

  return (
    previous.wordCount === next.wordCount &&
    previous.characterCount === next.characterCount &&
    previous.paragraphCount === next.paragraphCount &&
    previous.selectionCharacterCount === next.selectionCharacterCount &&
    previous.activeBlockLabel === next.activeBlockLabel &&
    previous.activeBlockIndex === next.activeBlockIndex &&
    previous.currentLine === next.currentLine &&
    previous.currentColumn === next.currentColumn &&
    previous.canUndo === next.canUndo &&
    previous.canRedo === next.canRedo
  );
}
