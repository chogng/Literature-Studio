import articleList from '../data/article-list';
import { normalizeUrl } from '../utils/url';

type ArticleListLookupEntry = {
  id: string;
  url: string;
  journalTitle: string;
  extractorId?: string | null;
};

export type ResolvedSourceTableMetadata = {
  lookupKey: string;
  articleListId: string;
  journalTitle: string;
  preferredExtractorId: string;
  defaultJournalTitle: string;
};

function createSourceLookupKey(input: unknown) {
  const normalized = normalizeUrl(String(input ?? ''));
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    return `${hostname}${pathname}`;
  } catch {
    return '';
  }
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

const builtInArticleListEntries: ArticleListLookupEntry[] = articleList.map((item) => ({
  id: String(item.id).trim(),
  url: item.url,
  journalTitle: item.journalTitle.trim(),
  extractorId: 'extractorId' in item ? String(item.extractorId ?? '').trim() || null : null,
}));

const builtInArticleListMaxId = builtInArticleListEntries.reduce((maxId, item) => {
  const parsed = Number.parseInt(item.id, 10);
  return Number.isFinite(parsed) ? Math.max(maxId, parsed) : maxId;
}, 0);

let journalTitleByLookupKey = new Map<string, string>();
let articleListIdByLookupKey = new Map<string, string>();
let preferredExtractorIdByLookupKey = new Map<string, string>();

function rebuildLookupMaps(entries: ReadonlyArray<ArticleListLookupEntry>) {
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

function buildMergedArticleListEntries(
  input: unknown,
): ArticleListLookupEntry[] {
  const merged = new Map<string, ArticleListLookupEntry>();

  for (const item of builtInArticleListEntries) {
    const lookupKey = createSourceLookupKey(item.url);
    if (!lookupKey) continue;
    merged.set(lookupKey, { ...item });
  }

  const values = Array.isArray(input) ? input : [];
  let nextCustomId = builtInArticleListMaxId + 1;

  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    const record = value as Record<string, unknown>;
    const url = String(record.url ?? '').trim();
    const normalizedUrl = normalizeUrl(url);
    const journalTitle = String(record.journalTitle ?? '').trim();
    if (!normalizedUrl || !journalTitle) {
      continue;
    }

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

export function syncConfiguredArticleList(input: unknown) {
  rebuildLookupMaps(buildMergedArticleListEntries(input));
}

rebuildLookupMaps(builtInArticleListEntries);

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
