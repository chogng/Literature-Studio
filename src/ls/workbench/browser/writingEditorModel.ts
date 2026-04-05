import { createEmptyWritingEditorDocument, normalizeWritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

import { createWritingLiveDraftState } from 'ls/workbench/browser/writingEditorLiveState';
import { createWritingEditorStorage } from 'ls/workbench/browser/writingEditorStorage';

export type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

export type WritingEditorViewMode = 'draft';

export type WritingWorkspaceDraftTab = {
  id: string;
  kind: 'draft';
  title: string;
  document: WritingEditorDocument;
  viewMode: WritingEditorViewMode;
};

export type WritingWorkspaceBrowserTab = {
  id: string;
  kind: 'browser';
  title: string;
  url: string;
};

export type WritingWorkspacePdfTab = {
  id: string;
  kind: 'pdf';
  title: string;
  url: string;
};

// Content tabs only store editor input metadata. The active content tab temporarily owns one shared
// web-content surface instead of spawning a dedicated browser/view instance per tab.
export type WritingWorkspaceContentTab =
  | WritingWorkspaceBrowserTab
  | WritingWorkspacePdfTab;

export type WritingWorkspaceTab =
  | WritingWorkspaceDraftTab
  | WritingWorkspaceContentTab;

export type WritingWorkspaceState = {
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
};

export type WritingEditorModelSnapshot = {
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
  activeTab: WritingWorkspaceTab | null;
};

type WritingEditorModelListener = () => void;

const DEFAULT_VIEW_MODE: WritingEditorViewMode = 'draft';

function createWorkspaceTabId(prefix: 'draft' | 'browser' | 'pdf') {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `ls-${prefix}-tab-${Date.now().toString(36)}-${randomPart}`;
}

function createDraftTab(
  initial?: Partial<Pick<WritingWorkspaceDraftTab, 'id' | 'title' | 'document' | 'viewMode'>>,
): WritingWorkspaceDraftTab {
  return {
    id: initial?.id ?? createWorkspaceTabId('draft'),
    kind: 'draft',
    title: initial?.title ?? '',
    document: normalizeWritingEditorDocument(
      initial?.document ?? createEmptyWritingEditorDocument(),
    ),
    viewMode: initial?.viewMode === 'draft' ? initial.viewMode : DEFAULT_VIEW_MODE,
  };
}

function createNormalizedDocumentKey(document: WritingEditorDocument) {
  return JSON.stringify(normalizeWritingEditorDocument(document));
}

function getContentTabTitle(url: string) {
  if (!url.trim()) {
    return '';
  }

  try {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const lastPathSegment = pathSegments[pathSegments.length - 1];
    return lastPathSegment
      ? `${parsedUrl.hostname}/${lastPathSegment}`
      : parsedUrl.hostname;
  } catch {
    return url;
  }
}

function createContentTab<K extends WritingWorkspaceContentTab['kind']>(
  kind: K,
  url: string,
  initial?: Partial<Pick<Extract<WritingWorkspaceContentTab, { kind: K }>, 'id' | 'title'>>,
): Extract<WritingWorkspaceContentTab, { kind: K }> {
  const normalizedUrl = url.trim();

  return {
    id: initial?.id ?? createWorkspaceTabId(kind),
    kind,
    title: initial?.title?.trim() || getContentTabTitle(normalizedUrl),
    url: normalizedUrl,
  } as Extract<WritingWorkspaceContentTab, { kind: K }>;
}

function createBrowserTab(
  url: string,
  initial?: Partial<Pick<WritingWorkspaceBrowserTab, 'id' | 'title'>>,
): WritingWorkspaceBrowserTab {
  return createContentTab('browser', url, initial);
}

function createPdfTab(
  url: string,
  initial?: Partial<Pick<WritingWorkspacePdfTab, 'id' | 'title'>>,
): WritingWorkspacePdfTab {
  return createContentTab('pdf', url, initial);
}

function normalizeWorkspaceTab(value: unknown): WritingWorkspaceTab | null {
  const candidate = value as Partial<WritingWorkspaceTab> | null | undefined;
  const rawCandidate = value as { kind?: unknown; url?: unknown } | null | undefined;
  const legacyKind = rawCandidate?.kind;
  if (!candidate || typeof candidate !== 'object' || typeof candidate.id !== 'string') {
    return null;
  }

  if (candidate.kind === 'draft') {
    return createDraftTab({
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : '',
      document: candidate.document,
      viewMode: candidate.viewMode,
    });
  }

  if (
    (candidate.kind === 'browser' || legacyKind === 'web') &&
    typeof rawCandidate?.url === 'string'
  ) {
    return createBrowserTab(rawCandidate.url, {
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : '',
    });
  }

  if (candidate.kind === 'pdf' && typeof candidate.url === 'string') {
    return createPdfTab(candidate.url, {
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : '',
    });
  }

  return null;
}

function toUniqueIds(values: ReadonlyArray<string>) {
  return Array.from(new Set(values));
}

function touchMruTab(mruTabIds: ReadonlyArray<string>, tabId: string) {
  return [tabId, ...mruTabIds.filter((value) => value !== tabId)];
}

function normalizeWorkspaceState(
  state: WritingWorkspaceState,
): WritingWorkspaceState {
  const tabs = state.tabs;
  const tabIdSet = new Set(tabs.map((tab) => tab.id));
  const normalizedMruTabIds = toUniqueIds(
    [...state.mruTabIds, ...tabs.map((tab) => tab.id)].filter((tabId) =>
      tabIdSet.has(tabId),
    ),
  );

  const activeTabId =
    state.activeTabId && tabIdSet.has(state.activeTabId)
      ? state.activeTabId
      : normalizedMruTabIds[0] ?? tabs[0]?.id ?? null;

  return {
    tabs,
    activeTabId,
    mruTabIds: activeTabId
      ? touchMruTab(normalizedMruTabIds, activeTabId)
      : normalizedMruTabIds,
  };
}

function migrateLegacyWorkspaceState(
  storage = createWritingEditorStorage(),
): WritingWorkspaceState {
  const legacyDraftState = storage.readLegacyDraftState();
  const initialDraftTab = createDraftTab({
    title: legacyDraftState.title,
    document: legacyDraftState.document,
    viewMode: legacyDraftState.viewMode,
  });

  return {
    tabs: [initialDraftTab],
    activeTabId: initialDraftTab.id,
    mruTabIds: [initialDraftTab.id],
  };
}

function readStoredWorkspaceState(
  storage = createWritingEditorStorage(),
): WritingWorkspaceState {
  const rawWorkspace = storage.readWorkspaceState();
  if (!rawWorkspace) {
    return migrateLegacyWorkspaceState(storage);
  }

  try {
    const tabs = Array.isArray(rawWorkspace.tabs)
      ? rawWorkspace.tabs
          .map((tab) => normalizeWorkspaceTab(tab))
          .filter((tab): tab is WritingWorkspaceTab => Boolean(tab))
      : [];
    const activeTabId =
      typeof rawWorkspace.activeTabId === 'string'
        ? rawWorkspace.activeTabId
        : null;
    const mruTabIds = Array.isArray(rawWorkspace.mruTabIds)
      ? rawWorkspace.mruTabIds.filter(
          (tabId): tabId is string => typeof tabId === 'string',
        )
      : [];

    return normalizeWorkspaceState({
      tabs,
      activeTabId,
      mruTabIds,
    });
  } catch {
    return migrateLegacyWorkspaceState(storage);
  }
}

function resolveActiveTab(workspaceState: WritingWorkspaceState) {
  return (
    workspaceState.tabs.find((tab) => tab.id === workspaceState.activeTabId) ??
    workspaceState.tabs[0] ??
    null
  );
}

function resolveContextDraftTab(
  workspaceState: WritingWorkspaceState,
  activeTab: WritingWorkspaceTab | null,
) {
  if (activeTab?.kind === 'draft') {
    return activeTab;
  }

  const tabById = new Map(workspaceState.tabs.map((tab) => [tab.id, tab] as const));
  return (
    workspaceState.mruTabIds
      .map((tabId) => tabById.get(tabId))
      .find((tab): tab is WritingWorkspaceDraftTab => tab?.kind === 'draft') ?? null
  );
}

function createWritingEditorModelSnapshot(
  workspaceState: WritingWorkspaceState,
): WritingEditorModelSnapshot {
  const activeTab = resolveActiveTab(workspaceState);

  return {
    tabs: workspaceState.tabs,
    activeTabId: workspaceState.activeTabId,
    mruTabIds: workspaceState.mruTabIds,
    activeTab,
  };
}

export class WritingEditorModel {
  private workspaceState: WritingWorkspaceState;
  private snapshot: WritingEditorModelSnapshot;
  private readonly liveDraftState = createWritingLiveDraftState();
  private readonly storage = createWritingEditorStorage();
  private listeners = new Set<WritingEditorModelListener>();

  constructor(initialState: WritingWorkspaceState = readStoredWorkspaceState()) {
    this.workspaceState = normalizeWorkspaceState(initialState);
    this.syncLiveDraftState();
    this.snapshot = createWritingEditorModelSnapshot(this.workspaceState);
    this.storage.save(this.createPersistedState());
  }

  readonly subscribe = (listener: WritingEditorModelListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;
  readonly getDraftBody = () => this.liveDraftState.getContextDraftBody();
  readonly getDraftDocument = () => this.liveDraftState.getActiveDraftDocument();

  readonly activateTab = (tabId: string) => {
    this.updateWorkspaceState((state) => ({
      ...state,
      activeTabId: tabId,
      mruTabIds: touchMruTab(state.mruTabIds, tabId),
    }));
  };

  readonly closeTab = (tabId: string) => {
    this.updateWorkspaceState((state) => ({
      tabs: state.tabs.filter((tab) => tab.id !== tabId),
      activeTabId: state.activeTabId === tabId ? null : state.activeTabId,
      mruTabIds: state.mruTabIds.filter((id) => id !== tabId),
    }));
  };

  readonly createDraftTab = () => {
    const nextTab = createDraftTab();
    this.updateWorkspaceState((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
      mruTabIds: touchMruTab(state.mruTabIds, nextTab.id),
    }));
  };

  readonly createBrowserTab = (url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    this.updateWorkspaceState((state) => {
      // Mirror upstream open-editor behavior: the same web content resource re-activates its tab
      // instead of creating duplicate entries in the strip.
      const existingTab = state.tabs.find(
        (tab) => tab.kind === 'browser' && tab.url === normalizedUrl,
      );
      if (existingTab) {
        return {
          ...state,
          activeTabId: existingTab.id,
          mruTabIds: touchMruTab(state.mruTabIds, existingTab.id),
        };
      }

      const nextTab = createBrowserTab(normalizedUrl);
      return {
        tabs: [...state.tabs, nextTab],
        activeTabId: nextTab.id,
        mruTabIds: touchMruTab(state.mruTabIds, nextTab.id),
      };
    });
  };

  readonly createPdfTab = (url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    this.updateWorkspaceState((state) => {
      // Keep PDF tabs aligned with web tabs: one resource maps to one tab/input entry.
      const existingTab = state.tabs.find(
        (tab) => tab.kind === 'pdf' && tab.url === normalizedUrl,
      );
      if (existingTab) {
        return {
          ...state,
          activeTabId: existingTab.id,
          mruTabIds: touchMruTab(state.mruTabIds, existingTab.id),
        };
      }

      const nextTab = createPdfTab(normalizedUrl);
      return {
        tabs: [...state.tabs, nextTab],
        activeTabId: nextTab.id,
        mruTabIds: touchMruTab(state.mruTabIds, nextTab.id),
      };
    });
  };

  readonly setDraftDocument = (value: WritingEditorDocument) => {
    const normalizedDocument = normalizeWritingEditorDocument(value);
    const currentActiveDraftTab =
      this.workspaceState.tabs.find(
        (tab): tab is WritingWorkspaceDraftTab =>
          tab.id === this.workspaceState.activeTabId && tab.kind === 'draft',
      ) ?? null;

    if (
      currentActiveDraftTab &&
      createNormalizedDocumentKey(currentActiveDraftTab.document) ===
        createNormalizedDocumentKey(normalizedDocument)
    ) {
      return;
    }

    this.updateWorkspaceState(
      (state) => ({
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId && tab.kind === 'draft'
            ? {
                ...tab,
                document: normalizedDocument,
              }
            : tab,
        ),
      }),
      { persist: 'debounced' },
    );
  };

  readonly updateActiveContentTabUrl = (url: string) => {
    const normalizedUrl = url.trim();
    this.updateWorkspaceState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        // When the shared web content view navigates while a content tab owns it, update that tab's
        // input so the tab title/url stay consistent with the visible editor content.
        tab.id === state.activeTabId && tab.kind !== 'draft'
          ? {
              ...tab,
              url: normalizedUrl,
              title: getContentTabTitle(normalizedUrl),
            }
          : tab,
      ),
    }));
  };

  readonly dispose = () => {
    this.storage.dispose();
    this.listeners.clear();
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private updateWorkspaceState(
    updater: (state: WritingWorkspaceState) => WritingWorkspaceState,
    options: { persist?: 'immediate' | 'debounced' } = {},
  ) {
    this.workspaceState = normalizeWorkspaceState(updater(this.workspaceState));
    this.syncLiveDraftState();
    this.snapshot = createWritingEditorModelSnapshot(this.workspaceState);
    if (options.persist === 'debounced') {
      this.storage.scheduleSave(this.createPersistedState());
    } else {
      this.storage.save(this.createPersistedState());
    }
    this.emitChange();
  }

  private syncLiveDraftState() {
    const activeTab = resolveActiveTab(this.workspaceState);
    const activeDraftTab = activeTab?.kind === 'draft' ? activeTab : null;
    const contextDraftTab = resolveContextDraftTab(this.workspaceState, activeTab);
    this.liveDraftState.sync({
      activeDraftDocument: activeDraftTab?.document ?? null,
      contextDraftDocument: contextDraftTab?.document ?? null,
    });
  }

  private createPersistedState() {
    const activeTab = resolveActiveTab(this.workspaceState);

    return {
      workspaceState: {
        tabs: this.workspaceState.tabs,
        activeTabId: this.workspaceState.activeTabId,
        mruTabIds: this.workspaceState.mruTabIds,
      },
      contextDraftTab: resolveContextDraftTab(this.workspaceState, activeTab),
    };
  }
}

export function createWritingEditorModel(
  initialState: WritingWorkspaceState = readStoredWorkspaceState(),
) {
  return new WritingEditorModel(initialState);
}
