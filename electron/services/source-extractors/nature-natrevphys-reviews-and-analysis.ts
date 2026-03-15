import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATREVPHYS_REVIEWS_AND_ANALYSIS_PATH = '/natrevphys/reviews-and-analysis';

export const natureNatrevphysReviewsAndAnalysisCandidateExtractor =
  createNatureResearchArticlesCandidateExtractor({
    id: 'nature-natrevphys-reviews-and-analysis',
    matches: isNatureNatrevphysReviewsAndAnalysisListingPage,
  });

export function isNatureNatrevphysReviewsAndAnalysisListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NATREVPHYS_REVIEWS_AND_ANALYSIS_PATH);
}
