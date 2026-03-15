import { natureLatestNewsCandidateExtractor } from './nature-latest-news.js';
import { natureOpinionCandidateExtractor } from './nature-opinions.js';
import { natureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

import type { HomepageCandidateExtractor } from './types.js';

const homepageCandidateExtractors: HomepageCandidateExtractor[] = [
  natureResearchArticlesCandidateExtractor,
  natureLatestNewsCandidateExtractor,
  natureOpinionCandidateExtractor,
];

export function findHomepageCandidateExtractor(homepage: URL) {
  return homepageCandidateExtractors.find((extractor) => extractor.matches(homepage)) ?? null;
}

export type {
  HomepageCandidateExtraction,
  HomepageCandidateExtractor,
  HomepageCandidateExtractorContext,
  HomepageCandidateRefinementContext,
  HomepageExtractorFetchHtml,
  HomepageExtractorFetchHtmlOptions,
  HomepagePaginationContext,
  HomepagePaginationStopContext,
  HomepagePaginationStopEvaluation,
  HomepageCandidateSeed,
  HomepageDom,
} from './types.js';
