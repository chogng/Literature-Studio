import { createEmptyWritingEditorDocument, createWritingEditorDocumentFromPlainText, normalizeWritingEditorDocument, writingEditorDocumentToPlainText } from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

import {
  isWritingDraftEditorInput,
  toWritingEditorInput,
} from 'ls/workbench/browser/editorInput';
import type {
  WritingEditorViewMode,
  WritingEditorGroupState,
  WritingWorkspaceDraftTab,
  WritingWorkspaceState,
} from 'ls/workbench/browser/writingEditorModel';

export type StoredWritingWorkspaceState = {
  groups?: unknown;
  activeGroupId?: unknown;
  tabs?: unknown;
  inputs?: unknown;
  groupId?: unknown;
  activeTabId?: unknown;
  mruTabIds?: unknown;
  draftStateByInputId?: unknown;
  viewStateEntries?: unknown;
};

type StoredWritingLegacyDraftState = {
  title: string;
  document: WritingEditorDocument;
  viewMode: WritingEditorViewMode;
};

type StoredWritingDraftState = {
  title: string;
  document: WritingEditorDocument;
  viewMode: WritingEditorViewMode;
};

type WritingEditorPersistedState = {
  workspaceState: Pick<
    WritingWorkspaceState,
    'groups' | 'activeGroupId' | 'viewStateEntries'
  >;
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

function createStoredDraftStateByInputId(
  workspaceState: Pick<WritingWorkspaceState, 'groups'>,
) {
  return Object.fromEntries(
    workspaceState.groups
      .flatMap((group) => group.tabs)
      .filter((tab): tab is WritingWorkspaceDraftTab => isWritingDraftEditorInput(tab))
      .map((tab) => [
        tab.id,
        {
          title: tab.title,
          document: tab.document,
          viewMode: tab.viewMode,
        } satisfies StoredWritingDraftState,
      ]),
  );
}

function serializeStoredGroup(group: WritingEditorGroupState) {
  return {
    groupId: group.groupId,
    inputs: group.tabs.map((tab) => toWritingEditorInput(tab)),
    activeTabId: group.activeTabId,
    mruTabIds: group.mruTabIds,
  };
}

function persistState({
  workspaceState,
  contextDraftTab,
}: WritingEditorPersistedState) {
  const draftStateByInputId = createStoredDraftStateByInputId(workspaceState);
  writeStoredValue(
    storageKeys.workspace,
    JSON.stringify({
      groups: workspaceState.groups.map((group) => serializeStoredGroup(group)),
      activeGroupId: workspaceState.activeGroupId,
      draftStateByInputId,
      viewStateEntries: workspaceState.viewStateEntries,
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
