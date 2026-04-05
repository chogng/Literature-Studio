import { EventEmitter } from 'ls/base/common/event';
import type { WorkbenchPage } from 'ls/workbench/browser/workbench';

export type WorkbenchLayoutStateSnapshot = {
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  primarySidebarSize: number;
  agentSidebarSize: number;
};

type WorkbenchLayoutEvent =
  | {
      type: 'SET_SIDEBAR_SIZES';
      sizes: Partial<
        Pick<
          WorkbenchLayoutStateSnapshot,
          'primarySidebarSize' | 'agentSidebarSize'
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
      type: 'SET_AGENT_SIDEBAR_VISIBLE';
      visible: boolean;
    }
  | {
      type: 'TOGGLE_AGENT_SIDEBAR_VISIBILITY';
    }
  | {
      type: 'SET_AGENT_SIDEBAR_SIZE';
      size: number;
    };

type WorkbenchShellLayoutParams = {
  activePage: WorkbenchPage;
};

type WorkbenchContentLayoutParams = {
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
};

export const WORKBENCH_PART_IDS = {
  container: 'workbench.container',
  titlebar: 'workbench.titlebar',
  primaryBar: 'workbench.primaryBar',
  agentSidebar: 'workbench.agentSidebar',
  statusbar: 'workbench.statusbar',
  settings: 'workbench.settings',
  editor: 'workbench.editor',
  view: 'workbench.view',
  webContentViewHost: 'workbench.view.webContentViewHost',
} as const;

export const WORKBENCH_CONTENT_LAYOUT_BREAKPOINT = 980;
export const WORKBENCH_SPLITVIEW_RESERVE_SASH_SPACE = false;
export const WORKBENCH_SPLITVIEW_LIMITS = {
  primaryBar: {
    minimum: 280,
    maximum: Number.POSITIVE_INFINITY,
    defaultSize: 320,
  },
  editor: {
    minimum: 220,
    maximum: Number.POSITIVE_INFINITY,
  },
  agentSidebar: {
    minimum: 332,
    maximum: Number.POSITIVE_INFINITY,
    defaultSize: 360,
  },
} as const;

export type WorkbenchPartId =
  (typeof WORKBENCH_PART_IDS)[keyof typeof WORKBENCH_PART_IDS];
export type WorkbenchPartRefCallback = (element: HTMLElement | null) => void;

const DEFAULT_WORKBENCH_LAYOUT_STATE: WorkbenchLayoutStateSnapshot = {
  isPrimarySidebarVisible: true,
  isAgentSidebarVisible: false,
  primarySidebarSize: WORKBENCH_SPLITVIEW_LIMITS.primaryBar.defaultSize,
  agentSidebarSize: WORKBENCH_SPLITVIEW_LIMITS.agentSidebar.defaultSize,
};

const DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT: Record<WorkbenchPartId, HTMLElement | null> = {
  [WORKBENCH_PART_IDS.container]: null,
  [WORKBENCH_PART_IDS.titlebar]: null,
  [WORKBENCH_PART_IDS.primaryBar]: null,
  [WORKBENCH_PART_IDS.agentSidebar]: null,
  [WORKBENCH_PART_IDS.statusbar]: null,
  [WORKBENCH_PART_IDS.settings]: null,
  [WORKBENCH_PART_IDS.editor]: null,
  [WORKBENCH_PART_IDS.view]: null,
  [WORKBENCH_PART_IDS.webContentViewHost]: null,
};

let workbenchLayoutState = DEFAULT_WORKBENCH_LAYOUT_STATE;
const onDidChangeWorkbenchLayoutStateEmitter = new EventEmitter<void>();

let workbenchPartDomSnapshot = DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT;
const onDidChangeWorkbenchPartDomEmitter = new EventEmitter<void>();
const workbenchPartRefCallbacks = new Map<
  WorkbenchPartId,
  WorkbenchPartRefCallback
>();

function clampSidebarSize(target: 'primaryBar' | 'agentSidebar', size: number) {
  const limits =
    target === 'primaryBar'
      ? WORKBENCH_SPLITVIEW_LIMITS.primaryBar
      : WORKBENCH_SPLITVIEW_LIMITS.agentSidebar;

  return Math.max(limits.minimum, Math.min(limits.maximum, Math.round(size)));
}

function reduceWorkbenchLayoutState(
  state: WorkbenchLayoutStateSnapshot,
  event: WorkbenchLayoutEvent,
): WorkbenchLayoutStateSnapshot {
  switch (event.type) {
    case 'SET_SIDEBAR_SIZES': {
      const nextPrimarySidebarSize =
        typeof event.sizes.primarySidebarSize === 'number'
          ? clampSidebarSize('primaryBar', event.sizes.primarySidebarSize)
          : state.primarySidebarSize;
      const nextAgentSidebarSize =
        typeof event.sizes.agentSidebarSize === 'number'
          ? clampSidebarSize('agentSidebar', event.sizes.agentSidebarSize)
          : state.agentSidebarSize;

      if (
        state.primarySidebarSize === nextPrimarySidebarSize &&
        state.agentSidebarSize === nextAgentSidebarSize
      ) {
        return state;
      }

      return {
        ...state,
        primarySidebarSize: nextPrimarySidebarSize,
        agentSidebarSize: nextAgentSidebarSize,
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
    case 'SET_AGENT_SIDEBAR_VISIBLE':
      if (state.isAgentSidebarVisible === event.visible) {
        return state;
      }
      return {
        ...state,
        isAgentSidebarVisible: event.visible,
      };
    case 'TOGGLE_AGENT_SIDEBAR_VISIBILITY':
      return {
        ...state,
        isAgentSidebarVisible: !state.isAgentSidebarVisible,
      };
    case 'SET_AGENT_SIDEBAR_SIZE': {
      const nextSize = clampSidebarSize('agentSidebar', event.size);
      if (state.agentSidebarSize === nextSize) {
        return state;
      }
      return {
        ...state,
        agentSidebarSize: nextSize,
      };
    }
    default:
      return state;
  }
}

export function subscribeWorkbenchLayoutState(listener: () => void) {
  return onDidChangeWorkbenchLayoutStateEmitter.event(listener);
}

export function getWorkbenchLayoutStateSnapshot() {
  return workbenchLayoutState;
}

export function subscribeWorkbenchPartDom(listener: () => void) {
  return onDidChangeWorkbenchPartDomEmitter.event(listener);
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
  onDidChangeWorkbenchLayoutStateEmitter.fire();
}

export function setWorkbenchSidebarSizes(
  sizes: Partial<
    Pick<
      WorkbenchLayoutStateSnapshot,
      'primarySidebarSize' | 'agentSidebarSize'
    >
  >,
) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_SIDEBAR_SIZES',
    sizes,
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

export function setAgentSidebarVisible(visible: boolean) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_AGENT_SIDEBAR_VISIBLE',
    visible,
  });
}

export function setAgentSidebarSize(size: number) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_AGENT_SIDEBAR_SIZE',
    size,
  });
}

export function toggleAgentSidebarVisibility() {
  dispatchWorkbenchLayoutEvent({
    type: 'TOGGLE_AGENT_SIDEBAR_VISIBILITY',
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
  onDidChangeWorkbenchPartDomEmitter.fire();
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
  isPrimarySidebarVisible,
  isAgentSidebarVisible,
}: WorkbenchContentLayoutParams) {
  return [
    'content-grid',
    isPrimarySidebarVisible ? 'is-primary-sidebar-visible' : '',
    isAgentSidebarVisible ? 'is-agent-sidebar-visible' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function getWorkbenchContentStyle({
  isPrimarySidebarVisible,
  isAgentSidebarVisible,
}: WorkbenchContentLayoutParams) {
  const desktopColumns = [
    isPrimarySidebarVisible ? 'minmax(280px, 320px)' : null,
    'minmax(0, 1fr)',
    isAgentSidebarVisible ? 'minmax(332px, 380px)' : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  const mobileRows = [
    isPrimarySidebarVisible ? 'minmax(220px, 28%)' : null,
    'minmax(0, 1fr)',
    isAgentSidebarVisible ? 'minmax(208px, 30%)' : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  return {
    '--workbench-content-columns': desktopColumns,
    '--workbench-content-mobile-rows': mobileRows,
  };
}
