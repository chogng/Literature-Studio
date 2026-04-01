import { sanitizeUrlInput } from 'ls/workbench/common/url';
import {
  createEmptyBatchSource,
  type BatchSource,
} from 'ls/workbench/services/config/configSchema';
import { resolveNextJournalTitleOnUrlChange } from 'ls/workbench/services/settings/sourceJournalTitle';

export function updateBatchSourceUrl(
  batchSources: ReadonlyArray<BatchSource>,
  index: number,
  nextUrl: string,
): BatchSource[] {
  const sanitizedUrl = sanitizeUrlInput(nextUrl);
  const targetSource = batchSources[index];
  if (!targetSource) {
    return [...batchSources];
  }

  const nextJournalTitle = resolveNextJournalTitleOnUrlChange({
    currentJournalTitle: targetSource.journalTitle,
    previousUrl: targetSource.url,
    nextUrl: sanitizedUrl,
    sourceTable: batchSources,
  });
  if (
    targetSource.url === sanitizedUrl &&
    targetSource.journalTitle === nextJournalTitle
  ) {
    return [...batchSources];
  }

  return batchSources.map((source, sourceIndex) => {
    if (sourceIndex !== index) {
      return source;
    }

    return {
      ...source,
      url: sanitizedUrl,
      journalTitle: nextJournalTitle,
    };
  });
}

export function updateBatchSourceJournalTitle(
  batchSources: ReadonlyArray<BatchSource>,
  index: number,
  nextJournalTitle: string,
): BatchSource[] {
  const targetSource = batchSources[index];
  if (!targetSource) {
    return [...batchSources];
  }

  if (targetSource.journalTitle === nextJournalTitle) {
    return [...batchSources];
  }

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
    return batchSources.slice();
  }

  const nextBatchSources = [...batchSources];
  const currentSource = nextBatchSources[index];
  nextBatchSources[index] = nextBatchSources[targetIndex];
  nextBatchSources[targetIndex] = currentSource;
  return nextBatchSources;
}
