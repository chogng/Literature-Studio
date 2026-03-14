import { load } from 'cheerio';

import type { DateRange } from '../../types.js';

export type HomepageDom = ReturnType<typeof load>;

export type HomepageCandidateSeed = {
  href: string;
  order: number;
  dateHint?: string | null;
  scoreBoost?: number;
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

export interface HomepageCandidateExtractor {
  id: string;
  matches(homepage: URL): boolean;
  extract(context: HomepageCandidateExtractorContext): HomepageCandidateExtraction | null;
  findNextPageUrl?(context: HomepagePaginationContext): string | null;
  refineExtraction?(
    context: HomepageCandidateRefinementContext,
  ): Promise<HomepageCandidateExtraction | null> | HomepageCandidateExtraction | null;
}
