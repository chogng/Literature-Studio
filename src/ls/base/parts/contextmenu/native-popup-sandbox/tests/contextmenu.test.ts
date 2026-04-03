import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ContextMenuPopupApi,
  ElectronAPI,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import {
  close,
  popup,
} from 'ls/base/parts/contextmenu/native-popup-sandbox/contextmenu';

function createFakeContextMenuApi() {
  let listener: ((event: Parameters<ContextMenuPopupApi['onEvent']>[0] extends (event: infer T) => void ? T : never) => void) | undefined;
  const openedPayloads: Array<Parameters<ContextMenuPopupApi['open']>[0]> = [];
  const closedRequestIds: string[] = [];

  const api: ContextMenuPopupApi = {
    open(payload) {
      openedPayloads.push(payload);
    },
    close(requestId) {
      closedRequestIds.push(requestId);
    },
    onEvent(nextListener) {
      listener = nextListener;
      return () => {
        if (listener === nextListener) {
          listener = undefined;
        }
      };
    },
  };

  return {
    api,
    openedPayloads,
    closedRequestIds,
    emitEvent(event: Parameters<NonNullable<typeof listener>>[0]) {
      listener?.(event);
    },
  };
}

function createElectronApi(
  overrides: Partial<ElectronAPI>,
): ElectronAPI {
  return {
    invoke: ((..._args: unknown[]) => {
      throw new Error('invoke is not available in this test');
    }) as ElectronAPI['invoke'],
    ...overrides,
  };
}

function withElectronApi<T>(electronAPI: ElectronAPI | undefined, run: () => T): T {
  const windowGlobal = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & { electronAPI?: ElectronAPI };
  };
  const previousWindow = windowGlobal.window;

  if (previousWindow) {
    previousWindow.electronAPI = electronAPI;
  } else {
    Object.defineProperty(windowGlobal, 'window', {
      configurable: true,
      writable: true,
      value: { electronAPI } as Window & typeof globalThis & { electronAPI?: ElectronAPI },
    });
  }

  try {
    return run();
  } finally {
    if (previousWindow) {
      previousWindow.electronAPI = undefined;
    } else {
      Reflect.deleteProperty(windowGlobal, 'window');
    }
  }
}

test('native popup contextmenu serializes popup items and forwards menu events', () => {
  const fakeApi = createFakeContextMenuApi();

  withElectronApi(createElectronApi({ nativePopupContextMenu: fakeApi.api }), () => {
    let selectEvent: { altKey?: boolean } | undefined;
    let hideCount = 0;

    const requestId = popup(
      [
        {
          label: 'Parent',
          submenu: [
            {
              label: 'Child',
              click: (event) => {
                selectEvent = event;
              },
            },
          ],
        },
        {
          label: 'Other',
        },
      ],
      {
        x: 10,
        y: 20,
        positioningItem: 1,
      },
      () => {
        hideCount += 1;
      },
    );

    assert.equal(requestId, 'native-popup-context-menu-0');
    assert.equal(fakeApi.openedPayloads.length, 1);

    const payload = fakeApi.openedPayloads[0];
    assert.equal(payload.requestId, requestId);
    assert.deepEqual(payload.options, {
      x: 10,
      y: 20,
      positioningItem: 1,
    });
    assert.equal(payload.items.length, 2);
    assert.equal(payload.items[0]?.id, 0);
    assert.equal(payload.items[0]?.submenu?.[0]?.id, 1);
    assert.equal(payload.items[1]?.id, 2);
    assert.equal(payload.items[0]?.enabled, true);
    assert.equal(payload.items[1]?.visible, true);

    fakeApi.emitEvent({
      requestId,
      type: 'select',
      itemId: 1,
      context: {
        altKey: true,
      },
    });

    assert.deepEqual(selectEvent, {
      altKey: true,
    });
    assert.equal(hideCount, 0);

    fakeApi.emitEvent({
      requestId,
      type: 'close',
    });

    assert.equal(hideCount, 1);

    fakeApi.emitEvent({
      requestId,
      type: 'select',
      itemId: 1,
      context: {
        altKey: false,
      },
    });

    assert.deepEqual(selectEvent, {
      altKey: true,
    });
  });
});

test('native popup contextmenu returns null without an available api and delegates close', () => {
  const fakeApi = createFakeContextMenuApi();

  withElectronApi(undefined, () => {
    assert.equal(popup([]), null);
  });

  withElectronApi(createElectronApi({ nativePopupContextMenu: fakeApi.api }), () => {
    close('closable-7');
  });

  assert.deepEqual(fakeApi.closedRequestIds, ['closable-7']);
});
