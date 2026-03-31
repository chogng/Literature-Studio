import {
  getWorkbenchPartDomSnapshot,
  subscribeWorkbenchPartDom,
  WORKBENCH_PART_IDS,
} from '../../browser/layout';
import type { Disposable } from '../workbench/workbench.contribution';

function syncWebContentViewBounds(webContentViewHostElement: HTMLElement | null) {
  const webContent = window.electronAPI?.webContent;
  if (!webContent) {
    return;
  }

  if (!webContentViewHostElement) {
    webContent.setVisible(false);
    webContent.setBounds(null);
    return;
  }

  const rect = webContentViewHostElement.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (width <= 0 || height <= 0) {
    webContent.setVisible(false);
    webContent.setBounds(null);
    return;
  }

  webContent.setVisible(true);
  webContent.setBounds({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width,
    height,
  });
}

export function createWorkbenchWebContentViewContribution(): Disposable | void {
  if (
    typeof window === 'undefined' ||
    typeof window.electronAPI?.webContent?.setBounds !== 'function' ||
    typeof window.electronAPI?.webContent?.setVisible !== 'function'
  ) {
    return;
  }

  let webContentViewHostElement =
    getWorkbenchPartDomSnapshot()[WORKBENCH_PART_IDS.webContentViewHost];
  let resizeObserver: ResizeObserver | null = null;
  let frameId: number | null = null;

  const resetObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    if (!webContentViewHostElement) {
      return;
    }

    resizeObserver = new ResizeObserver(() =>
      syncWebContentViewBounds(webContentViewHostElement)
    );
    resizeObserver.observe(webContentViewHostElement);
  };

  const syncFromPartDom = () => {
    const nextWebContentViewHostElement =
      getWorkbenchPartDomSnapshot()[WORKBENCH_PART_IDS.webContentViewHost];
    if (nextWebContentViewHostElement !== webContentViewHostElement) {
      webContentViewHostElement = nextWebContentViewHostElement;
      resetObserver();
    }

    syncWebContentViewBounds(webContentViewHostElement);
  };

  const handleWindowResize = () =>
    syncWebContentViewBounds(webContentViewHostElement);
  const unsubscribeWorkbenchPartDom = subscribeWorkbenchPartDom(syncFromPartDom);
  window.addEventListener('resize', handleWindowResize);

  resetObserver();
  frameId = window.requestAnimationFrame(() =>
    syncWebContentViewBounds(webContentViewHostElement)
  );

  return {
    dispose: () => {
      unsubscribeWorkbenchPartDom();
      window.removeEventListener('resize', handleWindowResize);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      syncWebContentViewBounds(null);
    },
  };
}
