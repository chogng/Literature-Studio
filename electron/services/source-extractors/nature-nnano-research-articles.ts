import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NNANO_RESEARCH_ARTICLES_PATH = '/nnano/research-articles';

export const natureNnanoResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-nnano-research-articles',
  matches: isNatureNnanoResearchArticlesListingPage,
});

export function isNatureNnanoResearchArticlesListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NNANO_RESEARCH_ARTICLES_PATH);
}
