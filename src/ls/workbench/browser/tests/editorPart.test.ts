import assert from 'node:assert/strict';
import test, { after, beforeEach } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
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

test('EditorPartController creates a browser tab from the current browser URL without prompting', async () => {
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
  assert.equal(browserTab.url, 'https://example.com/articles/current');
  assert.equal(controller.getSnapshot().activeTab?.id, browserTab.id);

  controller.dispose();
});

test('EditorPartController falls back to about:blank when creating a browser tab without an available URL', async () => {
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
