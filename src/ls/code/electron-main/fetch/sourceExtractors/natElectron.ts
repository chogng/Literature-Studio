import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor as createResearchExtractor } from './nature-research-articles.js';

const NAT_ELECTRON_PATH = '/natelectron/research-articles';

export const natureNatElectronResearchArticlesCandidateExtractor = createResearchExtractor({
  id: 'nature-natelectron-research-articles',
  matches: isNatElectronListingPage,
});

export function isNatElectronListingPage(page: URL) {
  return isNatureListingPage(page, NAT_ELECTRON_PATH);
}
