import type { WorkbenchPage } from 'ls/workbench/browser/workbench';

export type WorkbenchSidebarKind = 'secondarySidebar' | 'primaryBar';

export type WorkbenchLayoutStateSnapshot = {
  isSidebarVisible: boolean;
  activeSidebarKind: WorkbenchSidebarKind;
  isAuxiliarySidebarVisible: boolean;
};

type WorkbenchLayoutEvent =
  | {
      type: 'SET_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_SIDEBAR_VISIBILITY';
    }
  | {
      type: 'SET_ACTIVE_SIDEBAR_KIND';
      kind: WorkbenchSidebarKind;
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
  isSidebarVisible: boolean;
  isAuxiliarySidebarVisible: boolean;
  activeSidebarKind: WorkbenchSidebarKind;
};

export const WORKBENCH_PART_IDS = {
  container: 'workbench.container',
  titlebar: 'workbench.titlebar',
  sidebar: 'workbench.secondarySidebar',
  secondarySidebar: 'workbench.secondarySidebar',
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
  isSidebarVisible: true,
  activeSidebarKind: 'secondarySidebar',
  isAuxiliarySidebarVisible: false,
};

const DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT: Record<WorkbenchPartId, HTMLElement | null> = {
  [WORKBENCH_PART_IDS.container]: null,
  [WORKBENCH_PART_IDS.titlebar]: null,
  [WORKBENCH_PART_IDS.sidebar]: null,
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
    case 'SET_ACTIVE_SIDEBAR_KIND':
      if (state.activeSidebarKind === event.kind) {
        return state;
      }
      return {
        ...state,
        activeSidebarKind: event.kind,
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

export function setWorkbenchSidebarKind(kind: WorkbenchSidebarKind) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_ACTIVE_SIDEBAR_KIND',
    kind,
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
  isSidebarVisible,
  isAuxiliarySidebarVisible,
  activeSidebarKind,
}: WorkbenchContentLayoutParams) {
  return [
    'content-grid',
    isSidebarVisible ? '' : 'is-sidebar-collapsed',
    isAuxiliarySidebarVisible ? 'is-auxiliary-sidebar-visible' : '',
    `is-active-sidebar-${activeSidebarKind}`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function getWorkbenchContentStyle({
  isSidebarVisible,
  isAuxiliarySidebarVisible,
}: WorkbenchContentLayoutParams) {
  const desktopColumns =
    isSidebarVisible && isAuxiliarySidebarVisible
      ? 'minmax(288px, 332px) minmax(0, 1fr) minmax(332px, 380px)'
      : isSidebarVisible
        ? 'minmax(288px, 332px) minmax(0, 1fr)'
        : isAuxiliarySidebarVisible
          ? 'minmax(0, 1fr) minmax(332px, 380px)'
          : 'minmax(0, 1fr)';

  const mobileRows =
    isSidebarVisible && isAuxiliarySidebarVisible
      ? 'minmax(208px, 28%) minmax(0, 1fr) minmax(208px, 30%)'
      : isSidebarVisible
        ? 'minmax(220px, 36%) minmax(0, 1fr)'
        : isAuxiliarySidebarVisible
          ? 'minmax(0, 1fr) minmax(220px, 30%)'
          : 'minmax(0, 1fr)';

  return {
    '--workbench-content-columns': desktopColumns,
    '--workbench-content-mobile-rows': mobileRows,
  };
}
