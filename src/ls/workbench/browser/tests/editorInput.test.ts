import assert from 'node:assert/strict';
import test from 'node:test';
import { createWritingEditorDocumentFromPlainText } from 'ls/editor/common/writingEditorDocument';
import type { EditorWorkspaceDraftTab } from 'ls/workbench/browser/editorModel';
import {
  getEditorContentTabTitle,
  getEditorTabInputResourceKey,
  normalizeEditorTabInput,
  toEditorTabInput,
} from 'ls/workbench/browser/editorInput';

test('toEditorTabInput strips draft-only payload from workspace tabs', () => {
  const draftTab: EditorWorkspaceDraftTab = {
    id: 'draft-a',
    kind: 'draft',
    title: 'Draft A',
    viewMode: 'draft',
    document: createWritingEditorDocumentFromPlainText('alpha'),
  };
  const input = toEditorTabInput(draftTab);

  assert.deepEqual(input, {
    id: 'draft-a',
    kind: 'draft',
    title: 'Draft A',
    viewMode: 'draft',
  });
});

test('normalizeEditorTabInput migrates legacy web inputs to browser inputs', () => {
  const input = normalizeEditorTabInput({
    id: 'browser-a',
    kind: 'web',
    title: 'Example',
    url: 'https://example.com/paper',
  });

  assert.deepEqual(input, {
    id: 'browser-a',
    kind: 'browser',
    title: 'Example',
    url: 'https://example.com/paper',
  });
});

test('getEditorTabInputResourceKey uses stable kind-aware resource keys', () => {
  assert.equal(
    getEditorTabInputResourceKey({
      id: 'draft-a',
      kind: 'draft',
      title: 'Draft A',
      viewMode: 'draft',
    }),
    'draft:draft-a',
  );

  assert.equal(
    getEditorTabInputResourceKey({
      id: 'pdf-a',
      kind: 'pdf',
      title: 'Paper PDF',
      url: ' https://example.com/paper.pdf ',
    }),
    'pdf:https://example.com/paper.pdf',
  );
});

test('getEditorContentTabTitle treats about:blank as an empty browser tab title', () => {
  assert.equal(getEditorContentTabTitle('about:blank'), '');
});

test('normalizeEditorTabInput clears stale about:blank browser titles from persisted state', () => {
  const input = normalizeEditorTabInput({
    id: 'browser-blank',
    kind: 'browser',
    title: '/blank',
    url: 'about:blank',
  });

  assert.deepEqual(input, {
    id: 'browser-blank',
    kind: 'browser',
    title: '',
    url: 'about:blank',
  });
});
