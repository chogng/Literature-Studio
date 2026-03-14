import { isNatureNewsHomepage, natureNewsCandidateExtractor } from './nature-news.js';
import { natureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

import type { HomepageCandidateExtractor } from './types.js';

const homepageCandidateExtractors: HomepageCandidateExtractor[] = [
  natureResearchArticlesCandidateExtractor,
  natureNewsCandidateExtractor,
];

export function findHomepageCandidateExtractor(homepage: URL) {
  return homepageCandidateExtractors.find((extractor) => extractor.matches(homepage)) ?? null;
}

export { isNatureNewsHomepage };

export type {
  HomepageCandidateExtraction,
  HomepageCandidateExtractor,
  HomepageCandidateExtractorContext,
  HomepageCandidateSeed,
  HomepageDom,
} from './types.js';
