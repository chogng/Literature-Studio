import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NPHYS_RESEARCH_ARTICLES_PATH = '/nphys/research-articles';

export const natureNphysResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-nphys-research-articles',
  matches: isNatureNphysResearchArticlesHomepage,
});

export function isNatureNphysResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NPHYS_RESEARCH_ARTICLES_PATH);
}
