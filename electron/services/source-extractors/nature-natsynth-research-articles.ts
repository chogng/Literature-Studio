import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATSYNTH_RESEARCH_ARTICLES_PATH = '/natsynth/research-articles';

export const natureNatsynthResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-natsynth-research-articles',
  matches: isNatureNatsynthResearchArticlesHomepage,
});

export function isNatureNatsynthResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NATSYNTH_RESEARCH_ARTICLES_PATH);
}
