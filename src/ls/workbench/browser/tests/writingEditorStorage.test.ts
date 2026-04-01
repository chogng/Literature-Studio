import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createWritingEditorDocumentFromPlainText,
  writingEditorDocumentToPlainText,
} from 'ls/editor/common/writingEditorDocument';
import { createWritingEditorStorage } from 'ls/workbench/browser/writingEditorStorage';

type MockStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type MockWindow = Pick<Window, 'localStorage' | 'setTimeout' | 'clearTimeout'>;

const globalWindow = globalThis as {
  window?: MockWindow;
};

function createLocalStorage(initialValues: Record<string, string> = {}): MockStorage {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function installMockWindow(localStorage: MockStorage) {
  const previousWindow = globalWindow.window;
  globalWindow.window = {
    localStorage: localStorage as Storage,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };

  return () => {
    globalWindow.window = previousWindow;
  };
}

test('writing editor storage debounces draft persistence and keeps the latest state', async () => {
  const localStorage = createLocalStorage();
  const restoreWindow = installMockWindow(localStorage);
  const storage = createWritingEditorStorage({ debounceMs: 10 });

  storage.scheduleSave({
    workspaceState: {
      tabs: [],
      activeTabId: null,
      mruTabIds: [],
    },
    contextDraftTab: {
      id: 'draft-a',
      kind: 'draft',
      title: 'First',
      document: createWritingEditorDocumentFromPlainText('alpha'),
      viewMode: 'draft',
    },
  });

  storage.scheduleSave({
    workspaceState: {
      tabs: [],
      activeTabId: null,
      mruTabIds: [],
    },
    contextDraftTab: {
      id: 'draft-b',
      kind: 'draft',
      title: 'Second',
      document: createWritingEditorDocumentFromPlainText('beta'),
      viewMode: 'draft',
    },
  });

  await delay(25);

  assert.equal(localStorage.getItem('ls.writingDraft.title'), 'Second');
  assert.equal(localStorage.getItem('ls.writingDraft.body'), 'beta');

  try {
    storage.dispose();
  } finally {
    restoreWindow();
  }
});

test('writing editor storage reads the legacy draft payload from local storage', () => {
  const localStorage = createLocalStorage({
    'ls.writingDraft.title': 'Draft',
    'ls.writingDraft.body': 'legacy body',
    'ls.writingDraft.viewMode': 'split',
  });
  const restoreWindow = installMockWindow(localStorage);
  const storage = createWritingEditorStorage();

  const draftState = storage.readLegacyDraftState();

  assert.equal(draftState.title, 'Draft');
  assert.equal(writingEditorDocumentToPlainText(draftState.document), 'legacy body');
  assert.equal(draftState.viewMode, 'draft');

  try {
    storage.dispose();
  } finally {
    restoreWindow();
  }
});
