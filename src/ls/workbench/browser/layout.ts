import { useCallback, type RefCallback } from 'react';
import { createStore } from '../../base/common/store';
import type { WorkbenchPage } from './workbench';

export type WorkbenchLayoutStateSnapshot = {
  isSidebarVisible: boolean;
};

type WorkbenchLayoutEvent =
  | {
      type: 'SET_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_SIDEBAR_VISIBILITY';
    };

type WorkbenchShellLayoutParams = {
  activePage: WorkbenchPage;
};

type WorkbenchContentLayoutParams = {
  isSidebarVisible: boolean;
};

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

const DEFAULT_WORKBENCH_LAYOUT_STATE: WorkbenchLayoutStateSnapshot = {
  isSidebarVisible: true,
};

const DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT: Record<WorkbenchPartId, HTMLElement | null> = {
  [WORKBENCH_PART_IDS.container]: null,
  [WORKBENCH_PART_IDS.titlebar]: null,
  [WORKBENCH_PART_IDS.sidebar]: null,
  [WORKBENCH_PART_IDS.settings]: null,
  [WORKBENCH_PART_IDS.editor]: null,
  [WORKBENCH_PART_IDS.view]: null,
  [WORKBENCH_PART_IDS.previewHost]: null,
};

const workbenchLayoutStore = createStore(DEFAULT_WORKBENCH_LAYOUT_STATE);
const workbenchPartStore = createStore(DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT);

function reduceWorkbenchLayoutState(
  state: WorkbenchLayoutStateSnapshot,
  event: WorkbenchLayoutEvent,
): WorkbenchLayoutStateSnapshot {
  switch (event.type) {
    case 'SET_SIDEBAR_VISIBLE':
      if (state.isSidebarVisible === event.visible) {
        return state;
      }
      return {
        ...state,
        isSidebarVisible: event.visible,
      };
    case 'TOGGLE_SIDEBAR_VISIBILITY':
      return {
        ...state,
        isSidebarVisible: !state.isSidebarVisible,
      };
    default:
      return state;
  }
}

export const subscribeWorkbenchLayoutState = workbenchLayoutStore.subscribe;
export const getWorkbenchLayoutStateSnapshot = workbenchLayoutStore.getSnapshot;
export const subscribeWorkbenchPartDom = workbenchPartStore.subscribe;
export const getWorkbenchPartDomSnapshot = workbenchPartStore.getSnapshot;

export function dispatchWorkbenchLayoutEvent(event: WorkbenchLayoutEvent) {
  workbenchLayoutStore.updateState((currentState) =>
    reduceWorkbenchLayoutState(currentState, event),
  );
}

export function setSidebarVisible(visible: boolean) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_SIDEBAR_VISIBLE',
    visible,
  });
}

export function toggleSidebarVisibility() {
  dispatchWorkbenchLayoutEvent({
    type: 'TOGGLE_SIDEBAR_VISIBILITY',
  });
}

export function getWorkbenchPartDomNode(partId: WorkbenchPartId) {
  return workbenchPartStore.getSnapshot()[partId];
}

export function registerWorkbenchPartDomNode(
  partId: WorkbenchPartId,
  element: HTMLElement | null,
) {
  workbenchPartStore.updateState((currentSnapshot) => {
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

export function getWorkbenchShellClassName({
  activePage,
}: WorkbenchShellLayoutParams) {
  return `app-shell ${activePage === 'settings' ? 'app-shell-settings' : ''}`.trim();
}

export function getWorkbenchContentClassName({
  isSidebarVisible,
}: WorkbenchContentLayoutParams) {
  return `content-grid ${isSidebarVisible ? '' : 'is-sidebar-collapsed'}`.trim();
}
