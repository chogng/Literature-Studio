import { useCallback, type RefCallback } from 'react';
import { createStore } from '../../base/common/store';

export const WORKBENCH_PART_IDS = {
  container: 'workbench.container',
  titlebar: 'workbench.titlebar',
  sidebar: 'workbench.sidebar',
  settings: 'workbench.settings',
  editor: 'workbench.editor',
  view: 'workbench.view',
  previewHost: 'workbench.view.previewHost',
} as const;

export type WorkbenchPartId =
  (typeof WORKBENCH_PART_IDS)[keyof typeof WORKBENCH_PART_IDS];

const DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT: Record<WorkbenchPartId, HTMLElement | null> = {
  [WORKBENCH_PART_IDS.container]: null,
  [WORKBENCH_PART_IDS.titlebar]: null,
  [WORKBENCH_PART_IDS.sidebar]: null,
  [WORKBENCH_PART_IDS.settings]: null,
  [WORKBENCH_PART_IDS.editor]: null,
  [WORKBENCH_PART_IDS.view]: null,
  [WORKBENCH_PART_IDS.previewHost]: null,
};

const workbenchPartStore = createStore(DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT);

export const subscribeWorkbenchPartDom = workbenchPartStore.subscribe;
export const getWorkbenchPartDomSnapshot = workbenchPartStore.getSnapshot;

export function getWorkbenchPartDomNode(partId: WorkbenchPartId) {
  return workbenchPartStore.getSnapshot()[partId];
}

export function registerWorkbenchPartDomNode(
  partId: WorkbenchPartId,
  element: HTMLElement | null,
) {
  workbenchPartStore.updateState((currentSnapshot) => {
    // Parts publish live DOM here so services and contributions can react without reaching into React trees.
    if (currentSnapshot[partId] === element) {
      return currentSnapshot;
    }

    return {
      ...currentSnapshot,
      [partId]: element,
    };
  });
}

export function useWorkbenchPartRef(partId: WorkbenchPartId) {
  return useCallback<RefCallback<HTMLElement>>((element) => {
    registerWorkbenchPartDomNode(partId, element);
  }, [partId]);
}
