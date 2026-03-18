import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from '../components/Toast';
import type { LocaleMessages } from '../language/locales';
import { formatLocalized } from '../services/desktopError';
import { normalizeUrl, sanitizeUrlInput } from '../utils/url';
import { type BatchSource, resolveSourceTableMetadata } from '../services/config-schema';

type UsePreviewNavigationParams = {
  electronRuntime: boolean;
  previewRuntime: boolean;
  ui: LocaleMessages;
  webUrl: string;
  fetchSeedUrl: string;
  batchSources: BatchSource[];
  setWebUrl: Dispatch<SetStateAction<string>>;
  setFetchSeedUrl: Dispatch<SetStateAction<string>>;
};

const emptyPreviewState: DesktopPreviewState = {
  url: '',
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  visible: false,
};

export function usePreviewNavigation({
  electronRuntime,
  previewRuntime,
  ui,
  webUrl,
  fetchSeedUrl,
  batchSources,
  setWebUrl,
  setFetchSeedUrl,
}: UsePreviewNavigationParams) {
  const [browserUrl, setBrowserUrl] = useState('');
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [previewState, setPreviewState] = useState<DesktopPreviewState>(emptyPreviewState);

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) {
      setPreviewState(emptyPreviewState);
      return;
    }

    let mounted = true;
    const preview = window.electronAPI.preview;

    void preview
      .getState()
      .then((state) => {
        if (!mounted) return;
        setPreviewState(state);
        if (state.url) {
          setBrowserUrl(state.url);
          setWebUrl(state.url);
          setFetchSeedUrl((current) => current || state.url);
        }
      })
      .catch(() => {});

    const unsubscribe = preview.onStateChange((state) => {
      setPreviewState(state);
      if (state.url) {
        setBrowserUrl(state.url);
        setWebUrl(state.url);
        setFetchSeedUrl((current) => current || state.url);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [previewRuntime, setFetchSeedUrl, setWebUrl]);

  const navigateToAddressBarUrl = useCallback(
    (nextUrl: string, showToast: boolean = true) => {
      const normalized = normalizeUrl(nextUrl);
      if (!normalized) {
        toast.error(ui.toastEnterArticleUrl);
        return false;
      }

      setWebUrl(normalized);
      setBrowserUrl(normalized);
      setFetchSeedUrl(normalized);
      if (electronRuntime && !previewRuntime) {
        toast.error(ui.toastPreviewRuntimeUnavailable);
        return false;
      }

      if (previewRuntime && window.electronAPI?.preview) {
        void window.electronAPI.preview.navigate(normalized).catch(() => {
          window.electronAPI?.preview?.setVisible(false);
        });
      }

      if (showToast) {
        toast.success(formatLocalized(ui.toastNavigatingTo, { url: normalized }));
      }

      return true;
    },
    [electronRuntime, previewRuntime, setFetchSeedUrl, setWebUrl, ui],
  );

  const handleNavigateWeb = useCallback(() => {
    navigateToAddressBarUrl(webUrl, true);
  }, [navigateToAddressBarUrl, webUrl]);

  const handleBrowserRefresh = useCallback(() => {
    if (electronRuntime && !previewRuntime) {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
    }

    if (previewRuntime && window.electronAPI?.preview) {
      window.electronAPI.preview.reload();
      return;
    }

    setIframeReloadKey((prev) => prev + 1);
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

type AddressBarSourceOption = {
  id: string;
  label: string;
  url: string;
  journalTitle: string;
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
  const addressBarSourceOptions = useMemo<AddressBarSourceOption[]>(() => {
    const options: AddressBarSourceOption[] = [];
    const seenSourceIds = new Set<string>();

    for (const source of batchSources) {
      const sourceId = String(source.id ?? '').trim();
      const normalizedSourceUrl = normalizeUrl(source.url);
      if (!sourceId || !normalizedSourceUrl || seenSourceIds.has(sourceId)) {
        continue;
      }

      const journalTitle = source.journalTitle.trim();
      const labelPrimary = journalTitle || sourceId;

      options.push({
        id: sourceId,
        label: labelPrimary,
        url: normalizedSourceUrl,
        journalTitle,
      });
      seenSourceIds.add(sourceId);
    }

    return options;
  }, [batchSources]);

  const selectedAddressBarSourceId = useMemo(() => {
    const normalizedCurrentUrl = normalizeUrl(fetchSeedUrl || webUrl);
    if (!normalizedCurrentUrl) {
      return '';
    }

    return resolveSourceTableMetadata(normalizedCurrentUrl, batchSources).articleListId || '';
  }, [batchSources, fetchSeedUrl, webUrl]);

  const handleWebUrlChange = useCallback(
    (nextUrl: string) => {
      const sanitizedUrl = sanitizeUrlInput(nextUrl);
      setWebUrl(sanitizedUrl);
      setFetchSeedUrl(sanitizedUrl);
    },
    [setFetchSeedUrl, setWebUrl],
  );

  const handleSelectAddressBarSource = useCallback(
    (sourceId: string) => {
      const selectedSource = addressBarSourceOptions.find((option) => option.id === sourceId);
      if (!selectedSource) {
        return;
      }

      navigateToUrl(selectedSource.url, false);
    },
    [addressBarSourceOptions, navigateToUrl],
  );

  const handleCycleAddressBarSource = useCallback(
    (direction: 'prev' | 'next') => {
      if (addressBarSourceOptions.length === 0) {
        return;
      }

      const currentIndex = addressBarSourceOptions.findIndex(
        (option) => option.id === selectedAddressBarSourceId,
      );
      const step = direction === 'next' ? 1 : -1;
      const nextIndex =
        currentIndex < 0
          ? direction === 'next'
            ? 0
            : addressBarSourceOptions.length - 1
          : (currentIndex + step + addressBarSourceOptions.length) % addressBarSourceOptions.length;
      const nextSource = addressBarSourceOptions[nextIndex];
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
