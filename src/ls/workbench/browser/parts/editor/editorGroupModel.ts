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

// Topbar currently renders only supported pane modes.
// Planned modes are kept in the type surface for future wiring.
const FIXED_EDITOR_PANE_MODES = SUPPORTED_EDITOR_PANE_MODES;

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

function resolveRepresentativeTab(
  tabs: Array<{
    id: string;
    kind: EditorWorkspaceTab['kind'];
    paneMode: EditorGroupTabItem['paneMode'];
    label: string;
    title: string;
    faviconUrl?: string;
    state: EditorGroupTabState;
  }>,
) {
  if (tabs.length === 0) {
    return null;
  }

  // Fixed entries are stable anchors per pane mode. The first concrete tab
  // keeps ownership of that anchor; additional tabs are rendered behind it.
  return tabs[0] ?? null;
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
  paneMode: EditorPaneMode,
  tabId: string,
  activeTabId: string | null,
  browserFaviconUrl: string | undefined,
) {
  if (paneMode !== 'browser' || tabId !== activeTabId) {
    return '';
  }

  return sanitizeTabFaviconUrl(browserFaviconUrl);
}

export function createEditorGroupModel({
  tabs,
  activeTabId,
  activeTab,
  labels,
  draftStatusByTabId,
  dirtyDraftTabIds,
  browserFaviconUrl,
}: {
  tabs: EditorWorkspaceTab[];
  activeTabId: string | null;
  activeTab: EditorWorkspaceTab | null;
  labels: EditorPartLabels;
  draftStatusByTabId: Record<string, DraftEditorStatusState>;
  dirtyDraftTabIds: readonly string[];
  browserFaviconUrl?: string;
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
      faviconUrl: resolveTabFaviconUrl(
        paneMode,
        tab.id,
        activeTabId,
        browserFaviconUrl,
      ),
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

  const representativeTabIdByPaneMode = new Map<
    EditorGroupTabItem['paneMode'],
    string
  >();
  const fixedTabs = FIXED_EDITOR_PANE_MODES.map((paneMode) => {
    const matchingTabs = normalizedTabs.filter((tab) => tab.paneMode === paneMode);
    const representativeTab = resolveRepresentativeTab(matchingTabs);
    if (representativeTab?.id) {
      representativeTabIdByPaneMode.set(paneMode, representativeTab.id);
    }

    return {
      id: `${paneMode}-entry`,
      kind: representativeTab?.kind ?? getDefaultTabKindForPaneMode(paneMode),
      paneMode: representativeTab?.paneMode ?? paneMode,
      label: representativeTab?.label ?? getFallbackLabelForPaneMode(paneMode),
      title: representativeTab?.title || getFallbackTitleForPaneMode(paneMode, labels),
      faviconUrl: representativeTab?.faviconUrl ?? '',
      targetTabId: representativeTab?.id ?? null,
      state: {
        isActive: representativeTab?.id === activeTabId,
        isClosable: Boolean(
          representativeTab?.id && representativeTab.state.isClosable,
        ),
        isDirty: representativeTab?.state.isDirty ?? false,
        hasLocalHistory: representativeTab?.state.hasLocalHistory ?? false,
        canUndo: representativeTab?.state.canUndo ?? false,
        canRedo: representativeTab?.state.canRedo ?? false,
      },
    };
  });

  const extraTabs = normalizedTabs
    .filter((tab) => representativeTabIdByPaneMode.get(tab.paneMode) !== tab.id)
    .map((tab) => ({
      id: tab.id,
      kind: tab.kind,
      paneMode: tab.paneMode,
      label: tab.label,
      title: tab.title,
      faviconUrl: tab.faviconUrl ?? '',
      targetTabId: tab.id,
      state: tab.state,
    }));

  return {
    // Keep fixed pane-mode anchors first, then append additional concrete tabs.
    tabs: [...fixedTabs, ...extraTabs],
    activeTabId,
    activeTab,
  };
}
