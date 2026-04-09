import {
  SUPPORTED_EDITOR_PANE_MODES,
  type EditorPaneMode,
  type EditorPlannedTabKind,
  getEditorPaneMode,
  isEditorBrowserTabInput,
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
  isReusableEmptyDraftTab,
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
  faviconUrl?: string;
  targetTabId: string | null;
  state: EditorGroupTabState;
};

export type EditorGroupModel = {
  tabs: EditorGroupTabItem[];
  activeTabId: string | null;
  activeTab: EditorWorkspaceTab | null;
};

function getTabDisplayLabel(
  tab: EditorWorkspaceTab,
  labels: EditorPartLabels,
  draftIndex: number,
  draftCount: number,
  isReusableEmptyDraft: boolean,
  isDirtyDraft: boolean,
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
            isReusableEmpty: isReusableEmptyDraft,
            isDirty: isDirtyDraft,
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

function sanitizeTabFaviconUrl(value: string | undefined) {
  return String(value ?? '').trim();
}

function resolveTabFaviconUrl(
  tab: EditorWorkspaceTab,
) {
  if (!isEditorBrowserTabInput(tab)) {
    return '';
  }

  return sanitizeTabFaviconUrl(tab.faviconUrl);
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
  // Keep close/label behavior centralized by evaluating tab policy once per render.
  const dirtyDraftTabIdSet = createDirtyDraftTabIdSet(dirtyDraftTabIds);
  const draftTabIds = tabs
    .filter((tab) => isEditorDraftTabInput(tab))
    .map((tab) => tab.id);
  const normalizedTabs = tabs.map((tab) => {
    const paneMode = getEditorPaneMode(tab);
    const draftIndex =
      isEditorDraftTabInput(tab) ? draftTabIds.indexOf(tab.id) : -1;
    const isDirty = isEditorDraftTabInput(tab)
      ? dirtyDraftTabIdSet.has(tab.id)
      : false;
    const isReusableEmptyDraft = isEditorDraftTabInput(tab)
      ? isReusableEmptyDraftTab(tab, dirtyDraftTabIdSet)
      : false;
    const label = getTabDisplayLabel(
      tab,
      labels,
      Math.max(draftIndex, 0),
      draftTabIds.length,
      isReusableEmptyDraft,
      isDirty,
    );
    const draftStatus = isEditorDraftTabInput(tab)
      ? draftStatusByTabId[tab.id]
      : undefined;
    const canUndo = Boolean(draftStatus?.canUndo);
    const canRedo = Boolean(draftStatus?.canRedo);
    const isClosable = isClosableEditorTab(tab, dirtyDraftTabIdSet);

    return {
      id: tab.id,
      kind: tab.kind,
      paneMode,
      label,
      title: getTabDisplayTitle(tab, labels, label),
      faviconUrl: resolveTabFaviconUrl(tab),
      targetTabId: tab.id,
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

  const presentPaneModes = new Set(normalizedTabs.map((tab) => tab.paneMode));
  const placeholderTabs = SUPPORTED_EDITOR_PANE_MODES
    .filter((paneMode) => !presentPaneModes.has(paneMode))
    .map((paneMode) => ({
      id: `${paneMode}-entry`,
      kind: getDefaultTabKindForPaneMode(paneMode),
      paneMode,
      label: getFallbackLabelForPaneMode(paneMode),
      title: getFallbackTitleForPaneMode(paneMode, labels),
      faviconUrl: '',
      targetTabId: null,
      state: {
        isActive: false,
        isClosable: false,
        isDirty: false,
        hasLocalHistory: false,
        canUndo: false,
        canRedo: false,
      },
    }));

  return {
    // Real tabs keep their workspace order. Missing pane modes append a placeholder entry.
    tabs: [...normalizedTabs, ...placeholderTabs],
    activeTabId,
    activeTab,
  };
}
