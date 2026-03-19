import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { Article, StorageService } from '../types.js';

type HistoryStore = Pick<StorageService, 'saveFetchedArticles'>;

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

export function createHistoryStore(historyFile: string): HistoryStore {
  async function readHistory() {
    const payload = await readJson<Article[]>(historyFile, []);
    return Array.isArray(payload) ? payload : [];
  }

  async function writeHistory(items: Article[]) {
    await writeJson(historyFile, items);
  }

  return {
    async saveFetchedArticles(items) {
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
  };
}
