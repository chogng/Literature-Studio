import {
  getWorkbenchContentClassName,
  getWorkbenchContentStyle,
  type WorkbenchSidebarKind,
} from './layout';
import { createEditorPartView, type EditorPartProps } from './parts/editor/editorPartView';
import type { EditorStatusState } from './parts/editor/editorStatus';
import {
  createAuxiliarySidebarPartView,
  createPrimarySidebarPartView,
  createSecondarySidebarPartView,
  AuxiliarySidebarPartView,
  PrimarySidebarPartView,
  SecondarySidebarPartView,
  type SecondarySidebarProps,
} from './parts/sidebar/secondarySidebarPart';
import { initializeStatusbarState, updateStatusbarState } from './parts/statusbar/statusbarActions';
import type {
  LibraryDocumentsResult,
  RagAnswerResult,
} from '../../base/parts/sandbox/common/desktopTypes.js';
import type { AssistantChatMessage, AssistantConversation } from './assistantModel';

type ReaderViewProps = {
  isSidebarVisible: boolean;
  activeSidebarKind: WorkbenchSidebarKind;
  isAuxiliarySidebarVisible: boolean;
  secondarySidebarProps: SecondarySidebarProps;
  primarySidebarProps: {
    labels: SecondarySidebarProps['labels'];
    librarySnapshot: LibraryDocumentsResult;
    isLibraryLoading: boolean;
    onRefreshLibrary?: () => void;
    onDownloadPdf?: () => void;
    onCreateDraftTab?: () => void;
  };
  auxiliarySidebarProps: {
    labels: SecondarySidebarProps['labels'];
    isKnowledgeBaseModeEnabled: boolean;
    librarySnapshot: LibraryDocumentsResult;
    question: string;
    onQuestionChange: (value: string) => void;
    messages: AssistantChatMessage[];
    result: RagAnswerResult | null;
    isAsking: boolean;
    errorMessage: string | null;
    onAsk: () => void;
    availableArticleCount: number;
    conversations: AssistantConversation[];
    activeConversationId: string;
    isHistoryOpen: boolean;
    isMoreMenuOpen: boolean;
    onCreateConversation: () => void;
    onActivateConversation: (conversationId: string) => void;
    onCloseConversation: (conversationId: string) => void;
    onCloseAuxiliarySidebar: () => void;
    onToggleHistory: () => void;
    onToggleMoreMenu: () => void;
  };
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
    | PrimarySidebarPartView
    | SecondarySidebarPartView
    | null = null;
  private auxiliarySidebarView: AuxiliarySidebarPartView | null = null;
  private editorView: ReturnType<typeof createEditorPartView> | null = null;

  constructor(props: ReaderViewProps) {
    this.props = props;
    this.element.append(this.mainElement);
    this.render();
  }

  getElement() {
    return this.element;
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
      if (!(this.sidebarView instanceof PrimarySidebarPartView)) {
        this.sidebarView?.dispose();
        this.sidebarView = createPrimarySidebarPartView(
          this.props.primarySidebarProps,
        );
      } else {
        this.sidebarView.setProps(this.props.primarySidebarProps);
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
      this.auxiliarySidebarView = createAuxiliarySidebarPartView(
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
