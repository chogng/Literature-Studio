import type {
  WritingWorkspacePreviewTab,
  WritingWorkspaceTab,
} from './writingEditorModel';

export type PreviewSurfaceOwner = 'shared-preview' | 'editor-preview-tab';

export type PreviewSurfaceSnapshot = {
  activePreviewTab: WritingWorkspacePreviewTab | null;
  activePreviewTabId: string | null;
  activePreviewTabUrl: string;
  owner: PreviewSurfaceOwner;
};

export function resolveActivePreviewTab(
  activeTab: WritingWorkspaceTab | null,
): WritingWorkspacePreviewTab | null {
  return activeTab && activeTab.kind !== 'draft' ? activeTab : null;
}

// Mirror the upstream editor split: tabs select a target, while the active editor pane renders one shared preview surface.
export function createPreviewSurfaceSnapshot(
  activeTab: WritingWorkspaceTab | null,
): PreviewSurfaceSnapshot {
  const activePreviewTab = resolveActivePreviewTab(activeTab);

  return {
    activePreviewTab,
    activePreviewTabId: activePreviewTab?.id ?? null,
    activePreviewTabUrl: activePreviewTab?.url ?? '',
    owner: activePreviewTab ? 'editor-preview-tab' : 'shared-preview',
  };
}

export function shouldNavigateSharedPreviewFromTab(
  snapshot: PreviewSurfaceSnapshot,
  browserUrl: string,
) {
  return (
    snapshot.owner === 'editor-preview-tab' &&
    Boolean(snapshot.activePreviewTabUrl) &&
    snapshot.activePreviewTabUrl !== browserUrl
  );
}

export function shouldSyncPreviewTabFromSharedPreview(
  snapshot: PreviewSurfaceSnapshot,
  browserUrl: string,
) {
  return (
    snapshot.owner === 'editor-preview-tab' &&
    Boolean(browserUrl) &&
    snapshot.activePreviewTabUrl !== browserUrl
  );
}

export function resolvePreviewSourceUrl(
  snapshot: PreviewSurfaceSnapshot,
  browserUrl: string,
  webUrl: string,
) {
  return snapshot.activePreviewTabUrl || browserUrl || webUrl;
}
