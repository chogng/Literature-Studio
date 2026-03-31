import type { LibraryDocumentsResult } from '../../../../../base/parts/sandbox/common/desktopTypes.js';
import type { SimpleTreeRenderContext } from '../../../../../base/browser/ui/tree/simpleTree.js';
import { createLxIcon } from '../../../../../base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from '../../../../../base/browser/ui/lxicon/lxiconSemantic.js';
import {
  resolveLibraryDocumentStatusLabel,
  type LibraryTreeLabels,
  type LibraryTreeFolderNode,
  type LibraryTreeNode,
} from '../../common/libraryTreeModel.js';
import { LibraryDataSource } from './libraryDataSource.js';
import { LibraryDelegate } from './libraryDelegate.js';
import type { LibraryDragAndDrop } from './libraryDragAndDrop.js';

export type LibraryRendererLabels = LibraryTreeLabels & {
  unknown: string;
};

export type LibraryRendererProps = {
  labels: LibraryRendererLabels;
  dragAndDrop: LibraryDragAndDrop;
  delegate: LibraryDelegate;
  dataSource: LibraryDataSource;
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

export class LibraryRenderer {
  private props: LibraryRendererProps;

  constructor(props: LibraryRendererProps) {
    this.props = props;
  }

  setProps(props: LibraryRendererProps) {
    this.props = props;
  }

  renderElement(
    node: LibraryTreeNode,
    context: SimpleTreeRenderContext,
  ): HTMLElement {
    if (node.kind === 'document') {
      return this.renderDocumentRow(node.document, context);
    }

    const button = createElement(
      'button',
      'library-tree-row library-tree-row-folder btn-base btn-ghost btn-md',
    );
    button.type = 'button';
    button.style.paddingLeft = this.props.delegate.getNodePaddingLeft(
      context.depth,
    );
    button.setAttribute('role', 'treeitem');
    button.setAttribute('aria-expanded', String(context.isExpanded));
    button.addEventListener('click', () => {
      context.toggleExpanded();
    });

    const label = createElement('span', 'library-tree-folder-label');
    label.textContent = node.name;
    button.append(
      createLxIcon(
        context.isExpanded
          ? lxIconSemanticMap.library.folderExpanded
          : lxIconSemanticMap.library.folderCollapsed,
        'library-tree-chevron',
      ),
      label,
    );
    if (node.id === 'root') {
      const count = createElement('span', 'library-tree-folder-count');
      count.textContent = String(
        this.props.dataSource.getDocumentCount(node as LibraryTreeFolderNode),
      );
      button.append(count);
    }
    return button;
  }

  private renderDocumentRow(
    document: LibraryDocumentsResult['items'][number],
    context: SimpleTreeRenderContext,
  ) {
    const title = document.title?.trim() || this.props.labels.untitled;
    const authors =
      document.authors.length > 0
        ? document.authors.join(', ')
        : this.props.labels.unknown;
    const statusLabel = resolveLibraryDocumentStatusLabel(
      this.props.labels,
      document,
    );

    const row = createElement(
      'div',
      'library-tree-row library-tree-row-document',
    );
    row.setAttribute('role', 'treeitem');
    row.style.paddingLeft = this.props.delegate.getNodePaddingLeft(context.depth);
    row.draggable = true;
    row.addEventListener('dragstart', (event) => {
      this.props.dragAndDrop.handleDocumentDragStart(event, document);
    });
    row.addEventListener('dblclick', () => {
      context.open();
    });

    const titleElement = createElement('span', 'library-tree-document-title');
    titleElement.textContent = title;
    titleElement.title = title;

    const metaElement = createElement('span', 'library-tree-document-meta');
    metaElement.textContent = authors;
    metaElement.title = authors;

    const statusElement = createElement(
      'span',
      `library-doc-status library-doc-status-${document.ingestStatus}`,
    );
    statusElement.textContent = statusLabel;

    const main = createElement('div', 'library-tree-document-main');
    main.append(titleElement, metaElement);

    const aside = createElement('div', 'library-tree-document-aside');
    aside.append(statusElement);

    row.append(main, aside);
    return row;
  }
}
