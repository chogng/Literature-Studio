import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

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
  private readonly actionsElement = createElement(
    'div',
    'sidebar-action-bar',
  );
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
    this.headerElement.append(this.actionsElement);
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
    this.libraryView.dispose();
    this.element.replaceChildren();
  }

  private render() {
    const { labels, isLibraryLoading } = this.props;
    this.actionsElement.replaceChildren(
      this.createActionButton(
        labels.libraryAction,
        lxIconSemanticMap.library.refresh,
        this.props.onRefreshLibrary,
        isLibraryLoading || !this.props.onRefreshLibrary,
        true,
      ),
      this.createActionButton(
        labels.pdfDownloadAction,
        lxIconSemanticMap.library.downloadPdf,
        this.props.onDownloadPdf,
        !this.props.onDownloadPdf,
      ),
      this.createActionButton(
        labels.writingAction,
        lxIconSemanticMap.library.createDraft,
        this.props.onCreateDraftTab,
        !this.props.onCreateDraftTab,
      ),
    );
  }

  private createActionButton(
    label: string,
    icon: LxIconName,
    onClick: (() => void) | undefined,
    disabled: boolean,
    isActive: boolean = false,
  ) {
    const button = createElement(
      'button',
      [
        'sidebar-action-btn',
        'btn-base',
        'btn-ghost',
        'btn-mode-icon',
        'btn-sm',
        isActive ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    button.type = 'button';
    button.append(createLxIcon(icon));
    button.title = label;
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    if (onClick) {
      button.addEventListener('click', onClick);
    }
    return button;
  }
}

export function createPrimaryBar(props: PrimaryBarProps) {
  return new PrimaryBar(props);
}

export default PrimaryBar;
