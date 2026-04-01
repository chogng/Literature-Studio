import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createEmptyWritingEditorDocument,
  createWritingEditorDocumentFromPlainText,
  writingEditorDocumentToPlainText,
  type WritingEditorDocument,
} from '../../../common/writingEditorDocument';
import { installDomTestEnvironment } from './domTestUtils';

let ProseMirrorEditor: typeof import('../editor').ProseMirrorEditor;
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
  ({ ProseMirrorEditor } = await import('../editor'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

function createProps(
  document: WritingEditorDocument,
  onDocumentChange: (nextDocument: WritingEditorDocument) => void,
): import('../editor').WritingEditorSurfaceProps {
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

function getPlaceholderNode(editor: InstanceType<typeof ProseMirrorEditor>) {
  const element = editor.getElement().querySelector('.pm-empty-paragraph');
  assert(element instanceof HTMLElement, 'Placeholder node was not rendered.');
  return element;
}

function getScrollableRoot(editor: InstanceType<typeof ProseMirrorEditor>) {
  const element = editor.getElement().querySelector('.monaco-scrollable-element');
  assert(element instanceof HTMLElement, 'Scrollable root was not rendered.');
  return element;
}

function getToolbarButton(editor: InstanceType<typeof ProseMirrorEditor>, label: string) {
  const button = Array.from(editor.getElement().querySelectorAll('button')).find(
    (candidate) => candidate.getAttribute('aria-label') === label,
  );
  assert(button instanceof HTMLButtonElement, `Toolbar button "${label}" was not found.`);
  return button;
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
  initialDocument = createEmptyWritingEditorDocument(),
) {
  const changes: WritingEditorDocument[] = [];
  const editor = new ProseMirrorEditor(
    createProps(initialDocument, (nextDocument) => {
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

test('ProseMirrorEditor updates placeholder text without emitting a document change', async () => {
  const initialDocument = createEmptyWritingEditorDocument();

  await withEditor(({ editor, changes }) => {
    const placeholderBefore = getPlaceholderNode(editor);
    assert.equal(placeholderBefore.getAttribute('data-placeholder'), 'Write here');

    const nextProps = createProps(initialDocument, (nextDocument) => {
      changes.push(nextDocument);
    });
    nextProps.placeholder = 'Continue writing';
    editor.setProps(nextProps);

    const placeholderAfter = getPlaceholderNode(editor);
    assert.equal(placeholderAfter.getAttribute('data-placeholder'), 'Continue writing');
    assert.equal(changes.length, 0);
  }, initialDocument);
});

test('ProseMirrorEditor refreshes placeholder text during an external document replacement', async () => {
  const initialDocument = createWritingEditorDocumentFromPlainText('alpha');

  await withEditor(({ editor, changes }) => {
    const nextProps = createProps(createEmptyWritingEditorDocument(), (nextDocument) => {
      changes.push(nextDocument);
    });
    nextProps.placeholder = 'Continue writing';
    editor.setProps(nextProps);

    const placeholderAfter = getPlaceholderNode(editor);
    assert.equal(placeholderAfter.getAttribute('data-placeholder'), 'Continue writing');
    assert.equal(changes.length, 0);
  }, initialDocument);
});

test('ProseMirrorEditor mounts the editing surface inside the shared scrollable shell', async () => {
  await withEditor(({ editor }) => {
    const scrollableRoot = getScrollableRoot(editor);
    const host = scrollableRoot.querySelector('.pm-editor-host');
    assert(host instanceof HTMLElement);
    assert.equal(scrollableRoot.classList.contains('pm-editor-scrollable'), true);
    assert.equal(host.classList.contains('scrollable-content'), true);
  });
});

test('ProseMirrorEditor applies external document changes without echoing them back through onDocumentChange', async () => {
  await withEditor(({ editor, changes }) => {
    assert.equal(editor.insertPlainText('alpha'), true);
    assert.equal(changes.length, 1);

    const echoedLocalDocument = changes[0];
    editor.setProps(createProps(echoedLocalDocument, (nextDocument) => {
      changes.push(nextDocument);
    }));

    const externalDocument = createWritingEditorDocumentFromPlainText('beta');
    editor.setProps(createProps(externalDocument, (nextDocument) => {
      changes.push(nextDocument);
    }));

    assert.equal(getEditorText(editor), 'beta');
    assert.equal(changes.length, 1);
  });
});

test('ProseMirrorEditor clears undo history after an external document replacement', async () => {
  await withEditor(({ editor, changes }) => {
    assert.equal(editor.insertPlainText('alpha'), true);
    assert.equal(changes.length, 1);

    const echoedLocalDocument = changes[0];
    editor.setProps(createProps(echoedLocalDocument, (nextDocument) => {
      changes.push(nextDocument);
    }));

    editor.setProps(
      createProps(createWritingEditorDocumentFromPlainText('beta'), (nextDocument) => {
        changes.push(nextDocument);
      }),
    );

    const undoButton = getToolbarButton(editor, 'Undo');
    assert.equal(undoButton.disabled, true);
  });
});
