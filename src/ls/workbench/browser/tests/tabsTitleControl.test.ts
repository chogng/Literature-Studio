import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { createEmptyWritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import type {
  EditorGroupModel,
  EditorGroupTabItem,
} from 'ls/workbench/browser/parts/editor/editorGroupModel';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import type {
  WorkbenchContextMenuDelegate,
  WorkbenchContextMenuService,
} from 'ls/workbench/services/contextmenu/electron-sandbox/contextmenuService';

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
    paneMode?: EditorGroupTabItem['paneMode'];
    isActive?: boolean;
    hasLocalHistory?: boolean;
    targetTabId?: string | null;
  },
): EditorGroupTabItem {
  return {
    id: tab.id,
    kind: tab.kind,
    paneMode: tab.paneMode ?? (tab.kind === 'draft' ? 'draft' : tab.kind === 'pdf' ? 'pdf' : 'browser'),
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

function createContextMenuServiceSpy() {
  const delegates: WorkbenchContextMenuDelegate[] = [];
  const contextMenuService: WorkbenchContextMenuService = {
    showContextMenu(delegate) {
      delegates.push(delegate);
    },
    hideContextMenu() {},
    isVisible() {
      return delegates.length > 0;
    },
    dispose() {},
  };

  return {
    contextMenuService,
    delegates,
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
    onOpenPaneMode: () => {},
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
    onOpenPaneMode: () => {},
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

test('createEditorGroupModel keeps an untitled browser tab icon-only while preserving its mode title', () => {
  const model = createEditorGroupModel({
    tabs: [
      {
        id: 'browser-a',
        kind: 'browser',
        title: '',
        url: 'about:blank',
      },
    ],
    activeTabId: 'browser-a',
    activeTab: {
      id: 'browser-a',
      kind: 'browser',
      title: '',
      url: 'about:blank',
    },
    labels: editorLabels,
    draftStatusByTabId: {},
  });

  assert.equal(model.tabs[1]?.targetTabId, 'browser-a');
  assert.equal(model.tabs[1]?.label, '');
  assert.equal(model.tabs[1]?.title, 'Browser');
});

test('TabsTitleControl opens a pane mode when its fixed tab has no target tab yet', () => {
  const openedPaneModes: string[] = [];
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
    onOpenPaneMode: (paneMode) => {
      openedPaneModes.push(paneMode);
    },
  });
  const container = control.getElement();
  document.body.append(container);

  const browserButton = container.children[1]?.querySelector('.editor-tab-main');
  assert(browserButton instanceof HTMLButtonElement);

  browserButton.click();

  assert.deepEqual(openedPaneModes, ['browser']);

  control.dispose();
});

test('TabsTitleControl uses file-pdf for inactive pdf tabs and pdf for the active one', () => {
  const control = new TabsTitleControl({
    group: createGroupModel('browser-a', [
      createTabItem({
        id: 'browser-a',
        kind: 'browser',
        label: 'Browser',
        title: 'Browser',
        isActive: true,
      }),
      createTabItem({
        id: 'pdf-a',
        kind: 'pdf',
        label: 'Paper.pdf',
        title: 'Paper.pdf',
      }),
    ]),
    labels: {
      close: 'Close',
    },
    onActivateTab: () => {},
    onCloseTab: () => {},
    onOpenPaneMode: () => {},
  });
  const container = control.getElement();
  document.body.append(container);

  const getPdfIcon = () =>
    container.children[1]?.querySelector('.editor-tab-icon .lx-icon');

  assert.equal(getPdfIcon()?.classList.contains('lx-icon-file-pdf'), true);
  assert.equal(getPdfIcon()?.classList.contains('lx-icon-pdf'), false);

  control.setProps({
    group: createGroupModel('pdf-a', [
      createTabItem({
        id: 'browser-a',
        kind: 'browser',
        label: 'Browser',
        title: 'Browser',
      }),
      createTabItem({
        id: 'pdf-a',
        kind: 'pdf',
        label: 'Paper.pdf',
        title: 'Paper.pdf',
        isActive: true,
      }),
    ]),
    labels: {
      close: 'Close',
    },
    onActivateTab: () => {},
    onCloseTab: () => {},
    onOpenPaneMode: () => {},
  });

  assert.equal(getPdfIcon()?.classList.contains('lx-icon-file-pdf'), false);
  assert.equal(getPdfIcon()?.classList.contains('lx-icon-pdf'), true);

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
    onOpenPaneMode: () => {},
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
    onOpenPaneMode: () => {},
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
      onOpenPaneMode: () => {},
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

test('TabsTitleControl opens a context menu with close, close others, close all, and rename actions', () => {
  const closedTabIds: string[] = [];
  const closeOtherTabIds: string[] = [];
  const renamedTabIds: string[] = [];
  let closeAllCount = 0;
  const contextMenuSpy = createContextMenuServiceSpy();
  const control = new TabsTitleControl(
    {
      group: createGroupModel('browser-a', [
        createTabItem({
          id: 'draft-a',
          kind: 'draft',
          label: 'Draft A',
          title: 'Draft A',
        }),
        createTabItem({
          id: 'browser-a',
          kind: 'browser',
          label: 'Browser A',
          title: 'Browser A',
          isActive: true,
        }),
        createTabItem({
          id: 'pdf-a',
          kind: 'pdf',
          label: 'Paper.pdf',
          title: 'Paper.pdf',
        }),
      ]),
      labels: {
        close: 'Close',
        closeOthers: 'Close Others',
        closeAll: 'Close All',
        rename: 'Rename',
      },
      onActivateTab: () => {},
      onCloseTab: (tabId) => {
        closedTabIds.push(tabId);
      },
      onCloseOtherTabs: (tabId) => {
        closeOtherTabIds.push(tabId);
      },
      onCloseAllTabs: () => {
        closeAllCount += 1;
      },
      onRenameTab: (tabId) => {
        renamedTabIds.push(tabId);
      },
      onOpenPaneMode: () => {},
    },
    {
      contextMenuService: contextMenuSpy.contextMenuService,
    },
  );
  const container = control.getElement();
  document.body.append(container);

  const browserTab = container.children[1];
  const contextMenuEvent = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 24,
    clientY: 36,
  });
  browserTab?.dispatchEvent(contextMenuEvent);

  assert.equal(contextMenuEvent.defaultPrevented, true);
  assert.equal(contextMenuSpy.delegates.length, 1);
  const delegate = contextMenuSpy.delegates[0];

  assert.deepEqual(
    delegate.getActions().map((action) => action.value),
    ['close', 'close-others', 'close-all', 'rename'],
  );
  assert.deepEqual(
    delegate.getActions().map((action) => action.label),
    ['Close', 'Close Others', 'Close All', 'Rename'],
  );
  assert.deepEqual(delegate.getAnchor(), {
    x: 24,
    y: 36,
    width: 0,
    height: 0,
  });
  assert.equal(delegate.backend, 'dom');

  delegate.onSelect?.('close');
  delegate.onSelect?.('close-others');
  delegate.onSelect?.('close-all');
  delegate.onSelect?.('rename');

  assert.deepEqual(closedTabIds, ['browser-a']);
  assert.deepEqual(closeOtherTabIds, ['browser-a']);
  assert.equal(closeAllCount, 1);
  assert.deepEqual(renamedTabIds, ['browser-a']);

  control.dispose();
});

test('TabsTitleControl renders its DOM context menu below the cursor for available tabs near the top edge', async () => {
  const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 300,
  });

  HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('editor-tab-main')) {
      return {
        x: 40,
        y: 5,
        width: 80,
        height: 26,
        top: 5,
        left: 40,
        right: 120,
        bottom: 31,
        toJSON() {
          return this;
        },
      } as DOMRect;
    }

    if (this.classList.contains('ls-menu')) {
      return {
        x: 0,
        y: 0,
        width: 160,
        height: 120,
        top: 0,
        left: 0,
        right: 160,
        bottom: 120,
        toJSON() {
          return this;
        },
      } as DOMRect;
    }

    return originalGetBoundingClientRect.call(this);
  };

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
    onOpenPaneMode: () => {},
  });
  const container = control.getElement();
  document.body.append(container);

  try {
    const tab = container.querySelector('.editor-tab');
    assert(tab instanceof HTMLElement);
    const button = tab.querySelector('.editor-tab-main');
    assert(button instanceof HTMLButtonElement);

    const buttonRect = button.getBoundingClientRect();
    const clientX = Math.round(buttonRect.left + buttonRect.width / 2);
    const clientY = Math.round(buttonRect.bottom - 2);
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 2,
      buttons: 2,
    });

    tab.dispatchEvent(contextMenuEvent);
    await waitForAnimationFrame();
    await waitForAnimationFrame();

    const menu = document.body.querySelector('.ls-context-view .ls-menu');
    assert(menu instanceof HTMLElement);
    assert.equal(menu.classList.contains('dropdown-menu-bottom'), true);
    assert.equal(menu.classList.contains('dropdown-menu-top'), false);

    const menuRect = menu.getBoundingClientRect();
    assert.equal(menuRect.top >= clientY, true);
  } finally {
    control.dispose();
    document.body.replaceChildren();
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    if (originalInnerHeight) {
      Object.defineProperty(window, 'innerHeight', originalInnerHeight);
    }
  }
});
