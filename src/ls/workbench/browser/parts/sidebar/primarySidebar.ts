import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import type { SidebarLabels } from './secondarySidebarPart';
import './media/primarySidebar.css';

export type PrimarySidebarProps = {
  labels: SidebarLabels;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
  onDownloadPdf?: () => void;
  onCreateDraftTab?: () => void;
};

type LibraryTreeFolderNode = {
  kind: 'folder';
  id: string;
  name: string;
  folders: LibraryTreeFolderNode[];
  documents: LibraryDocumentSummary[];
};

type LibraryTreeDocumentNode = {
  kind: 'document';
  id: string;
  document: LibraryDocumentSummary;
};

type LibraryTreeNode = LibraryTreeFolderNode | LibraryTreeDocumentNode;

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

function resolveLibraryDocumentStatusLabel(
  labels: Pick<
    SidebarLabels,
    | 'libraryStatusRegistered'
    | 'libraryStatusQueued'
    | 'libraryStatusRunning'
    | 'libraryStatusFailed'
  >,
  document: LibraryDocumentSummary,
) {
  if (
    document.latestJobStatus === 'failed' ||
    document.ingestStatus === 'failed'
  ) {
    return labels.libraryStatusFailed;
  }

  if (
    document.latestJobStatus === 'running' ||
    document.ingestStatus === 'indexing'
  ) {
    return labels.libraryStatusRunning;
  }

  if (
    document.latestJobStatus === 'queued' ||
    document.ingestStatus === 'queued'
  ) {
    return labels.libraryStatusQueued;
  }

  return labels.libraryStatusRegistered;
}

function normalizePathSegment(value: string) {
  return value.trim().replace(/[\\/]+/g, '/');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDocumentPathSegments(
  document: LibraryDocumentSummary,
  librarySnapshot: LibraryDocumentsResult,
) {
  const filePath = normalizePathSegment(document.latestFilePath ?? '');
  const managedDirectory = normalizePathSegment(
    librarySnapshot.defaultManagedDirectory,
  );

  if (!filePath) {
    return [];
  }

  if (managedDirectory) {
    const managedDirectoryPattern = new RegExp(
      `^${escapeRegExp(managedDirectory)}/?`,
      'i',
    );
    const relativePath = filePath.replace(managedDirectoryPattern, '');
    if (relativePath && relativePath !== filePath) {
      return relativePath
        .split('/')
        .slice(0, -1)
        .filter(Boolean);
    }
  }

  const parts = filePath.split('/').filter(Boolean);
  return parts.slice(Math.max(parts.length - 3, 0), -1);
}

function buildLibraryTree(
  librarySnapshot: LibraryDocumentsResult,
  labels: SidebarLabels,
) {
  const root: LibraryTreeFolderNode = {
    kind: 'folder',
    id: 'root',
    name: labels.libraryTitle,
    folders: [],
    documents: [],
  };
  const folderIndex = new Map<string, LibraryTreeFolderNode>([['root', root]]);

  for (const document of librarySnapshot.items) {
    const pathSegments = getDocumentPathSegments(document, librarySnapshot);
    let currentFolder = root;
    let currentPath = 'root';

    for (const segment of pathSegments) {
      currentPath = `${currentPath}/${segment}`;
      let nextFolder = folderIndex.get(currentPath);
      if (!nextFolder) {
        nextFolder = {
          kind: 'folder',
          id: currentPath,
          name: segment,
          folders: [],
          documents: [],
        };
        currentFolder.folders.push(nextFolder);
        folderIndex.set(currentPath, nextFolder);
      }
      currentFolder = nextFolder;
    }

    currentFolder.documents.push(document);
  }

  const sortFolder = (folder: LibraryTreeFolderNode) => {
    folder.folders.sort((left, right) => left.name.localeCompare(right.name));
    folder.documents.sort((left, right) =>
      (left.title?.trim() || labels.untitled).localeCompare(
        right.title?.trim() || labels.untitled,
      ),
    );
    for (const childFolder of folder.folders) {
      sortFolder(childFolder);
    }
  };

  sortFolder(root);
  return root;
}

function librarySnapshotCount(node: LibraryTreeFolderNode): number {
  let count = node.documents.length;
  for (const folder of node.folders) {
    count += librarySnapshotCount(folder);
  }
  return count;
}

export class PrimarySidebar {
  private props: PrimarySidebarProps;
  private readonly element = createElement(
    'section',
    'panel sidebar-panel sidebar-panel-primary',
  );
  private readonly contentElement = createElement(
    'div',
    'sidebar-primary-content',
  );
  private readonly headerElement = createElement(
    'div',
    'sidebar-workbench-header',
  );
  private readonly actionsElement = createElement(
    'div',
    'sidebar-chat-action-bar',
  );
  private readonly treeElement = createElement('div', 'library-tree');
  private expandedFolders = new Set<string>(['root']);

  constructor(props: PrimarySidebarProps) {
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

  setProps(props: PrimarySidebarProps) {
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
        'Lib',
        this.props.onRefreshLibrary,
        isLibraryLoading || !this.props.onRefreshLibrary,
        true,
      ),
      this.createActionButton(
        labels.pdfDownloadAction,
        'PDF',
        this.props.onDownloadPdf,
        !this.props.onDownloadPdf,
      ),
      this.createActionButton(
        labels.writingAction,
        'New',
        this.props.onCreateDraftTab,
        !this.props.onCreateDraftTab,
      ),
    );

    this.treeElement.setAttribute('aria-label', labels.libraryTitle);
    const list = createElement('ul', 'library-tree-list');
    list.append(this.renderLibraryTreeNode(buildLibraryTree(librarySnapshot, labels), 0));
    this.treeElement.replaceChildren(list);
  }

  private createActionButton(
    label: string,
    text: string,
    onClick: (() => void) | undefined,
    disabled: boolean,
    isActive: boolean = false,
  ) {
    const button = createElement(
      'button',
      ['sidebar-chat-topbar-action-btn', isActive ? 'is-active' : '']
        .filter(Boolean)
        .join(' '),
    );
    button.type = 'button';
    button.textContent = text;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    if (onClick) {
      button.addEventListener('click', onClick);
    }
    return button;
  }

  private renderLibraryTreeNode(node: LibraryTreeNode, depth: number): HTMLLIElement {
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
    const button = createElement('button', 'library-tree-row library-tree-row-folder');
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
    button.textContent = isExpanded ? 'v ' : '> ';
    button.append(label);
    if (node.id === 'root') {
      const count = createElement('span', 'library-tree-folder-count');
      count.textContent = String(librarySnapshotCount(node));
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

export function createPrimarySidebar(props: PrimarySidebarProps) {
  return new PrimarySidebar(props);
}

export default PrimarySidebar;
