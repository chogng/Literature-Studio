import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '../components/Toast';
import type { LocaleMessages } from '../language/locales';
import { type BatchSource } from '../services/config-schema';
import {
  fetchLatestArticlesBatch,
  type Article,
} from '../services/article-fetch';
import {
  formatLocalized,
  localizeDesktopInvokeError,
} from '../services/desktopError';

type DesktopInvokeArgs = Record<string, unknown> | undefined;
type InvokeDesktop = <T,>(command: string, args?: DesktopInvokeArgs) => Promise<T>;

type UseBatchFetchParams = {
  desktopRuntime: boolean;
  addressBarUrl: string;
  batchSources: BatchSource[];
  sameDomainOnly: boolean;
  batchStartDate: string;
  batchEndDate: string;
  invokeDesktop: InvokeDesktop;
  ui: LocaleMessages;
  onBeforeFetch: () => void;
  onFetchSuccess: (articles: Article[]) => void;
};

type UseBatchFetchControllerParams = {
  electronRuntime: boolean;
  desktopRuntime?: boolean;
  addressBarUrl?: string;
  batchSources?: BatchSource[];
  sameDomainOnly?: boolean;
  batchStartDate?: string;
  batchEndDate?: string;
  invokeDesktop?: InvokeDesktop;
  ui?: LocaleMessages;
  onBeforeFetch?: () => void;
  onFetchSuccess?: (articles: Article[]) => void;
};

function useBatchFetchController({
  electronRuntime,
  desktopRuntime = false,
  addressBarUrl = '',
  batchSources = [],
  sameDomainOnly = false,
  batchStartDate = '',
  batchEndDate = '',
  invokeDesktop,
  ui,
  onBeforeFetch,
  onFetchSuccess,
}: UseBatchFetchControllerParams) {
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<DesktopFetchStatus | null>(null);

  useEffect(() => {
    if (!electronRuntime || !window.electronAPI?.fetch) {
      setFetchStatus(null);
      return;
    }

    const unsubscribe = window.electronAPI.fetch.onFetchStatus((status) => {
      setFetchStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, [electronRuntime]);

  const titlebarFetchSourceText = useMemo(() => {
    if (!fetchStatus) return '';
    if (fetchStatus.fetchChannel === 'preview' && fetchStatus.previewReuseMode === 'live-extract') {
      return 'Source: live preview DOM';
    }
    if (fetchStatus.fetchChannel === 'preview') return 'Source: preview DOM';
    return 'Source: network';
  }, [fetchStatus]);

  const titlebarFetchSourceTitle = useMemo(() => {
    if (!fetchStatus) return '';
    const sourceDetail = fetchStatus.fetchDetail ? ` | ${fetchStatus.fetchDetail}` : '';
    return `${fetchStatus.sourceId || 'source'} | page ${fetchStatus.pageNumber}${sourceDetail}`;
  }, [fetchStatus]);

  const titlebarFetchStopText = useMemo(() => {
    if (!fetchStatus?.paginationStopped) return '';
    if (fetchStatus.paginationStopReason === 'tail_dates_before_start_date') {
      return 'Stop: tail-date policy';
    }
    return 'Stop: extractor policy';
  }, [fetchStatus]);

  const titlebarFetchStopTitle = useMemo(() => {
    if (!fetchStatus?.paginationStopped) return '';
    const sourceLabel = fetchStatus.sourceId || 'source';
    const reasonLabel = fetchStatus.paginationStopReason || 'extractor_policy';
    return `${sourceLabel} | page ${fetchStatus.pageNumber} | ${reasonLabel}`;
  }, [fetchStatus]);

  const clearFetchStatus = useCallback(() => {
    setFetchStatus(null);
  }, []);

  const handleFetchLatestBatch = useCallback(async () => {
    if (!invokeDesktop || !ui) {
      throw new Error('Batch fetch requires invokeDesktop and ui');
    }

    setIsBatchLoading(true);
    clearFetchStatus();
    onBeforeFetch?.();

    try {
      const result = await fetchLatestArticlesBatch({
        desktopRuntime,
        addressBarUrl,
        batchSources,
        sameDomainOnly,
        startDate: batchStartDate || null,
        endDate: batchEndDate || null,
        invokeDesktop,
      });

      if (!result.ok) {
        if (result.reason === 'desktop_unsupported') {
          toast.info(ui.toastDesktopBatchFetchOnly);
          return;
        }
        if (result.reason === 'empty_page_url') {
          toast.error(ui.toastEnterPageUrl);
          return;
        }
        if (result.reason === 'invalid_date_range') {
          toast.error(ui.toastDateRangeInvalid);
          return;
        }
        const localizedError = result.error
          ? localizeDesktopInvokeError(ui, result.error)
          : ui.errorUnknown;
        toast.error(formatLocalized(ui.toastBatchFetchFailed, { error: localizedError }));
        return;
      }

      onFetchSuccess?.(result.articles);
      toast.success(formatLocalized(ui.toastBatchFetchSucceeded, { count: result.articles.length }));
    } finally {
      setIsBatchLoading(false);
    }
  }, [
    addressBarUrl,
    batchEndDate,
    batchSources,
    batchStartDate,
    desktopRuntime,
    invokeDesktop,
    onBeforeFetch,
    onFetchSuccess,
    sameDomainOnly,
    ui,
    clearFetchStatus,
  ]);

  return {
    isBatchLoading,
    handleFetchLatestBatch,
    fetchStatus,
    clearFetchStatus,
    titlebarFetchSourceText,
    titlebarFetchSourceTitle,
    titlebarFetchStopText,
    titlebarFetchStopTitle,
  };
}

export function useBatchFetch(params: UseBatchFetchParams) {
  return useBatchFetchController({
    electronRuntime: params.desktopRuntime,
    ...params,
  });
}
