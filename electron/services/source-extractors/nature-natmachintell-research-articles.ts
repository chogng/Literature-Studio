import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NATMACHINTELL_RESEARCH_ARTICLES_PATH = '/natmachintell/research-articles';

export const natureNatmachintellResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-natmachintell-research-articles',
  matches: isNatureNatmachintellResearchArticlesHomepage,
});

export function isNatureNatmachintellResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NATMACHINTELL_RESEARCH_ARTICLES_PATH);
}
