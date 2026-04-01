import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';

import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import { LibraryView } from 'ls/workbench/contrib/knowledgeBase/browser/views/libraryView';
import type { LibraryViewLabels } from 'ls/workbench/contrib/knowledgeBase/browser/views/libraryView';

import 'ls/workbench/browser/parts/primarybar/media/primarybar.css';

export type PrimaryBarLabels = LibraryViewLabels & {
  libraryAction: string;
  pdfDownloadAction: string;
  writingAction: string;
};

export type PrimaryBarProps = {
  labels: PrimaryBarLabels;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
  onDownloadPdf?: () => void;
  onCreateDraftTab?: () => void;
  onDocumentDragStart?: (documentId: string) => void;
  onDocumentSelect?: (document: LibraryDocumentSummary | null) => void;
  onDocumentOpen?: (document: LibraryDocumentSummary) => void;
  onDocumentRename?: (document: LibraryDocumentSummary) => void;
  onDocumentEditSourceUrl?: (document: LibraryDocumentSummary) => void;
  onDocumentDelete?: (document: LibraryDocumentSummary) => void;
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

export class PrimaryBar {
  private props: PrimaryBarProps;
  private readonly element = createElement(
    'section',
    'panel sidebar-panel primarybar-panel',
  );
  private readonly contentElement = createElement(
    'div',
    'primarybar-content',
  );
  private readonly headerElement = createElement(
    'div',
    'sidebar-workbench-header',
  );
  private readonly actionsView = createActionBarView({
    className: 'sidebar-action-bar',
    ariaRole: 'group',
  });
  private readonly libraryView: LibraryView;

  constructor(props: PrimaryBarProps) {
    this.props = props;
    this.libraryView = new LibraryView({
      labels: props.labels,
      librarySnapshot: props.librarySnapshot,
      onDocumentDragStart: props.onDocumentDragStart,
      onDocumentSelect: props.onDocumentSelect,
      onDocumentOpen: props.onDocumentOpen,
      onDocumentRename: props.onDocumentRename,
      onDocumentEditSourceUrl: props.onDocumentEditSourceUrl,
      onDocumentDelete: props.onDocumentDelete,
    });
    this.contentElement.append(this.headerElement, this.libraryView.getElement());
    this.headerElement.append(this.actionsView.getElement());
    this.element.append(this.contentElement);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: PrimaryBarProps) {
    this.props = props;
    this.libraryView.setProps({
      labels: props.labels,
      librarySnapshot: props.librarySnapshot,
      onDocumentDragStart: props.onDocumentDragStart,
      onDocumentSelect: props.onDocumentSelect,
      onDocumentOpen: props.onDocumentOpen,
      onDocumentRename: props.onDocumentRename,
      onDocumentEditSourceUrl: props.onDocumentEditSourceUrl,
      onDocumentDelete: props.onDocumentDelete,
    });
    this.render();
  }

  dispose() {
    this.actionsView.dispose();
    this.libraryView.dispose();
    this.element.replaceChildren();
  }

  private render() {
    const { labels, isLibraryLoading } = this.props;
    this.actionsView.setProps({
      className: 'sidebar-action-bar',
      ariaRole: 'group',
      items: [
        {
          label: labels.libraryAction,
          content: createLxIcon(lxIconSemanticMap.library.refresh),
          disabled: isLibraryLoading || !this.props.onRefreshLibrary,
          buttonClassName: 'sidebar-action-btn',
          onClick: () => this.props.onRefreshLibrary?.(),
        },
        {
          label: labels.pdfDownloadAction,
          content: createLxIcon(lxIconSemanticMap.library.downloadPdf),
          disabled: !this.props.onDownloadPdf,
          buttonClassName: 'sidebar-action-btn',
          onClick: () => this.props.onDownloadPdf?.(),
        },
        {
          label: labels.writingAction,
          content: createLxIcon(lxIconSemanticMap.library.createDraft),
          disabled: !this.props.onCreateDraftTab,
          buttonClassName: 'sidebar-action-btn',
          onClick: () => this.props.onCreateDraftTab?.(),
        },
      ],
    });
  }
}

export function createPrimaryBar(props: PrimaryBarProps) {
  return new PrimaryBar(props);
}

export default PrimaryBar;
