import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NPHOTON_RESEARCH_ARTICLES_PATH = '/nphoton/research-articles';

export const natureNphotonResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-nphoton-research-articles',
  matches: isNatureNphotonResearchArticlesListingPage,
});

export function isNatureNphotonResearchArticlesListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NPHOTON_RESEARCH_ARTICLES_PATH);
}
