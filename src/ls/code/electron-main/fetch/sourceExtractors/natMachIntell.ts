import { isNatureListingPage } from './nature-listing-shared.js';
import { createNatureResearchArticlesCandidateExtractor as createResearchExtractor } from './nature-research-articles.js';

const NAT_MACH_INTELL_PATH = '/natmachintell/research-articles';

export const natMachIntellCandidateExtractor = createResearchExtractor({
  id: 'nature-natmachintell-research-articles',
  matches: isNatMachIntellListingPage,
});

export function isNatMachIntellListingPage(page: URL) {
  return isNatureListingPage(page, NAT_MACH_INTELL_PATH);
}
