import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { AppSettings, Article, StorageService } from '../types.js';
import { cleanText } from '../utils/text.js';

interface StoragePaths {
  historyFile: string;
  settingsFile: string;
}

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
  const value = typeof payload.defaultDownloadDir === 'string' ? cleanText(payload.defaultDownloadDir) : '';
  return {
    defaultDownloadDir: value || null,
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
      const payload = await readJson<Partial<AppSettings>>(paths.settingsFile, { defaultDownloadDir: null });
      return normalizeSettings(payload);
    },

    async saveSettings(settings = {}) {
      const saved = normalizeSettings(settings);
      await writeJson(paths.settingsFile, saved);
      return saved;
    },
  };
}
