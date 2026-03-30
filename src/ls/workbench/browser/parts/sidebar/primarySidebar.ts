import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useSyncExternalStore, type Ref } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FilePenLine,
  FileText,
  FolderClosed,
  FolderOpen,
  Library,
} from "lucide-react";
import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from "../../../../base/parts/sandbox/common/desktopTypes.js";
import { Button } from "../../../../base/browser/ui/button/button";
import type { SidebarLabels } from "./secondarySidebarPart";
import "./media/primarySidebar.css";

function resolveLibraryDocumentStatusLabel(
  labels: Pick<
    SidebarLabels,
    | "libraryStatusRegistered"
    | "libraryStatusQueued"
    | "libraryStatusRunning"
    | "libraryStatusFailed"
  >,
  document: LibraryDocumentSummary
) {
  if (
    document.latestJobStatus === "failed" ||
    document.ingestStatus === "failed"
  ) {
    return labels.libraryStatusFailed;
  }

  if (
    document.latestJobStatus === "running" ||
    document.ingestStatus === "indexing"
  ) {
    return labels.libraryStatusRunning;
  }

  if (
    document.latestJobStatus === "queued" ||
    document.ingestStatus === "queued"
  ) {
    return labels.libraryStatusQueued;
  }

  return labels.libraryStatusRegistered;
}

type LibraryTreeFolderNode = {
  kind: "folder";
  id: string;
  name: string;
  folders: LibraryTreeFolderNode[];
  documents: LibraryDocumentSummary[];
};

type LibraryTreeDocumentNode = {
  kind: "document";
  id: string;
  document: LibraryDocumentSummary;
};

type LibraryTreeNode = LibraryTreeFolderNode | LibraryTreeDocumentNode;

function normalizePathSegment(value: string) {
  return value.trim().replace(/[\\/]+/g, "/");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getDocumentPathSegments(
  document: LibraryDocumentSummary,
  librarySnapshot: LibraryDocumentsResult
) {
  const filePath = normalizePathSegment(document.latestFilePath ?? "");
  const managedDirectory = normalizePathSegment(
    librarySnapshot.defaultManagedDirectory
  );

  if (!filePath) {
    return [];
  }

  if (managedDirectory) {
    const managedDirectoryPattern = new RegExp(
      `^${escapeRegExp(managedDirectory)}/?`,
      "i"
    );
    const relativePath = filePath.replace(managedDirectoryPattern, "");
    if (relativePath && relativePath !== filePath) {
      return relativePath
        .split("/")
        .slice(0, -1)
        .filter(Boolean);
    }
  }

  const parts = filePath.split("/").filter(Boolean);
  return parts.slice(Math.max(parts.length - 3, 0), -1);
}

function buildLibraryTree(
  librarySnapshot: LibraryDocumentsResult,
  labels: SidebarLabels
) {
  const root: LibraryTreeFolderNode = {
    kind: "folder",
    id: "root",
    name: labels.libraryTitle,
    folders: [],
    documents: [],
  };
  const folderIndex = new Map<string, LibraryTreeFolderNode>([["root", root]]);

  for (const document of librarySnapshot.items) {
    const pathSegments = getDocumentPathSegments(document, librarySnapshot);
    let currentFolder = root;
    let currentPath = "root";

    for (const segment of pathSegments) {
      currentPath = `${currentPath}/${segment}`;
      let nextFolder = folderIndex.get(currentPath);
      if (!nextFolder) {
        nextFolder = {
          kind: "folder",
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
        right.title?.trim() || labels.untitled
      )
    );
    for (const childFolder of folder.folders) {
      sortFolder(childFolder);
    }
  };

  sortFolder(root);
  return root;
}

function renderLibraryDocumentItem(document: LibraryDocumentSummary, labels: SidebarLabels) {
  const title = document.title?.trim() || labels.untitled;
  const authors =
    document.authors.length > 0 ? document.authors.join(", ") : labels.unknown;
  const statusLabel = resolveLibraryDocumentStatusLabel(labels, document);

  return jsxs(
    "div",
    {
      className: "library-tree-row library-tree-row-document",
      role: "treeitem",
      "aria-selected": false,
      children: [
        jsx("span", {
          className: "library-tree-indent",
          "aria-hidden": "true",
        }),
        jsx(FileText, {
          size: 14,
          strokeWidth: 1.8,
          className: "library-tree-icon library-tree-icon-document",
        }),
        jsxs("div", {
          className: "library-tree-document-main",
          children: [
            jsx("span", {
              className: "library-tree-document-title",
              title,
              children: title,
            }),
            jsx("span", {
              className: "library-tree-document-meta",
              title: authors,
              children: authors,
            }),
          ],
        }),
        jsxs("div", {
          className: "library-tree-document-aside",
          children: [
            jsx("span", {
              className: `library-doc-status library-doc-status-${document.ingestStatus}`,
              children: statusLabel,
            }),
          ],
        }),
      ],
    },
    document.documentId
  );
}

function renderLibraryTreeNode(
  node: LibraryTreeNode,
  depth: number,
  labels: SidebarLabels,
  expandedFolders: ReadonlySet<string>,
  onToggleFolder: (id: string) => void
): ReturnType<typeof jsx> {
  if (node.kind === "document") {
    return jsx(
      "li",
      {
        children: jsx("div", {
          style: { paddingLeft: `${depth * 16}px` },
          children: renderLibraryDocumentItem(node.document, labels),
        }),
      },
      node.id
    );
  }

  const isExpanded = expandedFolders.has(node.id);
  const childNodes: LibraryTreeNode[] = [
    ...node.folders,
    ...node.documents.map((document) => ({
      kind: "document" as const,
      id: document.documentId,
      document,
    })),
  ];

  return jsxs(
    "li",
    {
      children: [
        jsxs("button", {
          type: "button",
          className: "library-tree-row library-tree-row-folder",
          onClick: () => onToggleFolder(node.id),
          style: { paddingLeft: `${depth * 16}px` },
          role: "treeitem",
          "aria-expanded": isExpanded,
          children: [
            isExpanded
              ? jsx(ChevronDown, {
                  size: 14,
                  strokeWidth: 1.8,
                  className: "library-tree-chevron",
                })
              : jsx(ChevronRight, {
                  size: 14,
                  strokeWidth: 1.8,
                  className: "library-tree-chevron",
                }),
            isExpanded
              ? jsx(FolderOpen, {
                  size: 14,
                  strokeWidth: 1.8,
                  className: "library-tree-icon library-tree-icon-folder",
                })
              : jsx(FolderClosed, {
                  size: 14,
                  strokeWidth: 1.8,
                  className: "library-tree-icon library-tree-icon-folder",
                }),
            jsx("span", {
              className: "library-tree-folder-label",
              children: node.name,
            }),
            node.id === "root"
              ? jsx("span", {
                  className: "library-tree-folder-count",
                  children: librarySnapshotCount(node),
                })
              : null,
          ],
        }),
        isExpanded && childNodes.length > 0
          ? jsx("ul", {
              className: "library-tree-children",
              role: "group",
              children: childNodes.map((childNode) =>
                renderLibraryTreeNode(
                  childNode,
                  depth + 1,
                  labels,
                  expandedFolders,
                  onToggleFolder
                )
              ),
            })
          : null,
      ],
    },
    node.id
  );
}

function librarySnapshotCount(node: LibraryTreeFolderNode) {
  let count = node.documents.length;
  for (const folder of node.folders) {
    count += librarySnapshotCount(folder);
  }
  return count;
}

type PrimarySidebarProps = {
  partRef?: Ref<HTMLElement>;
  labels: SidebarLabels;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
  onDownloadPdf?: () => void;
  onCreateDraftTab?: () => void;
};

type PrimarySidebarSnapshot = {
  expandedFolders: ReadonlySet<string>;
};

class PrimarySidebarController {
  private snapshot: PrimarySidebarSnapshot = {
    expandedFolders: new Set(["root"]),
  };
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  toggleFolder(id: string) {
    const nextExpandedFolders = new Set(this.snapshot.expandedFolders);
    if (nextExpandedFolders.has(id) && id !== "root") {
      nextExpandedFolders.delete(id);
    } else {
      nextExpandedFolders.add(id);
    }

    this.snapshot = { expandedFolders: nextExpandedFolders };
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export default function PrimarySidebar({
  partRef,
  labels,
  librarySnapshot,
  isLibraryLoading,
  onRefreshLibrary,
  onDownloadPdf,
  onCreateDraftTab,
}: PrimarySidebarProps) {
  const [controller] = useState(
    () => new PrimarySidebarController()
  );
  const { expandedFolders } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const tree = buildLibraryTree(librarySnapshot, labels);

  const handleToggleFolder = (id: string) => controller.toggleFolder(id);

  return jsx("section", {
    ref: partRef,
    className: "panel sidebar-panel sidebar-panel-primary",
    children: jsxs("div", {
      className: "sidebar-primary-content",
      children: [
        jsx("div", {
          className: "sidebar-workbench-header",
          children: jsxs("div", {
            className: "sidebar-chat-action-bar",
            children: [
              jsx(Button, {
                type: "button",
                className: [
                  "sidebar-chat-topbar-action-btn",
                  "is-active",
                ].join(" "),
                variant: "ghost",
                size: "sm",
                mode: "icon",
                leftIcon: jsx(Library, { size: 16, strokeWidth: 2 }),
                title: labels.libraryAction,
                "aria-label": labels.libraryAction,
                onClick: onRefreshLibrary,
                disabled: isLibraryLoading || !onRefreshLibrary,
              }),
              jsx(Button, {
                type: "button",
                className: "sidebar-chat-topbar-action-btn",
                variant: "ghost",
                size: "sm",
                mode: "icon",
                leftIcon: jsx(Download, { size: 16, strokeWidth: 2 }),
                title: labels.pdfDownloadAction,
                "aria-label": labels.pdfDownloadAction,
                onClick: onDownloadPdf,
                disabled: !onDownloadPdf,
              }),
              jsx(Button, {
                type: "button",
                className: "sidebar-chat-topbar-action-btn",
                variant: "ghost",
                size: "sm",
                mode: "icon",
                leftIcon: jsx(FilePenLine, { size: 16, strokeWidth: 2 }),
                title: labels.writingAction,
                "aria-label": labels.writingAction,
                onClick: onCreateDraftTab,
                disabled: !onCreateDraftTab,
              }),
            ],
          }),
        }),
        jsx("div", {
          className: "library-tree",
          role: "tree",
          "aria-label": labels.libraryTitle,
          children: jsx("ul", {
            className: "library-tree-list",
            children: renderLibraryTreeNode(
              tree,
              0,
              labels,
              expandedFolders,
              handleToggleFolder
            ),
          }),
        }),
      ],
    }),
  });
}
