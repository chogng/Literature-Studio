import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createEmptyWritingEditorDocument, createWritingEditorDocumentFromPlainText, writingEditorDocumentToPlainText } from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let ProseMirrorEditor: typeof import('ls/editor/browser/text/editor').ProseMirrorEditor;
let DraftEditorToolbar: typeof import('ls/editor/browser/text/toolbar').DraftEditorToolbar;
let TextSelection: typeof import('prosemirror-state').TextSelection;
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
  fontFamily: 'Font',
  fontSize: 'Size',
  defaultTextStyle: 'Default',
  clearInlineStyles: 'Clear styles',
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
  fontFamilyPrompt: 'Font family',
  fontSizePrompt: 'Font size',
};

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ ProseMirrorEditor } = await import('ls/editor/browser/text/editor'));
  ({ DraftEditorToolbar } = await import('ls/editor/browser/text/toolbar'));
  ({ TextSelection } = await import('prosemirror-state'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

function createProps(
  document: WritingEditorDocument,
  onDocumentChange: (nextDocument: WritingEditorDocument) => void,
): import('ls/editor/browser/text/editor').WritingEditorSurfaceProps {
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

test('DraftEditorToolbar shows preset font labels for normalized browser font-family values', () => {
  const toolbar = new DraftEditorToolbar({
    labels,
    toolbarState: {
      isParagraphActive: true,
      activeHeadingLevel: null,
      isBoldActive: false,
      isItalicActive: false,
      fontFamily: 'Times New Roman, Times, serif',
      fontSize: null,
      isBulletListActive: false,
      isOrderedListActive: false,
      isBlockquoteActive: false,
      canUndo: false,
      canRedo: false,
      availableFigureIds: [],
    },
    actions: {
      setParagraph: () => {},
      toggleHeading: () => {},
      toggleBold: () => {},
      toggleItalic: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      clearInlineStyles: () => {},
      toggleBulletList: () => {},
      toggleOrderedList: () => {},
      toggleBlockquote: () => {},
      undo: () => {},
      redo: () => {},
      insertCitation: () => {},
      insertFigure: () => {},
      insertFigureRef: () => {},
    },
  });

  document.body.append(toolbar.getElement());

  try {
    const dropdownFields = toolbar.getElement().querySelectorAll('.dropdown-field');
    const fontFamilyField = dropdownFields.item(0);
    assert(fontFamilyField instanceof HTMLElement);
    assert.equal(fontFamilyField.textContent, 'Times New Roman');
  } finally {
    toolbar.dispose();
    document.body.replaceChildren();
  }
});

test('DraftEditorToolbar marks unavailable preset fonts in the dropdown', () => {
  const originalFonts = (
    document as Document & {
      fonts?: {
        check?: (font: string, text?: string) => boolean;
      };
    }
  ).fonts;

  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      check: (font: string) => !font.includes('"宋体"'),
    },
  });

  const toolbar = new DraftEditorToolbar({
    labels,
    toolbarState: {
      isParagraphActive: true,
      activeHeadingLevel: null,
      isBoldActive: false,
      isItalicActive: false,
      fontFamily: null,
      fontSize: null,
      isBulletListActive: false,
      isOrderedListActive: false,
      isBlockquoteActive: false,
      canUndo: false,
      canRedo: false,
      availableFigureIds: [],
    },
    actions: {
      setParagraph: () => {},
      toggleHeading: () => {},
      toggleBold: () => {},
      toggleItalic: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      clearInlineStyles: () => {},
      toggleBulletList: () => {},
      toggleOrderedList: () => {},
      toggleBlockquote: () => {},
      undo: () => {},
      redo: () => {},
      insertCitation: () => {},
      insertFigure: () => {},
      insertFigureRef: () => {},
    },
  });

  document.body.append(toolbar.getElement());

  try {
    const fontFamilyDropdown = toolbar.getElement().querySelector('.dropdown-wrapper');
    assert(fontFamilyDropdown instanceof HTMLElement);
    fontFamilyDropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const menuItems = Array.from(document.body.querySelectorAll('.dropdown-menu-item'));
    const unavailableSongti = menuItems.find((item) => item.textContent?.includes('宋体 (未安装)'));

    assert(unavailableSongti instanceof HTMLElement);
    assert.equal(unavailableSongti.classList.contains('disabled'), true);
  } finally {
    toolbar.dispose();
    document.body.replaceChildren();
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: originalFonts,
    });
  }
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

test('ProseMirrorEditor exports a stable selection target for a single text unit', async () => {
  await withEditor(({ editor }) => {
    const initialDocument = createWritingEditorDocumentFromPlainText('alpha beta');
    editor.setProps(createProps(initialDocument, () => {}));

    const editorView = (editor as unknown as { view: import('prosemirror-view').EditorView | null }).view;
    assert(editorView);

    const selection = TextSelection.create(editorView.state.doc, 1, 6);
    editorView.dispatch(editorView.state.tr.setSelection(selection));

    const target = editor.getStableSelectionTarget();
    assert(target);
    assert.deepEqual(target, {
      blockId: target.blockId,
      kind: 'paragraph',
      range: {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 6,
      },
      startOffset: 0,
      endOffset: 5,
      selectedText: 'alpha',
      blockText: 'alpha beta',
      isCollapsed: false,
      isPlainTextEditable: true,
    });
    assert.match(target.blockId, /^block_/);
  });
});

test('ProseMirrorEditor returns null for multi-block selections', async () => {
  await withEditor(({ editor }) => {
    const initialDocument = createWritingEditorDocumentFromPlainText('alpha\n\nbeta');
    editor.setProps(createProps(initialDocument, () => {}));

    const editorView = (editor as unknown as { view: import('prosemirror-view').EditorView | null }).view;
    assert(editorView);

    const selection = TextSelection.create(editorView.state.doc, 2, 11);
    editorView.dispatch(editorView.state.tr.setSelection(selection));

    assert.equal(editor.getStableSelectionTarget(), null);
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
