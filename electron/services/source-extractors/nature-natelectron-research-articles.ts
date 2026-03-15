import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATELECTRON_RESEARCH_ARTICLES_PATH = '/natelectron/research-articles';

export const natureNatelectronResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-natelectron-research-articles',
  matches: isNatureNatelectronResearchArticlesHomepage,
});

export function isNatureNatelectronResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NATELECTRON_RESEARCH_ARTICLES_PATH);
}
