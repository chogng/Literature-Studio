import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATELECTRON_RESEARCH_ARTICLES_PATH = '/natelectron/research-articles';

export const natureNatelectronResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-natelectron-research-articles',
  matches: isNatureNatelectronResearchArticlesListingPage,
});

export function isNatureNatelectronResearchArticlesListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NATELECTRON_RESEARCH_ARTICLES_PATH);
}
