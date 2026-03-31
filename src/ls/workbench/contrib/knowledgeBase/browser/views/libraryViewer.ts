import type { LibraryDocumentsResult } from '../../../../../base/parts/sandbox/common/desktopTypes.js';
import type { LibraryDocumentSummary } from '../../../../../base/parts/sandbox/common/desktopTypes.js';
import { SimpleTree } from '../../../../../base/browser/ui/tree/simpleTree.js';
import {
  type LibraryTreeLabels,
  type LibraryTreeNode,
} from '../../common/libraryTreeModel.js';
import { LibraryDataSource } from './libraryDataSource.js';
import { LibraryDelegate } from './libraryDelegate.js';
import { LibraryDragAndDrop } from './libraryDragAndDrop.js';
import { LibraryRenderer } from './libraryRenderer.js';

export type LibraryViewerLabels = LibraryTreeLabels & {
  unknown: string;
};

export type LibraryViewerProps = {
  labels: LibraryViewerLabels;
  librarySnapshot: LibraryDocumentsResult;
  onDocumentDragStart?: (documentId: string) => void;
  onDocumentSelect?: (document: LibraryDocumentSummary | null) => void;
  onDocumentOpen?: (document: LibraryDocumentSummary) => void;
};

export class LibraryViewer {
  private readonly dataSource: LibraryDataSource;
  private readonly delegate = new LibraryDelegate();
  private readonly dragAndDrop: LibraryDragAndDrop;
  private readonly renderer: LibraryRenderer;
  private readonly tree: SimpleTree<LibraryTreeNode>;
  private labels: LibraryViewerLabels;
  private onDocumentSelect?: (document: LibraryDocumentSummary | null) => void;
  private onDocumentOpen?: (document: LibraryDocumentSummary) => void;

  constructor(props: LibraryViewerProps) {
    this.labels = props.labels;
    this.onDocumentSelect = props.onDocumentSelect;
    this.onDocumentOpen = props.onDocumentOpen;
    this.dataSource = new LibraryDataSource({
      labels: props.labels,
      librarySnapshot: props.librarySnapshot,
    });
    this.dragAndDrop = new LibraryDragAndDrop({
      onDocumentDragStart: props.onDocumentDragStart,
    });
    this.renderer = new LibraryRenderer({
      labels: props.labels,
      dragAndDrop: this.dragAndDrop,
      delegate: this.delegate,
    });
    this.tree = new SimpleTree(this.dataSource, {
      renderElement: (node, context) => this.renderer.renderElement(node, context),
    }, {
      getId: (node) => node.id,
      isRoot: (node) => node.kind === 'folder' && node.id === 'root',
      getLabel: (node) =>
        node.kind === 'folder'
          ? node.name
          : node.document.title?.trim() || this.labels.untitled,
      defaultExpandedIds: ['root'],
      onDidChangeSelection: (node) => {
        this.handleSelectionChange(node);
      },
      onDidOpen: (node) => {
        this.handleOpen(node);
      },
    });
  }

  setProps(props: LibraryViewerProps) {
    this.labels = props.labels;
    this.onDocumentSelect = props.onDocumentSelect;
    this.onDocumentOpen = props.onDocumentOpen;
    this.dataSource.setInput({
      labels: props.labels,
      librarySnapshot: props.librarySnapshot,
    });
    this.dragAndDrop.setProps({
      onDocumentDragStart: props.onDocumentDragStart,
    });
    this.renderer.setProps({
      labels: props.labels,
      dragAndDrop: this.dragAndDrop,
      delegate: this.delegate,
    });
  }

  getElement() {
    return this.tree.getElement();
  }

  render(root: LibraryTreeNode = this.dataSource.getRoot()) {
    this.tree.setInput(root);
    return this.tree.getElement();
  }

  private handleSelectionChange(node: LibraryTreeNode | null) {
    this.onDocumentSelect?.(
      node?.kind === 'document' ? node.document : null,
    );
  }

  private handleOpen(node: LibraryTreeNode) {
    if (node.kind !== 'document') {
      return;
    }

    this.onDocumentOpen?.(node.document);
  }
}
