import articleList from '../data/article-list';
import { createSourceLookupKey } from '../utils/source-lookup-key';
import { normalizeUrl, sanitizeUrlInput } from '../utils/url';

export const batchLimitMin = 1;
export const batchLimitMax = 100;

export type BatchSource = {
  id: string;
  url: string;
  journalTitle: string;
};

type SourceTableEntry = {
  id: string;
  url: string;
  journalTitle: string;
  extractorId?: string | null;
};

type BuiltInSourceMetadata = {
  articleListId: string;
  defaultJournalTitle: string;
};

export type ResolvedSourceTableMetadata = {
  lookupKey: string;
  articleListId: string;
  journalTitle: string;
  preferredExtractorId: string;
  defaultJournalTitle: string;
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

export function ensureBatchSourceId(input: unknown, fallbackIndex?: number) {
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

function createLookupMap<T extends string>(table: ReadonlyArray<{ url: string; value: T }>) {
  const map = new Map<string, T>();

  for (const item of table) {
    const lookupKey = createSourceLookupKey(item.url);
    if (!lookupKey || !item.value || map.has(lookupKey)) {
      continue;
    }

    map.set(lookupKey, item.value);
  }

  return map;
}

const builtInSourceEntries: SourceTableEntry[] = articleList.map((item) => ({
  id: String(item.id).trim(),
  url: item.url,
  journalTitle: item.journalTitle.trim(),
  extractorId: 'extractorId' in item ? String(item.extractorId ?? '').trim() || null : null,
}));

const builtInArticleListMaxId = builtInSourceEntries.reduce((maxId, item) => {
  const parsed = Number.parseInt(item.id, 10);
  return Number.isFinite(parsed) ? Math.max(maxId, parsed) : maxId;
}, 0);

const builtInArticleListIdByLookupKey = createLookupMap(
  builtInSourceEntries.map((item) => ({
    url: item.url,
    value: item.id.trim(),
  })),
);

const builtInJournalTitleByLookupKey = createLookupMap(
  builtInSourceEntries.map((item) => ({
    url: item.url,
    value: item.journalTitle.trim(),
  })),
);

let journalTitleByLookupKey = new Map<string, string>();
let articleListIdByLookupKey = new Map<string, string>();
let preferredExtractorIdByLookupKey = new Map<string, string>();

function rebuildLookupMaps(entries: ReadonlyArray<SourceTableEntry>) {
  journalTitleByLookupKey = createLookupMap(
    entries.map((item) => ({
      url: item.url,
      value: item.journalTitle.trim(),
    })),
  );
  articleListIdByLookupKey = createLookupMap(
    entries.map((item) => ({
      url: item.url,
      value: item.id.trim(),
    })),
  );
  preferredExtractorIdByLookupKey = createLookupMap(
    entries.map((item) => ({
      url: item.url,
      value: String(item.extractorId ?? '').trim(),
    })),
  );
}

function resolveBuiltInSourceMetadata(input: unknown): BuiltInSourceMetadata {
  const lookupKey = createSourceLookupKey(input);
  if (!lookupKey) {
    return {
      articleListId: '',
      defaultJournalTitle: '',
    };
  }

  return {
    articleListId: builtInArticleListIdByLookupKey.get(lookupKey) ?? '',
    defaultJournalTitle: builtInJournalTitleByLookupKey.get(lookupKey) ?? '',
  };
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
  const { articleListId, defaultJournalTitle } = resolveBuiltInSourceMetadata(url);
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
    const key = createSourceLookupKey(source.url) || source.url;
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
    journalTitle: source.journalTitle || resolveBuiltInSourceMetadata(source.url).defaultJournalTitle,
  }));
}

function buildMergedSourceEntries(batchSources: ReadonlyArray<BatchSource>): SourceTableEntry[] {
  const merged = new Map<string, SourceTableEntry>();

  for (const item of builtInSourceEntries) {
    const lookupKey = createSourceLookupKey(item.url);
    if (!lookupKey) continue;
    merged.set(lookupKey, { ...item });
  }

  let nextCustomId = builtInArticleListMaxId + 1;

  for (const source of batchSources) {
    const normalizedUrl = normalizeUrl(source.url);
    const journalTitle = source.journalTitle.trim();
    if (!normalizedUrl || !journalTitle) continue;

    const lookupKey = createSourceLookupKey(normalizedUrl);
    if (!lookupKey) continue;

    const existing = merged.get(lookupKey);
    if (existing) {
      merged.set(lookupKey, {
        ...existing,
        url: normalizedUrl,
        journalTitle,
      });
      continue;
    }

    merged.set(lookupKey, {
      id: String(nextCustomId),
      url: normalizedUrl,
      journalTitle,
      extractorId: null,
    });
    nextCustomId += 1;
  }

  return [...merged.values()];
}

export function resolveSourceLookupKey(input: unknown) {
  return createSourceLookupKey(input);
}

export function resolveSourceTableMetadata(input: unknown): ResolvedSourceTableMetadata {
  const lookupKey = createSourceLookupKey(input);
  if (!lookupKey) {
    return {
      lookupKey: '',
      articleListId: '',
      journalTitle: '',
      preferredExtractorId: '',
      defaultJournalTitle: '',
    };
  }

  const articleListId = articleListIdByLookupKey.get(lookupKey) ?? '';
  const journalTitle = journalTitleByLookupKey.get(lookupKey) ?? '';
  const preferredExtractorId = preferredExtractorIdByLookupKey.get(lookupKey) ?? '';

  return {
    lookupKey,
    articleListId,
    journalTitle,
    preferredExtractorId,
    defaultJournalTitle: journalTitle || articleListId,
  };
}

export function resolveJournalTitleFromSourceUrl(input: unknown) {
  return resolveSourceTableMetadata(input).journalTitle;
}

export function resolveArticleListIdFromSourceUrl(input: unknown) {
  return resolveSourceTableMetadata(input).articleListId;
}

export function resolveDefaultJournalTitleFromSourceUrl(input: unknown) {
  return resolveSourceTableMetadata(input).defaultJournalTitle;
}

export function resolvePreferredExtractorIdFromSourceUrl(input: unknown) {
  return resolveSourceTableMetadata(input).preferredExtractorId;
}

export type ConfigBatchSourceEntry = BatchSource;
export type ConfigBatchSourceList = BatchSource[];
export type ConfigBatchSourceFallback = ReadonlyArray<BatchSource>;

export type ConfigBatchSourceResolution = {
  batchSources: ConfigBatchSourceList;
};

const configBatchSourceSeed: ReadonlyArray<BatchSource> = builtInSourceEntries.map((source) => ({
  id: source.id,
  url: source.url,
  journalTitle: source.journalTitle,
}));

export function getConfigBatchSourceSeed(): ConfigBatchSourceList {
  return configBatchSourceSeed.map((source) => ({
    id: source.id,
    url: source.url,
    journalTitle: source.journalTitle,
  }));
}

function createConfigBatchSourceResolution(
  input: unknown,
  fallback: ConfigBatchSourceFallback = configBatchSourceSeed,
): ConfigBatchSourceResolution {
  return {
    batchSources: normalizeBatchSources(input, fallback),
  };
}

function syncResolvedSourceTable(batchSources: ReadonlyArray<BatchSource>) {
  rebuildLookupMaps(buildMergedSourceEntries(batchSources));
}

export function resolveConfigBatchSources(
  input: unknown,
  fallback: ConfigBatchSourceFallback = configBatchSourceSeed,
): ConfigBatchSourceList {
  return createConfigBatchSourceResolution(input, fallback).batchSources;
}

export function syncConfiguredArticleListFromConfig(
  input: unknown,
  fallback: ConfigBatchSourceFallback = configBatchSourceSeed,
): ConfigBatchSourceResolution {
  const resolution = createConfigBatchSourceResolution(input, fallback);
  syncResolvedSourceTable(resolution.batchSources);
  return resolution;
}

rebuildLookupMaps(builtInSourceEntries);
