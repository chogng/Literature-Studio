import {
  getWorkbenchPartDomSnapshot,
  subscribeWorkbenchPartDom,
  WORKBENCH_PART_IDS,
} from '../../layout';
import type { Disposable } from '../../workbench.contribution';

function syncPreviewSurfaceBounds(previewHostElement: HTMLElement | null) {
  const preview = window.electronAPI?.preview;
  if (!preview) {
    return;
  }

  if (!previewHostElement) {
    preview.setVisible(false);
    preview.setBounds(null);
    return;
  }

  const rect = previewHostElement.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (width <= 0 || height <= 0) {
    preview.setVisible(false);
    preview.setBounds(null);
    return;
  }

  preview.setVisible(true);
  preview.setBounds({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width,
    height,
  });
}

export function createWorkbenchPreviewSurfaceContribution(): Disposable | void {
  if (
    typeof window === 'undefined' ||
    typeof window.electronAPI?.preview?.setBounds !== 'function' ||
    typeof window.electronAPI?.preview?.setVisible !== 'function'
  ) {
    return;
  }

  let previewHostElement =
    getWorkbenchPartDomSnapshot()[WORKBENCH_PART_IDS.previewHost];
  let resizeObserver: ResizeObserver | null = null;
  let frameId: number | null = null;

  const resetObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    if (!previewHostElement) {
      return;
    }

    resizeObserver = new ResizeObserver(() =>
      syncPreviewSurfaceBounds(previewHostElement)
    );
    resizeObserver.observe(previewHostElement);
  };

  const syncFromPartDom = () => {
    const nextPreviewHostElement =
      getWorkbenchPartDomSnapshot()[WORKBENCH_PART_IDS.previewHost];
    if (nextPreviewHostElement !== previewHostElement) {
      previewHostElement = nextPreviewHostElement;
      resetObserver();
    }

    syncPreviewSurfaceBounds(previewHostElement);
  };

  const handleWindowResize = () => syncPreviewSurfaceBounds(previewHostElement);
  const unsubscribeWorkbenchPartDom = subscribeWorkbenchPartDom(syncFromPartDom);
  window.addEventListener('resize', handleWindowResize);

  resetObserver();
  frameId = window.requestAnimationFrame(() =>
    syncPreviewSurfaceBounds(previewHostElement)
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

      syncPreviewSurfaceBounds(null);
    },
  };
}
