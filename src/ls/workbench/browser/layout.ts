import type { WorkbenchPage } from 'ls/workbench/browser/workbench';

export type WorkbenchLayoutStateSnapshot = {
  isFetchSidebarVisible: boolean;
  isPrimarySidebarVisible: boolean;
  isAuxiliarySidebarVisible: boolean;
};

type WorkbenchLayoutEvent =
  | {
      type: 'SET_FETCH_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_FETCH_SIDEBAR_VISIBILITY';
    }
  | {
      type: 'SET_PRIMARY_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_PRIMARY_SIDEBAR_VISIBILITY';
    }
  | {
      type: 'SET_AUXILIARY_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_AUXILIARY_SIDEBAR_VISIBILITY';
    };

type WorkbenchShellLayoutParams = {
  activePage: WorkbenchPage;
};

type WorkbenchContentLayoutParams = {
  isFetchSidebarVisible: boolean;
  isPrimarySidebarVisible: boolean;
  isAuxiliarySidebarVisible: boolean;
};

export const WORKBENCH_PART_IDS = {
  container: 'workbench.container',
  titlebar: 'workbench.titlebar',
  fetchSidebar: 'workbench.fetchSidebar',
  secondarySidebar: 'workbench.fetchSidebar',
  primaryBar: 'workbench.primaryBar',
  auxiliarySidebar: 'workbench.auxiliarySidebar',
  statusbar: 'workbench.statusbar',
  settings: 'workbench.settings',
  editor: 'workbench.editor',
  view: 'workbench.view',
  webContentViewHost: 'workbench.view.webContentViewHost',
} as const;

export type WorkbenchPartId =
  (typeof WORKBENCH_PART_IDS)[keyof typeof WORKBENCH_PART_IDS];
export type WorkbenchPartRefCallback = (element: HTMLElement | null) => void;

const DEFAULT_WORKBENCH_LAYOUT_STATE: WorkbenchLayoutStateSnapshot = {
  isFetchSidebarVisible: true,
  isPrimarySidebarVisible: false,
  isAuxiliarySidebarVisible: false,
};

const DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT: Record<WorkbenchPartId, HTMLElement | null> = {
  [WORKBENCH_PART_IDS.container]: null,
  [WORKBENCH_PART_IDS.titlebar]: null,
  [WORKBENCH_PART_IDS.fetchSidebar]: null,
  [WORKBENCH_PART_IDS.primaryBar]: null,
  [WORKBENCH_PART_IDS.auxiliarySidebar]: null,
  [WORKBENCH_PART_IDS.statusbar]: null,
  [WORKBENCH_PART_IDS.settings]: null,
  [WORKBENCH_PART_IDS.editor]: null,
  [WORKBENCH_PART_IDS.view]: null,
  [WORKBENCH_PART_IDS.webContentViewHost]: null,
};

let workbenchLayoutState = DEFAULT_WORKBENCH_LAYOUT_STATE;
const workbenchLayoutListeners = new Set<() => void>();

let workbenchPartDomSnapshot = DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT;
const workbenchPartDomListeners = new Set<() => void>();
const workbenchPartRefCallbacks = new Map<
  WorkbenchPartId,
  WorkbenchPartRefCallback
>();

function emitListeners(listeners: Set<() => void>) {
  for (const listener of listeners) {
    listener();
  }
}

function reduceWorkbenchLayoutState(
  state: WorkbenchLayoutStateSnapshot,
  event: WorkbenchLayoutEvent,
): WorkbenchLayoutStateSnapshot {
  switch (event.type) {
    case 'SET_FETCH_SIDEBAR_VISIBLE':
      if (state.isFetchSidebarVisible === event.visible) {
        return state;
      }
      return {
        ...state,
        isFetchSidebarVisible: event.visible,
      };
    case 'TOGGLE_FETCH_SIDEBAR_VISIBILITY':
      return {
        ...state,
        isFetchSidebarVisible: !state.isFetchSidebarVisible,
      };
    case 'SET_PRIMARY_SIDEBAR_VISIBLE':
      if (state.isPrimarySidebarVisible === event.visible) {
        return state;
      }
      return {
        ...state,
        isPrimarySidebarVisible: event.visible,
      };
    case 'TOGGLE_PRIMARY_SIDEBAR_VISIBILITY':
      return {
        ...state,
        isPrimarySidebarVisible: !state.isPrimarySidebarVisible,
      };
    case 'SET_AUXILIARY_SIDEBAR_VISIBLE':
      if (state.isAuxiliarySidebarVisible === event.visible) {
        return state;
      }
      return {
        ...state,
        isAuxiliarySidebarVisible: event.visible,
      };
    case 'TOGGLE_AUXILIARY_SIDEBAR_VISIBILITY':
      return {
        ...state,
        isAuxiliarySidebarVisible: !state.isAuxiliarySidebarVisible,
      };
    default:
      return state;
  }
}

export function subscribeWorkbenchLayoutState(listener: () => void) {
  workbenchLayoutListeners.add(listener);
  return () => {
    workbenchLayoutListeners.delete(listener);
  };
}

export function getWorkbenchLayoutStateSnapshot() {
  return workbenchLayoutState;
}

export function subscribeWorkbenchPartDom(listener: () => void) {
  workbenchPartDomListeners.add(listener);
  return () => {
    workbenchPartDomListeners.delete(listener);
  };
}

export function getWorkbenchPartDomSnapshot() {
  return workbenchPartDomSnapshot;
}

export function dispatchWorkbenchLayoutEvent(event: WorkbenchLayoutEvent) {
  const nextState = reduceWorkbenchLayoutState(workbenchLayoutState, event);
  if (Object.is(nextState, workbenchLayoutState)) {
    return;
  }

  workbenchLayoutState = nextState;
  emitListeners(workbenchLayoutListeners);
}

export function setFetchSidebarVisible(visible: boolean) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_FETCH_SIDEBAR_VISIBLE',
    visible,
  });
}

export function toggleFetchSidebarVisibility() {
  dispatchWorkbenchLayoutEvent({
    type: 'TOGGLE_FETCH_SIDEBAR_VISIBILITY',
  });
}

export function setPrimarySidebarVisible(visible: boolean) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_PRIMARY_SIDEBAR_VISIBLE',
    visible,
  });
}

export function togglePrimarySidebarVisibility() {
  dispatchWorkbenchLayoutEvent({
    type: 'TOGGLE_PRIMARY_SIDEBAR_VISIBILITY',
  });
}

export function setAuxiliarySidebarVisible(visible: boolean) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_AUXILIARY_SIDEBAR_VISIBLE',
    visible,
  });
}

export function toggleAuxiliarySidebarVisibility() {
  dispatchWorkbenchLayoutEvent({
    type: 'TOGGLE_AUXILIARY_SIDEBAR_VISIBILITY',
  });
}

export function getWorkbenchPartDomNode(partId: WorkbenchPartId) {
  return workbenchPartDomSnapshot[partId];
}

export function registerWorkbenchPartDomNode(
  partId: WorkbenchPartId,
  element: HTMLElement | null,
) {
  if (workbenchPartDomSnapshot[partId] === element) {
    return;
  }

  workbenchPartDomSnapshot = {
    ...workbenchPartDomSnapshot,
    [partId]: element,
  };
  emitListeners(workbenchPartDomListeners);
}

export function createWorkbenchPartRef(
  partId: WorkbenchPartId,
): WorkbenchPartRefCallback {
  const cachedCallback = workbenchPartRefCallbacks.get(partId);
  if (cachedCallback) {
    return cachedCallback;
  }

  const nextCallback: WorkbenchPartRefCallback = (element) => {
    registerWorkbenchPartDomNode(partId, element);
  };
  workbenchPartRefCallbacks.set(partId, nextCallback);
  return nextCallback;
}

export function getWorkbenchShellClassName({
  activePage,
}: WorkbenchShellLayoutParams) {
  return `app-shell ${activePage === 'settings' ? 'app-shell-settings' : ''}`.trim();
}

export function getWorkbenchContentClassName({
  isFetchSidebarVisible,
  isPrimarySidebarVisible,
  isAuxiliarySidebarVisible,
}: WorkbenchContentLayoutParams) {
  return [
    'content-grid',
    isFetchSidebarVisible ? 'is-fetch-sidebar-visible' : '',
    isPrimarySidebarVisible ? 'is-primary-sidebar-visible' : '',
    isAuxiliarySidebarVisible ? 'is-auxiliary-sidebar-visible' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function getWorkbenchContentStyle({
  isFetchSidebarVisible,
  isPrimarySidebarVisible,
  isAuxiliarySidebarVisible,
}: WorkbenchContentLayoutParams) {
  const desktopColumns = [
    isFetchSidebarVisible ? 'minmax(248px, 280px)' : null,
    isPrimarySidebarVisible ? 'minmax(280px, 320px)' : null,
    'minmax(0, 1fr)',
    isAuxiliarySidebarVisible ? 'minmax(332px, 380px)' : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  const mobileRows = [
    isFetchSidebarVisible ? 'minmax(208px, 22%)' : null,
    isPrimarySidebarVisible ? 'minmax(220px, 28%)' : null,
    'minmax(0, 1fr)',
    isAuxiliarySidebarVisible ? 'minmax(208px, 30%)' : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  return {
    '--workbench-content-columns': desktopColumns,
    '--workbench-content-mobile-rows': mobileRows,
  };
}
