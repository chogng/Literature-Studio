import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import type {
  ElectronOverlayMenuApi,
  ElectronAPI,
  NativeMenuEvent,
  NativeMenuOpenPayload,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let createElectronOverlayMenuController: typeof import('ls/base/parts/contextmenu/electron-sandbox/overlayContextmenu').createElectronOverlayMenuController;

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createElectronOverlayMenuController } = await import('ls/base/parts/contextmenu/electron-sandbox/overlayContextmenu'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

function createFakeOverlayMenuApi() {
  const openCalls: NativeMenuOpenPayload[] = [];
  const closeCalls: string[] = [];
  let menuListener: ((event: NativeMenuEvent) => void) | undefined;
  let removed = false;

  const api: ElectronOverlayMenuApi = {
    open(payload) {
      openCalls.push(payload);
    },
    close(requestId) {
      closeCalls.push(requestId);
    },
    select() {},
    getState: async () => null,
    onStateChange: () => () => {},
    onEvent(listener) {
      menuListener = listener;
      return () => {
        removed = true;
        if (menuListener === listener) {
          menuListener = undefined;
        }
      };
    },
  };

  return {
    api,
    openCalls,
    closeCalls,
    wasRemoved() {
      return removed;
    },
    emitEvent(event: NativeMenuEvent) {
      if (!menuListener) {
        throw new Error('Overlay menu event listener is unavailable.');
      }

      menuListener(event);
    },
  };
}

function createElectronApi(overrides: Partial<ElectronAPI>): ElectronAPI {
  return {
    invoke: (async () => {
      throw new Error('Unexpected invoke in overlay menu test.');
    }) as ElectronAPI['invoke'],
    ...overrides,
  };
}

function withElectronApi<T>(electronAPI: ElectronAPI | undefined, run: () => T): T {
  const testWindow = window as typeof window & {
    electronAPI?: ElectronAPI;
  };
  const previousElectronApi = testWindow.electronAPI;

  testWindow.electronAPI = electronAPI;

  try {
    return run();
  } finally {
    testWindow.electronAPI = previousElectronApi;
  }
}

test('electron overlay menu controller unsubscribes from native events on dispose', () => {
  const fakeApi = createFakeOverlayMenuApi();

  withElectronApi(createElectronApi({ overlayMenu: fakeApi.api }), () => {
    let selectedValue: string | null = null;
    let hideCount = 0;
    const controller = createElectronOverlayMenuController();

    try {
      controller.show({
        anchor: { x: 10, y: 20, width: 30, height: 40 },
        options: [{ value: 'archive', label: 'Archive' }],
        requestId: 'overlay-test',
        onSelect: ({ value }) => {
          selectedValue = value;
        },
        onHide: () => {
          hideCount += 1;
        },
      });

      assert.equal(fakeApi.openCalls.length, 1);
      assert.equal(controller.isVisible(), true);

      fakeApi.emitEvent({
        requestId: 'overlay-test',
        type: 'select',
        value: 'archive',
      });

      assert.equal(selectedValue, 'archive');
      assert.equal(hideCount, 1);
      assert.equal(controller.isVisible(), false);

      controller.dispose();

      assert.equal(fakeApi.wasRemoved(), true);
      assert.deepEqual(fakeApi.closeCalls, []);
    } finally {
      controller.dispose();
    }
  });
});

test('electron overlay menu controller closes the active request during dispose', () => {
  const fakeApi = createFakeOverlayMenuApi();

  withElectronApi(createElectronApi({ overlayMenu: fakeApi.api }), () => {
    let hideCount = 0;
    const controller = createElectronOverlayMenuController();

    controller.show({
      anchor: { x: 1, y: 2, width: 3, height: 4 },
      options: [{ value: 'delete', label: 'Delete' }],
      requestId: 'overlay-visible',
      onHide: () => {
        hideCount += 1;
      },
    });

    controller.dispose();

    assert.equal(hideCount, 1);
    assert.equal(controller.isVisible(), false);
    assert.deepEqual(fakeApi.closeCalls, ['overlay-visible']);
    assert.equal(fakeApi.wasRemoved(), true);
  });
});
