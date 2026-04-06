import {
  SUPPORTED_EDITOR_PANE_MODES,
  type EditorPaneMode,
  type EditorPlannedTabKind,
  getEditorPaneMode,
  isEditorDraftTabInput,
} from 'ls/workbench/browser/parts/editor/editorInput';
import type {
  DraftEditorStatusState,
} from 'ls/editor/browser/text/draftEditorStatusState';
import type {
  EditorWorkspaceTab,
} from 'ls/workbench/browser/parts/editor/editorModel';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import {
  createDirtyDraftTabIdSet,
  getDraftTabDisplayLabel as resolveDraftTabDisplayLabel,
  isClosableEditorTab,
} from 'ls/workbench/browser/parts/editor/editorTabPolicy';

export type EditorGroupTabState = {
  isActive: boolean;
  isClosable: boolean;
  isDirty: boolean;
  hasLocalHistory: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

export type EditorGroupTabItem = {
  id: string;
  kind: EditorPlannedTabKind;
  paneMode: EditorPaneMode;
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

// Topbar currently renders only supported pane modes.
// Planned modes are kept in the type surface for future wiring.
const FIXED_EDITOR_PANE_MODES = SUPPORTED_EDITOR_PANE_MODES;

function getTabDisplayLabel(
  tab: EditorWorkspaceTab,
  labels: EditorPartLabels,
  draftIndex: number,
  draftCount: number,
) {
  const paneMode = getEditorPaneMode(tab);

  switch (paneMode) {
    case 'draft':
      return isEditorDraftTabInput(tab)
        ? resolveDraftTabDisplayLabel({
            tab,
            draftModeLabel: labels.draftMode,
            draftIndex,
            draftCount,
          })
        : labels.draftMode;
    case 'pdf':
      return tab.title.trim() || labels.pdfMode;
    default:
      return tab.title.trim();
  }
}

function getTabDisplayTitle(
  tab: EditorWorkspaceTab,
  labels: EditorPartLabels,
  label: string,
) {
  const paneMode = getEditorPaneMode(tab);

  switch (paneMode) {
    case 'draft':
      return label || labels.draftMode;
    case 'browser':
      return label || labels.sourceMode;
    case 'pdf':
      return label || labels.pdfMode;
    default:
      return label;
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
    // Placeholder labels until localization + real pane contributions land.
    case 'file':
      return 'File';
    case 'terminal':
      return 'Terminal';
    case 'git-changes':
      return 'Git Changes';
    default:
      return labels.sourceMode;
  }
}

function getFallbackLabelForPaneMode(
  paneMode: EditorGroupTabItem['paneMode'],
) {
  switch (paneMode) {
    case 'file':
      return 'File';
    case 'terminal':
      return 'Terminal';
    case 'git-changes':
      return 'Git Changes';
    default:
      return '';
  }
}

function getDefaultTabKindForPaneMode(
  paneMode: EditorGroupTabItem['paneMode'],
): EditorPlannedTabKind {
  return paneMode;
}

export function createEditorGroupModel({
  tabs,
  activeTabId,
  activeTab,
  labels,
  draftStatusByTabId,
  dirtyDraftTabIds,
}: {
  tabs: EditorWorkspaceTab[];
  activeTabId: string | null;
  activeTab: EditorWorkspaceTab | null;
  labels: EditorPartLabels;
  draftStatusByTabId: Record<string, DraftEditorStatusState>;
  dirtyDraftTabIds: readonly string[];
}): EditorGroupModel {
  const activePaneMode = activeTab ? getEditorPaneMode(activeTab) : null;
  // Keep close/label behavior centralized by evaluating tab policy once per render.
  const dirtyDraftTabIdSet = createDirtyDraftTabIdSet(dirtyDraftTabIds);
  const draftTabIds = tabs
    .filter((tab) => isEditorDraftTabInput(tab))
    .map((tab) => tab.id);
  const normalizedTabs = tabs.map((tab) => {
    const draftIndex =
      isEditorDraftTabInput(tab) ? draftTabIds.indexOf(tab.id) : -1;
    const label = getTabDisplayLabel(
      tab,
      labels,
      Math.max(draftIndex, 0),
      draftTabIds.length,
    );
    const draftStatus = isEditorDraftTabInput(tab)
      ? draftStatusByTabId[tab.id]
      : undefined;
    const canUndo = Boolean(draftStatus?.canUndo);
    const canRedo = Boolean(draftStatus?.canRedo);
    const isDirty = isEditorDraftTabInput(tab)
      ? dirtyDraftTabIdSet.has(tab.id)
      : false;
    const isClosable = isClosableEditorTab(tab, dirtyDraftTabIdSet);

    return {
      id: tab.id,
      kind: tab.kind,
      paneMode: getEditorPaneMode(tab),
      label,
      title: getTabDisplayTitle(tab, labels, label),
      state: {
        isActive: tab.id === activeTabId,
        isClosable,
        isDirty,
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
        label: representativeTab?.label ?? getFallbackLabelForPaneMode(paneMode),
        title: representativeTab?.title || getFallbackTitleForPaneMode(paneMode, labels),
        targetTabId: representativeTab?.id ?? null,
        state: {
          isActive: activePaneMode === paneMode,
          isClosable: Boolean(
            representativeTab?.id && representativeTab.state.isClosable,
          ),
          isDirty: representativeTab?.state.isDirty ?? false,
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
