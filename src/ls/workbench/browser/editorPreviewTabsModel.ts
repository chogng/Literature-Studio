import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EditorPartProps } from './parts/editor/editorPartView';
import type { PreviewNavigationModel } from './previewNavigationModel';
import {
  type PreviewSurfaceSnapshot,
  shouldSyncActivePreviewTabFromBrowserUrl,
} from './previewSurfaceState';
import type { WritingWorkspaceTab } from './writingEditorModel';

type StringSetter = (value: string) => void;
type StringStateSetter = (value: string | ((current: string) => string)) => void;

type UseEditorPreviewTabsModelParams = {
  browserUrl: string;
  tabs: WritingWorkspaceTab[];
  activateTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  editorPartProps: EditorPartProps;
  previewNavigationModel: PreviewNavigationModel;
  previewSurfaceSnapshot: PreviewSurfaceSnapshot;
  navigateToAddressBarUrl: (nextUrl: string, showToast?: boolean) => boolean;
  setWebUrl: StringSetter;
  setFetchSeedUrl: StringStateSetter;
  updateActivePreviewTabUrl: (url: string) => void;
};

function isPreviewTab(tab: WritingWorkspaceTab) {
  return tab.kind !== 'draft';
}

function toPreviewTabIdSet(tabs: ReadonlyArray<WritingWorkspaceTab>) {
  return new Set(tabs.filter(isPreviewTab).map((tab) => tab.id));
}

export function useEditorPreviewTabsModel({
  browserUrl,
  tabs,
  activateTab,
  closeTab,
  editorPartProps,
  previewNavigationModel,
  previewSurfaceSnapshot,
  navigateToAddressBarUrl,
  setWebUrl,
  setFetchSeedUrl,
  updateActivePreviewTabUrl,
}: UseEditorPreviewTabsModelParams) {
  const previousBrowserUrlRef = useRef(browserUrl);
  const previousActivePreviewTabIdRef = useRef<string | null>(
    previewSurfaceSnapshot.activePreviewTabId,
  );
  const previousPreviewTabIdsRef = useRef<Set<string>>(toPreviewTabIdSet(tabs));

  const syncPreviewTarget = useCallback(
    (targetId: string | null, targetUrl: string) => {
      void previewNavigationModel
        .activateTarget(targetId, {
          setWebUrl,
          setFetchSeedUrl,
        })
        .then((state) => {
          // Existing web preview targets should resume their own live page state.
          // Only seed a target with the tab URL the first time it is activated.
          if (!targetId || state?.url || !targetUrl) {
            return;
          }

          navigateToAddressBarUrl(targetUrl, false);
        });
    },
    [
      navigateToAddressBarUrl,
      previewNavigationModel,
      setFetchSeedUrl,
      setWebUrl,
    ],
  );

  const activatePreviewTarget = useCallback(
    (targetId: string | null) => {
      void previewNavigationModel.activateTarget(targetId);
    },
    [previewNavigationModel],
  );

  const syncActivePreviewTarget = useCallback(
    () => {
      syncPreviewTarget(
        previewSurfaceSnapshot.activePreviewTabId,
        previewSurfaceSnapshot.activePreviewTabUrl,
      );
    },
    [
      previewSurfaceSnapshot.activePreviewTabId,
      previewSurfaceSnapshot.activePreviewTabUrl,
      syncPreviewTarget,
    ],
  );

  const handleActivateEditorTab = useCallback(
    (tabId: string) => {
      const targetTab = tabs.find((tab) => tab.id === tabId) ?? null;

      activateTab(tabId);
      activatePreviewTarget(
        targetTab && isPreviewTab(targetTab) ? targetTab.id : null,
      );
    },
    [activatePreviewTarget, activateTab, tabs],
  );

  const handleCloseEditorTab = useCallback(
    (tabId: string) => {
      closeTab(tabId);
    },
    [closeTab],
  );

  useEffect(() => {
    syncActivePreviewTarget();
  }, [syncActivePreviewTarget]);

  useEffect(() => {
    const nextPreviewTabIds = toPreviewTabIdSet(tabs);
    for (const previousTabId of previousPreviewTabIdsRef.current) {
      if (!nextPreviewTabIds.has(previousTabId)) {
        previewNavigationModel.releaseTarget(previousTabId);
      }
    }

    previousPreviewTabIdsRef.current = nextPreviewTabIds;
  }, [previewNavigationModel, tabs]);

  useEffect(() => {
    if (
      !shouldSyncActivePreviewTabFromBrowserUrl(
        previewSurfaceSnapshot,
        browserUrl,
        previousBrowserUrlRef.current,
        previousActivePreviewTabIdRef.current,
      )
    ) {
      return;
    }

    updateActivePreviewTabUrl(browserUrl);
  }, [browserUrl, previewSurfaceSnapshot, updateActivePreviewTabUrl]);

  useEffect(() => {
    previousBrowserUrlRef.current = browserUrl;
    previousActivePreviewTabIdRef.current =
      previewSurfaceSnapshot.activePreviewTabId;
  }, [browserUrl, previewSurfaceSnapshot.activePreviewTabId]);

  const nextEditorPartProps = useMemo(
    () => ({
      ...editorPartProps,
      onActivateTab: handleActivateEditorTab,
      onCloseTab: handleCloseEditorTab,
    }),
    [editorPartProps, handleActivateEditorTab, handleCloseEditorTab],
  );

  return {
    editorPartProps: nextEditorPartProps,
  };
}
