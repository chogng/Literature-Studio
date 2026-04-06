import {
  normalizeWritingEditorDocument,
} from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
import type { EditorTabViewMode } from 'ls/workbench/browser/parts/editor/editorInput';

export type EditorDraftSavedState = {
  title: string;
  document: WritingEditorDocument;
  viewMode: EditorTabViewMode;
};

export type EditorDraftSavedStateByInputId = Record<string, EditorDraftSavedState>;

type DraftTabLike = {
  id: string;
  kind: 'draft';
  title: string;
  document: WritingEditorDocument;
  viewMode: EditorTabViewMode;
};

type WorkspaceTabLike = {
  id: string;
  kind: string;
};

function toSavedState(value: DraftTabLike): EditorDraftSavedState {
  return {
    title: value.title,
    document: normalizeWritingEditorDocument(value.document),
    viewMode: value.viewMode === 'draft' ? value.viewMode : 'draft',
  };
}

function createSavedStateKey(value: EditorDraftSavedState) {
  return JSON.stringify({
    title: value.title,
    viewMode: value.viewMode,
    document: normalizeWritingEditorDocument(value.document),
  });
}

function isDraftTab(tab: WorkspaceTabLike): tab is DraftTabLike {
  return tab.kind === 'draft';
}

export class EditorDraftDirtyState {
  private savedStateByTabId: EditorDraftSavedStateByInputId;

  constructor(initialSavedStateByTabId: EditorDraftSavedStateByInputId = {}) {
    this.savedStateByTabId = initialSavedStateByTabId;
  }

  syncTabs(tabs: readonly WorkspaceTabLike[]) {
    const nextSavedStateByTabId: EditorDraftSavedStateByInputId = {};

    for (const tab of tabs) {
      if (!isDraftTab(tab)) {
        continue;
      }

      nextSavedStateByTabId[tab.id] = this.savedStateByTabId[tab.id] ?? toSavedState(tab);
    }

    this.savedStateByTabId = nextSavedStateByTabId;
  }

  isTabDirty(tabId: string, tabs: readonly WorkspaceTabLike[]) {
    const tab = tabs.find(
      (candidate): candidate is DraftTabLike =>
        candidate.id === tabId && isDraftTab(candidate),
    );
    if (!tab) {
      return false;
    }

    return this.isDraftTabDirty(tab);
  }

  getDirtyDraftTabIds(tabs: readonly WorkspaceTabLike[]) {
    return tabs
      .filter((tab): tab is DraftTabLike => isDraftTab(tab))
      .filter((tab) => this.isDraftTabDirty(tab))
      .map((tab) => tab.id);
  }

  markTabSaved(tabId: string, tabs: readonly WorkspaceTabLike[]) {
    const tab = tabs.find(
      (candidate): candidate is DraftTabLike =>
        candidate.id === tabId && isDraftTab(candidate),
    );
    if (!tab) {
      return false;
    }

    this.savedStateByTabId = {
      ...this.savedStateByTabId,
      [tab.id]: toSavedState(tab),
    };

    return true;
  }

  getSavedStateByTabId() {
    return this.savedStateByTabId;
  }

  private isDraftTabDirty(tab: DraftTabLike) {
    const currentState = toSavedState(tab);
    const savedState = this.savedStateByTabId[tab.id] ?? currentState;

    return createSavedStateKey(currentState) !== createSavedStateKey(savedState);
  }
}

export function createEditorDraftDirtyState(
  initialSavedStateByTabId?: EditorDraftSavedStateByInputId,
) {
  return new EditorDraftDirtyState(initialSavedStateByTabId);
}

