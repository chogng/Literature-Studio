import {
  createEmptyWritingEditorDocument,
  createWritingEditorDocumentFromPlainText,
  normalizeWritingEditorDocument,
  writingEditorDocumentToPlainText,
  type WritingEditorDocument,
} from 'ls/editor/common/writingEditorDocument';
import type {
  WritingEditorViewMode,
  WritingWorkspaceDraftTab,
  WritingWorkspaceState,
} from 'ls/workbench/browser/writingEditorModel';

export type StoredWritingWorkspaceState = {
  tabs?: unknown;
  activeTabId?: unknown;
  mruTabIds?: unknown;
};

type StoredWritingLegacyDraftState = {
  title: string;
  document: WritingEditorDocument;
  viewMode: WritingEditorViewMode;
};

type WritingEditorPersistedState = {
  workspaceState: Pick<WritingWorkspaceState, 'tabs' | 'activeTabId' | 'mruTabIds'>;
  contextDraftTab: WritingWorkspaceDraftTab | null;
};

type WritingEditorStorageOptions = {
  debounceMs?: number;
};

const DEFAULT_VIEW_MODE: WritingEditorViewMode = 'draft';
const DEFAULT_PERSIST_DEBOUNCE_MS = 250;

const storageKeys = {
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

function writeStoredValue(key: string, value: string) {
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
    // Ignore storage failures so the editor still works in restricted runtimes.
  }
}

function readStoredViewMode(): WritingEditorViewMode {
  const value = readStoredValue(storageKeys.viewMode);
  if (value === 'draft') {
    return value;
  }

  if (value === 'split') {
    return DEFAULT_VIEW_MODE;
  }

  return DEFAULT_VIEW_MODE;
}

function readStoredDocument(): WritingEditorDocument {
  const rawDocument = readStoredValue(storageKeys.document);
  if (rawDocument) {
    try {
      return normalizeWritingEditorDocument(JSON.parse(rawDocument));
    } catch {
      return createEmptyWritingEditorDocument();
    }
  }

  const legacyBody = readStoredValue(storageKeys.body);
  return legacyBody
    ? createWritingEditorDocumentFromPlainText(legacyBody)
    : createEmptyWritingEditorDocument();
}

function persistState({
  workspaceState,
  contextDraftTab,
}: WritingEditorPersistedState) {
  writeStoredValue(
    storageKeys.workspace,
    JSON.stringify({
      tabs: workspaceState.tabs,
      activeTabId: workspaceState.activeTabId,
      mruTabIds: workspaceState.mruTabIds,
    }),
  );
  writeStoredValue(storageKeys.title, contextDraftTab?.title ?? '');
  writeStoredValue(
    storageKeys.document,
    contextDraftTab ? JSON.stringify(contextDraftTab.document) : '',
  );
  writeStoredValue(
    storageKeys.body,
    contextDraftTab ? writingEditorDocumentToPlainText(contextDraftTab.document) : '',
  );
  writeStoredValue(storageKeys.viewMode, contextDraftTab?.viewMode ?? DEFAULT_VIEW_MODE);
}

export class WritingEditorStorage {
  private readonly debounceMs: number;
  private persistTimer: number | null = null;
  private pendingState: WritingEditorPersistedState | null = null;

  constructor(options: WritingEditorStorageOptions = {}) {
    this.debounceMs = options.debounceMs ?? DEFAULT_PERSIST_DEBOUNCE_MS;
  }

  readWorkspaceState() {
    const rawWorkspace = readStoredValue(storageKeys.workspace);
    if (!rawWorkspace) {
      return null;
    }

    try {
      return JSON.parse(rawWorkspace) as StoredWritingWorkspaceState;
    } catch {
      return null;
    }
  }

  readLegacyDraftState(): StoredWritingLegacyDraftState {
    return {
      title: readStoredValue(storageKeys.title),
      document: readStoredDocument(),
      viewMode: readStoredViewMode(),
    };
  }

  save(state: WritingEditorPersistedState) {
    this.clearPendingPersist();
    persistState(state);
  }

  scheduleSave(state: WritingEditorPersistedState) {
    if (typeof window === 'undefined') {
      return;
    }

    this.pendingState = state;
    if (this.persistTimer !== null) {
      window.clearTimeout(this.persistTimer);
    }

    this.persistTimer = window.setTimeout(() => {
      const nextState = this.pendingState;
      this.persistTimer = null;
      this.pendingState = null;
      if (nextState) {
        persistState(nextState);
      }
    }, this.debounceMs);
  }

  dispose() {
    const nextState = this.pendingState;
    this.clearPendingPersist();
    if (nextState) {
      persistState(nextState);
    }
  }

  private clearPendingPersist() {
    if (this.persistTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.persistTimer);
    }

    this.persistTimer = null;
    this.pendingState = null;
  }
}

export function createWritingEditorStorage(options?: WritingEditorStorageOptions) {
  return new WritingEditorStorage(options);
}

