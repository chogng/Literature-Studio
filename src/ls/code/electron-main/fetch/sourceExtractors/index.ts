import { natureLatestNewsCandidateExtractor } from './latestNews.js';
import { natureOpinionCandidateExtractor } from './nature-opinions.js';
import { naturePathExtractors } from './nature-paths.js';
import { natureResearchArticlesCandidateExtractor } from './nature-research-articles.js';
import { scienceCurrentNewsInDepthResearchArticlesCandidateExtractor } from './science-current-news-in-depth-research-articles.js';
import { scienceSciadvCurrentPhysicalMaterialsCandidateExtractor } from './science-sciadv-current-physical-materials.js';

import type { ListingCandidateExtractor } from './types.js';

const listingCandidateExtractors: ListingCandidateExtractor[] = [
  scienceCurrentNewsInDepthResearchArticlesCandidateExtractor,
  scienceSciadvCurrentPhysicalMaterialsCandidateExtractor,
  ...naturePathExtractors,
  natureResearchArticlesCandidateExtractor,
  natureLatestNewsCandidateExtractor,
  natureOpinionCandidateExtractor,
];

const listingCandidateExtractorById = new Map(
  listingCandidateExtractors.map((extractor) => [extractor.id, extractor] as const),
);

export function getListingCandidateExtractorById(id: string | null | undefined) {
  const normalizedId = String(id ?? '').trim();
  if (!normalizedId) return null;
  return listingCandidateExtractorById.get(normalizedId) ?? null;
}

export function findListingCandidateExtractor(page: URL, preferredExtractorId?: string | null) {
  const preferredExtractor = getListingCandidateExtractorById(preferredExtractorId);
  if (preferredExtractor?.matches(page)) {
    return preferredExtractor;
  }

  return listingCandidateExtractors.find((extractor) => extractor.matches(page)) ?? null;
}

export type {
  ListingCandidateExtraction,
  ListingCandidateExtractor,
  ListingCandidateExtractorContext,
  ListingCandidateRefinementContext,
  ListingExtractorFetchHtml,
  ListingExtractorFetchHtmlOptions,
  ListingPaginationContext,
  ListingPaginationStopContext,
  ListingPaginationStopEvaluation,
  ListingCandidateSeed,
  ListingDom,
} from './types.js';
export {
  normalizeListingCandidateSeed,
  normalizeListingCandidateSeeds,
} from './types.js';
