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

const DEFAULT_WORKBENCH_LAYOUT_STATE: WorkbenchLayoutStateSnapshot = {
  isSidebarVisible: true,
};

const workbenchLayoutStore = createStore(DEFAULT_WORKBENCH_LAYOUT_STATE);

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
