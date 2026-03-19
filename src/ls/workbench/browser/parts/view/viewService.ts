import { useCallback, useEffect, useSyncExternalStore, type RefCallback } from 'react';
import {
  getWorkbenchPartDomSnapshot,
  registerWorkbenchPartDomNode,
  subscribeWorkbenchPartDom,
  WORKBENCH_PART_IDS,
} from '../../layout';

type UseWorkbenchPreviewViewParams = {
  browserUrl: string;
  previewRuntime: boolean;
};

export function useWorkbenchPreviewView({
  browserUrl,
  previewRuntime,
}: UseWorkbenchPreviewViewParams) {
  const workbenchPartDomSnapshot = useSyncExternalStore(
    subscribeWorkbenchPartDom,
    getWorkbenchPartDomSnapshot,
    getWorkbenchPartDomSnapshot,
  );
  const previewHostElement = workbenchPartDomSnapshot[WORKBENCH_PART_IDS.previewHost];
  const hasPreviewSurface = Boolean(browserUrl);

  const handlePreviewHostRef = useCallback<RefCallback<HTMLDivElement>>((element) => {
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.previewHost, element);
  }, []);

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      return;
    }

    const preview = window.electronAPI.preview;
    // Keep the native preview bounds driven by the registered workbench part DOM instead of local view state.
    const syncBounds = () => {
      if (!previewHostElement) {
        preview.setBounds(null);
        return;
      }

      const rect = previewHostElement.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      if (width <= 0 || height <= 0) {
        preview.setBounds(null);
        return;
      }

      preview.setBounds({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width,
        height,
      });
    };

    if (!previewHostElement) {
      preview.setBounds(null);
      return;
    }

    const observer = new ResizeObserver(syncBounds);
    observer.observe(previewHostElement);

    const frameId = window.requestAnimationFrame(syncBounds);
    window.addEventListener('resize', syncBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncBounds);
      window.cancelAnimationFrame(frameId);
      preview.setBounds(null);
    };
  }, [hasPreviewSurface, previewHostElement, previewRuntime]);

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      return;
    }

    const preview = window.electronAPI.preview;
    if (!browserUrl) {
      preview.setVisible(false);
      preview.setBounds(null);
      return;
    }

    preview.setVisible(true);
  }, [browserUrl, previewRuntime]);

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      return;
    }

    const preview = window.electronAPI.preview;
    return () => {
      preview.setVisible(false);
      preview.setBounds(null);
    };
  }, [previewRuntime]);

  return {
    hasPreviewSurface,
    handlePreviewHostRef,
  };
}
