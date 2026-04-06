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
import {
  getWorkbenchContentClassName,
  setAgentSidebarVisible,
  setPrimarySidebarVisible,
  setWorkbenchSidebarSizes,
  WORKBENCH_CONTENT_LAYOUT_BREAKPOINT,
  WORKBENCH_SPLITVIEW_RESERVE_SASH_SPACE,
  WORKBENCH_SPLITVIEW_LIMITS,
} from 'ls/workbench/browser/layout';
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

import type { EditorStatusState } from 'ls/workbench/browser/parts/editor/editorStatus';
import { createEditorPartView } from 'ls/workbench/browser/parts/editor/editorPartView';
import type { EditorPartProps } from 'ls/workbench/browser/parts/editor/editorPartView';

import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import type { FetchPaneProps } from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';
import {
  createPrimaryBarPartView,
  PrimaryBarPartView,
} from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import type { PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import {
  createAgentBarPartView,
  AgentBarPartView,
} from 'ls/workbench/browser/parts/agentbar/agentbarPart';
import type { AgentBarPartProps } from 'ls/workbench/browser/parts/agentbar/agentbarPart';
import {
  SidebarTopbarActionsView,
  type SidebarTopbarActionsProps,
} from 'ls/workbench/browser/parts/sidebar/sidebarTopbarActions';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import { createDropdownMenuActionViewItem } from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';
import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import {
  requestOpenAddressBarSourceMenu,
  requestTitlebarNavigateBack,
  requestTitlebarNavigateForward,
  requestTitlebarNavigateRefresh,
  requestTitlebarNavigateWeb,
} from 'ls/workbench/browser/parts/titlebar/titlebarActions';
import { setWorkbenchWebUrl } from 'ls/workbench/browser/session';
import { getEditorPaneMode } from 'ls/workbench/browser/parts/editor/editorInput';
import { getEditorContentDisplayUrl } from 'ls/workbench/browser/parts/editor/editorUrlPresentation';

import {
  clearStatusbarCommandHandlers,
  initializeStatusbarState,
  setStatusbarCommandHandlers,
  updateStatusbarState,
} from 'ls/workbench/browser/parts/statusbar/statusbarActions';

type WorkbenchContentViewProps = {
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  isLayoutEdgeSnappingEnabled: boolean;
  primarySidebarSize: number;
  agentSidebarSize: number;
  fetchPaneProps: FetchPaneProps;
  primaryBarProps: PrimaryBarProps;
  agentBarProps: AgentBarPartProps;
  sidebarTopbarActionsProps: SidebarTopbarActionsProps;
  editorPartProps: EditorPartProps;
};

type SplitViewSizeSnapshot = {
  primarySidebarSize: number;
  editorSize: number;
  agentSidebarSize: number;
};

const PRIMARY_SIDEBAR_INDEX = 0;
const AGENT_SIDEBAR_INDEX = 1;
const EDITOR_INDEX = 2;

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
  props: WorkbenchContentViewProps,
  sizes: SplitViewSizeSnapshot,
) {
  return (
    (props.isPrimarySidebarVisible ? sizes.primarySidebarSize : 0) +
    sizes.editorSize +
    (props.isAgentSidebarVisible ? sizes.agentSidebarSize : 0)
  );
}

class WorkbenchContentSlotView implements IGridView {
  readonly element: HTMLElement;
  readonly snap: boolean;
  private minimumWidthValue = 0;
  private maximumWidthValue = Number.POSITIVE_INFINITY;
  private minimumHeightValue = 0;
  private maximumHeightValue = Number.POSITIVE_INFINITY;

  constructor(className: string, snap = false) {
    this.snap = snap;
    this.element = createElement('div', `workbench-content-slot ${className}`.trim());
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

export class WorkbenchContentView {
  private props: WorkbenchContentViewProps;
  private isEditorCollapsed = false;
  private expandedEditorSize: number = WORKBENCH_SPLITVIEW_LIMITS.editor.minimum;
  private readonly element = createElement('section', 'workbench-content-layout');
  private readonly mainElement = createElement('main');
  private readonly gridDisposables = new LifecycleStore();
  private readonly resizeObserver = new MutableLifecycle<DisposableLike>();
  private readonly layoutAnimationFrame = new MutableLifecycle<DisposableLike>();
  private readonly primarySidebarSlot = new WorkbenchContentSlotView(
    'workbench-content-slot-leading-group workbench-leading-pane workbench-leading-pane-primary',
    true,
  );
  private readonly editorSlot = new WorkbenchContentSlotView('workbench-content-slot-editor');
  private readonly agentBarSlot = new WorkbenchContentSlotView(
    'workbench-content-slot-agent',
    true,
  );
  private primaryBarView: PrimaryBarPartView | null = null;
  private agentBarView: AgentBarPartView | null = null;
  private editorView: ReturnType<typeof createEditorPartView> | null = null;
  private retiredEditorView: ReturnType<typeof createEditorPartView> | null = null;
  private readonly sidebarTopbarActionsView = new SidebarTopbarActionsView();
  private readonly editorTopbarActionsView = createActionBarView({
    className: 'sidebar-topbar-actions',
    ariaRole: 'group',
  });
  private readonly editorToolbarElement = createElement('div', 'editor-browser-toolbar');
  private readonly editorToolbarLeadingHost = createElement(
    'div',
    'editor-browser-toolbar-leading',
  );
  private readonly editorToolbarAddressHost = createElement(
    'div',
    'editor-browser-toolbar-address-host',
  );
  private readonly editorToolbarTrailingHost = createElement(
    'div',
    'editor-browser-toolbar-trailing',
  );
  private readonly editorToolbarLeadingActionsView = createActionBarView({
    className: 'editor-browser-toolbar-actions',
    ariaRole: 'group',
  });
  private readonly editorToolbarTrailingActionsView = createActionBarView({
    className: 'editor-browser-toolbar-actions',
    ariaRole: 'group',
  });
  private readonly editorPdfToolbarElement = createElement('div', 'editor-pdf-toolbar');
  private readonly editorPdfToolbarLabel = createElement('span', 'editor-pdf-toolbar-label');
  private readonly editorToolbarAddressInput = new InputBox(
    this.editorToolbarAddressHost,
    undefined,
    {
      className: 'editor-browser-toolbar-address-input',
      value: '',
      placeholder: '',
    },
  );
  private layoutTree: WorkbenchContentLayoutNode | null = null;
  private gridView: GridView | null = null;
  private rootGrid: GridBranchView | null = null;
  private gridOrientation: Orientation | null = null;
  private gridEditorCollapsedState: boolean | null = null;
  private splitConstraints = getWorkbenchContentSplitConstraints(Orientation.VERTICAL);
  private disposed = false;

  constructor(props: WorkbenchContentViewProps) {
    this.props = props;
    this.editorToolbarLeadingHost.append(this.editorToolbarLeadingActionsView.getElement());
    this.editorToolbarTrailingHost.append(this.editorToolbarTrailingActionsView.getElement());
    this.editorToolbarAddressInput.inputElement.setAttribute('spellcheck', 'false');
    this.editorToolbarAddressInput.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        requestTitlebarNavigateWeb();
      }
    });
    this.editorToolbarAddressInput.onDidChange((value) => {
      setWorkbenchWebUrl(value);
    });
    this.editorToolbarElement.append(
      this.editorToolbarLeadingHost,
      this.editorToolbarAddressHost,
      this.editorToolbarTrailingHost,
    );
    this.editorPdfToolbarElement.append(this.editorPdfToolbarLabel);
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

  whenEditorTabViewStateSettled(tabId: string) {
    return (
      this.editorView?.whenEditorTabViewStateSettled(tabId) ??
      this.retiredEditorView?.whenEditorTabViewStateSettled(tabId) ??
      Promise.resolve()
    );
  }

  setProps(props: WorkbenchContentViewProps) {
    if (this.disposed) {
      return;
    }

    this.props = props;
    this.render();
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
    clearStatusbarCommandHandlers();
    this.resizeObserver.dispose();
    this.layoutAnimationFrame.dispose();
    this.disposeGridView();
    this.primaryBarView?.dispose();
    this.agentBarView?.dispose();
    this.retiredEditorView = this.editorView;
    this.retiredEditorView?.dispose();
    this.sidebarTopbarActionsView.dispose();
    this.editorTopbarActionsView.dispose();
    this.editorToolbarAddressInput.dispose();
    this.editorToolbarLeadingActionsView.dispose();
    this.editorToolbarTrailingActionsView.dispose();
    this.primaryBarView = null;
    this.agentBarView = null;
    this.editorView = null;
    this.element.replaceChildren();
  }

  private handleEditorStatusChange = (status: EditorStatusState) => {
    updateStatusbarState(status);
  };

  private readonly handleToggleEditorCollapse = () => {
    if (!this.isEditorCollapsed && this.gridView) {
      this.expandedEditorSize = Math.max(
        WORKBENCH_SPLITVIEW_LIMITS.editor.minimum,
        this.gridView.getViewSize([EDITOR_INDEX]),
      );
    }

    this.isEditorCollapsed = !this.isEditorCollapsed;
    this.render();
  };

  private render() {
    initializeStatusbarState(this.props.editorPartProps.labels.status);

    this.mainElement.className = getWorkbenchContentClassName({
      isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
      isAgentSidebarVisible: this.props.isAgentSidebarVisible,
    });

    this.renderTopbarActions();
    this.renderPrimarySidebar();
    this.renderEditor();
    this.renderAgentBar();
    this.syncGridView();
  }

  private renderTopbarActions() {
    this.sidebarTopbarActionsView.setProps(this.props.sidebarTopbarActionsProps);
    this.editorTopbarActionsView.setProps({
      className: 'sidebar-topbar-actions',
      ariaRole: 'group',
      items: [
        createDropdownMenuActionViewItem({
          label: this.props.editorPartProps.labels.topbarAddAction,
          title: this.props.editorPartProps.labels.topbarAddAction,
          content: createLxIcon('add'),
          buttonClassName: 'editor-topbar-add-btn',
          menu: [
            {
              label: this.props.editorPartProps.labels.createWrite,
              icon: 'write',
              onClick: () => this.props.editorPartProps.onCreateDraftTab(),
            },
            {
              label: this.props.editorPartProps.labels.createBrowser,
              icon: 'link-external',
              onClick: () => this.props.editorPartProps.onCreateBrowserTab(),
            },
            {
              label: this.props.editorPartProps.labels.createFile,
              icon: 'file',
              onClick: () => this.props.editorPartProps.onCreatePdfTab(),
            },
          ],
        }),
        {
          label: this.isEditorCollapsed
            ? this.props.editorPartProps.labels.expandEditor
            : this.props.editorPartProps.labels.collapseEditor,
          title: this.isEditorCollapsed
            ? this.props.editorPartProps.labels.expandEditor
            : this.props.editorPartProps.labels.collapseEditor,
          mode: 'icon',
          buttonClassName: 'editor-topbar-toggle-editor-btn',
          content: createLxIcon(
            this.isEditorCollapsed
              ? 'layout-sidebar-right-off'
              : 'layout-sidebar-right',
          ),
          onClick: this.handleToggleEditorCollapse,
        },
      ],
    });
    this.editorToolbarLeadingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: [
        {
          label: this.props.editorPartProps.labels.toolbarSources,
          title: this.props.editorPartProps.labels.toolbarSources,
          mode: 'icon',
          buttonClassName: 'editor-browser-toolbar-btn',
          content: createLxIcon('list-unordered'),
          onClick: requestOpenAddressBarSourceMenu,
        },
        {
          label: this.props.editorPartProps.labels.toolbarBack,
          title: this.props.editorPartProps.labels.toolbarBack,
          mode: 'icon',
          buttonClassName: 'editor-browser-toolbar-btn',
          content: createLxIcon('arrow-left'),
          disabled: !this.props.editorPartProps.viewPartProps.browserUrl,
          onClick: requestTitlebarNavigateBack,
        },
        {
          label: this.props.editorPartProps.labels.toolbarForward,
          title: this.props.editorPartProps.labels.toolbarForward,
          mode: 'icon',
          buttonClassName: 'editor-browser-toolbar-btn',
          content: createLxIcon('arrow-right'),
          disabled: false,
          onClick: requestTitlebarNavigateForward,
        },
        {
          label: this.props.editorPartProps.labels.toolbarRefresh,
          title: this.props.editorPartProps.labels.toolbarRefresh,
          mode: 'icon',
          buttonClassName: 'editor-browser-toolbar-btn',
          content: createLxIcon('refresh'),
          disabled: !this.props.editorPartProps.viewPartProps.browserUrl,
          onClick: requestTitlebarNavigateRefresh,
        },
        {
          label: this.props.editorPartProps.labels.toolbarFavorite,
          title: this.props.editorPartProps.labels.toolbarFavorite,
          mode: 'icon',
          buttonClassName: 'editor-browser-toolbar-btn',
          content: createLxIcon('favorite'),
          disabled: !this.props.editorPartProps.viewPartProps.browserUrl,
        },
      ],
    });
    this.editorToolbarTrailingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: [{
        label: this.props.editorPartProps.labels.toolbarMore,
        title: this.props.editorPartProps.labels.toolbarMore,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('more'),
      }],
    });
    const displayBrowserUrl = getEditorContentDisplayUrl(
      this.props.editorPartProps.viewPartProps.browserUrl,
    );
    if (this.editorToolbarAddressInput.value !== displayBrowserUrl) {
      this.editorToolbarAddressInput.value = displayBrowserUrl;
    }
    this.editorToolbarAddressInput.inputElement.setAttribute(
      'aria-label',
      this.props.editorPartProps.labels.toolbarAddressBar,
    );
    this.editorToolbarAddressInput.setPlaceHolder(
      this.props.editorPartProps.labels.toolbarAddressPlaceholder,
    );
    this.editorPdfToolbarLabel.textContent = `${this.props.editorPartProps.labels.pdfTitle} toolbar coming soon`;
  }

  private shouldMountPrimarySidebarActionsInAgentBar() {
    return this.props.isAgentSidebarVisible && !this.props.isPrimarySidebarVisible;
  }

  private shouldMountEditorActionsInAgentBar() {
    return this.props.isAgentSidebarVisible && this.isEditorCollapsed;
  }

  private renderPrimarySidebar() {
    if (!this.props.isPrimarySidebarVisible) {
      this.primaryBarView?.dispose();
      this.primaryBarView = null;
      this.primarySidebarSlot.setContent(null);
      return;
    }

    if (!this.primaryBarView) {
      this.primaryBarView = createPrimaryBarPartView({
        ...this.props.primaryBarProps,
        topbarActionsElement: this.shouldMountPrimarySidebarActionsInAgentBar()
          ? null
          : this.sidebarTopbarActionsView.getElement(),
      });
    } else {
      this.primaryBarView.setProps({
        ...this.props.primaryBarProps,
        topbarActionsElement: this.shouldMountPrimarySidebarActionsInAgentBar()
          ? null
          : this.sidebarTopbarActionsView.getElement(),
      });
    }

    this.primarySidebarSlot.setContent(this.primaryBarView.getElement());
  }

  private renderEditor() {
    const editorTopbarToolbarElement = this.getEditorTopbarToolbarElement();
    if (!this.editorView) {
      this.editorView = createEditorPartView({
        ...this.props.editorPartProps,
        topbarActionsElement: this.isEditorCollapsed
          ? null
          : this.editorTopbarActionsView.getElement(),
        topbarToolbarElement: this.isEditorCollapsed
          ? null
          : editorTopbarToolbarElement,
        onStatusChange: this.handleEditorStatusChange,
      });
    } else {
      this.editorView.setProps({
        ...this.props.editorPartProps,
        topbarActionsElement: this.isEditorCollapsed
          ? null
          : this.editorTopbarActionsView.getElement(),
        topbarToolbarElement: this.isEditorCollapsed
          ? null
          : editorTopbarToolbarElement,
        onStatusChange: this.handleEditorStatusChange,
      });
    }

    this.editorSlot.setContent(this.editorView.getElement());
    this.syncStatusbarCommandHandlers();
  }

  private getEditorTopbarToolbarElement() {
    const activePaneMode = this.props.editorPartProps.activeTab
      ? getEditorPaneMode(this.props.editorPartProps.activeTab)
      : null;

    if (activePaneMode === 'browser') {
      return this.editorToolbarElement;
    }

    if (activePaneMode === 'pdf') {
      return this.editorPdfToolbarElement;
    }

    return null;
  }

  private renderAgentBar() {
    if (!this.props.isAgentSidebarVisible) {
      this.agentBarView?.dispose();
      this.agentBarView = null;
      this.agentBarSlot.setContent(null);
      return;
    }

    if (!this.agentBarView) {
      this.agentBarView = createAgentBarPartView(
        {
          ...this.props.agentBarProps,
          isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
          topbarActionsElement: this.shouldMountPrimarySidebarActionsInAgentBar()
            ? this.sidebarTopbarActionsView.getElement()
            : null,
          topbarTrailingActionsElement: this.shouldMountEditorActionsInAgentBar()
            ? this.editorTopbarActionsView.getElement()
            : null,
        },
      );
    } else {
      this.agentBarView.setProps({
        ...this.props.agentBarProps,
        isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
        topbarActionsElement: this.shouldMountPrimarySidebarActionsInAgentBar()
          ? this.sidebarTopbarActionsView.getElement()
          : null,
        topbarTrailingActionsElement: this.shouldMountEditorActionsInAgentBar()
          ? this.editorTopbarActionsView.getElement()
          : null,
      });
    }

    this.agentBarSlot.setContent(this.agentBarView.getElement());
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
      [PRIMARY_SIDEBAR_INDEX],
      this.props.isPrimarySidebarVisible,
    );
    this.gridView.setViewVisible([EDITOR_INDEX], !this.isEditorCollapsed);
    this.gridView.setViewVisible(
      [AGENT_SIDEBAR_INDEX],
      this.props.isAgentSidebarVisible,
    );
    this.applySidebarSizesToGridView();
    this.scheduleGridViewLayout();
  }

  private ensureGridView(orientation: Orientation) {
    if (
      this.gridView &&
      this.rootGrid &&
      this.gridOrientation === orientation &&
      this.gridEditorCollapsedState === this.isEditorCollapsed &&
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

    this.gridDisposables.add(gridView.onDidSashSnap(this.handleGridSashSnap));
    this.gridDisposables.add(gridView.onDidSashEnd(this.handleGridSashEnd));
    this.rootGrid = rootGrid;
    this.gridView = gridView;
    this.gridOrientation = orientation;
    this.gridEditorCollapsedState = this.isEditorCollapsed;
    this.mainElement.replaceChildren(gridView.element);
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
        setPrimarySidebarVisible(event.visible);
        break;
      case AGENT_SIDEBAR_INDEX:
        setAgentSidebarVisible(event.visible);
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
      this.resizeObserver.value = addDisposableListener(window, 'resize', this.handleWindowResize);
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      this.handleContainerResize();
    });
    resizeObserver.observe(this.element);
    this.resizeObserver.value = toDisposable(() => {
      resizeObserver.disconnect();
    });
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
    return containerWidth <= WORKBENCH_CONTENT_LAYOUT_BREAKPOINT
      ? Orientation.HORIZONTAL
      : Orientation.VERTICAL;
  }

  private syncSplitSlotConstraints(orientation: Orientation) {
    this.splitConstraints = getWorkbenchContentSplitConstraints(orientation);

    this.primarySidebarSlot.setConstraints(
      orientation,
      this.splitConstraints.primarySidebar,
    );
    this.editorSlot.setConstraints(orientation, this.splitConstraints.editor);
    this.agentBarSlot.setConstraints(
      orientation,
      this.splitConstraints.agentSidebar,
    );
  }

  private applySidebarSizesToGridView() {
    if (!this.gridView) {
      return;
    }

    this.gridView.setViewSize(
      [PRIMARY_SIDEBAR_INDEX],
      this.props.primarySidebarSize,
    );
    this.gridView.setViewSize(
      [AGENT_SIDEBAR_INDEX],
      this.props.agentSidebarSize,
    );
  }

  private captureGridSizes(): SplitViewSizeSnapshot {
    if (!this.gridView) {
      return {
        primarySidebarSize: this.props.primarySidebarSize,
        editorSize: this.expandedEditorSize,
        agentSidebarSize: this.props.agentSidebarSize,
      };
    }

    return {
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      agentSidebarSize: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
      editorSize: this.isEditorCollapsed
        ? this.expandedEditorSize
        : this.gridView.getViewSize([EDITOR_INDEX]),
    };
  }

  private persistGridSizes() {
    if (!this.gridView) {
      return;
    }

    const nextSizes: Partial<{
      primarySidebarSize: number;
      agentSidebarSize: number;
    }> = {
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      agentSidebarSize: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
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

  private buildBranchFromTree(node: WorkbenchContentLayoutNode): GridBranchView {
    if (node.type !== 'branch') {
      throw new Error('Root workbench content layout node must be a branch.');
    }

    const branch = new GridBranchView(
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

    return branch;
  }

  private getSlotView(id: WorkbenchContentLayoutLeafId) {
    switch (id) {
      case 'primarySidebar':
        return this.primarySidebarSlot;
      case 'editor':
        return this.editorSlot;
      case 'agentSidebar':
        return this.agentBarSlot;
    }
  }

  private isNodeVisible(node: WorkbenchContentLayoutNode): boolean {
    return node.type === 'leaf'
      ? node.visible
      : node.children.some((child) => this.isNodeVisible(child));
  }

  private syncLayoutTree(
    orientation: Orientation,
    cachedSizes: SplitViewSizeSnapshot,
  ) {
    let nextTree = reconcileWorkbenchContentLayoutTree(this.layoutTree, {
      orientation,
      isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
      isEditorVisible: !this.isEditorCollapsed,
      isAgentSidebarVisible: this.props.isAgentSidebarVisible,
      primarySidebarSize: this.props.primarySidebarSize,
      agentSidebarSize: this.props.agentSidebarSize,
      editorSize: this.isEditorCollapsed ? this.expandedEditorSize : cachedSizes.editorSize,
    });

    nextTree = this.updateTreeBranchSizes(nextTree, {
      primarySidebarSize: this.props.primarySidebarSize,
      editorSize: this.isEditorCollapsed ? 0 : cachedSizes.editorSize,
      agentSidebarSize: this.props.agentSidebarSize,
    });

    this.layoutTree = nextTree;
  }

  private syncLayoutTreeFromGrid() {
    if (!this.layoutTree || !this.gridView) {
      return;
    }

    let nextTree = updateLeaf(this.layoutTree, 'primarySidebar', {
      size: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      visible: this.props.isPrimarySidebarVisible,
    });
    nextTree = updateLeaf(nextTree, 'editor', {
      size: this.isEditorCollapsed
        ? this.expandedEditorSize
        : this.gridView.getViewSize([EDITOR_INDEX]),
      visible: !this.isEditorCollapsed,
      flex: !this.isEditorCollapsed,
    });
    nextTree = updateLeaf(nextTree, 'agentSidebar', {
      size: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
      visible: this.props.isAgentSidebarVisible,
      flex: this.isEditorCollapsed && this.props.isAgentSidebarVisible,
    });

    this.layoutTree = this.updateTreeBranchSizes(nextTree, {
      primarySidebarSize: this.gridView.getViewSize([PRIMARY_SIDEBAR_INDEX]),
      editorSize: this.isEditorCollapsed
        ? 0
        : this.gridView.getViewSize([EDITOR_INDEX]),
      agentSidebarSize: this.gridView.getViewSize([AGENT_SIDEBAR_INDEX]),
    });
  }

  private updateTreeBranchSizes(
    tree: WorkbenchContentLayoutNode,
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

export function createWorkbenchContentView(props: WorkbenchContentViewProps) {
  return new WorkbenchContentView(props);
}

export default WorkbenchContentView;
