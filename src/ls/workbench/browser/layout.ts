import { EventEmitter } from 'ls/base/common/event';
import type {
  GridSashSnapEvent,
  IGridView,
} from 'ls/base/browser/ui/grid/gridview';
import { GridBranchView, GridView, Orientation } from 'ls/base/browser/ui/grid/gridview';
import {
  LifecycleStore,
  MutableLifecycle,
  toDisposable,
  type DisposableLike,
} from 'ls/base/common/lifecycle';
import type { WorkbenchPage } from 'ls/workbench/browser/workbench';
import {
  getWorkbenchContentSplitConstraints,
  type SplitViewConstraints,
} from 'ls/workbench/browser/workbenchContentLayoutSizing';
import type {
  WorkbenchContentLayoutLeafId,
  WorkbenchContentLayoutNode,
} from 'ls/workbench/browser/workbenchContentLayoutTree';
import {
  reconcileWorkbenchContentLayoutTree,
  updateLeaf,
} from 'ls/workbench/browser/workbenchContentLayoutTree';

export type WorkbenchLayoutStateSnapshot = {
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  primarySidebarSize: number;
  agentSidebarSize: number;
  isEditorCollapsed: boolean;
  expandedEditorSize: number;
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
    }
  | {
      type: 'SET_EDITOR_COLLAPSED';
      collapsed: boolean;
      expandedEditorSize?: number;
    };

type WorkbenchShellLayoutParams = {
  activePage: WorkbenchPage;
};

type WorkbenchContentLayoutParams = {
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
};

export type WorkbenchContentLayoutControllerState = {
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  isLayoutEdgeSnappingEnabled: boolean;
  primarySidebarSize: number;
  agentSidebarSize: number;
  isEditorCollapsed: boolean;
  expandedEditorSize: number;
};

type SplitViewSizeSnapshot = {
  primarySidebarSize: number;
  editorSize: number;
  agentSidebarSize: number;
};

const PRIMARY_SIDEBAR_INDEX = 0;
const AGENT_SIDEBAR_INDEX = 1;
const EDITOR_INDEX = 2;

export const WORKBENCH_PART_IDS = {
  container: 'workbench.container',
  titlebar: 'workbench.titlebar',
  primaryBar: 'workbench.primaryBar',
  agentSidebar: 'workbench.agentSidebar',
  statusbar: 'workbench.statusbar',
  settings: 'workbench.settings',
  editor: 'workbench.editor',
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
  isEditorCollapsed: false,
  expandedEditorSize: WORKBENCH_SPLITVIEW_LIMITS.editor.minimum,
};

const DEFAULT_WORKBENCH_PART_DOM_SNAPSHOT: Record<WorkbenchPartId, HTMLElement | null> = {
  [WORKBENCH_PART_IDS.container]: null,
  [WORKBENCH_PART_IDS.titlebar]: null,
  [WORKBENCH_PART_IDS.primaryBar]: null,
  [WORKBENCH_PART_IDS.agentSidebar]: null,
  [WORKBENCH_PART_IDS.statusbar]: null,
  [WORKBENCH_PART_IDS.settings]: null,
  [WORKBENCH_PART_IDS.editor]: null,
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

function clampExpandedEditorSize(size: number) {
  return Math.max(
    WORKBENCH_SPLITVIEW_LIMITS.editor.minimum,
    Math.min(WORKBENCH_SPLITVIEW_LIMITS.editor.maximum, Math.round(size)),
  );
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
    case 'SET_EDITOR_COLLAPSED': {
      const nextExpandedEditorSize =
        typeof event.expandedEditorSize === 'number'
          ? clampExpandedEditorSize(event.expandedEditorSize)
          : state.expandedEditorSize;

      if (
        state.isEditorCollapsed === event.collapsed &&
        state.expandedEditorSize === nextExpandedEditorSize
      ) {
        return state;
      }

      return {
        ...state,
        isEditorCollapsed: event.collapsed,
        expandedEditorSize: nextExpandedEditorSize,
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

export function setEditorCollapsed(
  collapsed: boolean,
  expandedEditorSize?: number,
) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_EDITOR_COLLAPSED',
    collapsed,
    expandedEditorSize,
  });
}

export function toggleEditorCollapsed(expandedEditorSize?: number) {
  dispatchWorkbenchLayoutEvent({
    type: 'SET_EDITOR_COLLAPSED',
    collapsed: !workbenchLayoutState.isEditorCollapsed,
    expandedEditorSize,
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

function addDisposableListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options);
  return toDisposable(() => {
    target.removeEventListener(type, listener, options);
  });
}

function syncElementContent(host: HTMLElement, content: HTMLElement | null) {
  if (content) {
    if (host.firstChild !== content || host.childNodes.length !== 1) {
      host.replaceChildren(content);
    }
    return;
  }

  if (host.childNodes.length > 0) {
    host.replaceChildren();
  }
}

function getRootSplitSize(
  state: WorkbenchContentLayoutControllerState,
  sizes: SplitViewSizeSnapshot,
) {
  return (
    (state.isPrimarySidebarVisible ? sizes.primarySidebarSize : 0) +
    sizes.editorSize +
    (state.isAgentSidebarVisible ? sizes.agentSidebarSize : 0)
  );
}

export class WorkbenchLayoutSlotView implements IGridView {
  readonly element: HTMLElement;
  readonly snap: boolean;
  private minimumWidthValue = 0;
  private maximumWidthValue = Number.POSITIVE_INFINITY;
  private minimumHeightValue = 0;
  private maximumHeightValue = Number.POSITIVE_INFINITY;

  constructor(className: string, snap = false) {
    this.snap = snap;
    this.element = document.createElement('div');
    this.element.className = `workbench-content-slot ${className}`.trim();
  }

  get minimumWidth() {
    return this.minimumWidthValue;
  }

  get maximumWidth() {
    return this.maximumWidthValue;
  }

  get minimumHeight() {
    return this.minimumHeightValue;
  }

  get maximumHeight() {
    return this.maximumHeightValue;
  }

  setConstraints(
    orientation: Orientation,
    constraints: SplitViewConstraints,
  ) {
    if (orientation === Orientation.VERTICAL) {
      this.minimumWidthValue = constraints.minimum;
      this.maximumWidthValue = constraints.maximum;
      this.minimumHeightValue = 0;
      this.maximumHeightValue = Number.POSITIVE_INFINITY;
      return;
    }

    this.minimumWidthValue = 0;
    this.maximumWidthValue = Number.POSITIVE_INFINITY;
    this.minimumHeightValue = constraints.minimum;
    this.maximumHeightValue = constraints.maximum;
  }

  setContent(content: HTMLElement | null) {
    syncElementContent(this.element, content);
  }

  layout() {
    // The slotted part roots stretch with CSS, so no per-frame DOM work is needed here.
  }
}

export class WorkbenchContentLayoutController {
  private layoutTree: WorkbenchContentLayoutNode | null = null;
  private gridView: GridView | null = null;
  private rootGrid: GridBranchView | null = null;
  private gridOrientation: Orientation | null = null;
  private gridEditorCollapsedState: boolean | null = null;
  private splitConstraints = getWorkbenchContentSplitConstraints(Orientation.VERTICAL);
  private disposed = false;
  private readonly gridDisposables = new LifecycleStore();
  private readonly resizeObserver = new MutableLifecycle<DisposableLike>();
  private readonly layoutAnimationFrame = new MutableLifecycle<DisposableLike>();

  constructor(
    private readonly options: {
      container: HTMLElement;
      contentHost: HTMLElement;
      primarySidebarSlot: WorkbenchLayoutSlotView;
      editorSlot: WorkbenchLayoutSlotView;
      agentSidebarSlot: WorkbenchLayoutSlotView;
      getState: () => WorkbenchContentLayoutControllerState;
      onPrimarySidebarVisibilityChange: (visible: boolean) => void;
      onAgentSidebarVisibilityChange: (visible: boolean) => void;
      onSidebarSizesChange: (sizes: {
        primarySidebarSize: number;
        agentSidebarSize: number;
      }) => void;
    },
  ) {
    this.installResizeObserver();
  }

  sync() {
    const state = this.options.getState();
    const orientation = this.resolveSplitOrientation();
    this.syncSplitSlotConstraints(orientation);
    this.syncLayoutTree(state, orientation, this.captureGridSizes(state));
    this.ensureGridView(state, orientation);
    if (!this.gridView) {
      return;
    }

    this.gridView.edgeSnapping = state.isLayoutEdgeSnappingEnabled;
    this.gridView.setViewVisible([PRIMARY_SIDEBAR_INDEX], state.isPrimarySidebarVisible);
    this.gridView.setViewVisible([EDITOR_INDEX], !state.isEditorCollapsed);
    this.gridView.setViewVisible([AGENT_SIDEBAR_INDEX], state.isAgentSidebarVisible);
    this.applySidebarSizesToGridView(state);
    this.scheduleGridViewLayout();
  }

  layout() {
    if (this.disposed) {
      return;
    }

    this.handleContainerResize();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.resizeObserver.dispose();
    this.layoutAnimationFrame.dispose();
    this.disposeGridView();
  }

  getEditorViewSize() {
    return this.gridView?.getViewSize([EDITOR_INDEX]) ?? null;
  }

  private ensureGridView(
    state: WorkbenchContentLayoutControllerState,
    orientation: Orientation,
  ) {
    if (
      this.gridView &&
      this.rootGrid &&
      this.gridOrientation === orientation &&
      this.gridEditorCollapsedState === state.isEditorCollapsed &&
      this.options.contentHost.firstChild === this.gridView.element
    ) {
      return;
    }

    const cachedSizes = this.captureGridSizes(state);
    this.disposeGridView();
    this.syncLayoutTree(state, orientation, cachedSizes);
    const layoutTree = this.layoutTree;
    if (!layoutTree) {
      return;
    }

    const rootGrid = this.buildBranchFromTree(layoutTree);
    const gridView = new GridView(rootGrid);
    gridView.edgeSnapping = state.isLayoutEdgeSnappingEnabled;

    this.gridDisposables.add(gridView.onDidSashSnap(this.handleGridSashSnap));
    this.gridDisposables.add(gridView.onDidSashEnd(this.handleGridSashEnd));
    this.rootGrid = rootGrid;
    this.gridView = gridView;
    this.gridOrientation = orientation;
    this.gridEditorCollapsedState = state.isEditorCollapsed;
    this.options.contentHost.replaceChildren(gridView.element);
  }

  private disposeGridView() {
    this.gridDisposables.clear();
    this.gridView?.dispose();
    this.gridView = null;
    this.layoutTree = null;
    this.rootGrid = null;
    this.gridOrientation = null;
    this.gridEditorCollapsedState = null;
  }

  private readonly handleGridSashSnap = (event: GridSashSnapEvent) => {
    if (event.location.length !== 1) {
      return;
    }

    switch (event.itemIndex) {
      case PRIMARY_SIDEBAR_INDEX:
        this.options.onPrimarySidebarVisibilityChange(event.visible);
        break;
      case AGENT_SIDEBAR_INDEX:
        this.options.onAgentSidebarVisibilityChange(event.visible);
        break;
    }
  };

  private readonly handleGridSashEnd = (location: readonly number[]) => {
    if (location.length === 0 || !this.gridView) {
      return;
    }

    this.syncLayoutTreeFromGrid(this.options.getState());
    this.options.onSidebarSizesChange({
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      agentSidebarSize: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
    });
  };

  private installResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      this.resizeObserver.value = addDisposableListener(window, 'resize', this.handleWindowResize);
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      this.handleContainerResize();
    });
    resizeObserver.observe(this.options.container);
    this.resizeObserver.value = toDisposable(() => {
      resizeObserver.disconnect();
    });
  }

  private readonly handleWindowResize = () => {
    this.handleContainerResize();
  };

  private handleContainerResize() {
    const state = this.options.getState();
    const orientation = this.resolveSplitOrientation();
    this.syncSplitSlotConstraints(orientation);
    this.ensureGridView(state, orientation);
    this.scheduleGridViewLayout();
  }

  private scheduleGridViewLayout() {
    if (this.disposed) {
      return;
    }

    this.layoutAnimationFrame.clear();

    let animationFrameHandle = 0;
    const animationFrameDisposable = toDisposable(() => {
      window.cancelAnimationFrame(animationFrameHandle);
    });
    this.layoutAnimationFrame.value = animationFrameDisposable;
    animationFrameHandle = window.requestAnimationFrame(() => {
      if (this.layoutAnimationFrame.value === animationFrameDisposable) {
        this.layoutAnimationFrame.clearAndLeak();
      }
      if (!this.gridView) {
        return;
      }

      const state = this.options.getState();
      const nextOrientation = this.resolveSplitOrientation();
      this.syncSplitSlotConstraints(nextOrientation);
      if (nextOrientation !== this.gridOrientation) {
        this.ensureGridView(state, nextOrientation);
        this.applySidebarSizesToGridView(state);
      }

      this.gridView.layout(
        this.options.contentHost.clientWidth,
        this.options.contentHost.clientHeight,
      );
    });
  }

  private resolveSplitOrientation() {
    const containerWidth =
      this.options.contentHost.clientWidth ||
      this.options.container.clientWidth ||
      window.innerWidth;
    return containerWidth <= WORKBENCH_CONTENT_LAYOUT_BREAKPOINT
      ? Orientation.HORIZONTAL
      : Orientation.VERTICAL;
  }

  private syncSplitSlotConstraints(orientation: Orientation) {
    this.splitConstraints = getWorkbenchContentSplitConstraints(orientation);

    this.options.primarySidebarSlot.setConstraints(
      orientation,
      this.splitConstraints.primarySidebar,
    );
    this.options.editorSlot.setConstraints(orientation, this.splitConstraints.editor);
    this.options.agentSidebarSlot.setConstraints(
      orientation,
      this.splitConstraints.agentSidebar,
    );
  }

  private applySidebarSizesToGridView(state: WorkbenchContentLayoutControllerState) {
    if (!this.gridView) {
      return;
    }

    this.gridView.setViewSize([PRIMARY_SIDEBAR_INDEX], state.primarySidebarSize);
    this.gridView.setViewSize([AGENT_SIDEBAR_INDEX], state.agentSidebarSize);
  }

  private captureGridSizes(state: WorkbenchContentLayoutControllerState): SplitViewSizeSnapshot {
    if (!this.gridView) {
      return {
        primarySidebarSize: state.primarySidebarSize,
        editorSize: state.expandedEditorSize,
        agentSidebarSize: state.agentSidebarSize,
      };
    }

    return {
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      agentSidebarSize: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
      editorSize: state.isEditorCollapsed
        ? state.expandedEditorSize
        : this.gridView.getViewSize([EDITOR_INDEX]),
    };
  }

  private buildBranchFromTree(node: WorkbenchContentLayoutNode): GridBranchView {
    if (node.type !== 'branch') {
      throw new Error('Root workbench content layout node must be a branch.');
    }

    return new GridBranchView(
      node.orientation,
      undefined,
      WORKBENCH_SPLITVIEW_RESERVE_SASH_SPACE,
      node.children.map((child) => ({
        view:
          child.type === 'branch'
            ? this.buildBranchFromTree(child)
            : this.getSlotView(child.id),
        size: child.size,
        visible: this.isNodeVisible(child),
        flex: child.type === 'leaf' ? child.flex === true : false,
      })),
    );
  }

  private getSlotView(id: WorkbenchContentLayoutLeafId) {
    switch (id) {
      case 'primarySidebar':
        return this.options.primarySidebarSlot;
      case 'editor':
        return this.options.editorSlot;
      case 'agentSidebar':
        return this.options.agentSidebarSlot;
    }
  }

  private isNodeVisible(node: WorkbenchContentLayoutNode): boolean {
    return node.type === 'leaf'
      ? node.visible
      : node.children.some((child) => this.isNodeVisible(child));
  }

  private syncLayoutTree(
    state: WorkbenchContentLayoutControllerState,
    orientation: Orientation,
    cachedSizes: SplitViewSizeSnapshot,
  ) {
    let nextTree = reconcileWorkbenchContentLayoutTree(this.layoutTree, {
      orientation,
      isPrimarySidebarVisible: state.isPrimarySidebarVisible,
      isEditorVisible: !state.isEditorCollapsed,
      isAgentSidebarVisible: state.isAgentSidebarVisible,
      primarySidebarSize: state.primarySidebarSize,
      agentSidebarSize: state.agentSidebarSize,
      editorSize: state.isEditorCollapsed ? state.expandedEditorSize : cachedSizes.editorSize,
    });

    nextTree = this.updateTreeBranchSizes(state, nextTree, {
      primarySidebarSize: state.primarySidebarSize,
      editorSize: state.isEditorCollapsed ? 0 : cachedSizes.editorSize,
      agentSidebarSize: state.agentSidebarSize,
    });

    this.layoutTree = nextTree;
  }

  private syncLayoutTreeFromGrid(state: WorkbenchContentLayoutControllerState) {
    if (!this.layoutTree || !this.gridView) {
      return;
    }

    let nextTree = updateLeaf(this.layoutTree, 'primarySidebar', {
      size: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      visible: state.isPrimarySidebarVisible,
    });
    nextTree = updateLeaf(nextTree, 'editor', {
      size: state.isEditorCollapsed
        ? state.expandedEditorSize
        : this.gridView.getViewSize([EDITOR_INDEX]),
      visible: !state.isEditorCollapsed,
      flex: !state.isEditorCollapsed,
    });
    nextTree = updateLeaf(nextTree, 'agentSidebar', {
      size: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
      visible: state.isAgentSidebarVisible,
      flex: state.isEditorCollapsed && state.isAgentSidebarVisible,
    });

    this.layoutTree = this.updateTreeBranchSizes(state, nextTree, {
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      editorSize: state.isEditorCollapsed ? 0 : this.gridView.getViewSize([EDITOR_INDEX]),
      agentSidebarSize: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
    });
  }

  private updateTreeBranchSizes(
    state: WorkbenchContentLayoutControllerState,
    tree: WorkbenchContentLayoutNode,
    sizes: SplitViewSizeSnapshot,
  ) {
    if (tree.type !== 'branch') {
      return tree;
    }

    return {
      ...tree,
      size: getRootSplitSize(state, sizes),
    };
  }
}
