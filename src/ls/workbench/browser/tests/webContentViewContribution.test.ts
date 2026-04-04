import assert from 'node:assert/strict';
import test, { after, afterEach, before } from 'node:test';

import type { ElectronAPI } from 'ls/base/parts/sandbox/common/desktopTypes';
import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let createWorkbenchWebContentViewContribution: typeof import('ls/workbench/contrib/webContentView/webContentView.contribution').createWorkbenchWebContentViewContribution;
let registerWorkbenchPartDomNode: typeof import('ls/workbench/browser/layout').registerWorkbenchPartDomNode;
let WORKBENCH_PART_IDS: typeof import('ls/workbench/browser/layout').WORKBENCH_PART_IDS;

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

function installAnimationFrameSpy() {
  const previousRequestAnimationFrame = window.requestAnimationFrame;
  const previousCancelAnimationFrame = window.cancelAnimationFrame;
  let nextHandle = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const canceledHandles: number[] = [];

  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const handle = nextHandle;
    nextHandle += 1;
    callbacks.set(handle, callback);
    return handle;
  }) as typeof window.requestAnimationFrame;

  window.cancelAnimationFrame = ((handle: number) => {
    canceledHandles.push(handle);
    callbacks.delete(handle);
  }) as typeof window.cancelAnimationFrame;

  return {
    flushAll(timestamp = 0) {
      const pendingCallbacks = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pendingCallbacks) {
        callback(timestamp);
      }
    },
    flushUntilIdle(maxRounds = 10) {
      let rounds = 0;
      while (callbacks.size > 0) {
        if (rounds >= maxRounds) {
          throw new Error('requestAnimationFrame queue did not settle.');
        }
        this.flushAll(rounds);
        rounds += 1;
      }
    },
    getCanceledHandles() {
      return [...canceledHandles];
    },
    getPendingHandleCount() {
      return callbacks.size;
    },
    restore() {
      window.requestAnimationFrame = previousRequestAnimationFrame;
      window.cancelAnimationFrame = previousCancelAnimationFrame;
    },
  };
}

function createDomRect(x: number, y: number, width: number, height: number) {
  return {
    x,
    y,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON() {
      return this;
    },
  } as DOMRect;
}

function createElectronApi(overrides: Partial<ElectronAPI>): ElectronAPI {
  return {
    invoke: (async () => {
      throw new Error('Unexpected invoke in web content contribution test.');
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

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createWorkbenchWebContentViewContribution } = await import(
    'ls/workbench/contrib/webContentView/webContentView.contribution'
  ));
  ({ registerWorkbenchPartDomNode, WORKBENCH_PART_IDS } = await import(
    'ls/workbench/browser/layout'
  ));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

afterEach(() => {
  registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.webContentViewHost, null);
  document.body.replaceChildren();
});

test('web content contribution syncs native bounds and cleans up lifecycle handles on dispose', () => {
  const resizeObserverSpy = installResizeObserverSpy();
  const animationFrameSpy = installAnimationFrameSpy();
  const boundsCalls: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> = [];
  const visibilityCalls: boolean[] = [];
  const layoutPhaseCalls: string[] = [];
  const host = document.createElement('div');
  const activeObserversBeforeCreate = resizeObserverSpy.getActiveObservers();

  host.dataset.webcontentActive = 'true';
  Object.defineProperty(host, 'getBoundingClientRect', {
    configurable: true,
    value: () => createDomRect(12, 24, 320, 180),
  });
  document.body.append(host);
  registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.webContentViewHost, host);

  try {
    withElectronApi(createElectronApi({
      webContent: {
        setBounds(
          bounds: Parameters<
            NonNullable<ElectronAPI['webContent']>['setBounds']
          >[0],
        ) {
          boundsCalls.push(bounds);
        },
        setVisible(
          visible: Parameters<
            NonNullable<ElectronAPI['webContent']>['setVisible']
          >[0],
        ) {
          visibilityCalls.push(visible);
        },
        setLayoutPhase(
          phase: Parameters<
            NonNullable<ElectronAPI['webContent']>['setLayoutPhase']
          >[0],
        ) {
          layoutPhaseCalls.push(phase);
        },
      } as unknown as NonNullable<ElectronAPI['webContent']>,
    }), () => {
      const contribution = createWorkbenchWebContentViewContribution();
      assert(contribution);

      animationFrameSpy.flushUntilIdle();

      assert.deepEqual(layoutPhaseCalls, ['measuring', 'visible']);
      assert.deepEqual(boundsCalls.at(-1), {
        x: 12,
        y: 24,
        width: 320,
        height: 180,
      });
      assert.equal(visibilityCalls.at(-1), true);
      assert.equal(
        resizeObserverSpy.getActiveObservers(),
        activeObserversBeforeCreate + 1,
      );

      const canceledHandlesBeforeDispose =
        animationFrameSpy.getCanceledHandles().length;
      contribution.dispose();

      assert.equal(visibilityCalls.at(-1), false);
      assert.equal(boundsCalls.at(-1), null);
      assert.equal(resizeObserverSpy.getActiveObservers(), activeObserversBeforeCreate);
      assert.equal(animationFrameSpy.getPendingHandleCount(), 0);
      assert.equal(
        animationFrameSpy.getCanceledHandles().length,
        canceledHandlesBeforeDispose,
      );
    });
  } finally {
    animationFrameSpy.restore();
    resizeObserverSpy.restore();
  }
});
