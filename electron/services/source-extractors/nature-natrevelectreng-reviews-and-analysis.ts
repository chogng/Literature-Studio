import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATREVELECTRENG_REVIEWS_AND_ANALYSIS_PATH = '/natrevelectreng/reviews-and-analysis';

export const natureNatrevelectrengReviewsAndAnalysisCandidateExtractor =
  createNatureResearchArticlesCandidateExtractor({
    id: 'nature-natrevelectreng-reviews-and-analysis',
    matches: isNatureNatrevelectrengReviewsAndAnalysisHomepage,
  });

export function isNatureNatrevelectrengReviewsAndAnalysisHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NATREVELECTRENG_REVIEWS_AND_ANALYSIS_PATH);
}
