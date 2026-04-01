import type {
  GridSashSnapEvent,
  IGridView,
} from 'ls/base/browser/ui/grid/gridview';
import { GridBranchView, GridView, Orientation } from 'ls/base/browser/ui/grid/gridview';
import {
  getWorkbenchContentClassName,
  setAuxiliarySidebarVisible,
  setFetchSidebarVisible,
  setPrimarySidebarVisible,
  setWorkbenchSidebarSizes,
  WORKBENCH_READER_LAYOUT_BREAKPOINT,
  WORKBENCH_SPLITVIEW_LIMITS,
  WORKBENCH_SPLITVIEW_SASH_SIZE,
} from 'ls/workbench/browser/layout';
import { getReaderSplitConstraints } from 'ls/workbench/browser/readerLayoutSizing';
import type { SplitViewConstraints } from 'ls/workbench/browser/readerLayoutSizing';
import type {
  ReaderLayoutLeafId,
  ReaderLayoutNode,
} from 'ls/workbench/browser/readerLayoutTree';
import { reconcileReaderLayoutTree, updateLeaf } from 'ls/workbench/browser/readerLayoutTree';

import type { EditorStatusState } from 'ls/workbench/browser/parts/editor/editorStatus';
import { createEditorPartView } from 'ls/workbench/browser/parts/editor/editorPartView';
import type { EditorPartProps } from 'ls/workbench/browser/parts/editor/editorPartView';

import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import {
  createSecondarySidebarPartView,
  SecondarySidebarPartView,
} from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';
import type { SecondarySidebarProps } from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';
import {
  createPrimaryBarPartView,
  PrimaryBarPartView,
} from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import type { PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import {
  createAuxiliaryBarPartView,
  AuxiliaryBarPartView,
} from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarPart';
import type { AuxiliaryBarProps } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarPart';

import {
  clearStatusbarCommandHandlers,
  initializeStatusbarState,
  setStatusbarCommandHandlers,
  updateStatusbarState,
} from 'ls/workbench/browser/parts/statusbar/statusbarActions';

type ReaderPageViewProps = {
  isFetchSidebarVisible: boolean;
  isPrimarySidebarVisible: boolean;
  isAuxiliarySidebarVisible: boolean;
  isLayoutEdgeSnappingEnabled: boolean;
  fetchSidebarSize: number;
  primarySidebarSize: number;
  auxiliarySidebarSize: number;
  secondarySidebarProps: SecondarySidebarProps;
  primaryBarProps: PrimaryBarProps;
  auxiliarySidebarProps: AuxiliaryBarProps;
  editorPartProps: EditorPartProps;
};

type SplitViewSizeSnapshot = {
  fetchSidebarSize: number;
  primarySidebarSize: number;
  editorSize: number;
  auxiliarySidebarSize: number;
};

const FETCH_SIDEBAR_INDEX = 0;
const PRIMARY_SIDEBAR_INDEX = 1;
const EDITOR_INDEX = 2;
const AUXILIARY_SIDEBAR_INDEX = 3;

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
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

function getVisibleRootPaneCount(props: ReaderPageViewProps) {
  return [
    props.isFetchSidebarVisible,
    props.isPrimarySidebarVisible,
    true,
    props.isAuxiliarySidebarVisible,
  ].filter(Boolean).length;
}

function getRootSplitSize(
  props: ReaderPageViewProps,
  sizes: SplitViewSizeSnapshot,
) {
  return (
    (props.isFetchSidebarVisible ? sizes.fetchSidebarSize : 0) +
    (props.isPrimarySidebarVisible ? sizes.primarySidebarSize : 0) +
    sizes.editorSize +
    (props.isAuxiliarySidebarVisible ? sizes.auxiliarySidebarSize : 0) +
    Math.max(0, getVisibleRootPaneCount(props) - 1) * WORKBENCH_SPLITVIEW_SASH_SIZE
  );
}

class ReaderSplitSlotView implements IGridView {
  readonly element: HTMLElement;
  readonly snap: boolean;
  private minimumWidthValue = 0;
  private maximumWidthValue = Number.POSITIVE_INFINITY;
  private minimumHeightValue = 0;
  private maximumHeightValue = Number.POSITIVE_INFINITY;

  constructor(className: string, snap = false) {
    this.snap = snap;
    this.element = createElement('div', `reader-layout-slot ${className}`.trim());
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

export class ReaderPageView {
  private props: ReaderPageViewProps;
  private readonly element = createElement('section', 'reader-layout');
  private readonly mainElement = createElement('main');
  private readonly fetchSidebarSlot = new ReaderSplitSlotView(
    'reader-layout-slot-leading-group reader-left-group-pane reader-left-group-pane-fetch',
    true,
  );
  private readonly primarySidebarSlot = new ReaderSplitSlotView(
    'reader-layout-slot-leading-group reader-left-group-pane reader-left-group-pane-primary',
    true,
  );
  private readonly editorSlot = new ReaderSplitSlotView('reader-layout-slot-editor');
  private readonly auxiliarySidebarSlot = new ReaderSplitSlotView(
    'reader-layout-slot-auxiliary',
    true,
  );
  private fetchSidebarView: SecondarySidebarPartView | null = null;
  private primaryBarView: PrimaryBarPartView | null = null;
  private auxiliarySidebarView: AuxiliaryBarPartView | null = null;
  private editorView: ReturnType<typeof createEditorPartView> | null = null;
  private layoutTree: ReaderLayoutNode | null = null;
  private gridView: GridView | null = null;
  private rootGrid: GridBranchView | null = null;
  private gridOrientation: Orientation | null = null;
  private gridDisposables: Array<() => void> = [];
  private resizeObserver: ResizeObserver | null = null;
  private layoutAnimationFrame: number | null = null;
  private splitConstraints = getReaderSplitConstraints(Orientation.VERTICAL);

  constructor(props: ReaderPageViewProps) {
    this.props = props;
    this.element.append(this.mainElement);
    this.installResizeObserver();
    this.render();
  }

  getElement() {
    return this.element;
  }

  executeActiveDraftCommand(commandId: DraftEditorCommandId) {
    return this.editorView?.executeActiveDraftCommand(commandId) ?? false;
  }

  canExecuteActiveDraftCommand(commandId: DraftEditorCommandId) {
    return this.editorView?.canExecuteActiveDraftCommand(commandId) ?? false;
  }

  getActiveDraftStableSelectionTarget() {
    return this.editorView?.getActiveDraftStableSelectionTarget() ?? null;
  }

  setProps(props: ReaderPageViewProps) {
    this.props = props;
    this.render();
  }

  layout() {
    this.handleContainerResize();
  }

  dispose() {
    clearStatusbarCommandHandlers();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (typeof ResizeObserver === 'undefined') {
      window.removeEventListener('resize', this.handleWindowResize);
    }
    if (this.layoutAnimationFrame !== null) {
      window.cancelAnimationFrame(this.layoutAnimationFrame);
      this.layoutAnimationFrame = null;
    }
    this.disposeGridView();
    this.fetchSidebarView?.dispose();
    this.primaryBarView?.dispose();
    this.auxiliarySidebarView?.dispose();
    this.editorView?.dispose();
    this.fetchSidebarView = null;
    this.primaryBarView = null;
    this.auxiliarySidebarView = null;
    this.editorView = null;
    this.element.replaceChildren();
  }

  private handleEditorStatusChange = (status: EditorStatusState) => {
    updateStatusbarState(status);
  };

  private render() {
    initializeStatusbarState(this.props.editorPartProps.labels.status);

    this.mainElement.className = getWorkbenchContentClassName({
      isFetchSidebarVisible: this.props.isFetchSidebarVisible,
      isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
      isAuxiliarySidebarVisible: this.props.isAuxiliarySidebarVisible,
    });

    this.renderFetchSidebar();
    this.renderPrimarySidebar();
    this.renderEditor();
    this.renderAuxiliarySidebar();
    this.syncGridView();
  }

  private renderFetchSidebar() {
    if (!this.props.isFetchSidebarVisible) {
      this.fetchSidebarView?.dispose();
      this.fetchSidebarView = null;
      this.fetchSidebarSlot.setContent(null);
      return;
    }

    if (!this.fetchSidebarView) {
      this.fetchSidebarView = createSecondarySidebarPartView(
        this.props.secondarySidebarProps,
      );
    } else {
      this.fetchSidebarView.setProps(this.props.secondarySidebarProps);
    }

    this.fetchSidebarSlot.setContent(this.fetchSidebarView.getElement());
  }

  private renderPrimarySidebar() {
    if (!this.props.isPrimarySidebarVisible) {
      this.primaryBarView?.dispose();
      this.primaryBarView = null;
      this.primarySidebarSlot.setContent(null);
      return;
    }

    if (!this.primaryBarView) {
      this.primaryBarView = createPrimaryBarPartView(this.props.primaryBarProps);
    } else {
      this.primaryBarView.setProps(this.props.primaryBarProps);
    }

    this.primarySidebarSlot.setContent(this.primaryBarView.getElement());
  }

  private renderEditor() {
    if (!this.editorView) {
      this.editorView = createEditorPartView({
        ...this.props.editorPartProps,
        onStatusChange: this.handleEditorStatusChange,
      });
    } else {
      this.editorView.setProps({
        ...this.props.editorPartProps,
        onStatusChange: this.handleEditorStatusChange,
      });
    }

    this.editorSlot.setContent(this.editorView.getElement());
    this.syncStatusbarCommandHandlers();
  }

  private renderAuxiliarySidebar() {
    if (!this.props.isAuxiliarySidebarVisible) {
      this.auxiliarySidebarView?.dispose();
      this.auxiliarySidebarView = null;
      this.auxiliarySidebarSlot.setContent(null);
      return;
    }

    if (!this.auxiliarySidebarView) {
      this.auxiliarySidebarView = createAuxiliaryBarPartView(
        this.props.auxiliarySidebarProps,
      );
    } else {
      this.auxiliarySidebarView.setProps(this.props.auxiliarySidebarProps);
    }

    this.auxiliarySidebarSlot.setContent(this.auxiliarySidebarView.getElement());
  }

  private syncGridView() {
    const orientation = this.resolveSplitOrientation();
    this.syncSplitSlotConstraints(orientation);
    this.syncLayoutTree(orientation, this.captureGridSizes());
    this.ensureGridView(orientation);
    if (!this.gridView) {
      return;
    }

    this.gridView.edgeSnapping = this.props.isLayoutEdgeSnappingEnabled;
    this.gridView.setViewVisible(
      [FETCH_SIDEBAR_INDEX],
      this.props.isFetchSidebarVisible,
    );
    this.gridView.setViewVisible(
      [PRIMARY_SIDEBAR_INDEX],
      this.props.isPrimarySidebarVisible,
    );
    this.gridView.setViewVisible([EDITOR_INDEX], true);
    this.gridView.setViewVisible(
      [AUXILIARY_SIDEBAR_INDEX],
      this.props.isAuxiliarySidebarVisible,
    );
    this.applySidebarSizesToGridView();
    this.scheduleGridViewLayout();
  }

  private ensureGridView(orientation: Orientation) {
    if (
      this.gridView &&
      this.rootGrid &&
      this.gridOrientation === orientation &&
      this.mainElement.firstChild === this.gridView.element
    ) {
      return;
    }

    const cachedSizes = this.captureGridSizes();
    this.disposeGridView();
    this.syncLayoutTree(orientation, cachedSizes);
    const layoutTree = this.layoutTree;
    if (!layoutTree) {
      return;
    }

    const rootGrid = this.buildBranchFromTree(layoutTree);
    const gridView = new GridView(rootGrid);
    gridView.edgeSnapping = this.props.isLayoutEdgeSnappingEnabled;

    this.gridDisposables = [
      gridView.onDidSashSnap(this.handleGridSashSnap),
      gridView.onDidSashEnd(this.handleGridSashEnd),
    ];
    this.rootGrid = rootGrid;
    this.gridView = gridView;
    this.gridOrientation = orientation;
    this.mainElement.replaceChildren(gridView.element);
  }

  private disposeGridView() {
    for (const dispose of this.gridDisposables) {
      dispose();
    }
    this.gridDisposables = [];
    this.gridView?.dispose();
    this.gridView = null;
    this.layoutTree = null;
    this.rootGrid = null;
    this.gridOrientation = null;
  }

  private readonly handleGridSashSnap = (event: GridSashSnapEvent) => {
    if (event.location.length !== 1) {
      return;
    }

    switch (event.itemIndex) {
      case FETCH_SIDEBAR_INDEX:
        setFetchSidebarVisible(event.visible);
        break;
      case PRIMARY_SIDEBAR_INDEX:
        setPrimarySidebarVisible(event.visible);
        break;
      case AUXILIARY_SIDEBAR_INDEX:
        setAuxiliarySidebarVisible(event.visible);
        break;
    }
  };

  private readonly handleGridSashEnd = (location: readonly number[]) => {
    if (location.length === 0) {
      return;
    }

    this.persistGridSizes();
  };

  private installResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', this.handleWindowResize);
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.handleContainerResize();
    });
    this.resizeObserver.observe(this.element);
  }

  private readonly handleWindowResize = () => {
    this.handleContainerResize();
  };

  private handleContainerResize() {
    const orientation = this.resolveSplitOrientation();
    this.syncSplitSlotConstraints(orientation);
    this.ensureGridView(orientation);
    this.scheduleGridViewLayout();
  }

  private scheduleGridViewLayout() {
    if (this.layoutAnimationFrame !== null) {
      window.cancelAnimationFrame(this.layoutAnimationFrame);
    }

    this.layoutAnimationFrame = window.requestAnimationFrame(() => {
      this.layoutAnimationFrame = null;
      if (!this.gridView) {
        return;
      }

      const nextOrientation = this.resolveSplitOrientation();
      this.syncSplitSlotConstraints(nextOrientation);
      if (nextOrientation !== this.gridOrientation) {
        this.ensureGridView(nextOrientation);
        this.applySidebarSizesToGridView();
      }

      this.gridView.layout(
        this.mainElement.clientWidth,
        this.mainElement.clientHeight,
      );
    });
  }

  private resolveSplitOrientation() {
    const containerWidth =
      this.mainElement.clientWidth || this.element.clientWidth || window.innerWidth;
    return containerWidth <= WORKBENCH_READER_LAYOUT_BREAKPOINT
      ? Orientation.HORIZONTAL
      : Orientation.VERTICAL;
  }

  private syncSplitSlotConstraints(orientation: Orientation) {
    this.splitConstraints = getReaderSplitConstraints(orientation);

    this.fetchSidebarSlot.setConstraints(orientation, this.splitConstraints.fetchSidebar);
    this.primarySidebarSlot.setConstraints(
      orientation,
      this.splitConstraints.primarySidebar,
    );
    this.editorSlot.setConstraints(orientation, this.splitConstraints.editor);
    this.auxiliarySidebarSlot.setConstraints(
      orientation,
      this.splitConstraints.auxiliarySidebar,
    );
  }

  private applySidebarSizesToGridView() {
    if (!this.gridView) {
      return;
    }

    this.gridView.setViewSize(
      [FETCH_SIDEBAR_INDEX],
      this.props.fetchSidebarSize,
    );
    this.gridView.setViewSize(
      [PRIMARY_SIDEBAR_INDEX],
      this.props.primarySidebarSize,
    );
    this.gridView.setViewSize(
      [AUXILIARY_SIDEBAR_INDEX],
      this.props.auxiliarySidebarSize,
    );
  }

  private captureGridSizes(): SplitViewSizeSnapshot {
    if (!this.gridView) {
      return {
        fetchSidebarSize: this.props.fetchSidebarSize,
        primarySidebarSize: this.props.primarySidebarSize,
        editorSize: WORKBENCH_SPLITVIEW_LIMITS.editor.minimum,
        auxiliarySidebarSize: this.props.auxiliarySidebarSize,
      };
    }

    return {
      fetchSidebarSize: this.gridView.getViewSize([FETCH_SIDEBAR_INDEX]),
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      editorSize: this.gridView.getViewSize([EDITOR_INDEX]),
      auxiliarySidebarSize: this.gridView.getViewSize([AUXILIARY_SIDEBAR_INDEX]),
    };
  }

  private persistGridSizes() {
    if (!this.gridView) {
      return;
    }

    const nextSizes: Partial<{
      fetchSidebarSize: number;
      primarySidebarSize: number;
      auxiliarySidebarSize: number;
    }> = {
      fetchSidebarSize: this.gridView.getViewSize([FETCH_SIDEBAR_INDEX]),
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      auxiliarySidebarSize: this.gridView.getViewSize([AUXILIARY_SIDEBAR_INDEX]),
    };

    this.syncLayoutTreeFromGrid();
    setWorkbenchSidebarSizes(nextSizes);
  }

  private syncStatusbarCommandHandlers() {
    setStatusbarCommandHandlers({
      undo: () => {
        this.editorView?.runActiveDraftEditorAction('undo');
      },
      redo: () => {
        this.editorView?.runActiveDraftEditorAction('redo');
      },
    });
  }

  private buildBranchFromTree(node: ReaderLayoutNode): GridBranchView {
    if (node.type !== 'branch') {
      throw new Error('Root reader layout node must be a branch.');
    }

    const branch = new GridBranchView(
      node.orientation,
      WORKBENCH_SPLITVIEW_SASH_SIZE,
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

    return branch;
  }

  private getSlotView(id: ReaderLayoutLeafId) {
    switch (id) {
      case 'fetchSidebar':
        return this.fetchSidebarSlot;
      case 'primarySidebar':
        return this.primarySidebarSlot;
      case 'editor':
        return this.editorSlot;
      case 'auxiliarySidebar':
        return this.auxiliarySidebarSlot;
    }
  }

  private isNodeVisible(node: ReaderLayoutNode): boolean {
    return node.type === 'leaf'
      ? node.visible
      : node.children.some((child) => this.isNodeVisible(child));
  }

  private syncLayoutTree(
    orientation: Orientation,
    cachedSizes: SplitViewSizeSnapshot,
  ) {
    let nextTree = reconcileReaderLayoutTree(this.layoutTree, {
      orientation,
      isFetchSidebarVisible: this.props.isFetchSidebarVisible,
      isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
      isAuxiliarySidebarVisible: this.props.isAuxiliarySidebarVisible,
      fetchSidebarSize: this.props.fetchSidebarSize,
      primarySidebarSize: this.props.primarySidebarSize,
      auxiliarySidebarSize: this.props.auxiliarySidebarSize,
      editorSize: cachedSizes.editorSize,
    });

    nextTree = this.updateTreeBranchSizes(nextTree, {
      fetchSidebarSize: this.props.fetchSidebarSize,
      primarySidebarSize: this.props.primarySidebarSize,
      editorSize: cachedSizes.editorSize,
      auxiliarySidebarSize: this.props.auxiliarySidebarSize,
    });

    this.layoutTree = nextTree;
  }

  private syncLayoutTreeFromGrid() {
    if (!this.layoutTree || !this.gridView) {
      return;
    }

    let nextTree = updateLeaf(this.layoutTree, 'fetchSidebar', {
      size: this.gridView.getViewSize([FETCH_SIDEBAR_INDEX]),
      visible: this.props.isFetchSidebarVisible,
    });
    nextTree = updateLeaf(nextTree, 'primarySidebar', {
      size: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      visible: this.props.isPrimarySidebarVisible,
    });
    nextTree = updateLeaf(nextTree, 'editor', {
      size: this.gridView.getViewSize([EDITOR_INDEX]),
      visible: true,
      flex: true,
    });
    nextTree = updateLeaf(nextTree, 'auxiliarySidebar', {
      size: this.gridView.getViewSize([AUXILIARY_SIDEBAR_INDEX]),
      visible: this.props.isAuxiliarySidebarVisible,
    });

    this.layoutTree = this.updateTreeBranchSizes(nextTree, {
      fetchSidebarSize: this.gridView.getViewSize([FETCH_SIDEBAR_INDEX]),
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      editorSize: this.gridView.getViewSize([EDITOR_INDEX]),
      auxiliarySidebarSize: this.gridView.getViewSize([AUXILIARY_SIDEBAR_INDEX]),
    });
  }

  private updateTreeBranchSizes(
    tree: ReaderLayoutNode,
    sizes: SplitViewSizeSnapshot,
  ) {
    if (tree.type !== 'branch') {
      return tree;
    }

    return {
      ...tree,
      size: getRootSplitSize(this.props, sizes),
    };
  }
}

export function createReaderPageView(props: ReaderPageViewProps) {
  return new ReaderPageView(props);
}

export default ReaderPageView;
