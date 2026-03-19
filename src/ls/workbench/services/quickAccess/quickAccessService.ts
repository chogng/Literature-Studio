import type { BatchSource } from '../config/configSchema';
import { resolveSourceTableMetadata } from '../config/configSchema';
import { normalizeUrl, sanitizeUrlInput } from '../../common/url';
import type { TitlebarAddressBarSourceOption } from '../../browser/parts/titlebar/titlebarModel';

export type QuickAccessCycleDirection = 'prev' | 'next';

export function applyQuickAccessUrlInput(
  nextUrl: string,
  setWebUrl: (value: string) => void,
  setFetchSeedUrl: (value: string) => void,
) {
  const sanitizedUrl = sanitizeUrlInput(nextUrl);
  setWebUrl(sanitizedUrl);
  setFetchSeedUrl(sanitizedUrl);
}

export function createQuickAccessSourceOptions(
  batchSources: ReadonlyArray<BatchSource>,
): TitlebarAddressBarSourceOption[] {
  const options: TitlebarAddressBarSourceOption[] = [];
  const seenSourceIds = new Set<string>();

  for (const source of batchSources) {
    const sourceId = String(source.id ?? '').trim();
    const normalizedSourceUrl = normalizeUrl(source.url);
    if (!sourceId || !normalizedSourceUrl || seenSourceIds.has(sourceId)) {
      continue;
    }

    const journalTitle = source.journalTitle.trim();
    const labelPrimary = journalTitle || sourceId;

    options.push({
      id: sourceId,
      label: labelPrimary,
      url: normalizedSourceUrl,
      journalTitle,
    });
    seenSourceIds.add(sourceId);
  }

  return options;
}

export function resolveQuickAccessSourceId(
  fetchSeedUrl: string,
  webUrl: string,
  batchSources: ReadonlyArray<BatchSource>,
): string {
  const normalizedCurrentUrl = normalizeUrl(fetchSeedUrl || webUrl);
  if (!normalizedCurrentUrl) {
    return '';
  }

  return resolveSourceTableMetadata(normalizedCurrentUrl, batchSources).articleListId || '';
}

export function findQuickAccessSourceOption(
  options: ReadonlyArray<TitlebarAddressBarSourceOption>,
  sourceId: string,
) {
  return options.find((option) => option.id === sourceId);
}

export function resolveNextQuickAccessSourceOption(
  options: ReadonlyArray<TitlebarAddressBarSourceOption>,
  selectedSourceId: string,
  direction: QuickAccessCycleDirection,
) {
  if (options.length === 0) {
    return null;
  }

  const currentIndex = options.findIndex((option) => option.id === selectedSourceId);
  const step = direction === 'next' ? 1 : -1;
  const nextIndex =
    currentIndex < 0
      ? direction === 'next'
        ? 0
        : options.length - 1
      : (currentIndex + step + options.length) % options.length;

  return options[nextIndex] ?? null;
}
