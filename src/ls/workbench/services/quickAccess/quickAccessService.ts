import type { BatchSource } from '../config/configSchema';
import { resolveSourceTableMetadata } from '../config/configSchema';
import { normalizeUrl, sanitizeUrlInput } from '../../common/url';

export type QuickAccessCycleDirection = 'prev' | 'next';
export type QuickAccessSourceOption = {
  id: string;
  label: string;
  url: string;
  journalTitle: string;
};

export type QuickAccessAction =
  | {
      type: 'UPDATE_URL_INPUT';
      url: string;
    }
  | {
      type: 'SELECT_SOURCE';
      sourceId: string;
    }
  | {
      type: 'CYCLE_SOURCE';
      direction: QuickAccessCycleDirection;
    };

export type QuickAccessCommand =
  | {
      type: 'UPDATE_URL_INPUT';
      url: string;
    }
  | {
      type: 'OPEN_SOURCE_URL';
      url: string;
      // Quick source selections create or activate a content tab; the shared web content view then follows that tab.
      openInEditorTab: boolean;
    };

export type QuickAccessMachineState = {
  addressBarSourceOptions: ReadonlyArray<QuickAccessSourceOption>;
  selectedAddressBarSourceId: string;
  openQuickSourceInEditorTab: boolean;
};

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
): QuickAccessSourceOption[] {
  const options: QuickAccessSourceOption[] = [];
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
  options: ReadonlyArray<QuickAccessSourceOption>,
  sourceId: string,
) {
  return options.find((option) => option.id === sourceId);
}

export function resolveNextQuickAccessSourceOption(
  options: ReadonlyArray<QuickAccessSourceOption>,
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

export function reduceQuickAccessAction(
  state: QuickAccessMachineState,
  action: QuickAccessAction,
): QuickAccessCommand | null {
  switch (action.type) {
    case 'UPDATE_URL_INPUT':
      return {
        type: 'UPDATE_URL_INPUT',
        url: action.url,
      };
    case 'SELECT_SOURCE': {
      const selectedSource = findQuickAccessSourceOption(
        state.addressBarSourceOptions,
        action.sourceId,
      );
      if (!selectedSource) {
        return null;
      }

      return {
        type: 'OPEN_SOURCE_URL',
        url: selectedSource.url,
        openInEditorTab: state.openQuickSourceInEditorTab,
      };
    }
    case 'CYCLE_SOURCE': {
      const nextSource = resolveNextQuickAccessSourceOption(
        state.addressBarSourceOptions,
        state.selectedAddressBarSourceId,
        action.direction,
      );
      if (!nextSource) {
        return null;
      }

      return {
        type: 'OPEN_SOURCE_URL',
        url: nextSource.url,
        openInEditorTab: state.openQuickSourceInEditorTab,
      };
    }
    default:
      return null;
  }
}
