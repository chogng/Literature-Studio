import {
  getWorkbenchContentClassName,
  WorkbenchContentLayoutController,
  WorkbenchLayoutSlotView,
  setAgentSidebarVisible,
  setPrimarySidebarVisible,
  setWorkbenchSidebarSizes,
  WORKBENCH_SPLITVIEW_LIMITS,
} from 'ls/workbench/browser/layout';
import type { WorkbenchContentPartViews } from 'ls/workbench/browser/workbenchContentPartViews';

export type WorkbenchContentLayoutViewProps = {
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  isLayoutEdgeSnappingEnabled: boolean;
  primarySidebarSize: number;
  agentSidebarSize: number;
  partViews: WorkbenchContentPartViews;
};

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


export class WorkbenchContentLayoutView {
  private props: WorkbenchContentLayoutViewProps;
  private isEditorCollapsed = false;
  private expandedEditorSize: number = WORKBENCH_SPLITVIEW_LIMITS.editor.minimum;
  private readonly element = createElement('section', 'workbench-content-layout');
  private readonly mainElement = createElement('main');
  private readonly primarySidebarSlot = new WorkbenchLayoutSlotView(
    'workbench-content-slot-leading-group workbench-leading-pane workbench-leading-pane-primary',
    true,
  );
  private readonly editorSlot = new WorkbenchLayoutSlotView('workbench-content-slot-editor');
  private readonly agentBarSlot = new WorkbenchLayoutSlotView(
    'workbench-content-slot-agent',
    true,
  );
  private readonly layoutController: WorkbenchContentLayoutController;
  private disposed = false;

  get gridView() {
    return (this.layoutController as unknown as {
      gridView: unknown;
    }).gridView;
  }

  get layoutAnimationFrame() {
    return (this.layoutController as unknown as {
      layoutAnimationFrame: unknown;
    }).layoutAnimationFrame;
  }

  get resizeObserver() {
    return (this.layoutController as unknown as {
      resizeObserver: unknown;
    }).resizeObserver;
  }

  get handleWindowResize() {
    return (this.layoutController as unknown as {
      handleWindowResize: EventListenerOrEventListenerObject;
    }).handleWindowResize;
  }

  constructor(props: WorkbenchContentLayoutViewProps) {
    this.props = props;
    this.element.append(this.mainElement);
    this.layoutController = new WorkbenchContentLayoutController({
      container: this.element,
      contentHost: this.mainElement,
      primarySidebarSlot: this.primarySidebarSlot,
      editorSlot: this.editorSlot,
      agentSidebarSlot: this.agentBarSlot,
      getState: () => ({
        isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
        isAgentSidebarVisible: this.props.isAgentSidebarVisible,
        isLayoutEdgeSnappingEnabled: this.props.isLayoutEdgeSnappingEnabled,
        primarySidebarSize: this.props.primarySidebarSize,
        agentSidebarSize: this.props.agentSidebarSize,
        isEditorCollapsed: this.isEditorCollapsed,
        expandedEditorSize: this.expandedEditorSize,
      }),
      onPrimarySidebarVisibilityChange: setPrimarySidebarVisible,
      onAgentSidebarVisibilityChange: setAgentSidebarVisible,
      onSidebarSizesChange: setWorkbenchSidebarSizes,
    });
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: WorkbenchContentLayoutViewProps) {
    if (this.disposed) {
      return;
    }

    this.props = props;
    this.render();
  }

  layout() {
    this.layoutController.layout();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.layoutController.dispose();
    this.element.replaceChildren();
  }

  private readonly handleToggleEditorCollapse = () => {
    const editorViewSize = this.layoutController.getEditorViewSize();
    if (!this.isEditorCollapsed && typeof editorViewSize === 'number') {
      this.expandedEditorSize = Math.max(
        WORKBENCH_SPLITVIEW_LIMITS.editor.minimum,
        editorViewSize,
      );
    }

    this.isEditorCollapsed = !this.isEditorCollapsed;
    this.render();
  };

  private render() {
    this.mainElement.className = getWorkbenchContentClassName({
      isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
      isAgentSidebarVisible: this.props.isAgentSidebarVisible,
    });

    this.props.partViews.setLayoutState({
      isEditorCollapsed: this.isEditorCollapsed,
      mountPrimarySidebarActionsInAgentBar: this.shouldMountPrimarySidebarActionsInAgentBar(),
      mountEditorActionsInAgentBar: this.shouldMountEditorActionsInAgentBar(),
      onToggleEditorCollapse: this.handleToggleEditorCollapse,
    });
    this.primarySidebarSlot.setContent(this.props.partViews.getPrimarySidebarElement());
    this.editorSlot.setContent(this.props.partViews.getEditorElement());
    this.agentBarSlot.setContent(this.props.partViews.getAgentSidebarElement());
    this.layoutController.sync();
  }

  private shouldMountPrimarySidebarActionsInAgentBar() {
    return this.props.isAgentSidebarVisible && !this.props.isPrimarySidebarVisible;
  }

  private shouldMountEditorActionsInAgentBar() {
    return this.props.isAgentSidebarVisible && this.isEditorCollapsed;
  }
}

export function createWorkbenchContentLayoutView(props: WorkbenchContentLayoutViewProps) {
  return new WorkbenchContentLayoutView(props);
}

export default WorkbenchContentLayoutView;
