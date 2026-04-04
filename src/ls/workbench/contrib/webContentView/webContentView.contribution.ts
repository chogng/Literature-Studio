import {
  getWorkbenchPartDomSnapshot,
  subscribeWorkbenchPartDom,
  WORKBENCH_PART_IDS,
} from 'ls/workbench/browser/layout';
import {
  combineDisposables,
  LifecycleStore,
  MutableLifecycle,
  toDisposable,
  type DisposableLike,
} from 'ls/base/common/lifecycle';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';
import type { Disposable } from 'ls/workbench/contrib/workbench/workbench.contribution';

type WebContentLayoutSnapshot = {
  visible: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

type WebContentLayoutPhase = 'hidden' | 'measuring' | 'visible';

function readWebContentViewLayout(webContentViewHostElement: HTMLElement | null) {
  if (!webContentViewHostElement) {
    return {
      visible: false,
      bounds: null,
    };
  }

  if (webContentViewHostElement.dataset.webcontentActive !== 'true') {
    return {
      visible: false,
      bounds: null,
    };
  }

  const rect = webContentViewHostElement.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (width <= 0 || height <= 0) {
    return {
      visible: false,
      bounds: null,
    };
  }

  return {
    visible: true,
    bounds: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width,
      height,
    },
  };
}

function areBoundsEqual(
  left: WebContentLayoutSnapshot['bounds'],
  right: WebContentLayoutSnapshot['bounds'],
) {
  return (
    left?.x === right?.x &&
    left?.y === right?.y &&
    left?.width === right?.width &&
    left?.height === right?.height
  );
}

function areLayoutSnapshotsEqual(
  left: WebContentLayoutSnapshot | null,
  right: WebContentLayoutSnapshot | null,
) {
  if (!left || !right) {
    return left === right;
  }

  return left.visible === right.visible && areBoundsEqual(left.bounds, right.bounds);
}

function syncWebContentViewBounds(
  nextSnapshot: WebContentLayoutSnapshot,
  previousSnapshot: WebContentLayoutSnapshot | null,
) {
  const webContent = nativeHostService.webContent;
  if (!webContent) {
    return previousSnapshot;
  }

  if (areLayoutSnapshotsEqual(previousSnapshot, nextSnapshot)) {
    return previousSnapshot;
  }

  if (nextSnapshot.visible) {
    webContent.setBounds(nextSnapshot.bounds);
    webContent.setVisible(true);
  } else {
    webContent.setVisible(false);
    webContent.setBounds(null);
  }

  return nextSnapshot;
}

function addDisposableListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options);
  return toDisposable(() => {
    target.removeEventListener(type, listener, options);
  });
}

export function createWorkbenchWebContentViewContribution(): Disposable | void {
  if (
    typeof window === 'undefined' ||
    typeof nativeHostService.webContent?.setBounds !== 'function' ||
    typeof nativeHostService.webContent?.setVisible !== 'function'
  ) {
    return;
  }

  let webContentViewHostElement =
    getWorkbenchPartDomSnapshot()[WORKBENCH_PART_IDS.webContentViewHost];
  const contributionDisposables = new LifecycleStore();
  const hostObservers = new MutableLifecycle<DisposableLike>();
  const scheduledSync = new MutableLifecycle<DisposableLike>();
  let lastSnapshot: WebContentLayoutSnapshot | null = null;
  let layoutPhase: WebContentLayoutPhase = 'hidden';
  let measuringSnapshot: WebContentLayoutSnapshot | null = null;
  let lastEmittedLayoutPhase: WebContentLayoutPhase | null = null;

  contributionDisposables.add(hostObservers);
  contributionDisposables.add(scheduledSync);

  const scheduleSync = () => {
    if (scheduledSync.value) {
      return;
    }

    let frameId = 0;
    const frameDisposable = toDisposable(() => {
      window.cancelAnimationFrame(frameId);
    });
    scheduledSync.value = frameDisposable;
    frameId = window.requestAnimationFrame(() => {
      if (scheduledSync.value === frameDisposable) {
        scheduledSync.clearAndLeak();
      }
      const nextSnapshot = readWebContentViewLayout(webContentViewHostElement);

      if (!nextSnapshot.visible) {
        layoutPhase = 'hidden';
        measuringSnapshot = null;
        if (lastEmittedLayoutPhase !== 'hidden') {
          nativeHostService.webContent?.setLayoutPhase?.('hidden');
          lastEmittedLayoutPhase = 'hidden';
        }
        lastSnapshot = syncWebContentViewBounds(nextSnapshot, lastSnapshot);
        return;
      }

      if (layoutPhase === 'hidden') {
        layoutPhase = 'measuring';
        measuringSnapshot = nextSnapshot;
        if (lastEmittedLayoutPhase !== 'measuring') {
          nativeHostService.webContent?.setLayoutPhase?.('measuring');
          lastEmittedLayoutPhase = 'measuring';
        }
        scheduleSync();
        return;
      }

      if (layoutPhase === 'measuring') {
        if (areLayoutSnapshotsEqual(measuringSnapshot, nextSnapshot)) {
          layoutPhase = 'visible';
          measuringSnapshot = null;
          if (lastEmittedLayoutPhase !== 'visible') {
            nativeHostService.webContent?.setLayoutPhase?.('visible');
            lastEmittedLayoutPhase = 'visible';
          }
          lastSnapshot = syncWebContentViewBounds(nextSnapshot, lastSnapshot);
          return;
        }

        measuringSnapshot = nextSnapshot;
        if (lastEmittedLayoutPhase !== 'measuring') {
          nativeHostService.webContent?.setLayoutPhase?.('measuring');
          lastEmittedLayoutPhase = 'measuring';
        }
        scheduleSync();
        return;
      }

      if (lastEmittedLayoutPhase !== 'visible') {
        nativeHostService.webContent?.setLayoutPhase?.('visible');
        lastEmittedLayoutPhase = 'visible';
      }
      lastSnapshot = syncWebContentViewBounds(nextSnapshot, lastSnapshot);
    });
  };

  const resetObserver = () => {
    hostObservers.clear();

    if (!webContentViewHostElement) {
      return;
    }

    const mutationObserver = new MutationObserver(() => {
      layoutPhase = 'hidden';
      measuringSnapshot = null;
      scheduleSync();
    });
    mutationObserver.observe(webContentViewHostElement, {
      attributes: true,
      attributeFilter: ['data-webcontent-active'],
    });
    const observerDisposables: DisposableLike[] = [
      toDisposable(() => {
        mutationObserver.disconnect();
      }),
    ];

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => scheduleSync());
      resizeObserver.observe(webContentViewHostElement);
      observerDisposables.push(
        toDisposable(() => {
          resizeObserver.disconnect();
        }),
      );
    }

    hostObservers.value = combineDisposables(...observerDisposables);
  };

  const syncFromPartDom = () => {
    const nextWebContentViewHostElement =
      getWorkbenchPartDomSnapshot()[WORKBENCH_PART_IDS.webContentViewHost];
    if (nextWebContentViewHostElement !== webContentViewHostElement) {
      webContentViewHostElement = nextWebContentViewHostElement;
      layoutPhase = 'hidden';
      measuringSnapshot = null;
      resetObserver();
    }

    scheduleSync();
  };

  const handleWindowResize = () => scheduleSync();
  contributionDisposables.add(subscribeWorkbenchPartDom(syncFromPartDom));
  contributionDisposables.add(
    addDisposableListener(window, 'resize', handleWindowResize),
  );

  resetObserver();
  scheduleSync();

  return {
    dispose: () => {
      contributionDisposables.dispose();

      layoutPhase = 'hidden';
      measuringSnapshot = null;
      lastEmittedLayoutPhase = null;
      lastSnapshot = syncWebContentViewBounds(
        {
          visible: false,
          bounds: null,
        },
        lastSnapshot,
      );
    },
  };
}
