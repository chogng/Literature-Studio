import {
  SUPPORTED_EDITOR_PANE_MODES,
  type SupportedEditorPaneMode,
  getEditorPaneMode,
  isEditorDraftTabInput,
} from 'ls/workbench/browser/parts/editor/editorInput';
import type {
  DraftEditorStatusState,
} from 'ls/editor/browser/text/draftEditorStatusState';
import type {
  EditorWorkspaceDraftTab,
  EditorWorkspaceTab,
} from 'ls/workbench/browser/parts/editor/editorModel';
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
  kind: EditorWorkspaceTab['kind'];
  paneMode: SupportedEditorPaneMode;
  label: string;
  title: string;
  targetTabId: string | null;
  state: EditorGroupTabState;
};

export type EditorGroupModel = {
  tabs: EditorGroupTabItem[];
  activeTabId: string | null;
  activeTab: EditorWorkspaceTab | null;
};

const FIXED_EDITOR_PANE_MODES = SUPPORTED_EDITOR_PANE_MODES;

function getDraftTabDisplayLabel(
  tab: EditorWorkspaceDraftTab,
  labels: EditorPartLabels,
  index: number,
) {
  const normalizedTitle = tab.title.trim();
  return normalizedTitle || `${labels.draftMode} ${index + 1}`;
}

function getTabDisplayLabel(
  tab: EditorWorkspaceTab,
  labels: EditorPartLabels,
  draftIndex: number,
) {
  const paneMode = getEditorPaneMode(tab);

  switch (paneMode) {
    case 'draft':
      return isEditorDraftTabInput(tab)
        ? getDraftTabDisplayLabel(tab, labels, draftIndex)
        : labels.draftMode;
    case 'pdf':
      return tab.title.trim() || labels.pdfMode;
    default:
      return tab.title.trim() || labels.sourceMode;
  }
}

function resolveRepresentativeTab(
  tabs: Array<{
    id: string;
    kind: EditorWorkspaceTab['kind'];
    paneMode: EditorGroupTabItem['paneMode'];
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

function getFallbackTitleForPaneMode(
  paneMode: EditorGroupTabItem['paneMode'],
  labels: EditorPartLabels,
) {
  switch (paneMode) {
    case 'draft':
      return labels.draftMode;
    case 'pdf':
      return labels.pdfMode;
    default:
      return labels.sourceMode;
  }
}

function getDefaultTabKindForPaneMode(
  paneMode: EditorGroupTabItem['paneMode'],
): EditorWorkspaceTab['kind'] {
  return paneMode;
}

export function createEditorGroupModel({
  tabs,
  activeTabId,
  activeTab,
  labels,
  draftStatusByTabId,
}: {
  tabs: EditorWorkspaceTab[];
  activeTabId: string | null;
  activeTab: EditorWorkspaceTab | null;
  labels: EditorPartLabels;
  draftStatusByTabId: Record<string, DraftEditorStatusState>;
}): EditorGroupModel {
  const activePaneMode = activeTab ? getEditorPaneMode(activeTab) : null;
  const draftTabIds = tabs
    .filter((tab) => isEditorDraftTabInput(tab))
    .map((tab) => tab.id);
  const normalizedTabs = tabs.map((tab) => {
    const draftIndex =
      isEditorDraftTabInput(tab) ? draftTabIds.indexOf(tab.id) : -1;
    const label = getTabDisplayLabel(tab, labels, Math.max(draftIndex, 0));
    const draftStatus = isEditorDraftTabInput(tab)
      ? draftStatusByTabId[tab.id]
      : undefined;
    const canUndo = Boolean(draftStatus?.canUndo);
    const canRedo = Boolean(draftStatus?.canRedo);

    return {
      id: tab.id,
      kind: tab.kind,
      paneMode: getEditorPaneMode(tab),
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
    // The title strip renders fixed pane modes. Each entry points to the
    // most recent concrete workspace tab for that pane mode when one exists.
    tabs: FIXED_EDITOR_PANE_MODES.map((paneMode) => {
      const matchingTabs = normalizedTabs.filter((tab) => tab.paneMode === paneMode);
      const representativeTab = resolveRepresentativeTab(
        matchingTabs,
        activePaneMode === paneMode ? activeTabId : null,
      );

      return {
        id: `${paneMode}-entry`,
        kind: representativeTab?.kind ?? getDefaultTabKindForPaneMode(paneMode),
        paneMode: representativeTab?.paneMode ?? paneMode,
        label: representativeTab?.label ?? '',
        title: representativeTab?.title || getFallbackTitleForPaneMode(paneMode, labels),
        targetTabId: representativeTab?.id ?? null,
        state: {
          isActive: activePaneMode === paneMode,
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
