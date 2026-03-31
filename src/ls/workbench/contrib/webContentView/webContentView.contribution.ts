import {
  getWorkbenchPartDomSnapshot,
  subscribeWorkbenchPartDom,
  WORKBENCH_PART_IDS,
} from '../../browser/layout';
import { nativeHostService } from '../../../platform/native/electron-sandbox/nativeHostService';
import type { Disposable } from '../workbench/workbench.contribution';

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
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let frameId: number | null = null;
  let lastSnapshot: WebContentLayoutSnapshot | null = null;
  let layoutPhase: WebContentLayoutPhase = 'hidden';
  let measuringSnapshot: WebContentLayoutSnapshot | null = null;
  let lastEmittedLayoutPhase: WebContentLayoutPhase | null = null;

  const cancelScheduledSync = () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  const scheduleSync = () => {
    if (frameId !== null) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null;
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
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    if (!webContentViewHostElement) {
      return;
    }

    resizeObserver = new ResizeObserver(() => scheduleSync());
    resizeObserver.observe(webContentViewHostElement);
    mutationObserver = new MutationObserver(() => {
      layoutPhase = 'hidden';
      measuringSnapshot = null;
      scheduleSync();
    });
    mutationObserver.observe(webContentViewHostElement, {
      attributes: true,
      attributeFilter: ['data-webcontent-active'],
    });
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
  const unsubscribeWorkbenchPartDom = subscribeWorkbenchPartDom(syncFromPartDom);
  window.addEventListener('resize', handleWindowResize);

  resetObserver();
  scheduleSync();

  return {
    dispose: () => {
      unsubscribeWorkbenchPartDom();
      window.removeEventListener('resize', handleWindowResize);
      cancelScheduledSync();

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }

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
