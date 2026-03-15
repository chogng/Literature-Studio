import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NPJ2DMATERIALS_RESEARCH_ARTICLES_PATH = '/npj2dmaterials/research-articles';

export const natureNpj2dmaterialsResearchArticlesCandidateExtractor =
  createNatureResearchArticlesCandidateExtractor({
    id: 'nature-npj2dmaterials-research-articles',
    matches: isNatureNpj2dmaterialsResearchArticlesHomepage,
  });

export function isNatureNpj2dmaterialsResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NPJ2DMATERIALS_RESEARCH_ARTICLES_PATH);
}
