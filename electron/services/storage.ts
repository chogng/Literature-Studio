import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { AppSettings, Article, StorageService } from '../types.js';
import { cleanText } from '../utils/text.js';

interface StoragePaths {
  historyFile: string;
  settingsFile: string;
}

const defaultHomepageUrl = 'https://arxiv.org/list/cs/new';
const defaultBatchLimit = 5;
const defaultSameDomainOnly = true;

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

function normalizeSettings(payload: Partial<AppSettings> = {}): AppSettings {
  const downloadDir = typeof payload.defaultDownloadDir === 'string' ? cleanText(payload.defaultDownloadDir) : '';
  const homepageValue =
    typeof payload.defaultHomepageUrl === 'string' ? cleanText(payload.defaultHomepageUrl) : '';
  const parsedLimit = Number.parseInt(String(payload.defaultBatchLimit), 10);
  const normalizedLimit = Number.isNaN(parsedLimit)
    ? defaultBatchLimit
    : Math.min(20, Math.max(1, parsedLimit));

  return {
    defaultDownloadDir: downloadDir || null,
    defaultHomepageUrl: homepageValue || defaultHomepageUrl,
    defaultBatchLimit: normalizedLimit,
    defaultSameDomainOnly:
      typeof payload.defaultSameDomainOnly === 'boolean'
        ? payload.defaultSameDomainOnly
        : defaultSameDomainOnly,
  };
}

export function createStorageService(paths: StoragePaths): StorageService {
  async function readHistory() {
    const payload = await readJson<Article[]>(paths.historyFile, []);
    return Array.isArray(payload) ? payload : [];
  }

  async function writeHistory(items: Article[]) {
    await writeJson(paths.historyFile, items);
  }

  async function readSettings() {
    const payload = await readJson<Partial<AppSettings>>(paths.settingsFile, {});
    return normalizeSettings(payload);
  }

  return {
    async saveFetchedArticles(items: Article[]) {
      const previous = await readHistory();
      const next = [...items, ...previous];
      const seen = new Set<string>();
      const deduped: Article[] = [];

      for (const item of next) {
        const key = `${item.sourceUrl}::${item.fetchedAt}`;
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
      const saved = normalizeSettings({ ...current, ...settings });
      await writeJson(paths.settingsFile, saved);
      return saved;
    },
  };
}
