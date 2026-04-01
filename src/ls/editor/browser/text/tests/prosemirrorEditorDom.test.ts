import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createEmptyWritingEditorDocument,
  writingEditorDocumentToPlainText,
  type WritingEditorDocument,
} from '../../../common/writingEditorDocument';
import { installDomTestEnvironment } from './domTestUtils';

let ProseMirrorEditor: typeof import('../prosemirrorEditor').ProseMirrorEditor;
let cleanupDomEnvironment: (() => void) | null = null;

const labels = {
  textGroup: 'Text',
  formatGroup: 'Format',
  insertGroup: 'Insert',
  historyGroup: 'History',
  paragraph: 'Paragraph',
  heading1: 'H1',
  heading2: 'H2',
  heading3: 'H3',
  bold: 'Bold',
  italic: 'Italic',
  bulletList: 'Bullets',
  orderedList: 'Numbers',
  blockquote: 'Quote',
  undo: 'Undo',
  redo: 'Redo',
  insertCitation: 'Citation',
  insertFigure: 'Figure',
  insertFigureRef: 'Figure Ref',
  citationPrompt: 'Citation',
  figureUrlPrompt: 'Figure URL',
  figureCaptionPrompt: 'Figure caption',
  figureRefPrompt: 'Figure ref',
};

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ ProseMirrorEditor } = await import('../prosemirrorEditor'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

function createProps(
  document: WritingEditorDocument,
  onDocumentChange: (nextDocument: WritingEditorDocument) => void,
): import('../prosemirrorEditor').WritingEditorSurfaceProps {
  return {
    document,
    placeholder: 'Write here',
    labels,
    statusLabels: {
      blockFigure: 'Figure',
    },
    onInsertCitation: () => {},
    onInsertFigure: () => {},
    onInsertFigureRef: () => {},
    onDocumentChange,
  };
}

function getEditableRoot(editor: InstanceType<typeof ProseMirrorEditor>) {
  const element = editor.getElement().querySelector('.ProseMirror');
  assert(element instanceof HTMLElement, 'Editable root was not rendered.');
  return element;
}

function getEditorText(editor: InstanceType<typeof ProseMirrorEditor>) {
  return (getEditableRoot(editor).textContent ?? '').replace(/\u200b/g, '').trim();
}

function createCompositionEvent(type: 'compositionstart' | 'compositionend', data = '') {
  if (typeof CompositionEvent === 'function') {
    return new CompositionEvent(type, {
      bubbles: true,
      cancelable: true,
      data,
    });
  }

  return new Event(type, {
    bubbles: true,
    cancelable: true,
  });
}

async function withEditor(
  run: (params: {
    editor: InstanceType<typeof ProseMirrorEditor>;
    changes: WritingEditorDocument[];
  }) => Promise<void> | void,
) {
  const changes: WritingEditorDocument[] = [];
  const editor = new ProseMirrorEditor(
    createProps(createEmptyWritingEditorDocument(), (nextDocument) => {
      changes.push(nextDocument);
    }),
  );

  document.body.append(editor.getElement());

  try {
    await run({ editor, changes });
  } finally {
    editor.dispose();
    document.body.replaceChildren();
  }
}

test('ProseMirrorEditor preserves the local DOM when stale props arrive before the model echo', async () => {
  await withEditor(({ editor, changes }) => {
    const initialDocument = createEmptyWritingEditorDocument();

    assert.equal(editor.insertPlainText('hello world'), true);
    assert.equal(changes.length, 1);
    assert.equal(writingEditorDocumentToPlainText(changes[0]), 'hello world');

    editor.setProps(createProps(initialDocument, (nextDocument) => {
      changes.push(nextDocument);
    }));

    assert.match(getEditorText(editor), /hello world/);
    assert.equal(changes.length, 1);
  });
});

test('ProseMirrorEditor defers document emission until compositionend', async () => {
  await withEditor(async ({ editor, changes }) => {
    const editableRoot = getEditableRoot(editor);

    editableRoot.dispatchEvent(createCompositionEvent('compositionstart'));
    assert.equal(editor.insertPlainText('你'), true);
    assert.equal(changes.length, 0);

    editableRoot.dispatchEvent(createCompositionEvent('compositionend', '你'));
    await delay(20);

    assert.equal(changes.length, 1);
    assert.equal(writingEditorDocumentToPlainText(changes[0]), '你');
  });
});

test('ProseMirrorEditor keeps composed text when stale props land during composition', async () => {
  await withEditor(async ({ editor, changes }) => {
    const editableRoot = getEditableRoot(editor);
    const initialDocument = createEmptyWritingEditorDocument();

    editableRoot.dispatchEvent(createCompositionEvent('compositionstart'));
    assert.equal(editor.insertPlainText('你好'), true);

    editor.setProps(createProps(initialDocument, (nextDocument) => {
      changes.push(nextDocument);
    }));

    assert.match(getEditorText(editor), /你好/);
    assert.equal(changes.length, 0);

    editableRoot.dispatchEvent(createCompositionEvent('compositionend', '你好'));
    await delay(20);

    assert.equal(changes.length, 1);
    assert.equal(writingEditorDocumentToPlainText(changes[0]), '你好');
  });
});
