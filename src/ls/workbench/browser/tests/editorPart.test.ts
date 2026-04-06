import assert from 'node:assert/strict';
import test, { after, beforeEach } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import { createWritingEditorDocumentFromPlainText } from 'ls/editor/common/writingEditorDocument';
import en from 'language/locales/en';
import type { ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';

const domEnvironment = installDomTestEnvironment();

const defaultViewPartProps: ViewPartProps = {
  browserUrl: '',
  electronRuntime: false,
  webContentRuntime: false,
  labels: {
    emptyState: 'Empty',
    contentUnavailable: 'Unavailable',
  },
};

beforeEach(() => {
  window.localStorage.clear();
  document.body.replaceChildren();
});

after(() => {
  domEnvironment.cleanup();
});

test('EditorPartController creates a new browser tab as an empty about:blank tab', async () => {
  const { EditorPartController } = await import('ls/workbench/browser/parts/editor/editorPart');
  const controller = new EditorPartController({
    ui: en,
    browserUrl: 'https://example.com/articles/current',
    webUrl: '',
    viewPartProps: defaultViewPartProps,
  });

  await (controller.getSnapshot().editorPartProps.onCreateBrowserTab as unknown as () => Promise<void>)();

  const browserTab = controller
    .getSnapshot()
    .tabs.find((tab) => tab.kind === 'browser');
  assert(browserTab);
  assert.equal(browserTab.url, 'about:blank');
  assert.equal(controller.getSnapshot().activeTab?.id, browserTab.id);

  controller.dispose();
});

test('EditorPartController keeps browser tab creation empty even without an available URL', async () => {
  const { EditorPartController } = await import('ls/workbench/browser/parts/editor/editorPart');
  const controller = new EditorPartController({
    ui: en,
    browserUrl: '',
    webUrl: '',
    viewPartProps: defaultViewPartProps,
  });

  await (controller.getSnapshot().editorPartProps.onCreateBrowserTab as unknown as () => Promise<void>)();

  const browserTab = controller
    .getSnapshot()
    .tabs.find((tab) => tab.kind === 'browser');
  assert(browserTab);
  assert.equal(browserTab.url, 'about:blank');
  assert.equal(controller.getSnapshot().activeTab?.id, browserTab.id);

  controller.dispose();
});

test('EditorPartController opens the browser pane as an empty about:blank tab', async () => {
  const { EditorPartController } = await import('ls/workbench/browser/parts/editor/editorPart');
  const controller = new EditorPartController({
    ui: en,
    browserUrl: 'https://example.com/articles/current',
    webUrl: '',
    viewPartProps: defaultViewPartProps,
  });

  controller.getSnapshot().editorPartProps.onOpenBrowserPane();

  const browserTab = controller
    .getSnapshot()
    .tabs.find((tab) => tab.kind === 'browser');
  assert(browserTab);
  assert.equal(browserTab.url, 'about:blank');
  assert.equal(controller.getSnapshot().activeTab?.id, browserTab.id);

  controller.dispose();
});

test('EditorPartController reuses an existing empty draft tab for explicit draft creation', async () => {
  const { EditorPartController } = await import('ls/workbench/browser/parts/editor/editorPart');
  const controller = new EditorPartController({
    ui: en,
    browserUrl: '',
    webUrl: '',
    viewPartProps: defaultViewPartProps,
  });

  const initialDraftTabId = controller.getSnapshot().activeTab?.id ?? null;
  controller.getSnapshot().editorPartProps.onCreateDraftTab();

  const draftTabs = controller
    .getSnapshot()
    .tabs.filter((tab) => tab.kind === 'draft');
  assert.equal(draftTabs.length, 1);
  assert.equal(controller.getSnapshot().activeTab?.id, initialDraftTabId);

  controller.dispose();
});

test('EditorPartController creates a new draft tab when the reusable draft is dirty', async () => {
  const { EditorPartController } = await import('ls/workbench/browser/parts/editor/editorPart');
  const controller = new EditorPartController({
    ui: en,
    browserUrl: '',
    webUrl: '',
    viewPartProps: defaultViewPartProps,
  });

  const initialDraftTabId = controller.getSnapshot().activeTab?.id ?? null;
  controller.setDraftDocument(createWritingEditorDocumentFromPlainText('dirty'));
  controller.getSnapshot().editorPartProps.onCreateDraftTab();

  const draftTabs = controller
    .getSnapshot()
    .tabs.filter((tab) => tab.kind === 'draft');
  assert.equal(draftTabs.length, 2);
  assert.notEqual(controller.getSnapshot().activeTab?.id, initialDraftTabId);

  controller.dispose();
});

test('EditorPartController reuses an existing empty browser tab for explicit browser creation', async () => {
  const { EditorPartController } = await import('ls/workbench/browser/parts/editor/editorPart');
  const controller = new EditorPartController({
    ui: en,
    browserUrl: '',
    webUrl: '',
    viewPartProps: defaultViewPartProps,
  });

  controller.getSnapshot().editorPartProps.onOpenBrowserPane();
  await (controller.getSnapshot().editorPartProps.onCreateBrowserTab as unknown as () => Promise<void>)();

  const browserTabs = controller
    .getSnapshot()
    .tabs.filter((tab) => tab.kind === 'browser');
  assert.equal(browserTabs.length, 1);
  assert.equal(browserTabs[0]?.url, 'about:blank');
  assert.equal(controller.getSnapshot().activeTab?.id, browserTabs[0]?.id);

  controller.dispose();
});

test('EditorPartController serializes close requests while unsaved confirm is open', async () => {
  const { EditorPartController } = await import('ls/workbench/browser/parts/editor/editorPart');
  const controller = new EditorPartController({
    ui: en,
    browserUrl: '',
    webUrl: '',
    viewPartProps: defaultViewPartProps,
  });

  const activeDraftTab = controller
    .getSnapshot()
    .activeTab;
  assert(activeDraftTab?.kind === 'draft');
  controller.setDraftDocument(createWritingEditorDocumentFromPlainText('dirty'));

  const firstClose = controller.onCloseTab(activeDraftTab.id);
  const secondClose = controller.onCloseTab(activeDraftTab.id);

  await Promise.resolve();
  assert.equal(document.querySelectorAll('.workbench-editor-modal-panel').length, 1);

  const discardButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '.workbench-editor-modal-actions button',
    ),
  ).find(
    (button) => button.textContent?.trim() === en.editorUnsavedChangesDiscard,
  );
  assert(discardButton instanceof HTMLButtonElement);
  discardButton.click();

  const [didCloseFirst, didCloseSecond] = await Promise.all([
    firstClose,
    secondClose,
  ]);
  assert.equal(didCloseFirst, true);
  assert.equal(didCloseSecond, false);
  assert.equal(document.querySelectorAll('.workbench-editor-modal-panel').length, 0);

  controller.dispose();
});
