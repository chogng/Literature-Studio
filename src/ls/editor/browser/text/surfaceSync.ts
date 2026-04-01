export type WritingEditorSurfaceSyncPlan =
  | {
      kind: 'defer-while-composing';
      shouldRefreshToolbarChrome: boolean;
      shouldClearPendingDocumentSync: boolean;
    }
  | {
      kind: 'preserve-local-state';
      shouldRefreshToolbarChrome: boolean;
      shouldClearPendingDocumentSync: boolean;
      shouldReplaceStateFromCurrent: boolean;
    }
  | {
      kind: 'replace-state';
      shouldRefreshToolbarChrome: boolean;
      shouldClearPendingDocumentSync: boolean;
      documentSource: 'current' | 'props';
    }
  | {
      kind: 'sync-current-state';
      shouldRefreshToolbarChrome: boolean;
      shouldClearPendingDocumentSync: boolean;
    };

export type ResolveWritingEditorSurfaceSyncPlanParams = {
  currentDocumentKey: string;
  nextDocumentKey: string;
  pendingDocumentSyncKey: string | null;
  isComposing: boolean;
  shouldRefreshPlaceholder: boolean;
  shouldRefreshToolbarChrome: boolean;
};

export function resolveWritingEditorSurfaceSyncPlan({
  currentDocumentKey,
  nextDocumentKey,
  pendingDocumentSyncKey,
  isComposing,
  shouldRefreshPlaceholder,
  shouldRefreshToolbarChrome,
}: ResolveWritingEditorSurfaceSyncPlanParams): WritingEditorSurfaceSyncPlan {
  if (isComposing) {
    return {
      kind: 'defer-while-composing',
      shouldRefreshToolbarChrome,
      shouldClearPendingDocumentSync: false,
    };
  }

  const shouldClearPendingDocumentSync = nextDocumentKey === pendingDocumentSyncKey;
  const hasPendingDocumentSync =
    pendingDocumentSyncKey !== null && !shouldClearPendingDocumentSync;

  if (currentDocumentKey !== nextDocumentKey && hasPendingDocumentSync) {
    return {
      kind: 'preserve-local-state',
      shouldRefreshToolbarChrome,
      shouldClearPendingDocumentSync,
      shouldReplaceStateFromCurrent: shouldRefreshPlaceholder,
    };
  }

  if (currentDocumentKey !== nextDocumentKey || shouldRefreshPlaceholder) {
    return {
      kind: 'replace-state',
      shouldRefreshToolbarChrome,
      shouldClearPendingDocumentSync,
      documentSource: currentDocumentKey === nextDocumentKey ? 'current' : 'props',
    };
  }

  return {
    kind: 'sync-current-state',
    shouldRefreshToolbarChrome,
    shouldClearPendingDocumentSync,
  };
}

export default resolveWritingEditorSurfaceSyncPlan;
