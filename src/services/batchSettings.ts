import { normalizeUrl } from '../utils/url';

export const batchLimitMin = 1;
export const batchLimitMax = 100;

export const defaultBatchSourceUrl = 'https://arxiv.org/list/cs/new';
export type BatchSource = {
  id: string;
  url: string;
  journalTitle: string;
};

export type BatchFetchSource = {
  sourceId: string;
  homepageUrl: string;
  journalTitle: string;
};

function randomIdSegment() {
  return Math.random().toString(36).slice(2, 10);
}

function createBatchSourceId(seed = '') {
  const normalizedSeed = seed
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);

  return normalizedSeed ? `source-${normalizedSeed}` : '';
}

function createRandomBatchSourceId() {
  return `source-${Date.now().toString(36)}-${randomIdSegment()}`;
}

function ensureBatchSourceId(input: unknown, seed = '', fallbackIndex = 0) {
  const cleaned = String(input ?? '').trim();
  if (cleaned) return cleaned;

  const seeded = createBatchSourceId(seed);
  if (seeded) {
    return `${seeded}-${fallbackIndex + 1}`;
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

export const defaultBatchSources: BatchSource[] = [
  {
    id: 'source-arxiv-cs-new',
    url: defaultBatchSourceUrl,
    journalTitle: '',
  },
];
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
  const url = String(record.url ?? '').trim();
  const journalTitle = String(record.journalTitle ?? '').trim();
  return {
    id: ensureBatchSourceId(record.id, url, index),
    url,
    journalTitle,
  };
}

function dedupeBatchSources(sources: BatchSource[]): BatchSource[] {
  const deduped = new Map<string, BatchSource>();

  for (const source of sources) {
    const key = source.url;
    const previous = deduped.get(key);
    if (!previous) {
      deduped.set(key, source);
      continue;
    }
    if (!previous.journalTitle && source.journalTitle) {
      deduped.set(key, source);
      continue;
    }
    if (!previous.id && source.id) {
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
  fallback: BatchSource[] = defaultBatchSources,
): BatchSource[] {
  const normalized = sanitizeBatchSources(input);
  if (normalized.length > 0) {
    return normalized;
  }

  return fallback.map((source) => ({
    id: ensureBatchSourceId(source.id, source.url),
    url: source.url,
    journalTitle: source.journalTitle,
  }));
}

export function prepareBatchSourcesForFetch(input: unknown): {
  sources: BatchFetchSource[];
} {
  const sanitized = sanitizeBatchSources(input);
  const deduped = new Map<string, BatchFetchSource>();

  for (const source of sanitized) {
    const normalizedUrl = normalizeUrl(source.url);
    if (!normalizedUrl) continue;

    const journalTitle = source.journalTitle.trim();
    const existing = deduped.get(normalizedUrl);
    if (existing) {
      if (!existing.journalTitle && journalTitle) {
        deduped.set(normalizedUrl, {
          ...existing,
          journalTitle,
        });
      }
      continue;
    }

    deduped.set(normalizedUrl, {
      sourceId: ensureBatchSourceId(source.id, normalizedUrl),
      homepageUrl: normalizedUrl,
      journalTitle,
    });
  }

  return {
    sources: [...deduped.values()],
  };
}
