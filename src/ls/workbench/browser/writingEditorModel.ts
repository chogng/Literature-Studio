import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collectWritingEditorStats,
  createEmptyWritingEditorDocument,
  createWritingEditorDocumentFromPlainText,
  normalizeWritingEditorDocument,
  type WritingEditorDocument,
  writingEditorDocumentToPlainText,
} from './writingEditorDocument';

export type { WritingEditorDocument } from './writingEditorDocument';

export type WritingEditorViewMode = 'draft' | 'split';

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

export type WritingWorkspaceTab =
  | WritingWorkspaceDraftTab
  | WritingWorkspaceWebTab;

type WritingWorkspaceState = {
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
};

type StoredWritingWorkspaceState = {
  tabs?: unknown;
  activeTabId?: unknown;
  mruTabIds?: unknown;
};

const DEFAULT_VIEW_MODE: WritingEditorViewMode = 'split';

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

function createWorkspaceTabId(prefix: 'draft' | 'web') {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `ls-${prefix}-tab-${Date.now().toString(36)}-${randomPart}`;
}

function readStoredViewMode(): WritingEditorViewMode {
  const value = readStoredValue(draftStorageKeys.viewMode);
  if (value === 'draft' || value === 'split') {
    return value;
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
    viewMode:
      initial?.viewMode === 'draft' || initial?.viewMode === 'split'
        ? initial.viewMode
        : DEFAULT_VIEW_MODE,
  };
}

function createWebTab(
  url: string,
  initial?: Partial<Pick<WritingWorkspaceWebTab, 'id' | 'title'>>,
): WritingWorkspaceWebTab {
  const normalizedUrl = url.trim();

  return {
    id: initial?.id ?? createWorkspaceTabId('web'),
    kind: 'web',
    title: initial?.title?.trim() || getWebTabTitle(normalizedUrl),
    url: normalizedUrl,
  };
}

function getWebTabTitle(url: string) {
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
  let tabs = state.tabs;
  if (tabs.length === 0) {
    tabs = [createDraftTab()];
  }

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

export function useWritingEditorModel() {
  const [workspaceState, setWorkspaceState] = useState<WritingWorkspaceState>(() =>
    readStoredWorkspaceState(),
  );

  const updateWorkspaceState = useCallback(
    (updater: (state: WritingWorkspaceState) => WritingWorkspaceState) => {
      setWorkspaceState((state) => normalizeWorkspaceState(updater(state)));
    },
    [],
  );

  const { tabs, activeTabId, mruTabIds } = workspaceState;

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [activeTabId, tabs],
  );

  const draftTabsInMruOrder = useMemo(() => {
    const tabById = new Map(tabs.map((tab) => [tab.id, tab] as const));
    return mruTabIds
      .map((tabId) => tabById.get(tabId))
      .filter((tab): tab is WritingWorkspaceDraftTab => tab?.kind === 'draft');
  }, [mruTabIds, tabs]);

  const activeDraftTab =
    activeTab?.kind === 'draft' ? activeTab : null;
  const contextDraftTab = activeDraftTab ?? draftTabsInMruOrder[0] ?? null;

  useEffect(() => {
    persistDraftValue(
      draftStorageKeys.workspace,
      JSON.stringify({
        tabs,
        activeTabId,
        mruTabIds,
      }),
    );
  }, [activeTabId, mruTabIds, tabs]);

  useEffect(() => {
    persistDraftValue(draftStorageKeys.title, contextDraftTab?.title ?? '');
    persistDraftValue(
      draftStorageKeys.document,
      contextDraftTab ? JSON.stringify(contextDraftTab.document) : '',
    );
    persistDraftValue(
      draftStorageKeys.body,
      contextDraftTab
        ? writingEditorDocumentToPlainText(contextDraftTab.document)
        : '',
    );
    persistDraftValue(
      draftStorageKeys.viewMode,
      contextDraftTab?.viewMode ?? DEFAULT_VIEW_MODE,
    );
  }, [contextDraftTab]);

  const activateTab = useCallback((tabId: string) => {
    updateWorkspaceState((state) => ({
      ...state,
      activeTabId: tabId,
      mruTabIds: touchMruTab(state.mruTabIds, tabId),
    }));
  }, [updateWorkspaceState]);

  const closeTab = useCallback((tabId: string) => {
    updateWorkspaceState((state) => ({
      tabs: state.tabs.filter((tab) => tab.id !== tabId),
      activeTabId: state.activeTabId === tabId ? null : state.activeTabId,
      mruTabIds: state.mruTabIds.filter((id) => id !== tabId),
    }));
  }, [updateWorkspaceState]);

  const createDraftWorkspaceTab = useCallback(() => {
    const nextTab = createDraftTab();
    updateWorkspaceState((state) => ({
      tabs: [...state.tabs, nextTab],
      activeTabId: nextTab.id,
      mruTabIds: touchMruTab(state.mruTabIds, nextTab.id),
    }));
  }, [updateWorkspaceState]);

  const createWebWorkspaceTab = useCallback((url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    updateWorkspaceState((state) => {
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
  }, [updateWorkspaceState]);

  const setDraftTitle = useCallback((value: string) => {
    updateWorkspaceState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId && tab.kind === 'draft'
          ? {
              ...tab,
              title: value,
            }
          : tab,
      ),
    }));
  }, [updateWorkspaceState]);

  const setDraftDocument = useCallback((value: WritingEditorDocument) => {
    updateWorkspaceState((state) => ({
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
  }, [updateWorkspaceState]);

  const setViewMode = useCallback((value: WritingEditorViewMode) => {
    updateWorkspaceState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId && tab.kind === 'draft'
          ? {
              ...tab,
              viewMode: value,
            }
          : tab,
      ),
    }));
  }, [updateWorkspaceState]);

  const clearDraft = useCallback(() => {
    updateWorkspaceState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId && tab.kind === 'draft'
          ? {
              ...tab,
              title: '',
              document: createEmptyWritingEditorDocument(),
            }
          : tab,
      ),
    }));
  }, [updateWorkspaceState]);

  const updateActiveWebTabUrl = useCallback((url: string) => {
    const normalizedUrl = url.trim();
    updateWorkspaceState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.id === state.activeTabId && tab.kind === 'web'
          ? {
              ...tab,
              url: normalizedUrl,
              title: getWebTabTitle(normalizedUrl),
            }
          : tab,
      ),
    }));
  }, [updateWorkspaceState]);

  const draftTitle = activeDraftTab?.title ?? '';
  const draftDocument = activeDraftTab?.document ?? createEmptyWritingEditorDocument();
  const viewMode = activeDraftTab?.viewMode ?? DEFAULT_VIEW_MODE;
  const draftBody = useMemo(
    () =>
      contextDraftTab
        ? writingEditorDocumentToPlainText(contextDraftTab.document)
        : '',
    [contextDraftTab],
  );
  const stats = useMemo(
    () =>
      activeDraftTab
        ? collectWritingEditorStats(activeDraftTab.document)
        : {
            wordCount: 0,
            characterCount: 0,
            paragraphCount: 0,
          },
    [activeDraftTab],
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    draftTitle,
    setDraftTitle,
    draftDocument,
    setDraftDocument,
    draftBody,
    viewMode,
    setViewMode,
    clearDraft,
    stats,
    activateTab,
    closeTab,
    createDraftTab: createDraftWorkspaceTab,
    createWebTab: createWebWorkspaceTab,
    updateActiveWebTabUrl,
  };
}
