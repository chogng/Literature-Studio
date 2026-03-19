export type BatchFetchPhase = 'idle' | 'loading' | 'succeeded' | 'failed';

export type BatchFetchMachineState = {
  phase: BatchFetchPhase;
  activeRequestId: number | null;
  fetchStatus: DesktopFetchStatus | null;
  lastErrorMessage: string | null;
};

export type BatchFetchMachineEvent =
  | { type: 'FETCH_STARTED'; requestId: number }
  | { type: 'FETCH_STATUS_UPDATED'; status: DesktopFetchStatus }
  | { type: 'FETCH_STATUS_CLEARED' }
  | { type: 'FETCH_SUCCEEDED'; requestId: number }
  | { type: 'FETCH_FAILED'; requestId: number; errorMessage: string | null };

export type BatchFetchTitlebarStatus = {
  titlebarFetchSourceText: string;
  titlebarFetchSourceTitle: string;
  titlebarFetchStopText: string;
  titlebarFetchStopTitle: string;
};

export const INITIAL_BATCH_FETCH_MACHINE_STATE: BatchFetchMachineState = {
  phase: 'idle',
  activeRequestId: null,
  fetchStatus: null,
  lastErrorMessage: null,
};

const EMPTY_BATCH_FETCH_TITLEBAR_STATUS: BatchFetchTitlebarStatus = {
  titlebarFetchSourceText: '',
  titlebarFetchSourceTitle: '',
  titlebarFetchStopText: '',
  titlebarFetchStopTitle: '',
};

export function reduceBatchFetchMachineState(
  state: BatchFetchMachineState,
  event: BatchFetchMachineEvent,
): BatchFetchMachineState {
  switch (event.type) {
    case 'FETCH_STARTED':
      return {
        phase: 'loading',
        activeRequestId: event.requestId,
        fetchStatus: null,
        lastErrorMessage: null,
      };
    case 'FETCH_STATUS_UPDATED':
      return {
        ...state,
        fetchStatus: event.status,
      };
    case 'FETCH_STATUS_CLEARED':
      return {
        ...state,
        fetchStatus: null,
      };
    case 'FETCH_SUCCEEDED':
      if (state.activeRequestId !== event.requestId) {
        return state;
      }

      return {
        ...state,
        phase: 'succeeded',
        activeRequestId: null,
        lastErrorMessage: null,
      };
    case 'FETCH_FAILED':
      if (state.activeRequestId !== event.requestId) {
        return state;
      }

      return {
        ...state,
        phase: 'failed',
        activeRequestId: null,
        lastErrorMessage: event.errorMessage,
      };
    default:
      return state;
  }
}

function resolveFetchSourceText(fetchStatus: DesktopFetchStatus) {
  if (fetchStatus.fetchChannel === 'preview' && fetchStatus.previewReuseMode === 'live-extract') {
    return 'Source: live preview DOM';
  }

  if (fetchStatus.fetchChannel === 'preview') {
    return 'Source: preview DOM';
  }

  return 'Source: network';
}

function resolveFetchSourceTitle(fetchStatus: DesktopFetchStatus) {
  const sourceDetail = fetchStatus.fetchDetail ? ` | ${fetchStatus.fetchDetail}` : '';
  return `${fetchStatus.sourceId || 'source'} | page ${fetchStatus.pageNumber}${sourceDetail}`;
}

function resolveFetchStopText(fetchStatus: DesktopFetchStatus) {
  if (!fetchStatus.paginationStopped) {
    return '';
  }

  if (fetchStatus.paginationStopReason === 'tail_dates_before_start_date') {
    return 'Stop: tail-date policy';
  }

  return 'Stop: extractor policy';
}

function resolveFetchStopTitle(fetchStatus: DesktopFetchStatus) {
  if (!fetchStatus.paginationStopped) {
    return '';
  }

  const sourceLabel = fetchStatus.sourceId || 'source';
  const reasonLabel = fetchStatus.paginationStopReason || 'extractor_policy';
  return `${sourceLabel} | page ${fetchStatus.pageNumber} | ${reasonLabel}`;
}

export function resolveBatchFetchTitlebarStatus(
  fetchStatus: DesktopFetchStatus | null,
): BatchFetchTitlebarStatus {
  if (!fetchStatus) {
    return EMPTY_BATCH_FETCH_TITLEBAR_STATUS;
  }

  return {
    titlebarFetchSourceText: resolveFetchSourceText(fetchStatus),
    titlebarFetchSourceTitle: resolveFetchSourceTitle(fetchStatus),
    titlebarFetchStopText: resolveFetchStopText(fetchStatus),
    titlebarFetchStopTitle: resolveFetchStopTitle(fetchStatus),
  };
}
