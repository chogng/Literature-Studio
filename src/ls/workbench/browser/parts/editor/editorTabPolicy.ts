import { writingEditorDocumentToPlainText } from 'ls/editor/common/writingEditorDocument';
import {
  isEmptyBrowserTabInput,
  isEditorDraftTabInput,
} from 'ls/workbench/browser/parts/editor/editorInput';
import type {
  EditorWorkspaceDraftTab,
  EditorWorkspaceTab,
} from 'ls/workbench/browser/parts/editor/editorModel';

export function createDirtyDraftTabIdSet(
  dirtyDraftTabIds: readonly string[],
): ReadonlySet<string> {
  // Shared immutable lookup used across policy checks in the same render cycle.
  return new Set(dirtyDraftTabIds);
}

export function isReusableEmptyBrowserTab(
  tab: EditorWorkspaceTab | null | undefined,
) {
  return Boolean(tab && isEmptyBrowserTabInput(tab));
}

export function isReusableEmptyDraftTab(
  tab: EditorWorkspaceTab | null | undefined,
  dirtyDraftTabIds: ReadonlySet<string>,
): tab is EditorWorkspaceDraftTab {
  if (!tab || !isEditorDraftTabInput(tab) || dirtyDraftTabIds.has(tab.id)) {
    return false;
  }

  // Reusable draft means "untitled + no textual edits".
  return (
    tab.title.trim().length === 0 &&
    writingEditorDocumentToPlainText(tab.document).length === 0
  );
}

export function isClosableEditorTab(
  tab: EditorWorkspaceTab,
  dirtyDraftTabIds: ReadonlySet<string>,
) {
  // Close affordance is hidden only for reusable empty placeholders.
  if (isEditorDraftTabInput(tab)) {
    return !isReusableEmptyDraftTab(tab, dirtyDraftTabIds);
  }

  return !isEmptyBrowserTabInput(tab);
}

export function getDraftTabDisplayLabel(params: {
  tab: EditorWorkspaceDraftTab;
  draftModeLabel: string;
  draftIndex: number;
  draftCount: number;
  isReusableEmpty: boolean;
  isDirty: boolean;
}) {
  const {
    tab,
    draftModeLabel,
    draftIndex,
    draftCount,
    isReusableEmpty,
    isDirty,
  } = params;
  const normalizedTitle = tab.title.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  // In single-draft mode, keep the fixed draft entry icon-only when it is
  // either a reusable placeholder or currently unsaved (dirty).
  if (draftCount <= 1 && (isReusableEmpty || isDirty)) {
    return '';
  }

  return `${draftModeLabel} ${draftIndex + 1}`;
}
