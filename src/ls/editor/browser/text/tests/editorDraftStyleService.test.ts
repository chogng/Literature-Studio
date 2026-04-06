import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_EDITOR_DRAFT_BODY_COLOR,
  DEFAULT_EDITOR_DRAFT_FONT_FAMILY_VALUE,
  normalizeEditorDraftStyleSettings,
} from 'ls/base/common/editorDraftStyle';
import { DEFAULT_EDITOR_BODY_FONT_SIZE_VALUE } from 'ls/base/common/editorFormat';
import { getEditorDraftStyleCatalogSnapshot } from 'ls/editor/browser/text/editorDraftStyleCatalog';
import { createEditorDraftStyleService } from 'ls/editor/browser/text/editorDraftStyleService';

test('EditorDraftStyleService initializes from catalog and notifies on snapshot changes', () => {
  const initialSnapshot = getEditorDraftStyleCatalogSnapshot();
  const service = createEditorDraftStyleService(initialSnapshot);
  let changeCount = 0;

  const unsubscribe = service.subscribe(() => {
    changeCount += 1;
  });

  assert.deepEqual(service.getSnapshot(), initialSnapshot);

  const nextSnapshot = {
    ...initialSnapshot,
    defaultBodyStyle: {
      ...initialSnapshot.defaultBodyStyle,
      fontSizeValue: '16px',
    },
  };

  service.setSnapshot(nextSnapshot);
  assert.equal(changeCount, 1);
  assert.deepEqual(service.getSnapshot(), nextSnapshot);
  assert.notEqual(service.getSnapshot(), nextSnapshot);

  service.setSnapshot(nextSnapshot);
  assert.equal(changeCount, 1);

  unsubscribe();
  service.resetToCatalog();
  assert.equal(changeCount, 1);
  assert.deepEqual(service.getSnapshot(), initialSnapshot);
});

test('EditorDraftStyleService snapshots are frozen and detached from caller-owned objects', () => {
  const initialSnapshot = getEditorDraftStyleCatalogSnapshot();
  const mutableSnapshot = {
    ...initialSnapshot,
    defaultBodyStyle: {
      ...initialSnapshot.defaultBodyStyle,
      inlineStyleDefaults: {
        ...initialSnapshot.defaultBodyStyle.inlineStyleDefaults,
      },
    },
    fontFamilyPresets: initialSnapshot.fontFamilyPresets.map((option) => ({ ...option })),
    fontSizePresets: initialSnapshot.fontSizePresets.map((option) => ({ ...option })),
  };
  const service = createEditorDraftStyleService();

  service.setSnapshot(mutableSnapshot);
  const storedSnapshot = service.getSnapshot();

  assert.notEqual(storedSnapshot, mutableSnapshot);
  assert.notEqual(storedSnapshot.fontFamilyPresets, mutableSnapshot.fontFamilyPresets);
  assert.notEqual(storedSnapshot.fontFamilyPresets[0], mutableSnapshot.fontFamilyPresets[0]);
  assert.equal(Object.isFrozen(storedSnapshot), true);
  assert.equal(Object.isFrozen(storedSnapshot.fontFamilyPresets), true);
  assert.equal(Object.isFrozen(storedSnapshot.fontFamilyPresets[0]), true);

  mutableSnapshot.defaultBodyStyle.fontSizeValue = '99px';
  mutableSnapshot.defaultBodyStyle.fontFamilyValue = '"Mutated", sans-serif';
  mutableSnapshot.defaultBodyStyle.lineHeight = 1.6;
  mutableSnapshot.defaultBodyStyle.inlineStyleDefaults.bold = true;
  mutableSnapshot.fontFamilyPresets[0].label = 'Mutated';

  assert.equal(
    service.getSnapshot().defaultBodyStyle.fontSizeValue,
    initialSnapshot.defaultBodyStyle.fontSizeValue,
  );
  assert.equal(
    service.getSnapshot().defaultBodyStyle.fontFamilyValue,
    initialSnapshot.defaultBodyStyle.fontFamilyValue,
  );
  assert.equal(service.getSnapshot().defaultBodyStyle.lineHeight, initialSnapshot.defaultBodyStyle.lineHeight);
  assert.equal(
    service.getSnapshot().defaultBodyStyle.inlineStyleDefaults.bold,
    initialSnapshot.defaultBodyStyle.inlineStyleDefaults.bold,
  );
  assert.notEqual(service.getSnapshot().fontFamilyPresets[0].label, 'Mutated');
});

test('normalizeEditorDraftStyleSettings tolerates partial or malformed persisted values', () => {
  const normalizedFromEmpty = normalizeEditorDraftStyleSettings(
    {} as unknown as Parameters<typeof normalizeEditorDraftStyleSettings>[0],
  );

  assert.equal(
    normalizedFromEmpty.defaultBodyStyle.fontFamilyValue,
    DEFAULT_EDITOR_DRAFT_FONT_FAMILY_VALUE,
  );
  assert.equal(normalizedFromEmpty.defaultBodyStyle.color, DEFAULT_EDITOR_DRAFT_BODY_COLOR);
  assert.equal(normalizedFromEmpty.defaultBodyStyle.inlineStyleDefaults.bold, false);

  const normalizedFromMalformed = normalizeEditorDraftStyleSettings({
    defaultBodyStyle: {
      fontFamilyValue: 12 as never,
      fontSizeValue: 'not-a-size',
      lineHeight: 0,
      color: null as never,
      inlineStyleDefaults: {
        bold: 1 as never,
        italic: '' as never,
        underline: 'yes' as never,
      },
    },
  });

  assert.equal(
    normalizedFromMalformed.defaultBodyStyle.fontFamilyValue,
    DEFAULT_EDITOR_DRAFT_FONT_FAMILY_VALUE,
  );
  assert.equal(
    normalizedFromMalformed.defaultBodyStyle.fontSizeValue,
    DEFAULT_EDITOR_BODY_FONT_SIZE_VALUE,
  );
  assert.equal(normalizedFromMalformed.defaultBodyStyle.color, DEFAULT_EDITOR_DRAFT_BODY_COLOR);
  assert.equal(normalizedFromMalformed.defaultBodyStyle.inlineStyleDefaults.bold, true);
  assert.equal(normalizedFromMalformed.defaultBodyStyle.inlineStyleDefaults.italic, false);
  assert.equal(normalizedFromMalformed.defaultBodyStyle.inlineStyleDefaults.underline, true);
});
