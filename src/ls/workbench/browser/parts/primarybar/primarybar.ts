import type {
  LibraryDocumentsResult,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { createLxIcon, type LxIconName } from '../../../../base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from '../../../../base/browser/ui/lxicon/lxiconSemantic.js';
import {
  buildLibraryTree,
  getLibraryTreeDocumentCount,
  resolveLibraryDocumentStatusLabel,
  type LibraryTreeLabels,
  type LibraryTreeNode,
} from '../../../contrib/knowledgeBase/browser/libraryTreeModel';
import './media/primarybar.css';

export type PrimaryBarLabels = LibraryTreeLabels & {
  unknown: string;
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
  private readonly treeElement = createElement('div', 'library-tree');
  private expandedFolders = new Set<string>(['root']);

  constructor(props: PrimaryBarProps) {
    this.props = props;
    this.treeElement.setAttribute('role', 'tree');
    this.contentElement.append(this.headerElement, this.treeElement);
    this.headerElement.append(this.actionsElement);
    this.element.append(this.contentElement);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: PrimaryBarProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.element.replaceChildren();
  }

  private render() {
    const { labels, librarySnapshot, isLibraryLoading } = this.props;
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

    this.treeElement.setAttribute('aria-label', labels.libraryTitle);
    const list = createElement('ul', 'library-tree-list');
    list.append(
      this.renderLibraryTreeNode(
        buildLibraryTree(librarySnapshot, labels),
        0,
      ),
    );
    this.treeElement.replaceChildren(list);
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

  private renderLibraryTreeNode(
    node: LibraryTreeNode,
    depth: number,
  ): HTMLLIElement {
    const item = document.createElement('li');

    if (node.kind === 'document') {
      const title = node.document.title?.trim() || this.props.labels.untitled;
      const authors =
        node.document.authors.length > 0
          ? node.document.authors.join(', ')
          : this.props.labels.unknown;
      const statusLabel = resolveLibraryDocumentStatusLabel(
        this.props.labels,
        node.document,
      );
      const row = createElement('div', 'library-tree-row library-tree-row-document');
      row.setAttribute('role', 'treeitem');
      row.style.paddingLeft = `${depth * 16}px`;

      const titleElement = createElement('span', 'library-tree-document-title');
      titleElement.textContent = title;
      titleElement.title = title;
      const metaElement = createElement('span', 'library-tree-document-meta');
      metaElement.textContent = authors;
      metaElement.title = authors;
      const statusElement = createElement(
        'span',
        `library-doc-status library-doc-status-${node.document.ingestStatus}`,
      );
      statusElement.textContent = statusLabel;

      const main = createElement('div', 'library-tree-document-main');
      main.append(titleElement, metaElement);
      const aside = createElement('div', 'library-tree-document-aside');
      aside.append(statusElement);
      row.append(main, aside);
      item.append(row);
      return item;
    }

    const isExpanded = this.expandedFolders.has(node.id);
    const button = createElement(
      'button',
      'library-tree-row library-tree-row-folder btn-base btn-ghost btn-md',
    );
    button.type = 'button';
    button.style.paddingLeft = `${depth * 16}px`;
    button.setAttribute('role', 'treeitem');
    button.setAttribute('aria-expanded', String(isExpanded));
    button.addEventListener('click', () => {
      if (this.expandedFolders.has(node.id) && node.id !== 'root') {
        this.expandedFolders.delete(node.id);
      } else {
        this.expandedFolders.add(node.id);
      }
      this.render();
    });

    const label = createElement('span', 'library-tree-folder-label');
    label.textContent = node.name;
    button.append(
      createLxIcon(
        isExpanded
          ? lxIconSemanticMap.library.folderExpanded
          : lxIconSemanticMap.library.folderCollapsed,
        'library-tree-chevron',
      ),
      label,
    );
    if (node.id === 'root') {
      const count = createElement('span', 'library-tree-folder-count');
      count.textContent = String(getLibraryTreeDocumentCount(node));
      button.append(count);
    }
    item.append(button);

    if (isExpanded) {
      const children = createElement('ul', 'library-tree-children');
      children.setAttribute('role', 'group');
      for (const folder of node.folders) {
        children.append(this.renderLibraryTreeNode(folder, depth + 1));
      }
      for (const document of node.documents) {
        children.append(
          this.renderLibraryTreeNode(
            {
              kind: 'document',
              id: document.documentId,
              document,
            },
            depth + 1,
          ),
        );
      }
      item.append(children);
    }

    return item;
  }
}

export function createPrimaryBar(props: PrimaryBarProps) {
  return new PrimaryBar(props);
}

export default PrimaryBar;
