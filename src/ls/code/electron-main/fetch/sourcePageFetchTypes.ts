import type {
  Article,
  FetchChannel,
  FetchStatus,
  WebContentReuseMode,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { CandidateArticleSnapshot } from './merge.js';
import type { ListingPaginationStopEvaluation } from './sourceExtractors/index.js';
import type {
  FetchStrategy,
  WebContentExtractionSnapshot,
  WebContentSnapshot,
} from './fetchStrategy.js';

export type FetchLatestArticlesOptions = {
  previewExtractions?: ReadonlyMap<string, WebContentExtractionSnapshot>;
  previewSnapshots?: ReadonlyMap<string, WebContentSnapshot>;
  fetchStrategy?: FetchStrategy;
  onFetchStatus?: (status: FetchStatus) => void;
};

export type PageHtmlResult = {
  html: string;
  source: 'network' | 'web-content';
  usedRenderFallback?: boolean;
};

export type CandidateDescriptor = CandidateArticleSnapshot & {
  score: number;
  order: number;
};

export type CandidateCollectionResult = {
  candidates: CandidateDescriptor[];
  linkCount: number;
  datedCandidateCount: number;
  inRangeDateHintCount: number;
  dateFilteredCount: number;
  stoppedByDateHint: boolean;
  sortedDateHintsObserved: boolean;
  consecutiveOlderDateHints: number;
  stopDateHint: string | null;
  extractorId: string | null;
  extractorDiagnostics: Record<string, unknown> | null;
  paginationStopEvaluation: ListingPaginationStopEvaluation | null;
};

export type PageFetchResult = {
  fetchChannel: FetchChannel;
  webContentReuseMode: WebContentReuseMode | null;
  articles: Article[];
  candidateAttempted: number;
  candidateResolved: number;
  candidateAccepted: number;
  usedPageOnly: boolean;
  nextPageUrl: string | null;
  stoppedByDateHint: boolean;
};
