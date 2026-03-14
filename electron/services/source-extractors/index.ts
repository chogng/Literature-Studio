import { natureNewsCandidateExtractor } from './nature-news.js';

import type { HomepageCandidateExtractor } from './types.js';

const homepageCandidateExtractors: HomepageCandidateExtractor[] = [natureNewsCandidateExtractor];

export function findHomepageCandidateExtractor(homepage: URL) {
  return homepageCandidateExtractors.find((extractor) => extractor.matches(homepage)) ?? null;
}

export type {
  HomepageCandidateExtraction,
  HomepageCandidateExtractor,
  HomepageCandidateExtractorContext,
  HomepageCandidateSeed,
  HomepageDom,
} from './types.js';
