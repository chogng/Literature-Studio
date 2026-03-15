import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NPHOTON_RESEARCH_ARTICLES_PATH = '/nphoton/research-articles';

export const natureNphotonResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-nphoton-research-articles',
  matches: isNatureNphotonResearchArticlesHomepage,
});

export function isNatureNphotonResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NPHOTON_RESEARCH_ARTICLES_PATH);
}
