import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NNANO_RESEARCH_ARTICLES_PATH = '/nnano/research-articles';

export const natureNnanoResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-nnano-research-articles',
  matches: isNatureNnanoResearchArticlesHomepage,
});

export function isNatureNnanoResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NNANO_RESEARCH_ARTICLES_PATH);
}
