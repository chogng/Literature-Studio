import type { WorkbenchPage } from 'ls/workbench/browser/workbench';

export type WorkbenchLayoutStateSnapshot = {
  isFetchSidebarVisible: boolean;
  isPrimarySidebarVisible: boolean;
  isAuxiliarySidebarVisible: boolean;
  fetchSidebarSize: number;
  primarySidebarSize: number;
  auxiliarySidebarSize: number;
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
      type: 'SET_FETCH_SIDEBAR_SIZE';
      size: number;
    }
  | {
      type: 'SET_SIDEBAR_SIZES';
      sizes: Partial<
        Pick<
          WorkbenchLayoutStateSnapshot,
          'fetchSidebarSize' | 'primarySidebarSize' | 'auxiliarySidebarSize'
        >
      >;
    }
  | {
      type: 'SET_PRIMARY_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_PRIMARY_SIDEBAR_VISIBILITY';
    }
  | {
      type: 'SET_PRIMARY_SIDEBAR_SIZE';
      size: number;
    }
  | {
      type: 'SET_AUXILIARY_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_AUXILIARY_SIDEBAR_VISIBILITY';
    }
  | {
      type: 'SET_AUXILIARY_SIDEBAR_SIZE';
      size: number;
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

export const WORKBENCH_READER_LAYOUT_BREAKPOINT = 980;
export const WORKBENCH_SPLITVIEW_SASH_SIZE = 10;
export const WORKBENCH_SPLITVIEW_LIMITS = {
  fetchSidebar: {
    minimum: 248,
    maximum: Number.POSITIVE_INFINITY,
    defaultSize: 280,
  },
  primaryBar: {
    minimum: 280,
    maximum: Number.POSITIVE_INFINITY,
    defaultSize: 320,
  },
  editor: {
    minimum: 220,
    maximum: Number.POSITIVE_INFINITY,
  },
  auxiliarySidebar: {
    minimum: 332,
    maximum: Number.POSITIVE_INFINITY,
    defaultSize: 360,
  },
} as const;

export type WorkbenchPartId =
  (typeof WORKBENCH_PART_IDS)[keyof typeof WORKBENCH_PART_IDS];
export type WorkbenchPartRefCallback = (element: HTMLElement | null) => void;

const DEFAULT_WORKBENCH_LAYOUT_STATE: WorkbenchLayoutStateSnapshot = {
  isFetchSidebarVisible: true,
  isPrimarySidebarVisible: false,
  isAuxiliarySidebarVisible: false,
  fetchSidebarSize: WORKBENCH_SPLITVIEW_LIMITS.fetchSidebar.defaultSize,
  primarySidebarSize: WORKBENCH_SPLITVIEW_LIMITS.primaryBar.defaultSize,
  auxiliarySidebarSize: WORKBENCH_SPLITVIEW_LIMITS.auxiliarySidebar.defaultSize,
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

function clampSidebarSize(target: 'fetchSidebar' | 'primaryBar' | 'auxiliarySidebar', size: number) {
  const limits =
    target === 'fetchSidebar'
      ? WORKBENCH_SPLITVIEW_LIMITS.fetchSidebar
      : target === 'primaryBar'
        ? WORKBENCH_SPLITVIEW_LIMITS.primaryBar
        : WORKBENCH_SPLITVIEW_LIMITS.auxiliarySidebar;

  return Math.max(limits.minimum, Math.min(limits.maximum, Math.round(size)));
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
    case 'SET_FETCH_SIDEBAR_SIZE': {
      const nextSize = clampSidebarSize('fetchSidebar', event.size);
      if (state.fetchSidebarSize === nextSize) {
        return state;
      }
      return {
        ...state,
        fetchSidebarSize: nextSize,
      };
    }
    case 'SET_SIDEBAR_SIZES': {
      const nextFetchSidebarSize =
        typeof event.sizes.fetchSidebarSize === 'number'
          ? clampSidebarSize('fetchSidebar', event.sizes.fetchSidebarSize)
          : state.fetchSidebarSize;
      const nextPrimarySidebarSize =
        typeof event.sizes.primarySidebarSize === 'number'
          ? clampSidebarSize('primaryBar', event.sizes.primarySidebarSize)
          : state.primarySidebarSize;
      const nextAuxiliarySidebarSize =
        typeof event.sizes.auxiliarySidebarSize === 'number'
          ? clampSidebarSize('auxiliarySidebar', event.sizes.auxiliarySidebarSize)
          : state.auxiliarySidebarSize;

      if (
        state.fetchSidebarSize === nextFetchSidebarSize &&
        state.primarySidebarSize === nextPrimarySidebarSize &&
        state.auxiliarySidebarSize === nextAuxiliarySidebarSize
      ) {
        return state;
      }

      return {
        ...state,
        fetchSidebarSize: nextFetchSidebarSize,
        primarySidebarSize: nextPrimarySidebarSize,
        auxiliarySidebarSize: nextAuxiliarySidebarSize,
      };
    }
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
    case 'SET_PRIMARY_SIDEBAR_SIZE': {
      const nextSize = clampSidebarSize('primaryBar', event.size);
      if (state.primarySidebarSize === nextSize) {
        return state;
      }
      return {
        ...state,
        primarySidebarSize: nextSize,
      };
    }
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
    case 'SET_AUXILIARY_SIDEBAR_SIZE': {
      const nextSize = clampSidebarSize('auxiliarySidebar', event.size);
      if (state.auxiliarySidebarSize === nextSize) {
        return state;
      }
      return {
        ...state,
        auxiliarySidebarSize: nextSize,
      };
    }
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

export function setFetchSidebarSize(size: number) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_FETCH_SIDEBAR_SIZE',
    size,
  });
}

export function setWorkbenchSidebarSizes(
  sizes: Partial<
    Pick<
      WorkbenchLayoutStateSnapshot,
      'fetchSidebarSize' | 'primarySidebarSize' | 'auxiliarySidebarSize'
    >
  >,
) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_SIDEBAR_SIZES',
    sizes,
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

export function setPrimarySidebarSize(size: number) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_PRIMARY_SIDEBAR_SIZE',
    size,
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

export function setAuxiliarySidebarSize(size: number) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_AUXILIARY_SIDEBAR_SIZE',
    size,
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
