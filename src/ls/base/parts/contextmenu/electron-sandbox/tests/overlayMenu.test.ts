import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import type {
  ElectronAPI,
  ElectronOverlayMenuApi,
  NativeMenuState,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let createOverlayMenuView: typeof import('ls/base/parts/contextmenu/electron-sandbox/overlayMenu').createOverlayMenuView;

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createOverlayMenuView } = await import('ls/base/parts/contextmenu/electron-sandbox/overlayMenu'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

function createMenuState(overrides: Partial<NativeMenuState> = {}): NativeMenuState {
  return {
    requestId: 'overlay-menu-state',
    triggerRect: { x: 10, y: 20, width: 30, height: 40 },
    options: [{ value: 'archive', label: 'Archive' }],
    value: 'archive',
    align: 'start',
    coverage: 'full-window',
    sourceWebContentsId: 1,
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function createFakeOverlayMenuApi(getState: () => Promise<NativeMenuState | null>) {
  let stateListener: ((state: NativeMenuState | null) => void) | undefined;
  let removed = false;
  const closeCalls: string[] = [];
  const selectCalls: Array<{ requestId: string; value: string }> = [];

  const api: ElectronOverlayMenuApi = {
    open() {},
    close(requestId) {
      closeCalls.push(requestId);
    },
    select(requestId, value) {
      selectCalls.push({ requestId, value });
    },
    getState,
    onStateChange(listener) {
      stateListener = listener;
      return () => {
        removed = true;
        if (stateListener === listener) {
          stateListener = undefined;
        }
      };
    },
    onEvent: () => () => {},
  };

  return {
    api,
    closeCalls,
    selectCalls,
    wasRemoved() {
      return removed;
    },
    emitState(state: NativeMenuState | null) {
      if (!stateListener) {
        throw new Error('Overlay menu state listener is unavailable.');
      }

      stateListener(state);
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

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test('overlay menu view unsubscribes from state changes and disconnects resize observers on dispose', async () => {
  const resizeObserverSpy = installResizeObserverSpy();
  const deferredInitialState = createDeferred<NativeMenuState | null>();
  const fakeApi = createFakeOverlayMenuApi(() => deferredInitialState.promise);

  try {
    await withElectronApi(createElectronApi({ overlayMenu: fakeApi.api }), async () => {
      const view = createOverlayMenuView();
      document.body.append(view.getElement());

      try {
        fakeApi.emitState(createMenuState());
        await flushMicrotasks();

        assert.equal(resizeObserverSpy.getActiveObservers(), 1);

        view.dispose();

        assert.equal(fakeApi.wasRemoved(), true);
        assert.equal(resizeObserverSpy.getActiveObservers(), 0);
        assert.equal(view.getElement().childElementCount, 0);
      } finally {
        view.dispose();
      }
    });
  } finally {
    resizeObserverSpy.restore();
    document.body.replaceChildren();
  }
});

test('overlay menu view ignores late initial state after dispose', async () => {
  const resizeObserverSpy = installResizeObserverSpy();
  const deferredState = createDeferred<NativeMenuState | null>();
  const fakeApi = createFakeOverlayMenuApi(() => deferredState.promise);

  try {
    await withElectronApi(createElectronApi({ overlayMenu: fakeApi.api }), async () => {
      const view = createOverlayMenuView();
      document.body.append(view.getElement());

      view.dispose();
      deferredState.resolve(createMenuState({ requestId: 'late-state' }));
      await flushMicrotasks();

      assert.equal(fakeApi.wasRemoved(), true);
      assert.equal(resizeObserverSpy.getActiveObservers(), 0);
      assert.equal(view.getElement().childElementCount, 0);
    });
  } finally {
    resizeObserverSpy.restore();
    document.body.replaceChildren();
  }
});
