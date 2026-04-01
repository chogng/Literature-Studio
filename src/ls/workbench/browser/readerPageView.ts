import { getWorkbenchContentClassName, getWorkbenchContentStyle } from 'ls/workbench/browser/layout';

import type { EditorStatusState } from 'ls/workbench/browser/parts/editor/editorStatus';
import { createEditorPartView } from 'ls/workbench/browser/parts/editor/editorPartView';
import type { EditorPartProps } from 'ls/workbench/browser/parts/editor/editorPartView';

import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import { createSecondarySidebarPartView, SecondarySidebarPartView } from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';
import type { SecondarySidebarProps } from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';
import { createPrimaryBarPartView, PrimaryBarPartView } from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import type { PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import { createAuxiliaryBarPartView, AuxiliaryBarPartView } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarPart';
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
  secondarySidebarProps: SecondarySidebarProps;
  primaryBarProps: PrimaryBarProps;
  auxiliarySidebarProps: AuxiliaryBarProps;
  editorPartProps: EditorPartProps;
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

export class ReaderPageView {
  private props: ReaderPageViewProps;
  private readonly element = createElement('section', 'reader-layout');
  private readonly mainElement = createElement('main');
  private fetchSidebarView: SecondarySidebarPartView | null = null;
  private primaryBarView: PrimaryBarPartView | null = null;
  private auxiliarySidebarView: AuxiliaryBarPartView | null = null;
  private editorView: ReturnType<typeof createEditorPartView> | null = null;

  constructor(props: ReaderPageViewProps) {
    this.props = props;
    this.element.append(this.mainElement);
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

  dispose() {
    clearStatusbarCommandHandlers();
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

    const contentStyle = getWorkbenchContentStyle({
      isFetchSidebarVisible: this.props.isFetchSidebarVisible,
      isPrimarySidebarVisible: this.props.isPrimarySidebarVisible,
      isAuxiliarySidebarVisible: this.props.isAuxiliarySidebarVisible,
    });
    for (const [name, value] of Object.entries(contentStyle)) {
      this.mainElement.style.setProperty(name, value);
    }

    this.renderFetchSidebar();
    this.renderPrimarySidebar();
    this.renderEditor();
    this.renderAuxiliarySidebar();

    // Keep the editor DOM attached while outer workbench props change. Detaching and
    // re-attaching the focused contenteditable breaks IME sessions in Electron/macOS.
    this.syncMainChildren([
      this.fetchSidebarView?.getElement(),
      this.primaryBarView?.getElement(),
      this.editorView?.getElement(),
      this.auxiliarySidebarView?.getElement(),
    ].filter((element): element is HTMLElement => Boolean(element)));
  }

  private syncMainChildren(children: readonly HTMLElement[]) {
    let cursor = this.mainElement.firstChild;

    for (const child of children) {
      if (child === cursor) {
        cursor = cursor?.nextSibling ?? null;
        continue;
      }

      this.mainElement.insertBefore(child, cursor);
    }

    while (cursor) {
      const nextSibling = cursor.nextSibling;
      this.mainElement.removeChild(cursor);
      cursor = nextSibling;
    }
  }

  private renderFetchSidebar() {
    if (!this.props.isFetchSidebarVisible) {
      this.fetchSidebarView?.dispose();
      this.fetchSidebarView = null;
      return;
    }

    if (!this.fetchSidebarView) {
      this.fetchSidebarView = createSecondarySidebarPartView(
        this.props.secondarySidebarProps,
      );
      return;
    }

    this.fetchSidebarView.setProps(this.props.secondarySidebarProps);
  }

  private renderPrimarySidebar() {
    if (!this.props.isPrimarySidebarVisible) {
      this.primaryBarView?.dispose();
      this.primaryBarView = null;
      return;
    }

    if (!this.primaryBarView) {
      this.primaryBarView = createPrimaryBarPartView(this.props.primaryBarProps);
      return;
    }

    this.primaryBarView.setProps(this.props.primaryBarProps);
  }

  private renderEditor() {
    if (!this.editorView) {
      this.editorView = createEditorPartView({
        ...this.props.editorPartProps,
        onStatusChange: this.handleEditorStatusChange,
      });
      this.syncStatusbarCommandHandlers();
      return;
    }

    this.editorView.setProps({
      ...this.props.editorPartProps,
      onStatusChange: this.handleEditorStatusChange,
    });
    this.syncStatusbarCommandHandlers();
  }

  private renderAuxiliarySidebar() {
    if (!this.props.isAuxiliarySidebarVisible) {
      this.auxiliarySidebarView?.dispose();
      this.auxiliarySidebarView = null;
      return;
    }

    if (!this.auxiliarySidebarView) {
      this.auxiliarySidebarView = createAuxiliaryBarPartView(
        this.props.auxiliarySidebarProps,
      );
      return;
    }

    this.auxiliarySidebarView.setProps(this.props.auxiliarySidebarProps);
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
}

export function createReaderPageView(props: ReaderPageViewProps) {
  return new ReaderPageView(props);
}

export default ReaderPageView;
