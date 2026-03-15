import { load } from 'cheerio';

import type { DateRange } from '../../types.js';

export type ListingDom = ReturnType<typeof load>;

export type ListingCandidatePrefetchedArticle = {
  title: string;
  doi?: string | null;
  authors?: string[];
  abstractText?: string | null;
  publishedAt?: string | null;
};

export type ListingCandidateSeed = {
  href: string;
  order: number;
  dateHint?: string | null;
  articleType?: string | null;
  scoreBoost?: number;
  prefetchedArticle?: ListingCandidatePrefetchedArticle | null;
};

export type ListingCandidateExtraction = {
  candidates: ListingCandidateSeed[];
  diagnostics?: Record<string, unknown>;
};

export type ListingCandidateExtractorContext = {
  page: URL;
  pageUrl: string;
  $: ListingDom;
};

export type ListingPaginationContext = ListingCandidateExtractorContext & {
  seenPageUrls?: ReadonlySet<string>;
};

export type ListingExtractorFetchHtmlOptions = {
  timeoutMs?: number;
  traceId?: string;
  stage?: string;
  signal?: AbortSignal;
};

export type ListingExtractorFetchHtml = (
  url: string,
  options?: ListingExtractorFetchHtmlOptions,
) => Promise<string>;

export type ListingCandidateRefinementContext = ListingCandidateExtractorContext & {
  pageNumber: number;
  traceId: string;
  dateRange: DateRange;
  extraction: ListingCandidateExtraction;
  fetchHtml: ListingExtractorFetchHtml;
};

export type ListingPaginationStopEvaluation = {
  shouldStop: boolean;
  reason?: string;
  diagnostics?: Record<string, unknown>;
};

export type ListingPaginationStopContext = {
  page: URL;
  pageUrl: string;
  pageNumber: number;
  dateRange: DateRange;
  extraction: ListingCandidateExtraction;
};

export interface ListingCandidateExtractor {
  id: string;
  matches(page: URL): boolean;
  extract(context: ListingCandidateExtractorContext): ListingCandidateExtraction | null;
  findNextPageUrl?(context: ListingPaginationContext): string | null;
  refineExtraction?(
    context: ListingCandidateRefinementContext,
  ): Promise<ListingCandidateExtraction | null> | ListingCandidateExtraction | null;
  evaluatePaginationStop?(
    context: ListingPaginationStopContext,
  ): ListingPaginationStopEvaluation | null;
}
