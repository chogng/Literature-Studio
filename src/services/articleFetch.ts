import { isDateRangeValid } from '../utils/dateRange';
import { prepareBatchSourcesForFetch, type BatchSource } from './batchSettings';
import { parseDesktopInvokeError, type DesktopInvokeErrorData } from './desktopError';

export type Article = {
  title: string;
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

export type FetchLatestArticlesBatchResult =
  | { ok: true; articles: Article[] }
  | {
      ok: false;
      reason: 'desktop_unsupported' | 'empty_homepage_url' | 'invalid_date_range' | 'fetch_failed';
      error?: DesktopInvokeErrorData;
    };

type FetchLatestArticlesBatchParams = {
  desktopRuntime: boolean;
  batchSources: BatchSource[];
  limit: number;
  sameDomainOnly: boolean;
  startDate?: string | null;
  endDate?: string | null;
  invokeDesktop: InvokeDesktop;
};

export async function fetchLatestArticlesBatch({
  desktopRuntime,
  batchSources,
  limit,
  sameDomainOnly,
  startDate,
  endDate,
  invokeDesktop,
}: FetchLatestArticlesBatchParams): Promise<FetchLatestArticlesBatchResult> {
  if (!desktopRuntime) {
    return { ok: false, reason: 'desktop_unsupported' };
  }

  const { sources } = prepareBatchSourcesForFetch(batchSources);
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
      limit,
      sameDomainOnly,
      startDate: startDate || null,
      endDate: endDate || null,
    });
    return { ok: true, articles };
  } catch (error) {
    return { ok: false, reason: 'fetch_failed', error: parseDesktopInvokeError(error) };
  }
}
