import { natureLatestNewsCandidateExtractor } from './latestNews.js';
import { natureNatElectronResearchArticlesCandidateExtractor } from './natElectron.js';
import { natureNcommsResearchArticlesCandidateExtractor } from './nature-ncomms-research-articles.js';
import { natMachIntellCandidateExtractor } from './natMachIntell.js';
import { natureNatrevelectrengReviewsAndAnalysisCandidateExtractor } from './nature-natrevelectreng-reviews-and-analysis.js';
import { natureNatrevmatsReviewsAndAnalysisCandidateExtractor } from './nature-natrevmats-reviews-and-analysis.js';
import { natureNatrevphysReviewsAndAnalysisCandidateExtractor } from './nature-natrevphys-reviews-and-analysis.js';
import { natureNmatResearchArticlesCandidateExtractor } from './nature-nmat-research-articles.js';
import { natureNnanoResearchArticlesCandidateExtractor } from './nature-nnano-research-articles.js';
import { natureNpj2dmaterialsResearchArticlesCandidateExtractor } from './nature-npj2dmaterials-research-articles.js';
import { natureNphotonResearchArticlesCandidateExtractor } from './nature-nphoton-research-articles.js';
import { natureNphysResearchArticlesCandidateExtractor } from './nature-nphys-research-articles.js';
import { natureNatsynthResearchArticlesCandidateExtractor } from './nature-natsynth-research-articles.js';
import { natureOpinionCandidateExtractor } from './nature-opinions.js';
import { natureResearchArticlesCandidateExtractor } from './nature-research-articles.js';
import { scienceCurrentNewsInDepthResearchArticlesCandidateExtractor } from './science-current-news-in-depth-research-articles.js';
import { scienceSciadvCurrentPhysicalMaterialsCandidateExtractor } from './science-sciadv-current-physical-materials.js';

import type { ListingCandidateExtractor } from './types.js';

const listingCandidateExtractors: ListingCandidateExtractor[] = [
  scienceCurrentNewsInDepthResearchArticlesCandidateExtractor,
  scienceSciadvCurrentPhysicalMaterialsCandidateExtractor,
  natureNatElectronResearchArticlesCandidateExtractor,
  natureNcommsResearchArticlesCandidateExtractor,
  natMachIntellCandidateExtractor,
  natureNatrevelectrengReviewsAndAnalysisCandidateExtractor,
  natureNatrevmatsReviewsAndAnalysisCandidateExtractor,
  natureNatrevphysReviewsAndAnalysisCandidateExtractor,
  natureNmatResearchArticlesCandidateExtractor,
  natureNnanoResearchArticlesCandidateExtractor,
  natureNpj2dmaterialsResearchArticlesCandidateExtractor,
  natureNphotonResearchArticlesCandidateExtractor,
  natureNphysResearchArticlesCandidateExtractor,
  natureNatsynthResearchArticlesCandidateExtractor,
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
