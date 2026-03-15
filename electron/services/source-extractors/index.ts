import { natureLatestNewsCandidateExtractor } from './nature-latest-news.js';
import { natureNatelectronResearchArticlesCandidateExtractor } from './nature-natelectron-research-articles.js';
import { natureNcommsResearchArticlesCandidateExtractor } from './nature-ncomms-research-articles.js';
import { natureNatmachintellResearchArticlesCandidateExtractor } from './nature-natmachintell-research-articles.js';
import { natureNatrevelectrengReviewsAndAnalysisCandidateExtractor } from './nature-natrevelectreng-reviews-and-analysis.js';
import { natureNatrevmatsReviewsAndAnalysisCandidateExtractor } from './nature-natrevmats-reviews-and-analysis.js';
import { natureNatrevphysReviewsAndAnalysisCandidateExtractor } from './nature-natrevphys-reviews-and-analysis.js';
import { natureNmatResearchArticlesCandidateExtractor } from './nature-nmat-research-articles.js';
import { natureNnanoResearchArticlesCandidateExtractor } from './nature-nnano-research-articles.js';
import { natureNpj2dmaterialsResearchArticlesCandidateExtractor } from './nature-npj2dmaterials-research-articles.js';
import { natureNphotonResearchArticlesCandidateExtractor } from './nature-nphoton-research-articles.js';
import { natureNphysResearchArticlesCandidateExtractor } from './nature-nphys-research-articles.js';
import { natureNatsynthResearchArticlesCandidateExtractor } from './nature-natsynth-research-articles.js';
import { natureOpinionCandidateExtractor } from './nature-opinions.js';
import { natureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

import type { HomepageCandidateExtractor } from './types.js';

const homepageCandidateExtractors: HomepageCandidateExtractor[] = [
  natureNatelectronResearchArticlesCandidateExtractor,
  natureNcommsResearchArticlesCandidateExtractor,
  natureNatmachintellResearchArticlesCandidateExtractor,
  natureNatrevelectrengReviewsAndAnalysisCandidateExtractor,
  natureNatrevmatsReviewsAndAnalysisCandidateExtractor,
  natureNatrevphysReviewsAndAnalysisCandidateExtractor,
  natureNmatResearchArticlesCandidateExtractor,
  natureNnanoResearchArticlesCandidateExtractor,
  natureNpj2dmaterialsResearchArticlesCandidateExtractor,
  natureNphotonResearchArticlesCandidateExtractor,
  natureNphysResearchArticlesCandidateExtractor,
  natureNatsynthResearchArticlesCandidateExtractor,
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
