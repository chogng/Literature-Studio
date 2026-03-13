import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { AppSettings, Article, BatchSource, StorageService, StoredAppSettings } from '../types.js';
import { cleanText } from '../utils/text.js';

interface StoragePaths {
  historyFile: string;
  configFile: string;
}

interface StorageOptions {
  defaultLocale?: 'zh' | 'en';
}

const defaultBatchHomepageUrl = 'https://arxiv.org/list/cs/new';
const defaultBatchHomepageUrls = [defaultBatchHomepageUrl];
const defaultBatchSources: BatchSource[] = [
  { id: 'source-arxiv-cs-new', url: defaultBatchHomepageUrl, journalTitle: '' },
];
const defaultBatchLimit = 5;
const defaultSameDomainOnly = true;
const fallbackLocale: 'zh' | 'en' = 'zh';

async function readJson<T>(filePath: string, fallbackValue: T) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallbackValue;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeLocale(value: unknown, defaultLocale: 'zh' | 'en'): 'zh' | 'en' {
  if (value === 'zh' || value === 'en') {
    return value;
  }

  return defaultLocale;
}

function buildSourceId(seed: unknown, fallbackSeed: string, index: number) {
  const cleaned = cleanText(seed);
  if (cleaned) return cleaned;

  const normalizedFallback = cleanText(fallbackSeed)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);

  if (normalizedFallback) {
    return `source-${normalizedFallback}-${index + 1}`;
  }

  return `source-${index + 1}`;
}

function normalizeBatchSources(payload: Partial<StoredAppSettings>): BatchSource[] {
  const fromStructured = Array.isArray(payload.defaultBatchSources)
    ? payload.defaultBatchSources.map((item, index) => {
        const url = cleanText(item?.url);
        return {
          id: buildSourceId(item?.id, url, index),
          url,
          journalTitle: cleanText(item?.journalTitle),
        };
      })
    : [];
  const fromLegacy = Array.isArray(payload.defaultBatchHomepageUrls)
    ? payload.defaultBatchHomepageUrls.map((url, index) => ({
        id: buildSourceId('', url, fromStructured.length + index),
        url: cleanText(url),
        journalTitle: '',
      }))
    : [];

  const normalized = [...fromStructured, ...fromLegacy].filter((source) => source.url);
  const deduped = new Map<string, BatchSource>();

  for (const source of normalized) {
    const existing = deduped.get(source.url);
    if (!existing) {
      deduped.set(source.url, source);
      continue;
    }

    if (!existing.journalTitle && source.journalTitle) {
      deduped.set(source.url, source);
      continue;
    }
    if (!existing.id && source.id) {
      deduped.set(source.url, source);
    }
  }

  const merged = [...deduped.values()];
  return merged.length > 0 ? merged : defaultBatchSources.map((source) => ({ ...source }));
}

function normalizeSettings(
  payload: Partial<StoredAppSettings> = {},
  defaultLocale: 'zh' | 'en',
): StoredAppSettings {
  const downloadDir = typeof payload.defaultDownloadDir === 'string' ? cleanText(payload.defaultDownloadDir) : '';
  const normalizedBatchSources = normalizeBatchSources(payload);
  const normalizedHomepageUrls = normalizedBatchSources.map((source) => source.url);
  const parsedLimit = Number.parseInt(String(payload.defaultBatchLimit), 10);
  const normalizedLimit = Number.isNaN(parsedLimit)
    ? defaultBatchLimit
    : Math.min(20, Math.max(1, parsedLimit));
  const batchHomepageUrls = [...new Set(normalizedHomepageUrls)];

  return {
    defaultDownloadDir: downloadDir || null,
    defaultBatchHomepageUrls:
      batchHomepageUrls.length > 0 ? batchHomepageUrls : [...defaultBatchHomepageUrls],
    defaultBatchSources:
      normalizedBatchSources.length > 0
        ? normalizedBatchSources
        : defaultBatchSources.map((source) => ({ ...source })),
    defaultBatchLimit: normalizedLimit,
    defaultSameDomainOnly:
      typeof payload.defaultSameDomainOnly === 'boolean'
        ? payload.defaultSameDomainOnly
        : defaultSameDomainOnly,
    locale: normalizeLocale(payload.locale, defaultLocale),
  };
}

function attachConfigPath(settings: StoredAppSettings, configPath: string): AppSettings {
  return {
    ...settings,
    configPath,
  };
}

export function createStorageService(paths: StoragePaths, options: StorageOptions = {}): StorageService {
  const defaultLocale = options.defaultLocale === 'en' ? 'en' : fallbackLocale;

  async function readHistory() {
    const payload = await readJson<Article[]>(paths.historyFile, []);
    return Array.isArray(payload) ? payload : [];
  }

  async function writeHistory(items: Article[]) {
    await writeJson(paths.historyFile, items);
  }

  async function readSettings() {
    const payload = await readJson<Partial<StoredAppSettings>>(paths.configFile, {});
    const normalized = normalizeSettings(payload, defaultLocale);
    return attachConfigPath(normalized, paths.configFile);
  }

  return {
    async saveFetchedArticles(items: Article[]) {
      const previous = await readHistory();
      const next = [...items, ...previous];
      const seen = new Set<string>();
      const deduped: Article[] = [];

      for (const item of next) {
        const key = `${item.sourceId ?? ''}::${item.sourceUrl}::${item.fetchedAt}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
      }

      await writeHistory(deduped);
    },

    async loadSettings() {
      return readSettings();
    },

    async saveSettings(settings = {}) {
      const current = await readSettings();
      const { configPath: _configPath, ...currentStored } = current;
      const saved = normalizeSettings({ ...currentStored, ...settings }, defaultLocale);
      await writeJson(paths.configFile, saved);
      return attachConfigPath(saved, paths.configFile);
    },
  };
}
