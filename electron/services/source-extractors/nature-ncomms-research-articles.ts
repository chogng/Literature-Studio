import { isNatureListingHomepage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NCOMMS_RESEARCH_ARTICLES_PATH = '/ncomms/research-articles';

export const natureNcommsResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-ncomms-research-articles',
  matches: isNatureNcommsResearchArticlesHomepage,
});

export function isNatureNcommsResearchArticlesHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_NCOMMS_RESEARCH_ARTICLES_PATH);
}
