import { isWritingContentEditorInput } from 'ls/workbench/browser/editorInput';
import type {
  WritingWorkspaceContentTab,
  WritingWorkspaceTab,
} from 'ls/workbench/browser/writingEditorModel';

export type WebContentSurfaceOwner = 'shared-content' | 'editor-content-tab';

export type WebContentSurfaceSnapshot = {
  activeContentTab: WritingWorkspaceContentTab | null;
  activeContentTabId: string | null;
  activeContentTabUrl: string;
  owner: WebContentSurfaceOwner;
};

export function resolveActiveContentTab(
  activeTab: WritingWorkspaceTab | null,
): WritingWorkspaceContentTab | null {
  return isWritingContentEditorInput(activeTab) ? activeTab : null;
}

// Mirror the upstream editor split: tabs select a target, while the active editor pane renders one shared web-content surface.
export function createWebContentSurfaceSnapshot(
  activeTab: WritingWorkspaceTab | null,
): WebContentSurfaceSnapshot {
  const activeContentTab = resolveActiveContentTab(activeTab);

  return {
    activeContentTab,
    activeContentTabId: activeContentTab?.id ?? null,
    activeContentTabUrl: activeContentTab?.url ?? '',
    owner: activeContentTab ? 'editor-content-tab' : 'shared-content',
  };
}

export function shouldNavigateSharedContentFromTab(
  snapshot: WebContentSurfaceSnapshot,
  browserUrl: string,
) {
  return (
    snapshot.owner === 'editor-content-tab' &&
    Boolean(snapshot.activeContentTabUrl) &&
    snapshot.activeContentTabUrl !== browserUrl
  );
}

export function shouldSyncContentTabFromSharedContent(
  snapshot: WebContentSurfaceSnapshot,
  browserUrl: string,
) {
  return (
    snapshot.owner === 'editor-content-tab' &&
    Boolean(browserUrl) &&
    snapshot.activeContentTabUrl !== browserUrl
  );
}

export function shouldSyncActiveContentTabFromBrowserUrl(
  snapshot: WebContentSurfaceSnapshot,
  browserUrl: string,
  previousBrowserUrl: string,
  previousActiveContentTabId: string | null,
) {
  const isSameActiveContentTab =
    previousActiveContentTabId === snapshot.activeContentTabId;

  return (
    isSameActiveContentTab &&
    Boolean(snapshot.activeContentTabId) &&
    snapshot.activeContentTabUrl === previousBrowserUrl &&
    shouldSyncContentTabFromSharedContent(snapshot, browserUrl)
  );
}

export function resolveContentSourceUrl(
  snapshot: WebContentSurfaceSnapshot,
  browserUrl: string,
  webUrl: string,
) {
  return snapshot.activeContentTabUrl || browserUrl || webUrl;
}
