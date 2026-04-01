import { getWorkbenchContentClassName, getWorkbenchContentStyle } from 'ls/workbench/browser/layout';
import type { WorkbenchSidebarKind } from 'ls/workbench/browser/layout';

import type { EditorStatusState } from 'ls/editor/browser/shared/editorStatus';
import { createEditorPartView } from 'ls/workbench/browser/parts/editor/editorPartView';
import type { EditorPartProps } from 'ls/workbench/browser/parts/editor/editorPartView';

import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import { createSecondarySidebarPartView, SecondarySidebarPartView } from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';
import type { SecondarySidebarProps } from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';
import { createPrimaryBarPartView, PrimaryBarPartView } from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import type { PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybarPart';
import { createAuxiliaryBarPartView, AuxiliaryBarPartView } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarPart';
import type { AuxiliaryBarProps } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarPart';

import { initializeStatusbarState, updateStatusbarState } from 'ls/workbench/browser/parts/statusbar/statusbarActions';

type ReaderPageViewProps = {
  isSidebarVisible: boolean;
  activeSidebarKind: WorkbenchSidebarKind;
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
  private leftPaneView:
    | PrimaryBarPartView
    | SecondarySidebarPartView
    | null = null;
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

  setProps(props: ReaderPageViewProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.leftPaneView?.dispose();
    this.auxiliarySidebarView?.dispose();
    this.editorView?.dispose();
    this.leftPaneView = null;
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
      isSidebarVisible: this.props.isSidebarVisible,
      isAuxiliarySidebarVisible: this.props.isAuxiliarySidebarVisible,
      activeSidebarKind: this.props.activeSidebarKind,
    });

    const contentStyle = getWorkbenchContentStyle({
      isSidebarVisible: this.props.isSidebarVisible,
      isAuxiliarySidebarVisible: this.props.isAuxiliarySidebarVisible,
      activeSidebarKind: this.props.activeSidebarKind,
    });
    for (const [name, value] of Object.entries(contentStyle)) {
      this.mainElement.style.setProperty(name, value);
    }

    this.renderLeftPane();
    this.renderEditor();
    this.renderAuxiliarySidebar();

    // Keep the editor DOM attached while outer workbench props change. Detaching and
    // re-attaching the focused contenteditable breaks IME sessions in Electron/macOS.
    this.syncMainChildren([
      this.leftPaneView?.getElement(),
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

  private renderLeftPane() {
    if (!this.props.isSidebarVisible) {
      this.leftPaneView?.dispose();
      this.leftPaneView = null;
      return;
    }

    if (this.props.activeSidebarKind === 'primaryBar') {
      if (!(this.leftPaneView instanceof PrimaryBarPartView)) {
        this.leftPaneView?.dispose();
        this.leftPaneView = createPrimaryBarPartView(
          this.props.primaryBarProps,
        );
      } else {
        this.leftPaneView.setProps(this.props.primaryBarProps);
      }
      return;
    }

    if (!(this.leftPaneView instanceof SecondarySidebarPartView)) {
      this.leftPaneView?.dispose();
      this.leftPaneView = createSecondarySidebarPartView(
        this.props.secondarySidebarProps,
      );
    } else {
      this.leftPaneView.setProps(this.props.secondarySidebarProps);
    }
  }

  private renderEditor() {
    if (!this.editorView) {
      this.editorView = createEditorPartView({
        ...this.props.editorPartProps,
        onStatusChange: this.handleEditorStatusChange,
      });
      return;
    }

    this.editorView.setProps({
      ...this.props.editorPartProps,
      onStatusChange: this.handleEditorStatusChange,
    });
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
}

export function createReaderPageView(props: ReaderPageViewProps) {
  return new ReaderPageView(props);
}

export default ReaderPageView;
