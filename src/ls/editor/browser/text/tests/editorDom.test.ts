import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { ScrollbarVisibility } from 'ls/base/browser/ui/scrollbar/scrollableElementOptions';
import { createEmptyWritingEditorDocument, createWritingEditorDocumentFromPlainText, writingEditorDocumentToPlainText } from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let ProseMirrorEditor: typeof import('ls/editor/browser/text/editor').ProseMirrorEditor;
let DraftEditorToolbar: typeof import('ls/editor/browser/text/editorToolbar').DraftEditorToolbar;
let TextSelection: typeof import('prosemirror-state').TextSelection;
let DomScrollableElement: typeof import('ls/base/browser/ui/scrollbar/scrollableElement').DomScrollableElement;
let cleanupDomEnvironment: (() => void) | null = null;

const labels = {
  textGroup: 'Text',
  formatGroup: 'Format',
  insertGroup: 'Insert',
  historyGroup: 'History',
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  fontFamily: 'Font',
  fontSize: 'Size',
  defaultTextStyle: 'Default',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
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
  ({ DraftEditorToolbar } = await import('ls/editor/browser/text/editorToolbar'));
  ({ TextSelection } = await import('prosemirror-state'));
  ({ DomScrollableElement } = await import('ls/base/browser/ui/scrollbar/scrollableElement'));
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
  const element = editor.getElement().querySelector('.scrollable-element-root');
  assert(element instanceof HTMLElement, 'Scrollable root was not rendered.');
  return element;
}

function getLatestFigureWidth(document: WritingEditorDocument) {
  const figureNode = document.content?.find((node) => node.type === 'figure');
  assert(figureNode, 'Figure node was not found in the document.');
  return figureNode.attrs?.width;
}

function getToolbarButton(editor: InstanceType<typeof ProseMirrorEditor>, label: string) {
  const toolbarRoot = editor.getToolbarElement();
  const button = Array.from(toolbarRoot.querySelectorAll('button')).find(
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

function createDragPointerEvent(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
) {
  const pointerEventConstructor = (
    window as Window & {
      PointerEvent?: typeof PointerEvent;
    }
  ).PointerEvent;

  if (typeof pointerEventConstructor === 'function') {
    return new pointerEventConstructor(type, {
      bubbles: true,
      clientX,
      pointerId: 1,
      pointerType: 'mouse',
    });
  }

  const fallbackType =
    type === 'pointerdown'
      ? 'mousedown'
      : type === 'pointermove'
        ? 'mousemove'
        : 'mouseup';
  return new MouseEvent(fallbackType, {
    bubbles: true,
    clientX,
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

test('ProseMirrorEditor writes resized figure widths back to the document', async () => {
  await withEditor(({ editor, changes }) => {
    assert.equal(
      editor.insertFigure({
        src: 'https://example.com/figure.png',
        caption: 'Figure caption',
        width: 220,
      }),
      true,
    );
    assert.equal(changes.length, 1);
    assert.equal(getLatestFigureWidth(changes[0]), 220);

    const resizeHandle = editor.getElement().querySelector('.pm-resizable-handle');
    assert(resizeHandle instanceof HTMLElement, 'Figure resize handle was not rendered.');

    resizeHandle.dispatchEvent(
      createDragPointerEvent('pointerdown', 220),
    );
    window.dispatchEvent(createDragPointerEvent('pointermove', 300));
    window.dispatchEvent(createDragPointerEvent('pointerup', 300));

    assert.equal(changes.length, 2);
    assert.equal(getLatestFigureWidth(changes[1]), 300);
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
      isUnderlineActive: false,
      fontFamily: 'Times New Roman, Times, serif',
      fontSize: null,
      textAlign: 'left',
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
      toggleUnderline: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      setTextAlign: () => {},
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

test('DraftEditorToolbar shows Chinese named font-size presets for matching px values', () => {
  const toolbar = new DraftEditorToolbar({
    labels,
    toolbarState: {
      isParagraphActive: true,
      activeHeadingLevel: null,
      isBoldActive: false,
      isItalicActive: false,
      isUnderlineActive: false,
      fontFamily: null,
      fontSize: '16px',
      textAlign: 'left',
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
      toggleUnderline: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      setTextAlign: () => {},
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
    const fontSizeField = dropdownFields.item(1);
    assert(fontSizeField instanceof HTMLElement);
    assert.equal(fontSizeField.textContent, '小四');
  } finally {
    toolbar.dispose();
    document.body.replaceChildren();
  }
});

test('DraftEditorToolbar orders Chinese named font-size presets from large to small', () => {
  const toolbar = new DraftEditorToolbar({
    labels,
    toolbarState: {
      isParagraphActive: true,
      activeHeadingLevel: null,
      isBoldActive: false,
      isItalicActive: false,
      isUnderlineActive: false,
      fontFamily: null,
      fontSize: null,
      textAlign: 'left',
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
      toggleUnderline: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      setTextAlign: () => {},
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
    const dropdowns = toolbar.getElement().querySelectorAll('.dropdown-wrapper');
    const fontSizeDropdown = dropdowns.item(1);
    assert(fontSizeDropdown instanceof HTMLElement);
    fontSizeDropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const menuItems = Array.from(document.body.querySelectorAll('.dropdown-menu-item'));
    const labels = menuItems
      .map((item) => item.textContent?.trim())
      .filter((value): value is string => Boolean(value));

    assert.deepEqual(labels.slice(0, 5), ['Default', '初号', '小初', '一号', '小一']);
    assert.deepEqual(labels.slice(-4), ['五号', '小五', '六号', '小六']);
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
      isUnderlineActive: false,
      fontFamily: null,
      fontSize: null,
      textAlign: 'left',
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
      toggleUnderline: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      setTextAlign: () => {},
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
    const dropdowns = toolbar.getElement().querySelectorAll('.dropdown-wrapper');
    const fontFamilyDropdown = dropdowns.item(0);
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

test('DraftEditorToolbar disables figure-ref action when no figures are available', () => {
  const toolbar = new DraftEditorToolbar({
    labels,
    toolbarState: {
      isParagraphActive: true,
      activeHeadingLevel: null,
      isBoldActive: false,
      isItalicActive: false,
      isUnderlineActive: false,
      fontFamily: null,
      fontSize: null,
      textAlign: 'left',
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
      toggleUnderline: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      setTextAlign: () => {},
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
    const button = Array.from(toolbar.getElement().querySelectorAll('button')).find(
      (candidate) => candidate.getAttribute('aria-label') === labels.insertFigureRef,
    );
    assert(button instanceof HTMLButtonElement);
    assert.equal(button.disabled, true);
  } finally {
    toolbar.dispose();
    document.body.replaceChildren();
  }
});

test('DraftEditorToolbar renders draft-specific toolbar content classes', () => {
  const toolbar = new DraftEditorToolbar({
    labels,
    toolbarState: {
      isParagraphActive: true,
      activeHeadingLevel: null,
      isBoldActive: false,
      isItalicActive: false,
      isUnderlineActive: false,
      fontFamily: null,
      fontSize: null,
      textAlign: 'left',
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
      toggleUnderline: () => {},
      setFontFamily: () => {},
      setFontSize: () => {},
      setTextAlign: () => {},
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
    const toolbarElement = toolbar.getElement();
    const toolbarGroup = toolbarElement.querySelector(
      ':scope > .actionbar.editor-draft-toolbar-group',
    );
    const toolbarAction = toolbarElement.querySelector(
      '.editor-draft-toolbar-group .editor-draft-toolbar-btn.actionbar-action',
    );
    const textStylePrimary = toolbarElement.querySelector(
      '.editor-draft-toolbar-split .editor-draft-toolbar-split-primary.actionbar-action',
    );
    const textStyleDropdown = toolbarElement.querySelector(
      '.editor-draft-toolbar-split .editor-draft-toolbar-split-dropdown.actionbar-action',
    );

    assert.equal(toolbarElement.classList.contains('editor-draft-toolbar'), true);
    assert(toolbarGroup instanceof HTMLElement);
    assert(toolbarAction instanceof HTMLButtonElement);
    assert(textStylePrimary instanceof HTMLButtonElement);
    assert(textStyleDropdown instanceof HTMLElement);
  } finally {
    toolbar.dispose();
    document.body.replaceChildren();
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

test('ProseMirrorEditor mounts the editing surface inside the shared scrollable container', async () => {
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

test('ProseMirrorEditor restores draft view state with selection and scroll position', async () => {
  await withEditor(({ editor }) => {
    const initialDocument = createWritingEditorDocumentFromPlainText('alpha beta');
    editor.setProps(createProps(initialDocument, () => {}));

    const editorView = (editor as unknown as { view: import('prosemirror-view').EditorView | null }).view;
    const host = (editor as unknown as { hostWrapperElement: HTMLElement }).hostWrapperElement;
    assert(editorView);
    assert(host instanceof HTMLElement);

    const selection = TextSelection.create(editorView.state.doc, 1, 6);
    editorView.dispatch(editorView.state.tr.setSelection(selection));
    host.scrollTop = 48;
    host.dispatchEvent(new Event('scroll'));

    const viewState = editor.getViewState();
    assert(viewState);
    assert.equal(viewState.scrollPosition.scrollTop, 48);
    assert.equal(viewState.selectionTarget?.selectedText, 'alpha');

    const collapsedSelection = TextSelection.create(editorView.state.doc, 1, 1);
    editorView.dispatch(editorView.state.tr.setSelection(collapsedSelection));
    host.scrollTop = 0;
    host.dispatchEvent(new Event('scroll'));

    editor.restoreViewState(viewState);

    const restoredTarget = editor.getStableSelectionTarget();
    assert(restoredTarget);
    assert.equal(restoredTarget.selectedText, 'alpha');
    assert.equal(host.scrollTop, 48);
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

test('DomScrollableElement uses visibility controllers to reveal auto scrollbars on hover and scroll', async () => {
  const content = document.createElement('div');
  Object.defineProperties(content, {
    clientHeight: { configurable: true, value: 120 },
    clientWidth: { configurable: true, value: 120 },
    scrollHeight: { configurable: true, value: 360 },
    scrollWidth: { configurable: true, value: 120 },
    scrollTop: { configurable: true, writable: true, value: 0 },
    scrollLeft: { configurable: true, writable: true, value: 0 },
  });

  const scrollable = new DomScrollableElement(content, {
    vertical: ScrollbarVisibility.Auto,
    horizontal: ScrollbarVisibility.Hidden,
  });
  const root = scrollable.getDomNode();
  document.body.append(root);

  try {
    assert.equal(root.classList.contains('is-vertical-scrollbar-visible'), false);

    root.dispatchEvent(new Event('mouseenter'));
    await delay(0);
    assert.equal(root.classList.contains('is-vertical-scrollbar-visible'), true);

    root.dispatchEvent(new Event('mouseleave'));
    await delay(550);
    assert.equal(root.classList.contains('is-vertical-scrollbar-visible'), false);

    content.scrollTop = 48;
    content.dispatchEvent(new Event('scroll'));
    await delay(0);
    assert.equal(root.classList.contains('is-vertical-scrollbar-visible'), true);

    await delay(550);
    assert.equal(root.classList.contains('is-vertical-scrollbar-visible'), false);
  } finally {
    scrollable.dispose();
    document.body.replaceChildren();
  }
});
