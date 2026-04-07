import type { EditorStatusState } from 'ls/workbench/browser/parts/editor/editorStatus';
import { createEditorPartView } from 'ls/workbench/browser/parts/editor/editorPartView';
import type { EditorPartProps } from 'ls/workbench/browser/parts/editor/editorPartView';
import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import type { PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import {
  createPrimaryBarPartView,
  PrimaryBarPartView,
} from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import type { AgentBarPartProps } from 'ls/workbench/browser/parts/agentbar/agentbarPart';
import {
  createAgentBarPartView,
  AgentBarPartView,
} from 'ls/workbench/browser/parts/agentbar/agentbarPart';
import {
  clearStatusbarCommandHandlers,
  initializeStatusbarState,
  setStatusbarCommandHandlers,
  updateStatusbarState,
} from 'ls/workbench/browser/parts/statusbar/statusbarActions';

export type WorkbenchContentPartViewsProps = {
  mode?: 'content' | 'settings';
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  primaryBarProps: PrimaryBarProps;
  settingsNavigationElement?: HTMLElement | null;
  settingsTopbarActionsElement?: HTMLElement | null;
  agentBarProps: AgentBarPartProps;
  editorPartProps: EditorPartProps;
  settingsContentElement?: HTMLElement | null;
  sidebarTopbarActionsElement: HTMLElement;
  primaryBarFooterActionsElement: HTMLElement;
  editorTopbarAuxiliaryActionsElement?: HTMLElement | null;
};

export type WorkbenchContentPartViewsLayoutState = {
  isEditorCollapsed: boolean;
  mountPrimarySidebarActionsInAgentBar: boolean;
  mountEditorActionsInAgentBar: boolean;
  onToggleEditorCollapse: () => void;
};

export class WorkbenchContentPartViews {
  private props: WorkbenchContentPartViewsProps;
  private layoutState: WorkbenchContentPartViewsLayoutState;
  private primaryBarView: PrimaryBarPartView | null = null;
  private agentBarView: AgentBarPartView | null = null;
  private editorView: ReturnType<typeof createEditorPartView> | null = null;
  private retiredEditorView: ReturnType<typeof createEditorPartView> | null = null;
  private disposed = false;

  constructor(props: WorkbenchContentPartViewsProps) {
    this.props = props;
    this.layoutState = {
      isEditorCollapsed: false,
      mountPrimarySidebarActionsInAgentBar: false,
      mountEditorActionsInAgentBar: false,
      onToggleEditorCollapse: () => {},
    };
    this.render();
  }

  setProps(props: WorkbenchContentPartViewsProps) {
    if (this.disposed) {
      return;
    }

    this.props = props;
    this.render();
  }

  setLayoutState(layoutState: WorkbenchContentPartViewsLayoutState) {
    if (this.disposed) {
      return;
    }

    this.layoutState = layoutState;
    this.render();
  }

  getPrimarySidebarElement() {
    return this.primaryBarView?.getElement() ?? null;
  }

  getEditorElement() {
    if (this.props.mode === 'settings') {
      return this.props.settingsContentElement ?? null;
    }

    return this.editorView?.getElement() ?? null;
  }

  getAgentSidebarElement() {
    return this.agentBarView?.getElement() ?? null;
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

  focusActiveEditorPrimaryInput() {
    this.editorView?.focusPrimaryInput();
  }

  whenEditorTabViewStateSettled(tabId: string) {
    return (
      this.editorView?.whenEditorTabViewStateSettled(tabId) ??
      this.retiredEditorView?.whenEditorTabViewStateSettled(tabId) ??
      Promise.resolve()
    );
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    clearStatusbarCommandHandlers();
    this.primaryBarView?.dispose();
    this.agentBarView?.dispose();
    this.retiredEditorView = this.editorView;
    this.retiredEditorView?.dispose();
    this.primaryBarView = null;
    this.agentBarView = null;
    this.editorView = null;
  }

  private render() {
    initializeStatusbarState(this.props.editorPartProps.labels.status);
    this.renderPrimarySidebar();
    this.renderEditor();
    this.renderAgentBar();
  }

  private renderPrimarySidebar() {
    if (!this.props.isPrimarySidebarVisible) {
      this.primaryBarView?.dispose();
      this.primaryBarView = null;
      return;
    }

    const topbarActionsElement =
      this.props.mode === 'settings'
        ? (this.props.settingsTopbarActionsElement ?? null)
        : this.layoutState.mountPrimarySidebarActionsInAgentBar
          ? null
          : this.props.sidebarTopbarActionsElement;
    const nextProps: PrimaryBarProps = {
      ...this.props.primaryBarProps,
      mode: this.props.mode === 'settings' ? 'settings' : 'content',
      settingsNavigationElement:
        this.props.mode === 'settings'
          ? (this.props.settingsNavigationElement ?? null)
          : null,
      topbarActionsElement,
      footerActionsElement: this.props.primaryBarFooterActionsElement,
    };

    if (!this.primaryBarView) {
      this.primaryBarView = createPrimaryBarPartView(nextProps);
      return;
    }

    this.primaryBarView.setProps(nextProps);
  }

  private renderEditor() {
    if (this.props.mode === 'settings') {
      this.retiredEditorView = this.editorView;
      this.retiredEditorView?.dispose();
      this.editorView = null;
      clearStatusbarCommandHandlers();
      return;
    }

    const nextProps: EditorPartProps = {
      ...this.props.editorPartProps,
      showTopbarActions: !this.layoutState.isEditorCollapsed,
      showTopbarToolbar: !this.layoutState.isEditorCollapsed,
      isEditorCollapsed: this.layoutState.isEditorCollapsed,
      onToggleEditorCollapse: this.layoutState.onToggleEditorCollapse,
      onStatusChange: this.handleEditorStatusChange,
    };

    if (!this.editorView) {
      this.editorView = createEditorPartView(nextProps);
    } else {
      this.editorView.setProps(nextProps);
    }

    this.syncStatusbarCommandHandlers();
  }

  private renderAgentBar() {
    if (this.props.mode === 'settings') {
      this.agentBarView?.dispose();
      this.agentBarView = null;
      return;
    }

    if (!this.props.isAgentSidebarVisible) {
      this.agentBarView?.dispose();
      this.agentBarView = null;
      return;
    }

    const nextProps: AgentBarPartProps = {
      ...this.props.agentBarProps,
      isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
      topbarActionsElement: this.layoutState.mountPrimarySidebarActionsInAgentBar
        ? this.props.sidebarTopbarActionsElement
        : null,
      topbarTrailingActionsElement: this.layoutState.mountEditorActionsInAgentBar
        ? (this.props.editorTopbarAuxiliaryActionsElement ?? null)
        : null,
    };

    if (!this.agentBarView) {
      this.agentBarView = createAgentBarPartView(nextProps);
      return;
    }

    this.agentBarView.setProps(nextProps);
  }

  private handleEditorStatusChange = (status: EditorStatusState) => {
    updateStatusbarState(status);
  };

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
}

export function createWorkbenchContentPartViews(props: WorkbenchContentPartViewsProps) {
  return new WorkbenchContentPartViews(props);
}
