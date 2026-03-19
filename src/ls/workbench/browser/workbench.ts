import { createStore } from '../../base/common/store';

export type WorkbenchPage = 'reader' | 'settings';

export type WorkbenchStateSnapshot = {
  activePage: WorkbenchPage;
};

type WorkbenchEvent =
  | {
      type: 'SET_ACTIVE_PAGE';
      page: WorkbenchPage;
    }
  | {
      type: 'TOGGLE_SETTINGS';
    };

const DEFAULT_WORKBENCH_STATE: WorkbenchStateSnapshot = {
  activePage: 'reader',
};

const workbenchStateStore = createStore(DEFAULT_WORKBENCH_STATE);

function reduceWorkbenchState(
  state: WorkbenchStateSnapshot,
  event: WorkbenchEvent,
): WorkbenchStateSnapshot {
  switch (event.type) {
    case 'SET_ACTIVE_PAGE':
      if (state.activePage === event.page) {
        return state;
      }
      return {
        ...state,
        activePage: event.page,
      };
    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        activePage: state.activePage === 'settings' ? 'reader' : 'settings',
      };
    default:
      return state;
  }
}

export const subscribeWorkbenchState = workbenchStateStore.subscribe;
export const getWorkbenchStateSnapshot = workbenchStateStore.getSnapshot;

export function dispatchWorkbenchEvent(event: WorkbenchEvent) {
  workbenchStateStore.updateState((currentState) =>
    reduceWorkbenchState(currentState, event),
  );
}

export function setWorkbenchActivePage(page: WorkbenchPage) {
  dispatchWorkbenchEvent({
    type: 'SET_ACTIVE_PAGE',
    page,
  });
}

export function toggleWorkbenchSettings() {
  dispatchWorkbenchEvent({
    type: 'TOGGLE_SETTINGS',
  });
}
