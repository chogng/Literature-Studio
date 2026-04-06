import assert from 'node:assert/strict';
import test from 'node:test';
import { createWritingEditorDocumentFromPlainText } from 'ls/editor/common/writingEditorDocument';
import type { WritingWorkspaceDraftTab } from 'ls/workbench/browser/writingEditorModel';
import {
  getWritingEditorInputResourceKey,
  normalizeWritingEditorInput,
  toWritingEditorInput,
} from 'ls/workbench/browser/editorInput';

test('toWritingEditorInput strips draft-only payload from workspace tabs', () => {
  const draftTab: WritingWorkspaceDraftTab = {
    id: 'draft-a',
    kind: 'draft',
    title: 'Draft A',
    viewMode: 'draft',
    document: createWritingEditorDocumentFromPlainText('alpha'),
  };
  const input = toWritingEditorInput(draftTab);

  assert.deepEqual(input, {
    id: 'draft-a',
    kind: 'draft',
    title: 'Draft A',
    viewMode: 'draft',
  });
});

test('normalizeWritingEditorInput migrates legacy web inputs to browser inputs', () => {
  const input = normalizeWritingEditorInput({
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

test('getWritingEditorInputResourceKey uses stable kind-aware resource keys', () => {
  assert.equal(
    getWritingEditorInputResourceKey({
      id: 'draft-a',
      kind: 'draft',
      title: 'Draft A',
      viewMode: 'draft',
    }),
    'draft:draft-a',
  );

  assert.equal(
    getWritingEditorInputResourceKey({
      id: 'pdf-a',
      kind: 'pdf',
      title: 'Paper PDF',
      url: ' https://example.com/paper.pdf ',
    }),
    'pdf:https://example.com/paper.pdf',
  );
});
