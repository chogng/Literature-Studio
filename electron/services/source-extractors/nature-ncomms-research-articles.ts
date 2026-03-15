import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor } from './nature-research-articles.js';

const NATURE_NCOMMS_RESEARCH_ARTICLES_PATH = '/ncomms/research-articles';

export const natureNcommsResearchArticlesCandidateExtractor = createNatureResearchArticlesCandidateExtractor({
  id: 'nature-ncomms-research-articles',
  matches: isNatureNcommsResearchArticlesListingPage,
});

export function isNatureNcommsResearchArticlesListingPage(page: URL) {
  return isNatureListingPage(page, NATURE_NCOMMS_RESEARCH_ARTICLES_PATH);
}
