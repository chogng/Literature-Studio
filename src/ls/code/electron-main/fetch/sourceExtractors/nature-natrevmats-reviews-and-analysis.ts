import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATREVMATS_REVIEWS_AND_ANALYSIS_PATH = '/natrevmats/reviews-and-analysis';

export const natureNatrevmatsReviewsAndAnalysisCandidateExtractor =
  createNatureResearchArticlesCandidateExtractor({
    id: 'nature-natrevmats-reviews-and-analysis',
    matches: isNatureNatrevmatsReviewsAndAnalysisListingPage,
  });

export function isNatureNatrevmatsReviewsAndAnalysisListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NATREVMATS_REVIEWS_AND_ANALYSIS_PATH);
}
