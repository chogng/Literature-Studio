import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATSYNTH_RESEARCH_ARTICLES_PATH = '/natsynth/research-articles';

export const natureNatsynthResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-natsynth-research-articles',
  matches: isNatureNatsynthResearchArticlesListingPage,
});

export function isNatureNatsynthResearchArticlesListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NATSYNTH_RESEARCH_ARTICLES_PATH);
}
