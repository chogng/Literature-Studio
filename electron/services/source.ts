import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { AppSettings, BatchSource, StorageService, StoredAppSettings } from '../types.js';
import { cleanText } from '../utils/text.js';

type SourceStore = Pick<StorageService, 'loadSettings' | 'saveSettings'>;

const defaultBatchSourceUrl = 'https://arxiv.org/list/cs/new';
const defaultBatchSources: BatchSource[] = [
  { id: 'source-arxiv-cs-new', url: defaultBatchSourceUrl, journalTitle: '' },
];
const batchLimitMin = 1;
const batchLimitMax = 100;
const defaultBatchLimit = 20;
const defaultSameDomainOnly = true;
const fallbackLocale: 'zh' | 'en' = 'zh';

type SourceStoreOptions = {
  defaultLocale?: 'zh' | 'en';
};

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
  const normalized = fromStructured.filter((source) => source.url);
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
  const parsedLimit = Number.parseInt(String(payload.defaultBatchLimit), 10);
  const normalizedLimit = Number.isNaN(parsedLimit)
    ? defaultBatchLimit
    : Math.min(batchLimitMax, Math.max(batchLimitMin, parsedLimit));

  return {
    defaultDownloadDir: downloadDir || null,
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

export function createSourceStore(configFile: string, options: SourceStoreOptions = {}): SourceStore {
  const defaultLocale = options.defaultLocale === 'en' ? 'en' : fallbackLocale;

  async function readSettings() {
    const payload = await readJson<Partial<StoredAppSettings>>(configFile, {});
    const normalized = normalizeSettings(payload, defaultLocale);
    return attachConfigPath(normalized, configFile);
  }

  return {
    async loadSettings() {
      return readSettings();
    },

    async saveSettings(settings = {}) {
      const current = await readSettings();
      const { configPath: _configPath, ...currentStored } = current;
      const saved = normalizeSettings({ ...currentStored, ...settings }, defaultLocale);
      await writeJson(configFile, saved);
      return attachConfigPath(saved, configFile);
    },
  };
}
