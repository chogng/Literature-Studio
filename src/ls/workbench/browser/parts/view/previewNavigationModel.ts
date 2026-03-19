import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from '../../../../base/browser/ui/toast/toast';
import type { LocaleMessages } from '../../../../../language/locales';
import { formatLocalized } from '../../../services/desktop/desktopError';
import type { BatchSource } from '../../../services/config/configSchema';
import {
  EMPTY_PREVIEW_STATE,
  resolvePreviewNavigation,
  resolvePreviewRefreshMode,
  resolvePreviewStateUrlUpdate,
} from '../../../services/preview/previewNavigationService';
import {
  applyQuickAccessUrlInput,
  createQuickAccessSourceOptions,
  findQuickAccessSourceOption,
  resolveNextQuickAccessSourceOption,
  resolveQuickAccessSourceId,
  type QuickAccessCycleDirection,
} from '../../../services/quickAccess/quickAccessService';

type UsePreviewNavigationModelParams = {
  electronRuntime: boolean;
  previewRuntime: boolean;
  ui: LocaleMessages;
  webUrl: string;
  fetchSeedUrl: string;
  batchSources: BatchSource[];
  setWebUrl: Dispatch<SetStateAction<string>>;
  setFetchSeedUrl: Dispatch<SetStateAction<string>>;
};

type UseAddressBarSourceParams = {
  webUrl: string;
  fetchSeedUrl: string;
  batchSources: BatchSource[];
  setWebUrl: Dispatch<SetStateAction<string>>;
  setFetchSeedUrl: Dispatch<SetStateAction<string>>;
  navigateToUrl: (url: string, showToast: boolean) => unknown;
};

function useAddressBarSource({
  webUrl,
  fetchSeedUrl,
  batchSources,
  setWebUrl,
  setFetchSeedUrl,
  navigateToUrl,
}: UseAddressBarSourceParams) {
  const addressBarSourceOptions = useMemo(
    () => createQuickAccessSourceOptions(batchSources),
    [batchSources],
  );

  const selectedAddressBarSourceId = useMemo(() => {
    return resolveQuickAccessSourceId(fetchSeedUrl, webUrl, batchSources);
  }, [batchSources, fetchSeedUrl, webUrl]);

  const handleWebUrlChange = useCallback(
    (nextUrl: string) => {
      applyQuickAccessUrlInput(nextUrl, setWebUrl, setFetchSeedUrl);
    },
    [setFetchSeedUrl, setWebUrl],
  );

  const handleSelectAddressBarSource = useCallback(
    (sourceId: string) => {
      const selectedSource = findQuickAccessSourceOption(addressBarSourceOptions, sourceId);
      if (!selectedSource) {
        return;
      }

      navigateToUrl(selectedSource.url, false);
    },
    [addressBarSourceOptions, navigateToUrl],
  );

  const handleCycleAddressBarSource = useCallback(
    (direction: QuickAccessCycleDirection) => {
      const nextSource = resolveNextQuickAccessSourceOption(
        addressBarSourceOptions,
        selectedAddressBarSourceId,
        direction,
      );
      if (!nextSource) {
        return;
      }

      navigateToUrl(nextSource.url, false);
    },
    [addressBarSourceOptions, navigateToUrl, selectedAddressBarSourceId],
  );

  return {
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    handleWebUrlChange,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  };
}

export function usePreviewNavigationModel({
  electronRuntime,
  previewRuntime,
  ui,
  webUrl,
  fetchSeedUrl,
  batchSources,
  setWebUrl,
  setFetchSeedUrl,
}: UsePreviewNavigationModelParams) {
  const [browserUrl, setBrowserUrl] = useState('');
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [previewState, setPreviewState] = useState<DesktopPreviewState>(EMPTY_PREVIEW_STATE);

  const applyPreviewState = useCallback(
    (state: DesktopPreviewState) => {
      setPreviewState(state);

      const previewStateUrlUpdate = resolvePreviewStateUrlUpdate(state);
      if (!previewStateUrlUpdate) {
        return;
      }

      setBrowserUrl(previewStateUrlUpdate.browserUrl);
      setWebUrl(previewStateUrlUpdate.webUrl);
      setFetchSeedUrl((current) => current || previewStateUrlUpdate.fetchSeedUrl);
    },
    [setFetchSeedUrl, setWebUrl],
  );

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      setPreviewState(EMPTY_PREVIEW_STATE);
      return;
    }

    let mounted = true;
    const preview = window.electronAPI.preview;

    void preview
      .getState()
      .then((state) => {
        if (!mounted) {
          return;
        }

        applyPreviewState(state);
      })
      .catch(() => {});

    const unsubscribe = preview.onStateChange((state) => {
      applyPreviewState(state);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applyPreviewState, previewRuntime]);

  const navigateToAddressBarUrl = useCallback(
    (nextUrl: string, showToast: boolean = true) => {
      const previewNavigation = resolvePreviewNavigation(
        nextUrl,
        electronRuntime,
        previewRuntime,
      );

      if (previewNavigation.kind === 'invalid-url') {
        toast.error(ui.toastEnterArticleUrl);
        return false;
      }

      setWebUrl(previewNavigation.normalizedUrl);
      setBrowserUrl(previewNavigation.normalizedUrl);
      setFetchSeedUrl(previewNavigation.normalizedUrl);

      if (previewNavigation.kind === 'preview-runtime-unavailable') {
        toast.error(ui.toastPreviewRuntimeUnavailable);
        return false;
      }

      if (previewNavigation.kind === 'native-preview' && window.electronAPI?.preview) {
        void window.electronAPI.preview.navigate(previewNavigation.normalizedUrl).catch(() => {
          window.electronAPI?.preview?.setVisible(false);
        });
      }

      if (showToast) {
        toast.success(formatLocalized(ui.toastNavigatingTo, { url: previewNavigation.normalizedUrl }));
      }

      return true;
    },
    [electronRuntime, previewRuntime, setFetchSeedUrl, setWebUrl, ui],
  );

  const handleNavigateWeb = useCallback(() => {
    navigateToAddressBarUrl(webUrl, true);
  }, [navigateToAddressBarUrl, webUrl]);

  const handleBrowserRefresh = useCallback(() => {
    const previewRefreshMode = resolvePreviewRefreshMode(electronRuntime, previewRuntime);

    if (previewRefreshMode === 'preview-runtime-unavailable') {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
    }

    if (previewRefreshMode === 'native-preview' && window.electronAPI?.preview) {
      window.electronAPI.preview.reload();
      return;
    }

    setIframeReloadKey((current) => current + 1);
  }, [electronRuntime, previewRuntime, ui]);

  const handlePreviewBack = useCallback(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewBackUnsupported);
      return;
    }

    window.electronAPI.preview.goBack();
  }, [previewRuntime, ui]);

  const handlePreviewForward = useCallback(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewForwardUnsupported);
      return;
    }

    window.electronAPI.preview.goForward();
  }, [previewRuntime, ui]);

  const {
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    handleWebUrlChange,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  } = useAddressBarSource({
    webUrl,
    fetchSeedUrl,
    batchSources,
    setWebUrl,
    setFetchSeedUrl,
    navigateToUrl: navigateToAddressBarUrl,
  });

  return {
    browserUrl,
    iframeReloadKey,
    previewState,
    handleNavigateWeb,
    handleBrowserRefresh,
    handlePreviewBack,
    handlePreviewForward,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    handleWebUrlChange,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  };
}
