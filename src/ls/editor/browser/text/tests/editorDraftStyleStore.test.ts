import assert from 'node:assert/strict';
import test from 'node:test';

import { getEditorDraftStyleCatalogSnapshot } from 'ls/editor/browser/text/editorDraftStyleCatalog';
import { createEditorDraftStyleStore } from 'ls/editor/browser/text/editorDraftStyleStore';

test('EditorDraftStyleStore initializes from catalog and notifies on snapshot changes', () => {
  const initialSnapshot = getEditorDraftStyleCatalogSnapshot();
  const store = createEditorDraftStyleStore(initialSnapshot);
  let changeCount = 0;

  const unsubscribe = store.subscribe(() => {
    changeCount += 1;
  });

  assert.equal(store.getSnapshot(), initialSnapshot);

  const nextSnapshot = {
    ...initialSnapshot,
    defaultFontSizePresetName: '小四' as const,
    defaultFontSizeValue: '16px',
  };

  store.setSnapshot(nextSnapshot);
  assert.equal(changeCount, 1);
  assert.equal(store.getSnapshot(), nextSnapshot);

  store.setSnapshot(nextSnapshot);
  assert.equal(changeCount, 1);

  unsubscribe();
  store.resetToCatalog();
  assert.equal(changeCount, 1);
  assert.equal(store.getSnapshot(), initialSnapshot);
});
