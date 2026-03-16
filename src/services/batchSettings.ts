import {
  resolveDefaultJournalTitleFromSourceUrl,
  resolveSourceLookupKey,
  resolveSourceTableMetadata,
} from './sourceTable';
import { normalizeUrl, sanitizeUrlInput } from '../utils/url';

export const batchLimitMin = 1;
export const batchLimitMax = 100;

export type BatchSource = {
  id: string;
  url: string;
  journalTitle: string;
};

export type BatchFetchSource = {
  sourceId: string;
  pageUrl: string;
  journalTitle: string;
  preferredExtractorId: string | null;
};

function randomIdSegment() {
  return Math.random().toString(36).slice(2, 10);
}

function createIndexedBatchSourceId(index: number) {
  return String(Math.max(0, Math.trunc(index)) + 1);
}

function createRandomBatchSourceId() {
  return `source-${Date.now().toString(36)}-${randomIdSegment()}`;
}

function ensureBatchSourceId(input: unknown, fallbackIndex?: number) {
  const cleaned = String(input ?? '').trim();
  if (cleaned) return cleaned;

  if (Number.isInteger(fallbackIndex) && Number(fallbackIndex) >= 0) {
    return createIndexedBatchSourceId(Number(fallbackIndex));
  }

  return createRandomBatchSourceId();
}

export function createEmptyBatchSource(): BatchSource {
  return {
    id: createRandomBatchSourceId(),
    url: '',
    journalTitle: '',
  };
}

export const defaultBatchLimit = 20;
export const defaultSameDomainOnly = true;

export function normalizeBatchLimit(input: unknown, fallback: number = defaultBatchLimit): number {
  const parsed = Number.parseInt(String(input), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(batchLimitMax, Math.max(batchLimitMin, parsed));
}

function sanitizeBatchSourceEntry(value: unknown, index: number): BatchSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      id: '',
      url: '',
      journalTitle: '',
    };
  }

  const record = value as Record<string, unknown>;
  const url = sanitizeUrlInput(String(record.url ?? ''));
  const explicitJournalTitle = String(record.journalTitle ?? '').trim();
  const { articleListId, defaultJournalTitle } = resolveSourceTableMetadata(url);
  const normalizedId = String(record.id ?? '').trim() || articleListId;
  return {
    id: ensureBatchSourceId(normalizedId, index),
    url,
    journalTitle: explicitJournalTitle || defaultJournalTitle,
  };
}

function dedupeBatchSources(sources: BatchSource[]): BatchSource[] {
  const deduped = new Map<string, BatchSource>();

  for (const source of sources) {
    const key = resolveSourceLookupKey(source.url) || source.url;
    const previous = deduped.get(key);
    if (!previous) {
      deduped.set(key, source);
      continue;
    }
    if (!previous.id && source.id) {
      deduped.set(key, source);
      continue;
    }
    if (!previous.journalTitle && source.journalTitle) {
      deduped.set(key, source);
    }
  }

  return [...deduped.values()];
}

export function sanitizeBatchSources(input: unknown): BatchSource[] {
  const values = Array.isArray(input) ? input : [];
  const normalized = values
    .map((value, index) => sanitizeBatchSourceEntry(value, index))
    .filter((source) => source.url);
  return dedupeBatchSources(normalized);
}

export function normalizeBatchSources(
  input: unknown,
  fallback: ReadonlyArray<BatchSource>,
): BatchSource[] {
  const normalized = sanitizeBatchSources(input);
  if (normalized.length > 0) {
    return normalized;
  }

  return fallback.map((source) => ({
    id: ensureBatchSourceId(source.id),
    url: source.url,
    journalTitle: source.journalTitle || resolveDefaultJournalTitleFromSourceUrl(source.url),
  }));
}

export function prepareBatchSourcesForFetch(input: unknown): {
  sources: BatchFetchSource[];
} {
  const sanitized = sanitizeBatchSources(input);
  const deduped = new Map<string, BatchFetchSource>();

  for (const [index, source] of sanitized.entries()) {
    const normalizedUrl = normalizeUrl(source.url);
    if (!normalizedUrl) continue;

    const {
      articleListId,
      defaultJournalTitle,
      preferredExtractorId: matchedPreferredExtractorId,
    } = resolveSourceTableMetadata(normalizedUrl);
    const sourceId = ensureBatchSourceId(source.id || articleListId, index);
    const journalTitle = source.journalTitle.trim() || defaultJournalTitle || sourceId;
    const preferredExtractorId = matchedPreferredExtractorId || null;
    const existing = deduped.get(normalizedUrl);
    if (existing) {
      if ((!existing.journalTitle && journalTitle) || (!existing.preferredExtractorId && preferredExtractorId)) {
        deduped.set(normalizedUrl, {
          ...existing,
          journalTitle,
          preferredExtractorId,
        });
      }
      continue;
    }

    deduped.set(normalizedUrl, {
      sourceId,
      pageUrl: normalizedUrl,
      journalTitle,
      preferredExtractorId,
    });
  }

  return {
    sources: [...deduped.values()],
  };
}
