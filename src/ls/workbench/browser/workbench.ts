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

let workbenchState = DEFAULT_WORKBENCH_STATE;
const workbenchStateListeners = new Set<() => void>();

function emitWorkbenchStateChange() {
  for (const listener of workbenchStateListeners) {
    listener();
  }
}

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

export function subscribeWorkbenchState(listener: () => void) {
  workbenchStateListeners.add(listener);
  return () => {
    workbenchStateListeners.delete(listener);
  };
}

export function getWorkbenchStateSnapshot() {
  return workbenchState;
}

export function dispatchWorkbenchEvent(event: WorkbenchEvent) {
  const nextState = reduceWorkbenchState(workbenchState, event);
  if (Object.is(nextState, workbenchState)) {
    return;
  }

  workbenchState = nextState;
  emitWorkbenchStateChange();
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
