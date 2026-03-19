import type { ListingCandidateExtraction } from './sourceExtractors/index.js';

export type FetchStrategy = 'network-first' | 'preview-first' | 'compare';

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

export type PreviewExtractionFetchPlan = {
  requestedStrategy: FetchStrategy;
  shouldAttempt: boolean;
  previewReuseMode: 'live-extract' | null;
  reason:
    | 'strategy_network_first'
    | 'preview_extraction_unavailable'
    | 'extractor_unavailable'
    | 'page_not_first'
    | 'article_detail_page'
    | 'preview_live_extract';
};

export type PageHtmlFetchPlan = {
  requestedStrategy: FetchStrategy;
  effectiveStrategy: FetchStrategy;
  selectedChannel: 'network' | 'preview';
  previewReuseMode: 'snapshot' | null;
  shouldStartNetworkBenchmark: boolean;
  networkStage: 'source_page' | 'source_page_network';
};

export function normalizeFetchStrategy(input: FetchStrategy | null | undefined): FetchStrategy {
  switch (input) {
    case 'compare':
      return 'compare';
    case 'preview-first':
      return 'preview-first';
    case 'network-first':
    default:
      return 'network-first';
  }
}

export function shouldPreparePreviewArtifacts(input: FetchStrategy | null | undefined): boolean {
  return normalizeFetchStrategy(input) !== 'network-first';
}

export function buildPreviewExtractionFetchPlan({
  fetchStrategy,
  hasPreviewExtraction,
  hasExtractor,
  pageNumber,
  isLikelyArticleDetailPage,
}: {
  fetchStrategy: FetchStrategy | null | undefined;
  hasPreviewExtraction: boolean;
  hasExtractor: boolean;
  pageNumber: number;
  isLikelyArticleDetailPage: boolean;
}): PreviewExtractionFetchPlan {
  const requestedStrategy = normalizeFetchStrategy(fetchStrategy);
  if (requestedStrategy === 'network-first') {
    return {
      requestedStrategy,
      shouldAttempt: false,
      previewReuseMode: null,
      reason: 'strategy_network_first',
    };
  }

  if (!hasPreviewExtraction) {
    return {
      requestedStrategy,
      shouldAttempt: false,
      previewReuseMode: null,
      reason: 'preview_extraction_unavailable',
    };
  }

  if (!hasExtractor) {
    return {
      requestedStrategy,
      shouldAttempt: false,
      previewReuseMode: null,
      reason: 'extractor_unavailable',
    };
  }

  if (pageNumber !== 1) {
    return {
      requestedStrategy,
      shouldAttempt: false,
      previewReuseMode: null,
      reason: 'page_not_first',
    };
  }

  if (isLikelyArticleDetailPage) {
    return {
      requestedStrategy,
      shouldAttempt: false,
      previewReuseMode: null,
      reason: 'article_detail_page',
    };
  }

  return {
    requestedStrategy,
    shouldAttempt: true,
    previewReuseMode: 'live-extract',
    reason: 'preview_live_extract',
  };
}

export function buildPageHtmlFetchPlan({
  fetchStrategy,
  hasPreviewSnapshot,
}: {
  fetchStrategy: FetchStrategy | null | undefined;
  hasPreviewSnapshot: boolean;
}): PageHtmlFetchPlan {
  const requestedStrategy = normalizeFetchStrategy(fetchStrategy);
  const effectiveStrategy = hasPreviewSnapshot ? requestedStrategy : 'network-first';
  const selectedChannel = effectiveStrategy === 'network-first' ? 'network' : 'preview';
  const shouldStartNetworkBenchmark = effectiveStrategy === 'compare';

  return {
    requestedStrategy,
    effectiveStrategy,
    selectedChannel,
    previewReuseMode: selectedChannel === 'preview' ? 'snapshot' : null,
    shouldStartNetworkBenchmark,
    networkStage: shouldStartNetworkBenchmark ? 'source_page_network' : 'source_page',
  };
}
