import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from '../../../../../base/parts/sandbox/common/desktopTypes.js';
import {
  buildLibraryTree,
  type LibraryTreeLabels,
  type LibraryTreeNode,
} from '../../common/libraryTreeModel.js';

export type LibraryDataSourceLabels = LibraryTreeLabels;

export type LibraryDataSourceInput = {
  labels: LibraryDataSourceLabels;
  librarySnapshot: LibraryDocumentsResult;
};

export class LibraryDataSource {
  private root: LibraryTreeNode;

  constructor(input: LibraryDataSourceInput) {
    this.root = buildLibraryTree(input.librarySnapshot, input.labels);
  }

  setInput(input: LibraryDataSourceInput) {
    this.root = buildLibraryTree(input.librarySnapshot, input.labels);
  }

  getRoot() {
    return this.root;
  }

  hasChildren(node: LibraryTreeNode) {
    return node.kind === 'folder' && (node.folders.length > 0 || node.documents.length > 0);
  }

  getChildren(node: LibraryTreeNode): LibraryTreeNode[] {
    if (node.kind !== 'folder') {
      return [];
    }

    return [
      ...node.folders,
      ...node.documents.map((document) => this.createDocumentNode(document)),
    ];
  }

  createDocumentNode(document: LibraryDocumentSummary): LibraryTreeNode {
    return {
      kind: 'document',
      id: document.documentId,
      document,
    };
  }
}
