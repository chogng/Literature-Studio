import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NPHYS_RESEARCH_ARTICLES_PATH = '/nphys/research-articles';

export const natureNphysResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-nphys-research-articles',
  matches: isNatureNphysResearchArticlesListingPage,
});

export function isNatureNphysResearchArticlesListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NPHYS_RESEARCH_ARTICLES_PATH);
}
