import {
  createNatureListingCandidateExtractor,
  findNatureListingNextPageUrl,
  isNatureListingHomepage,
} from './nature-listing-shared.js';

import type { HomepagePaginationContext } from './types.js';

const NATURE_OPINION_HOMEPAGE_PATH = '/opinion';

function findNatureOpinionNextPageUrl(context: HomepagePaginationContext) {
  if (!isNatureOpinionHomepage(context.homepage)) return null;
  return findNatureListingNextPageUrl(context);
}

export const natureOpinionCandidateExtractor = createNatureListingCandidateExtractor({
  id: 'nature-opinion',
  matches: isNatureOpinionHomepage,
  findNextPageUrl: findNatureOpinionNextPageUrl,
});

export function isNatureOpinionHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, NATURE_OPINION_HOMEPAGE_PATH);
}
