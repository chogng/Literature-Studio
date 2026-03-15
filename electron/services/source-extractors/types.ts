import { load } from 'cheerio';

import type { DateRange } from '../../types.js';

export type HomepageDom = ReturnType<typeof load>;

export type HomepageCandidatePrefetchedArticle = {
  title: string;
  doi?: string | null;
  authors?: string[];
  abstractText?: string | null;
  publishedAt?: string | null;
};

export type HomepageCandidateSeed = {
  href: string;
  order: number;
  dateHint?: string | null;
  articleType?: string | null;
  scoreBoost?: number;
  prefetchedArticle?: HomepageCandidatePrefetchedArticle | null;
};

export type HomepageCandidateExtraction = {
  candidates: HomepageCandidateSeed[];
  diagnostics?: Record<string, unknown>;
};

export type HomepageCandidateExtractorContext = {
  homepage: URL;
  homepageUrl: string;
  $: HomepageDom;
};

export type HomepagePaginationContext = HomepageCandidateExtractorContext & {
  seenPageUrls?: ReadonlySet<string>;
};

export type HomepageExtractorFetchHtmlOptions = {
  timeoutMs?: number;
  traceId?: string;
  stage?: string;
  signal?: AbortSignal;
};

export type HomepageExtractorFetchHtml = (
  url: string,
  options?: HomepageExtractorFetchHtmlOptions,
) => Promise<string>;

export type HomepageCandidateRefinementContext = HomepageCandidateExtractorContext & {
  pageNumber: number;
  traceId: string;
  dateRange: DateRange;
  extraction: HomepageCandidateExtraction;
  fetchHtml: HomepageExtractorFetchHtml;
};

export type HomepagePaginationStopEvaluation = {
  shouldStop: boolean;
  reason?: string;
  diagnostics?: Record<string, unknown>;
};

export type HomepagePaginationStopContext = {
  homepage: URL;
  homepageUrl: string;
  pageNumber: number;
  dateRange: DateRange;
  extraction: HomepageCandidateExtraction;
};

export interface HomepageCandidateExtractor {
  id: string;
  matches(homepage: URL): boolean;
  extract(context: HomepageCandidateExtractorContext): HomepageCandidateExtraction | null;
  findNextPageUrl?(context: HomepagePaginationContext): string | null;
  refineExtraction?(
    context: HomepageCandidateRefinementContext,
  ): Promise<HomepageCandidateExtraction | null> | HomepageCandidateExtraction | null;
  evaluatePaginationStop?(
    context: HomepagePaginationStopContext,
  ): HomepagePaginationStopEvaluation | null;
}
