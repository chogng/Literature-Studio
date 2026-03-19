import { sanitizeUrlInput } from '../../common/url';
import {
  createEmptyBatchSource,
  type BatchSource,
} from '../config/configSchema';
import { resolveNextJournalTitleOnUrlChange } from './sourceJournalTitle';

export function updateBatchSourceUrl(
  batchSources: ReadonlyArray<BatchSource>,
  index: number,
  nextUrl: string,
): BatchSource[] {
  const sanitizedUrl = sanitizeUrlInput(nextUrl);

  return batchSources.map((source, sourceIndex) =>
    sourceIndex === index
      ? {
          ...source,
          url: sanitizedUrl,
          journalTitle: resolveNextJournalTitleOnUrlChange({
            currentJournalTitle: source.journalTitle,
            previousUrl: source.url,
            nextUrl: sanitizedUrl,
            sourceTable: batchSources,
          }),
        }
      : source,
  );
}

export function updateBatchSourceJournalTitle(
  batchSources: ReadonlyArray<BatchSource>,
  index: number,
  nextJournalTitle: string,
): BatchSource[] {
  return batchSources.map((source, sourceIndex) =>
    sourceIndex === index
      ? {
          ...source,
          journalTitle: nextJournalTitle,
        }
      : source,
  );
}

export function addBatchSource(batchSources: ReadonlyArray<BatchSource>): BatchSource[] {
  return [...batchSources, createEmptyBatchSource()];
}

export function removeBatchSource(
  batchSources: ReadonlyArray<BatchSource>,
  index: number,
): BatchSource[] {
  if (batchSources.length <= 1) {
    return [createEmptyBatchSource()];
  }

  return batchSources.filter((_, sourceIndex) => sourceIndex !== index);
}

export function moveBatchSource(
  batchSources: ReadonlyArray<BatchSource>,
  index: number,
  direction: 'up' | 'down',
): BatchSource[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= batchSources.length ||
    targetIndex < 0 ||
    targetIndex >= batchSources.length
  ) {
    return [...batchSources];
  }

  const nextBatchSources = [...batchSources];
  const currentSource = nextBatchSources[index];
  nextBatchSources[index] = nextBatchSources[targetIndex];
  nextBatchSources[targetIndex] = currentSource;
  return nextBatchSources;
}
