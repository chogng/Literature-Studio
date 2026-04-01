import type {
  DraftEditorRuntimeState,
} from 'ls/editor/browser/shared/editorStatus';
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
  state: EditorGroupTabState;
};

export type EditorGroupModel = {
  tabs: EditorGroupTabItem[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
};

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
  if (tab.kind === 'draft') {
    return getDraftTabDisplayLabel(tab, labels, draftIndex);
  }

  if (tab.kind === 'pdf') {
    return tab.title.trim() || labels.pdfMode;
  }

  return tab.title.trim() || labels.sourceMode;
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
  draftStatusByTabId: Record<string, DraftEditorRuntimeState>;
}): EditorGroupModel {
  const draftTabIds = tabs
    .filter((tab) => tab.kind === 'draft')
    .map((tab) => tab.id);

  return {
    // The view layer only consumes this normalized tab shape so title controls
    // do not need to understand draft numbering or per-kind fallback labels.
    tabs: tabs.map((tab) => {
      const draftIndex =
        tab.kind === 'draft' ? draftTabIds.indexOf(tab.id) : -1;
      const label = getTabDisplayLabel(tab, labels, Math.max(draftIndex, 0));
      const draftStatus = tab.kind === 'draft' ? draftStatusByTabId[tab.id] : undefined;
      const canUndo = Boolean(draftStatus?.canUndo);
      const canRedo = Boolean(draftStatus?.canRedo);

      return {
        id: tab.id,
        kind: tab.kind,
        label,
        title: label,
        state: {
          isActive: tab.id === activeTabId,
          isClosable: true,
          hasLocalHistory: canUndo || canRedo,
          canUndo,
          canRedo,
        },
      };
    }),
    activeTabId,
    activeTab,
  };
}
