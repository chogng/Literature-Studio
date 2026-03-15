import type { ListingCandidateExtraction } from './source-extractors/index.js';

export type FetchStrategy = 'network-first' | 'preview-first' | 'compare';
export type LegacyFetchStrategy = 'network' | 'prefer-preview';
export type FetchStrategyInput = FetchStrategy | LegacyFetchStrategy;

export type PreviewSnapshot = {
  html: string;
  previewUrl: string;
  captureMs: number;
  isLoading: boolean;
};

export type PreviewExtractionSnapshot = {
  extraction: ListingCandidateExtraction;
  extractorId: string;
  previewUrl: string;
  captureMs: number;
  isLoading: boolean;
  nextPageUrl: string | null;
};

export function normalizeFetchStrategy(
  input: FetchStrategyInput | null | undefined,
): FetchStrategy {
  switch (input) {
    case 'compare':
      return 'compare';
    case 'preview-first':
    case 'prefer-preview':
      return 'preview-first';
    case 'network-first':
    case 'network':
    default:
      return 'network-first';
  }
}
