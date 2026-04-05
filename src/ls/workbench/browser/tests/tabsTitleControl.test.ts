import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { createEmptyWritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import type {
  EditorGroupModel,
  EditorGroupTabItem,
} from 'ls/workbench/browser/parts/editor/editorGroupModel';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';

let cleanupDomEnvironment: (() => void) | null = null;
let TabsTitleControl: typeof import('ls/workbench/browser/parts/editor/tabsTitleControl').TabsTitleControl;
let createEditorGroupModel: typeof import('ls/workbench/browser/parts/editor/editorGroupModel').createEditorGroupModel;

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}

function createGroupModel(
  activeTabId: string | null,
  tabs: EditorGroupModel['tabs'],
): EditorGroupModel {
  return {
    tabs,
    activeTabId,
    activeTab: null,
  };
}

function createTabItem(
  tab: Pick<EditorGroupTabItem, 'id' | 'kind' | 'label' | 'title'> & {
    isActive?: boolean;
    hasLocalHistory?: boolean;
    targetTabId?: string | null;
  },
): EditorGroupTabItem {
  return {
    id: tab.id,
    kind: tab.kind,
    label: tab.label,
    title: tab.title,
    targetTabId:
      Object.prototype.hasOwnProperty.call(tab, 'targetTabId')
        ? tab.targetTabId ?? null
        : tab.id,
    state: {
      isActive: Boolean(tab.isActive),
      isClosable: false,
      hasLocalHistory: Boolean(tab.hasLocalHistory),
      canUndo: Boolean(tab.hasLocalHistory),
      canRedo: false,
    },
  };
}

function installResizeObserverSpy() {
  let activeObservers = 0;
  const previousResizeObserver = globalThis.ResizeObserver;

  class FakeResizeObserver implements ResizeObserver {
    private observing = false;

    disconnect() {
      if (!this.observing) {
        return;
      }

      this.observing = false;
      activeObservers -= 1;
    }

    observe() {
      if (this.observing) {
        return;
      }

      this.observing = true;
      activeObservers += 1;
    }

    unobserve() {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: FakeResizeObserver,
  });

  return {
    getActiveObservers() {
      return activeObservers;
    },
    restore() {
      if (previousResizeObserver === undefined) {
        Reflect.deleteProperty(globalThis, 'ResizeObserver');
        return;
      }

      Object.defineProperty(globalThis, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: previousResizeObserver,
      });
    },
  };
}

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ TabsTitleControl } = await import('ls/workbench/browser/parts/editor/tabsTitleControl'));
  ({ createEditorGroupModel } = await import('ls/workbench/browser/parts/editor/editorGroupModel'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

const editorLabels = {
  draftMode: 'Draft',
  sourceMode: 'Browser',
  pdfMode: 'PDF',
} as EditorPartLabels;

test('TabsTitleControl reuses tab nodes across prop updates', () => {
  const activatedTabIds: string[] = [];
  const control = new TabsTitleControl({
    group: createGroupModel('draft-a', [
      createTabItem({
        id: 'draft-a',
        kind: 'draft',
        label: 'Draft A',
        title: 'Draft A',
        isActive: true,
      }),
      createTabItem({
        id: 'browser-b',
        kind: 'browser',
        label: 'Web B',
        title: 'Web B',
      }),
    ]),
    labels: {
      close: 'Close',
    },
    onActivateTab: (tabId) => {
      activatedTabIds.push(tabId);
    },
    onCloseTab: () => {},
    onOpenKind: () => {},
  });
  const container = control.getElement();
  document.body.append(container);

  const draftTab = container.children[0];
  const browserTab = container.children[1];

  control.setProps({
    group: createGroupModel('browser-b', [
      createTabItem({
        id: 'browser-b',
        kind: 'browser',
        label: 'Web B Updated',
        title: 'Web B Updated',
        isActive: true,
      }),
      createTabItem({
        id: 'pdf-c',
        kind: 'pdf',
        label: 'PDF C',
        title: 'PDF C',
      }),
    ]),
    labels: {
      close: 'Remove',
    },
    onActivateTab: (tabId) => {
      activatedTabIds.push(tabId);
    },
    onCloseTab: () => {},
    onOpenKind: () => {},
  });

  assert.equal(container.children.length, 2);
  assert.equal(container.children[0], browserTab);
  assert.equal(container.children[1].querySelector('.editor-tab-label-text')?.textContent, 'PDF C');
  assert.equal(draftTab.isConnected, false);

  const updatedMainButton = browserTab.querySelector('.editor-tab-main');
  assert(updatedMainButton instanceof HTMLButtonElement);
  assert.equal(updatedMainButton.title, 'Web B Updated');
  assert.equal(updatedMainButton.getAttribute('aria-selected'), 'true');
  assert.equal(updatedMainButton.getAttribute('aria-posinset'), '1');
  assert.equal(updatedMainButton.getAttribute('aria-setsize'), '2');

  updatedMainButton.click();

  assert.deepEqual(activatedTabIds, ['browser-b']);

  control.dispose();
});

test('createEditorGroupModel always returns three fixed tabs and prefers the active tab for each kind', () => {
  const model = createEditorGroupModel({
    tabs: [
      {
        id: 'draft-a',
        kind: 'draft',
        title: 'Draft A',
        document: createEmptyWritingEditorDocument(),
        viewMode: 'draft',
      },
      {
        id: 'draft-b',
        kind: 'draft',
        title: 'Draft B',
        document: createEmptyWritingEditorDocument(),
        viewMode: 'draft',
      },
      {
        id: 'browser-a',
        kind: 'browser',
        title: 'Example A',
        url: 'https://a.test',
      },
      {
        id: 'pdf-a',
        kind: 'pdf',
        title: 'Paper A',
        url: 'https://a.test/paper.pdf',
      },
    ],
    activeTabId: 'draft-a',
    activeTab: {
      id: 'draft-a',
      kind: 'draft',
      title: 'Draft A',
      document: createEmptyWritingEditorDocument(),
      viewMode: 'draft',
    },
    labels: editorLabels,
    draftStatusByTabId: {},
  });

  assert.deepEqual(
    model.tabs.map((tab) => tab.kind),
    ['draft', 'browser', 'pdf'],
  );
  assert.equal(model.tabs[0]?.targetTabId, 'draft-a');
  assert.equal(model.tabs[0]?.label, 'Draft A');
  assert.equal(model.tabs[1]?.targetTabId, 'browser-a');
  assert.equal(model.tabs[2]?.targetTabId, 'pdf-a');
});

test('TabsTitleControl opens a kind when its fixed tab has no target tab yet', () => {
  const openedKinds: string[] = [];
  const control = new TabsTitleControl({
    group: createGroupModel(null, [
      createTabItem({
        id: 'draft-entry',
        kind: 'draft',
        label: '',
        title: 'Draft',
        targetTabId: null,
      }),
      createTabItem({
        id: 'browser-entry',
        kind: 'browser',
        label: '',
        title: 'Browser',
        targetTabId: null,
      }),
      createTabItem({
        id: 'pdf-entry',
        kind: 'pdf',
        label: '',
        title: 'PDF',
        targetTabId: null,
      }),
    ]),
    labels: {
      close: 'Close',
    },
    onActivateTab: () => {},
    onCloseTab: () => {},
    onOpenKind: (kind) => {
      openedKinds.push(kind);
    },
  });
  const container = control.getElement();
  document.body.append(container);

  const browserButton = container.children[1]?.querySelector('.editor-tab-main');
  assert(browserButton instanceof HTMLButtonElement);

  browserButton.click();

  assert.deepEqual(openedKinds, ['browser']);

  control.dispose();
});

test('TabsTitleControl reveals the active tab when the strip overflows', async () => {
  const control = new TabsTitleControl({
    group: createGroupModel('draft-a', [
      createTabItem({
        id: 'draft-a',
        kind: 'draft',
        label: 'Draft A',
        title: 'Draft A',
        isActive: true,
      }),
      createTabItem({
        id: 'browser-b',
        kind: 'browser',
        label: 'Web B',
        title: 'Web B',
      }),
      createTabItem({
        id: 'pdf-c',
        kind: 'pdf',
        label: 'PDF C',
        title: 'PDF C',
      }),
    ]),
    labels: {
      close: 'Close',
    },
    onActivateTab: () => {},
    onCloseTab: () => {},
    onOpenKind: () => {},
  });
  const container = control.getElement();
  document.body.append(container);

  let scrollLeft = 0;
  Object.defineProperty(container, 'clientWidth', {
    configurable: true,
    get: () => 160,
  });
  Object.defineProperty(container, 'scrollWidth', {
    configurable: true,
    get: () => 360,
  });
  Object.defineProperty(container, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    },
  });

  const [firstTab, secondTab, thirdTab] = Array.from(container.children);
  for (const [element, offsetLeft, offsetWidth] of [
    [firstTab, 0, 96],
    [secondTab, 96, 120],
    [thirdTab, 216, 120],
  ] as const) {
    Object.defineProperty(element, 'offsetLeft', {
      configurable: true,
      get: () => offsetLeft,
    });
    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      get: () => offsetWidth,
    });
  }

  control.setProps({
    group: createGroupModel('pdf-c', [
      createTabItem({
        id: 'draft-a',
        kind: 'draft',
        label: 'Draft A',
        title: 'Draft A',
      }),
      createTabItem({
        id: 'browser-b',
        kind: 'browser',
        label: 'Web B',
        title: 'Web B',
        hasLocalHistory: true,
      }),
      createTabItem({
        id: 'pdf-c',
        kind: 'pdf',
        label: 'PDF C',
        title: 'PDF C',
        isActive: true,
      }),
    ]),
    labels: {
      close: 'Close',
    },
    onActivateTab: () => {},
    onCloseTab: () => {},
    onOpenKind: () => {},
  });

  await waitForAnimationFrame();

  assert.equal(scrollLeft, 176);
  assert.equal(container.classList.contains('is-overflowing'), true);
  assert.equal(container.classList.contains('is-scroll-end'), true);
  assert.equal(secondTab.classList.contains('has-local-history'), true);

  control.dispose();
});

test('TabsTitleControl disconnects resize observers on dispose', () => {
  const resizeObserverSpy = installResizeObserverSpy();

  try {
    const control = new TabsTitleControl({
      group: createGroupModel('draft-a', [
        createTabItem({
          id: 'draft-a',
          kind: 'draft',
          label: 'Draft A',
          title: 'Draft A',
          isActive: true,
        }),
      ]),
      labels: {
        close: 'Close',
      },
      onActivateTab: () => {},
      onCloseTab: () => {},
      onOpenKind: () => {},
    });
    document.body.append(control.getElement());

    assert.equal(resizeObserverSpy.getActiveObservers(), 1);

    control.dispose();

    assert.equal(resizeObserverSpy.getActiveObservers(), 0);
  } finally {
    resizeObserverSpy.restore();
    document.body.replaceChildren();
  }
});
