import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATREVMATS_REVIEWS_AND_ANALYSIS_PATH = '/natrevmats/reviews-and-analysis';

export const natureNatrevmatsReviewsAndAnalysisCandidateExtractor =
  createNatureResearchArticlesCandidateExtractor({
    id: 'nature-natrevmats-reviews-and-analysis',
    matches: isNatureNatrevmatsReviewsAndAnalysisHomepage,
  });

export function isNatureNatrevmatsReviewsAndAnalysisHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NATREVMATS_REVIEWS_AND_ANALYSIS_PATH);
}
