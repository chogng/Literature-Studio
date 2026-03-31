import {
  getWorkbenchContentClassName,
  getWorkbenchContentStyle,
  type WorkbenchSidebarKind,
} from './layout';
import type { EditorStatusState } from '../../editor/browser/shared/editorStatus';
import { createEditorPartView, type EditorPartProps } from './parts/editor/editorPartView';
import type { DraftEditorCommandId } from './parts/editor/panes/draftEditorCommands';
import {
  createSecondarySidebarPartView,
  SecondarySidebarPartView,
  type SecondarySidebarProps,
} from './parts/sidebar/secondarySidebarPart';
import {
  createPrimaryBarPartView,
  PrimaryBarPartView,
  type PrimaryBarProps,
} from './parts/primarybar/primarybarPart';
import {
  createAuxiliaryBarPartView,
  AuxiliaryBarPartView,
  type AuxiliaryBarProps,
} from './parts/auxiliarybar/auxiliarybarPart';
import { initializeStatusbarState, updateStatusbarState } from './parts/statusbar/statusbarActions';

type ReaderViewProps = {
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

export class ReaderView {
  private props: ReaderViewProps;
  private readonly element = createElement('section', 'reader-layout');
  private readonly mainElement = createElement('main');
  private sidebarView:
    | PrimaryBarPartView
    | SecondarySidebarPartView
    | null = null;
  private auxiliarySidebarView: AuxiliaryBarPartView | null = null;
  private editorView: ReturnType<typeof createEditorPartView> | null = null;

  constructor(props: ReaderViewProps) {
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

  setProps(props: ReaderViewProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.sidebarView?.dispose();
    this.auxiliarySidebarView?.dispose();
    this.editorView?.dispose();
    this.sidebarView = null;
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

    this.renderSidebar();
    this.renderEditor();
    this.renderAuxiliarySidebar();

    this.mainElement.replaceChildren();
    if (this.sidebarView) {
      this.mainElement.append(this.sidebarView.getElement());
    }
    if (this.editorView) {
      this.mainElement.append(this.editorView.getElement());
    }
    if (this.auxiliarySidebarView) {
      this.mainElement.append(this.auxiliarySidebarView.getElement());
    }
  }

  private renderSidebar() {
    if (!this.props.isSidebarVisible) {
      this.sidebarView?.dispose();
      this.sidebarView = null;
      return;
    }

    if (this.props.activeSidebarKind === 'primary') {
      if (!(this.sidebarView instanceof PrimaryBarPartView)) {
        this.sidebarView?.dispose();
        this.sidebarView = createPrimaryBarPartView(
          this.props.primaryBarProps,
        );
      } else {
        this.sidebarView.setProps(this.props.primaryBarProps);
      }
      return;
    }

    if (!(this.sidebarView instanceof SecondarySidebarPartView)) {
      this.sidebarView?.dispose();
      this.sidebarView = createSecondarySidebarPartView(
        this.props.secondarySidebarProps,
      );
    } else {
      this.sidebarView.setProps(this.props.secondarySidebarProps);
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

export function createReaderView(props: ReaderViewProps) {
  return new ReaderView(props);
}

export default ReaderView;
