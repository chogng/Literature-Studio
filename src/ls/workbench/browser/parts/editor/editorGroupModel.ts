import {
  isWritingDraftEditorInput,
  isWritingPdfEditorInput,
} from 'ls/workbench/browser/editorInput';
import type {
  DraftEditorStatusState,
} from 'ls/editor/browser/text/draftEditorStatusState';
import type {
  WritingWorkspaceDraftTab,
  WritingWorkspaceTab,
} from 'ls/workbench/browser/writingEditorModel';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';

export type EditorGroupTabState = {
  isActive: boolean;
  isClosable: boolean;
  hasLocalHistory: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

export type EditorGroupTabItem = {
  id: string;
  kind: WritingWorkspaceTab['kind'];
  label: string;
  title: string;
  targetTabId: string | null;
  state: EditorGroupTabState;
};

export type EditorGroupModel = {
  tabs: EditorGroupTabItem[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
};

const FIXED_EDITOR_TAB_KINDS: ReadonlyArray<WritingWorkspaceTab['kind']> = [
  'draft',
  'browser',
  'pdf',
];

function getDraftTabDisplayLabel(
  tab: WritingWorkspaceDraftTab,
  labels: EditorPartLabels,
  index: number,
) {
  const normalizedTitle = tab.title.trim();
  return normalizedTitle || `${labels.draftMode} ${index + 1}`;
}

function getTabDisplayLabel(
  tab: WritingWorkspaceTab,
  labels: EditorPartLabels,
  draftIndex: number,
) {
  if (isWritingDraftEditorInput(tab)) {
    return getDraftTabDisplayLabel(tab, labels, draftIndex);
  }

  if (isWritingPdfEditorInput(tab)) {
    return tab.title.trim() || labels.pdfMode;
  }

  return tab.title.trim() || labels.sourceMode;
}

function resolveRepresentativeTab(
  tabs: Array<{
    id: string;
    kind: WritingWorkspaceTab['kind'];
    label: string;
    title: string;
    state: EditorGroupTabState;
  }>,
  activeTabId: string | null,
) {
  if (tabs.length === 0) {
    return null;
  }

  return tabs.find((tab) => tab.id === activeTabId) ?? tabs.at(-1) ?? null;
}

export function createEditorGroupModel({
  tabs,
  activeTabId,
  activeTab,
  labels,
  draftStatusByTabId,
}: {
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
  labels: EditorPartLabels;
  draftStatusByTabId: Record<string, DraftEditorStatusState>;
}): EditorGroupModel {
  const draftTabIds = tabs
    .filter((tab) => isWritingDraftEditorInput(tab))
    .map((tab) => tab.id);
  const normalizedTabs = tabs.map((tab) => {
    const draftIndex =
      isWritingDraftEditorInput(tab) ? draftTabIds.indexOf(tab.id) : -1;
    const label = getTabDisplayLabel(tab, labels, Math.max(draftIndex, 0));
    const draftStatus = isWritingDraftEditorInput(tab)
      ? draftStatusByTabId[tab.id]
      : undefined;
    const canUndo = Boolean(draftStatus?.canUndo);
    const canRedo = Boolean(draftStatus?.canRedo);

    return {
      id: tab.id,
      kind: tab.kind,
      label,
      title: label,
      state: {
        isActive: tab.id === activeTabId,
        isClosable: false,
        hasLocalHistory: canUndo || canRedo,
        canUndo,
        canRedo,
      },
    };
  });

  return {
    // The title strip renders three fixed mode tabs. Each entry points to the
    // most recent concrete workspace tab for that kind when one exists.
    tabs: FIXED_EDITOR_TAB_KINDS.map((kind) => {
      const matchingTabs = normalizedTabs.filter((tab) => tab.kind === kind);
      const representativeTab = resolveRepresentativeTab(
        matchingTabs,
        activeTab?.kind === kind ? activeTabId : null,
      );
      const fallbackTitle =
        kind === 'draft'
          ? labels.draftMode
          : kind === 'pdf'
            ? labels.pdfMode
            : labels.sourceMode;

      return {
        id: `${kind}-entry`,
        kind,
        label: representativeTab?.label ?? '',
        title: representativeTab?.title || fallbackTitle,
        targetTabId: representativeTab?.id ?? null,
        state: {
          isActive: activeTab?.kind === kind,
          isClosable: false,
          hasLocalHistory: representativeTab?.state.hasLocalHistory ?? false,
          canUndo: representativeTab?.state.canUndo ?? false,
          canRedo: representativeTab?.state.canRedo ?? false,
        },
      };
    }),
    activeTabId,
    activeTab,
  };
}
