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

  assert.deepEqual(store.getSnapshot(), initialSnapshot);

  const nextSnapshot = {
    ...initialSnapshot,
    defaultFontSizePresetName: '小四' as const,
    defaultFontSizeValue: '16px',
  };

  store.setSnapshot(nextSnapshot);
  assert.equal(changeCount, 1);
  assert.deepEqual(store.getSnapshot(), nextSnapshot);
  assert.notEqual(store.getSnapshot(), nextSnapshot);

  store.setSnapshot(nextSnapshot);
  assert.equal(changeCount, 1);

  unsubscribe();
  store.resetToCatalog();
  assert.equal(changeCount, 1);
  assert.deepEqual(store.getSnapshot(), initialSnapshot);
});

test('EditorDraftStyleStore snapshots are frozen and detached from caller-owned objects', () => {
  const initialSnapshot = getEditorDraftStyleCatalogSnapshot();
  const mutableSnapshot = {
    ...initialSnapshot,
    fontFamilyPresets: initialSnapshot.fontFamilyPresets.map((option) => ({ ...option })),
    fontSizePresets: initialSnapshot.fontSizePresets.map((option) => ({ ...option })),
  };
  const store = createEditorDraftStyleStore();

  store.setSnapshot(mutableSnapshot);
  const storedSnapshot = store.getSnapshot();

  assert.notEqual(storedSnapshot, mutableSnapshot);
  assert.notEqual(storedSnapshot.fontFamilyPresets, mutableSnapshot.fontFamilyPresets);
  assert.notEqual(storedSnapshot.fontFamilyPresets[0], mutableSnapshot.fontFamilyPresets[0]);
  assert.equal(Object.isFrozen(storedSnapshot), true);
  assert.equal(Object.isFrozen(storedSnapshot.fontFamilyPresets), true);
  assert.equal(Object.isFrozen(storedSnapshot.fontFamilyPresets[0]), true);

  mutableSnapshot.defaultFontSizeValue = '99px';
  mutableSnapshot.fontFamilyPresets[0].label = 'Mutated';

  assert.equal(store.getSnapshot().defaultFontSizeValue, initialSnapshot.defaultFontSizeValue);
  assert.notEqual(store.getSnapshot().fontFamilyPresets[0].label, 'Mutated');
});
