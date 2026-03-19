import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { toast } from '../../base/browser/ui/toast/toast';
import type { LocaleMessages } from '../../../language/locales';
import type { BatchSource } from '../services/config/configSchema';
import {
  fetchLatestArticlesBatch,
  type Article,
} from '../services/article/articleFetch';
import {
  INITIAL_BATCH_FETCH_MACHINE_STATE,
  reduceBatchFetchMachineState,
  resolveBatchFetchTitlebarStatus,
} from '../services/article/batchFetchState';
import {
  formatLocalized,
  localizeDesktopInvokeError,
} from '../services/desktop/desktopError';

type DesktopInvokeArgs = Record<string, unknown> | undefined;
type InvokeDesktop = <T,>(command: string, args?: DesktopInvokeArgs) => Promise<T>;

type UseBatchFetchModelParams = {
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

type UseBatchFetchModelControllerParams = {
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

function useBatchFetchModelController({
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
}: UseBatchFetchModelControllerParams) {
  const [machineState, dispatchBatchFetchMachineEvent] = useReducer(
    reduceBatchFetchMachineState,
    INITIAL_BATCH_FETCH_MACHINE_STATE,
  );
  const requestIdRef = useRef(0);
  const fetchStatus = machineState.fetchStatus;
  const isBatchLoading = machineState.phase === 'loading';

  useEffect(() => {
    if (!electronRuntime || !window.electronAPI?.fetch) {
      dispatchBatchFetchMachineEvent({ type: 'FETCH_STATUS_CLEARED' });
      return;
    }

    const unsubscribe = window.electronAPI.fetch.onFetchStatus((status) => {
      dispatchBatchFetchMachineEvent({ type: 'FETCH_STATUS_UPDATED', status });
    });

    return () => {
      unsubscribe();
    };
  }, [electronRuntime]);

  const titlebarFetchStatus = useMemo(
    () => resolveBatchFetchTitlebarStatus(fetchStatus),
    [fetchStatus],
  );

  const clearFetchStatus = useCallback(() => {
    dispatchBatchFetchMachineEvent({ type: 'FETCH_STATUS_CLEARED' });
  }, []);

  const handleFetchLatestBatch = useCallback(async () => {
    if (!invokeDesktop || !ui) {
      throw new Error('Batch fetch requires invokeDesktop and ui');
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    dispatchBatchFetchMachineEvent({ type: 'FETCH_STARTED', requestId });
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
          dispatchBatchFetchMachineEvent({
            type: 'FETCH_FAILED',
            requestId,
            errorMessage: 'desktop_unsupported',
          });
          return;
        }
        if (result.reason === 'empty_page_url') {
          toast.error(ui.toastEnterPageUrl);
          dispatchBatchFetchMachineEvent({
            type: 'FETCH_FAILED',
            requestId,
            errorMessage: 'empty_page_url',
          });
          return;
        }
        if (result.reason === 'invalid_date_range') {
          toast.error(ui.toastDateRangeInvalid);
          dispatchBatchFetchMachineEvent({
            type: 'FETCH_FAILED',
            requestId,
            errorMessage: 'invalid_date_range',
          });
          return;
        }
        const localizedError = result.error
          ? localizeDesktopInvokeError(ui, result.error)
          : ui.errorUnknown;
        toast.error(formatLocalized(ui.toastBatchFetchFailed, { error: localizedError }));
        dispatchBatchFetchMachineEvent({
          type: 'FETCH_FAILED',
          requestId,
          errorMessage: localizedError,
        });
        return;
      }

      onFetchSuccess?.(result.articles);
      toast.success(formatLocalized(ui.toastBatchFetchSucceeded, { count: result.articles.length }));
      dispatchBatchFetchMachineEvent({ type: 'FETCH_SUCCEEDED', requestId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(formatLocalized(ui.toastBatchFetchFailed, { error: errorMessage || ui.errorUnknown }));
      dispatchBatchFetchMachineEvent({
        type: 'FETCH_FAILED',
        requestId,
        errorMessage: errorMessage || ui.errorUnknown,
      });
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
  ]);

  return {
    isBatchLoading,
    handleFetchLatestBatch,
    fetchStatus,
    clearFetchStatus,
    ...titlebarFetchStatus,
  };
}

export function useBatchFetchModel(params: UseBatchFetchModelParams) {
  return useBatchFetchModelController({
    electronRuntime: params.desktopRuntime,
    ...params,
  });
}
