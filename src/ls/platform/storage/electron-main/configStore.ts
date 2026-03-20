import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { AppSettings, BatchSource, StoredAppSettings } from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { StorageService } from '../common/storage.js';
import { cleanText } from '../../../base/common/strings.js';
import {
  batchLimitMax,
  batchLimitMin,
  defaultBatchLimit,
  defaultSameDomainOnly,
} from '../../config/common/defaultBatchSources.js';

type ConfigStore = Pick<StorageService, 'loadSettings' | 'saveSettings'>;
const fallbackLocale: 'zh' | 'en' = 'zh';

type ConfigStoreOptions = {
  defaultLocale?: 'zh' | 'en';
  defaultBatchSources?: ReadonlyArray<BatchSource>;
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

function buildSourceId(seed: unknown, index: number) {
  const cleaned = cleanText(seed);
  if (cleaned) return cleaned;

  return String(index + 1);
}

function normalizePreferredExtractorId(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function cloneBatchSources(input: ReadonlyArray<BatchSource>): BatchSource[] {
  return input
    .map((item, index) => {
      const url = cleanText(item?.url);
      return {
        id: buildSourceId(item?.id, index),
        url,
        journalTitle: cleanText(item?.journalTitle),
        preferredExtractorId: normalizePreferredExtractorId(item?.preferredExtractorId),
      };
    })
    .filter((source) => source.url);
}

function normalizeBatchSources(
  payload: Partial<StoredAppSettings>,
  fallbackBatchSources: ReadonlyArray<BatchSource>,
): BatchSource[] {
  if (!Array.isArray(payload.defaultBatchSources)) {
    return cloneBatchSources(fallbackBatchSources);
  }

  const fallbackByUrl = new Map<string, BatchSource>();
  for (const source of fallbackBatchSources) {
    if (!source.url || fallbackByUrl.has(source.url)) {
      continue;
    }
    fallbackByUrl.set(source.url, source);
  }

  const fromStructured = payload.defaultBatchSources.map((item, index) => {
    const url = cleanText(item?.url);
    const fallbackSource = fallbackByUrl.get(url);
    return {
      id: buildSourceId(item?.id ?? fallbackSource?.id, index),
      url,
      journalTitle: cleanText(item?.journalTitle) || cleanText(fallbackSource?.journalTitle),
      preferredExtractorId: normalizePreferredExtractorId(
        item?.preferredExtractorId ?? fallbackSource?.preferredExtractorId,
      ),
    };
  });
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
      continue;
    }
    if (!existing.preferredExtractorId && source.preferredExtractorId) {
      deduped.set(source.url, source);
    }
  }

  return [...deduped.values()];
}

function normalizeSettings(
  payload: Partial<StoredAppSettings> = {},
  defaultLocale: 'zh' | 'en',
  fallbackBatchSources: ReadonlyArray<BatchSource>,
): StoredAppSettings {
  const downloadDir = typeof payload.defaultDownloadDir === 'string' ? cleanText(payload.defaultDownloadDir) : '';
  const normalizedBatchSources = normalizeBatchSources(payload, fallbackBatchSources);
  const parsedLimit = Number.parseInt(String(payload.defaultBatchLimit), 10);
  const normalizedLimit = Number.isNaN(parsedLimit)
    ? defaultBatchLimit
    : Math.min(batchLimitMax, Math.max(batchLimitMin, parsedLimit));

  return {
    defaultDownloadDir: downloadDir || null,
    defaultBatchSources: normalizedBatchSources,
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

export function createConfigStore(configFile: string, options: ConfigStoreOptions = {}): ConfigStore {
  const defaultLocale = options.defaultLocale === 'en' ? 'en' : fallbackLocale;
  const fallbackBatchSources = cloneBatchSources(options.defaultBatchSources ?? []);

  async function readSettings() {
    const payload = await readJson<Partial<StoredAppSettings>>(configFile, {});
    const normalized = normalizeSettings(payload, defaultLocale, fallbackBatchSources);
    if (!Array.isArray(payload.defaultBatchSources)) {
      try {
        await writeJson(configFile, normalized);
      } catch {
        // ignore write failures on lazy defaults hydration
      }
    }
    return attachConfigPath(normalized, configFile);
  }

  return {
    async loadSettings() {
      return readSettings();
    },

    async saveSettings(settings = {}) {
      const current = await readSettings();
      const { configPath: _configPath, ...currentStored } = current;
      const saved = normalizeSettings({ ...currentStored, ...settings }, defaultLocale, fallbackBatchSources);
      await writeJson(configFile, saved);
      return attachConfigPath(saved, configFile);
    },
  };
}
