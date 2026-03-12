import { isDateRangeValid } from '../utils/dateRange';

export type Article = {
  title: string;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
};

type DesktopInvokeArgs = Record<string, unknown> | undefined;

type InvokeDesktop = <T,>(command: string, args?: DesktopInvokeArgs) => Promise<T>;

export type FetchLatestArticlesBatchResult =
  | { ok: true; articles: Article[] }
  | {
      ok: false;
      reason: 'desktop_unsupported' | 'empty_homepage_url' | 'invalid_date_range' | 'fetch_failed';
      error?: string;
    };

type FetchLatestArticlesBatchParams = {
  desktopRuntime: boolean;
  homepageUrl: string;
  limit: number;
  sameDomainOnly: boolean;
  startDate?: string | null;
  endDate?: string | null;
  normalizeUrl: (input: string) => string;
  invokeDesktop: InvokeDesktop;
};

export async function fetchLatestArticlesBatch({
  desktopRuntime,
  homepageUrl,
  limit,
  sameDomainOnly,
  startDate,
  endDate,
  normalizeUrl,
  invokeDesktop,
}: FetchLatestArticlesBatchParams): Promise<FetchLatestArticlesBatchResult> {
  if (!desktopRuntime) {
    return { ok: false, reason: 'desktop_unsupported' };
  }

  const normalized = normalizeUrl(homepageUrl);
  if (!normalized) {
    return { ok: false, reason: 'empty_homepage_url' };
  }

  const rangeStart = startDate ?? '';
  const rangeEnd = endDate ?? '';
  if (!isDateRangeValid(rangeStart, rangeEnd)) {
    return { ok: false, reason: 'invalid_date_range' };
  }

  try {
    const articles = await invokeDesktop<Article[]>('fetch_latest_articles', {
      homepageUrl: normalized,
      limit,
      sameDomainOnly,
      startDate: startDate || null,
      endDate: endDate || null,
    });
    return { ok: true, articles };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: 'fetch_failed', error: message };
  }
}
