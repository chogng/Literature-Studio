import { isDateRangeValid } from '../utils/dateRange';
import { normalizeUrl } from '../utils/url';
import { prepareBatchSourcesForFetch, type BatchSource } from './batchSettings';
import { parseDesktopInvokeError, type DesktopInvokeErrorData } from './desktopError';

export type Article = {
  title: string;
  articleType: string | null;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
  sourceId?: string | null;
  journalTitle?: string | null;
};

type DesktopInvokeArgs = Record<string, unknown> | undefined;

type InvokeDesktop = <T,>(command: string, args?: DesktopInvokeArgs) => Promise<T>;

const manualAddressBarSourceId = 'source-manual-address-bar';

export type FetchLatestArticlesBatchResult =
  | { ok: true; articles: Article[] }
  | {
      ok: false;
      reason: 'desktop_unsupported' | 'empty_homepage_url' | 'invalid_date_range' | 'fetch_failed';
      error?: DesktopInvokeErrorData;
    };

type FetchLatestArticlesBatchParams = {
  desktopRuntime: boolean;
  addressBarUrl?: string | null;
  batchSources: BatchSource[];
  limit?: number;
  sameDomainOnly: boolean;
  startDate?: string | null;
  endDate?: string | null;
  invokeDesktop: InvokeDesktop;
};

function buildManualBatchSource(url: string): BatchSource {
  return {
    id: manualAddressBarSourceId,
    url,
    journalTitle: '',
  };
}

export function resolveBatchFetchSources(addressBarUrl: string | null | undefined, batchSources: BatchSource[]): BatchSource[] {
  const normalizedAddressBarUrl = normalizeUrl(addressBarUrl ?? '');
  return normalizedAddressBarUrl ? [buildManualBatchSource(normalizedAddressBarUrl)] : batchSources;
}

export async function fetchLatestArticlesBatch({
  desktopRuntime,
  addressBarUrl,
  batchSources,
  limit: _limit,
  sameDomainOnly,
  startDate,
  endDate,
  invokeDesktop,
}: FetchLatestArticlesBatchParams): Promise<FetchLatestArticlesBatchResult> {
  if (!desktopRuntime) {
    return { ok: false, reason: 'desktop_unsupported' };
  }

  const selectedSources = resolveBatchFetchSources(addressBarUrl, batchSources);
  const { sources } = prepareBatchSourcesForFetch(selectedSources);
  if (sources.length === 0) {
    return { ok: false, reason: 'empty_homepage_url' };
  }

  const rangeStart = startDate ?? '';
  const rangeEnd = endDate ?? '';
  if (!isDateRangeValid(rangeStart, rangeEnd)) {
    return { ok: false, reason: 'invalid_date_range' };
  }

  try {
    const articles = await invokeDesktop<Article[]>('fetch_latest_articles', {
      sources,
      sameDomainOnly,
      startDate: startDate || null,
      endDate: endDate || null,
    });
    return { ok: true, articles };
  } catch (error) {
    return { ok: false, reason: 'fetch_failed', error: parseDesktopInvokeError(error) };
  }
}
