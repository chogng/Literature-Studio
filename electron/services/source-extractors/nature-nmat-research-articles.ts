import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NMAT_RESEARCH_ARTICLES_PATH = '/nmat/research-articles';

export const natureNmatResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-nmat-research-articles',
  matches: isNatureNmatResearchArticlesHomepage,
});

export function isNatureNmatResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NMAT_RESEARCH_ARTICLES_PATH);
}
