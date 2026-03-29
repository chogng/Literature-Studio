import { jsx, jsxs } from "react/jsx-runtime";
import type { Ref } from "react";
import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from "../../../../base/parts/sandbox/common/desktopTypes.js";
import { Button } from "../../../../base/browser/ui/button/button";
import type { SidebarLabels } from "./secondarySidebarPart";
import "./media/primarySidebar.css";

function formatLibraryDate(value: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized;
}

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

function renderLibraryDocumentItem(
  document: LibraryDocumentSummary,
  index: number,
  labels: SidebarLabels
) {
  const title = document.title?.trim() || labels.untitled;
  const authors =
    document.authors.length > 0 ? document.authors.join(", ") : labels.unknown;
  const journal = document.journalTitle?.trim() || labels.unknown;
  const publishedAt = formatLibraryDate(document.publishedAt);
  const statusLabel = resolveLibraryDocumentStatusLabel(labels, document);

  return jsxs(
    "li",
    {
      className: "library-doc-card",
      children: [
        jsxs("div", {
          className: "library-doc-card-main",
          children: [
            jsx("h3", {
              className: "library-doc-card-title",
              title,
              children: title,
            }),
            jsx("p", { className: "library-doc-card-meta", children: authors }),
            jsx("p", {
              className: "library-doc-card-meta",
              children:
                [journal, publishedAt].filter(Boolean).join(" | ") ||
                labels.unknown,
            }),
          ],
        }),
        jsxs("div", {
          className: "library-doc-card-aside",
          children: [
            jsx("span", {
              className: `library-doc-status library-doc-status-${document.ingestStatus}`,
              children: statusLabel,
            }),
            jsx("span", {
              className: "library-doc-count",
              children: document.fileCount,
            }),
          ],
        }),
      ],
    },
    `${document.documentId}-${index}`
  );
}

type PrimarySidebarProps = {
  partRef?: Ref<HTMLElement>;
  labels: SidebarLabels;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
};

export default function PrimarySidebar({
  partRef,
  labels,
  librarySnapshot,
  isLibraryLoading,
  onRefreshLibrary,
}: PrimarySidebarProps) {
  return jsx("section", {
    ref: partRef,
    className: "panel sidebar-panel sidebar-panel-primary",
    children: jsxs("div", {
      className: "sidebar-primary-content",
      children: [
        jsxs("div", {
          className: "sidebar-workbench-header",
          children: [
            jsxs("div", {
              className: "sidebar-workbench-header-main",
              children: [
                jsx("h2", {
                  className: "sidebar-workbench-title",
                  children: labels.libraryTitle,
                }),
                jsx("p", {
                  className: "sidebar-workbench-description",
                  children: labels.libraryDescription,
                }),
              ],
            }),
            jsx(Button, {
              type: "button",
              className: "sidebar-refresh-btn",
              variant: "secondary",
              size: "sm",
              mode: "text",
              textMode: "with",
              iconMode: "without",
              onClick: onRefreshLibrary,
              disabled: isLibraryLoading || !onRefreshLibrary,
              children: isLibraryLoading ? labels.loading : labels.refresh,
            }),
          ],
        }),
        jsxs("div", {
          className: "sidebar-stats-grid",
          children: [
            jsxs("div", {
              className: "sidebar-stat-card",
              children: [
                jsx("span", { children: labels.libraryDocuments }),
                jsx("strong", { children: librarySnapshot.totalCount }),
              ],
            }),
            jsxs("div", {
              className: "sidebar-stat-card",
              children: [
                jsx("span", { children: labels.libraryFiles }),
                jsx("strong", { children: librarySnapshot.fileCount }),
              ],
            }),
            jsxs("div", {
              className: "sidebar-stat-card",
              children: [
                jsx("span", { children: labels.libraryQueuedJobs }),
                jsx("strong", { children: librarySnapshot.queuedJobCount }),
              ],
            }),
          ],
        }),
        jsxs("div", {
          className: "sidebar-path-stack",
          children: [
            jsxs("p", {
              children: [
                `${labels.libraryDbFile}: `,
                jsx("code", {
                  children: librarySnapshot.libraryDbFile || labels.unknown,
                }),
              ],
            }),
            jsxs("p", {
              children: [
                `${labels.libraryFilesDir}: `,
                jsx("code", {
                  children:
                    librarySnapshot.defaultManagedDirectory || labels.unknown,
                }),
              ],
            }),
            jsxs("p", {
              children: [
                `${labels.libraryCacheDir}: `,
                jsx("code", {
                  children: librarySnapshot.ragCacheDir || labels.unknown,
                }),
              ],
            }),
          ],
        }),
        librarySnapshot.items.length > 0
          ? jsx("ul", {
              className: "library-doc-list",
              children: librarySnapshot.items.map((document, index) =>
                renderLibraryDocumentItem(document, index, labels)
              ),
            })
          : jsx("div", {
              className: "sidebar-empty-state sidebar-empty-state-library",
              children: labels.libraryEmpty,
            }),
      ],
    }),
  });
}
