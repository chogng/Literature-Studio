import {
  createEmptyWritingEditorDocument,
  createWritingEditorDocumentFromPlainText,
  normalizeWritingEditorDocument,
  type WritingEditorDocument,
  writingEditorDocumentToPlainText,
} from './writingEditorDocument';

export type { WritingEditorDocument } from './writingEditorDocument';

export type WritingEditorViewMode = 'draft';

export type WritingWorkspaceDraftTab = {
  id: string;
  kind: 'draft';
  title: string;
  document: WritingEditorDocument;
  viewMode: WritingEditorViewMode;
};

export type WritingWorkspaceWebTab = {
  id: string;
  kind: 'web';
  title: string;
  url: string;
};

export type WritingWorkspacePdfTab = {
  id: string;
  kind: 'pdf';
  title: string;
  url: string;
};

// Preview tabs only store editor input metadata. The active preview tab temporarily owns one shared
// preview surface instead of spawning a dedicated browser/view instance per tab.
export type WritingWorkspacePreviewTab =
  | WritingWorkspaceWebTab
  | WritingWorkspacePdfTab;

export type WritingWorkspaceTab =
  | WritingWorkspaceDraftTab
  | WritingWorkspacePreviewTab;

type WritingWorkspaceState = {
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
};

export type WritingEditorModelSnapshot = {
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
  activeTab: WritingWorkspaceTab | null;
  draftDocument: WritingEditorDocument;
  draftBody: string;
};

type WritingEditorModelListener = () => void;

type StoredWritingWorkspaceState = {
  tabs?: unknown;
  activeTabId?: unknown;
  mruTabIds?: unknown;
};

const DEFAULT_VIEW_MODE: WritingEditorViewMode = 'draft';

const draftStorageKeys = {
  title: 'ls.writingDraft.title',
  body: 'ls.writingDraft.body',
  document: 'ls.writingDraft.document',
  viewMode: 'ls.writingDraft.viewMode',
  workspace: 'ls.writingWorkspace.state',
} as const;

function readStoredValue(key: string): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function persistDraftValue(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(key, value);
      return;
    }

    window.localStorage.removeItem(key);
  } catch {
    // Ignore local storage failures so the editor still works in restricted runtimes.
  }
}

function createWorkspaceTabId(prefix: 'draft' | 'web' | 'pdf') {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `ls-${prefix}-tab-${Date.now().toString(36)}-${randomPart}`;
}

function readStoredViewMode(): WritingEditorViewMode {
  const value = readStoredValue(draftStorageKeys.viewMode);
  if (value === 'draft') {
    return value;
  }

  // Legacy split mode is removed; migrate old values back to draft.
  if (value === 'split') {
    return DEFAULT_VIEW_MODE;
  }

  return DEFAULT_VIEW_MODE;
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

function getPreviewTabTitle(url: string) {
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

function createPreviewTab<K extends WritingWorkspacePreviewTab['kind']>(
  kind: K,
  url: string,
  initial?: Partial<Pick<Extract<WritingWorkspacePreviewTab, { kind: K }>, 'id' | 'title'>>,
): Extract<WritingWorkspacePreviewTab, { kind: K }> {
  const normalizedUrl = url.trim();

  return {
    id: initial?.id ?? createWorkspaceTabId(kind),
    kind,
    title: initial?.title?.trim() || getPreviewTabTitle(normalizedUrl),
    url: normalizedUrl,
  } as Extract<WritingWorkspacePreviewTab, { kind: K }>;
}

function createWebTab(
  url: string,
  initial?: Partial<Pick<WritingWorkspaceWebTab, 'id' | 'title'>>,
): WritingWorkspaceWebTab {
  return createPreviewTab('web', url, initial);
}

function createPdfTab(
  url: string,
  initial?: Partial<Pick<WritingWorkspacePdfTab, 'id' | 'title'>>,
): WritingWorkspacePdfTab {
  return createPreviewTab('pdf', url, initial);
}

function normalizeWorkspaceTab(value: unknown): WritingWorkspaceTab | null {
  const candidate = value as Partial<WritingWorkspaceTab> | null | undefined;
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

  if (candidate.kind === 'web' && typeof candidate.url === 'string') {
    return createWebTab(candidate.url, {
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

function readStoredDocument(): WritingEditorDocument {
  const rawDocument = readStoredValue(draftStorageKeys.document);
  if (rawDocument) {
    try {
      return normalizeWritingEditorDocument(JSON.parse(rawDocument));
    } catch {
      return createEmptyWritingEditorDocument();
    }
  }

  // Migrate legacy textarea drafts into the structured ProseMirror document once.
  const legacyBody = readStoredValue(draftStorageKeys.body);
  return legacyBody
    ? createWritingEditorDocumentFromPlainText(legacyBody)
    : createEmptyWritingEditorDocument();
}

function migrateLegacyWorkspaceState(): WritingWorkspaceState {
  const initialDraftTab = createDraftTab({
    title: readStoredValue(draftStorageKeys.title),
    document: readStoredDocument(),
    viewMode: readStoredViewMode(),
  });

  return {
    tabs: [initialDraftTab],
    activeTabId: initialDraftTab.id,
    mruTabIds: [initialDraftTab.id],
  };
}

function readStoredWorkspaceState(): WritingWorkspaceState {
  const rawWorkspace = readStoredValue(draftStorageKeys.workspace);
  if (!rawWorkspace) {
    return migrateLegacyWorkspaceState();
  }

  try {
    const parsedWorkspace = JSON.parse(rawWorkspace) as StoredWritingWorkspaceState;
    const tabs = Array.isArray(parsedWorkspace.tabs)
      ? parsedWorkspace.tabs
          .map((tab) => normalizeWorkspaceTab(tab))
          .filter((tab): tab is WritingWorkspaceTab => Boolean(tab))
      : [];
    const activeTabId =
      typeof parsedWorkspace.activeTabId === 'string'
        ? parsedWorkspace.activeTabId
        : null;
    const mruTabIds = Array.isArray(parsedWorkspace.mruTabIds)
      ? parsedWorkspace.mruTabIds.filter(
          (tabId): tabId is string => typeof tabId === 'string',
        )
      : [];

    return normalizeWorkspaceState({
      tabs,
      activeTabId,
      mruTabIds,
    });
  } catch {
    return migrateLegacyWorkspaceState();
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
  const activeDraftTab = activeTab?.kind === 'draft' ? activeTab : null;
  const contextDraftTab = resolveContextDraftTab(workspaceState, activeTab);

  return {
    tabs: workspaceState.tabs,
    activeTabId: workspaceState.activeTabId,
    mruTabIds: workspaceState.mruTabIds,
    activeTab,
    draftDocument: activeDraftTab?.document ?? createEmptyWritingEditorDocument(),
    draftBody: contextDraftTab
      ? writingEditorDocumentToPlainText(contextDraftTab.document)
      : '',
  };
}

function persistWorkspaceState(workspaceState: WritingWorkspaceState) {
  persistDraftValue(
    draftStorageKeys.workspace,
    JSON.stringify({
      tabs: workspaceState.tabs,
      activeTabId: workspaceState.activeTabId,
      mruTabIds: workspaceState.mruTabIds,
    }),
  );
}

function persistContextDraftState(
  workspaceState: WritingWorkspaceState,
  activeTab: WritingWorkspaceTab | null,
) {
  const contextDraftTab = resolveContextDraftTab(workspaceState, activeTab);
  persistDraftValue(draftStorageKeys.title, contextDraftTab?.title ?? '');
  persistDraftValue(
    draftStorageKeys.document,
    contextDraftTab ? JSON.stringify(contextDraftTab.document) : '',
  );
  persistDraftValue(
    draftStorageKeys.body,
    contextDraftTab ? writingEditorDocumentToPlainText(contextDraftTab.document) : '',
  );
  persistDraftValue(
    draftStorageKeys.viewMode,
    contextDraftTab?.viewMode ?? DEFAULT_VIEW_MODE,
  );
}

function persistWorkspaceSnapshot(workspaceState: WritingWorkspaceState) {
  const activeTab = resolveActiveTab(workspaceState);
  persistWorkspaceState(workspaceState);
  persistContextDraftState(workspaceState, activeTab);
}

export class WritingEditorModel {
  private workspaceState: WritingWorkspaceState;
  private snapshot: WritingEditorModelSnapshot;
  private listeners = new Set<WritingEditorModelListener>();

  constructor(initialState: WritingWorkspaceState = readStoredWorkspaceState()) {
    this.workspaceState = normalizeWorkspaceState(initialState);
    this.snapshot = createWritingEditorModelSnapshot(this.workspaceState);
    persistWorkspaceSnapshot(this.workspaceState);
  }

  readonly subscribe = (listener: WritingEditorModelListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

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

  readonly createWebTab = (url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    this.updateWorkspaceState((state) => {
      // Mirror upstream open-editor behavior: the same preview resource re-activates its tab
      // instead of creating duplicate entries in the strip.
      const existingTab = state.tabs.find(
        (tab) => tab.kind === 'web' && tab.url === normalizedUrl,
      );
      if (existingTab) {
        return {
          ...state,
          activeTabId: existingTab.id,
          mruTabIds: touchMruTab(state.mruTabIds, existingTab.id),
        };
      }

      const nextTab = createWebTab(normalizedUrl);
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
    this.updateWorkspaceState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId && tab.kind === 'draft'
          ? {
              ...tab,
              document: normalizeWritingEditorDocument(value),
            }
          : tab,
      ),
    }));
  };

  readonly updateActivePreviewTabUrl = (url: string) => {
    const normalizedUrl = url.trim();
    this.updateWorkspaceState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        // When the shared preview navigates while a preview tab owns it, update that tab's
        // input so the tab title/url stay consistent with the visible editor content.
        tab.id === state.activeTabId && tab.kind !== 'draft'
          ? {
              ...tab,
              url: normalizedUrl,
              title: getPreviewTabTitle(normalizedUrl),
            }
          : tab,
      ),
    }));
  };

  readonly dispose = () => {
    this.listeners.clear();
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private updateWorkspaceState(
    updater: (state: WritingWorkspaceState) => WritingWorkspaceState,
  ) {
    this.workspaceState = normalizeWorkspaceState(updater(this.workspaceState));
    this.snapshot = createWritingEditorModelSnapshot(this.workspaceState);
    persistWorkspaceSnapshot(this.workspaceState);
    this.emitChange();
  }
}

export function createWritingEditorModel(
  initialState: WritingWorkspaceState = readStoredWorkspaceState(),
) {
  return new WritingEditorModel(initialState);
}
