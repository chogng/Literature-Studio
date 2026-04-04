import { EventEmitter } from 'ls/base/common/event';
import type { Article } from 'ls/workbench/services/article/articleFetch';
import { buildDefaultBatchDateRange } from 'ls/workbench/common/dateRange';

export type ReaderStateSnapshot = {
  batchStartDate: string;
  batchEndDate: string;
  filterJournal: string;
};

export type ReaderDerivedState = {
  filteredArticles: Article[];
  hasData: boolean;
};

type ReaderStateUpdater = (
  current: ReaderStateSnapshot,
) => ReaderStateSnapshot;

const defaultBatchDateRange = buildDefaultBatchDateRange();
const DEFAULT_READER_STATE_SNAPSHOT: ReaderStateSnapshot = {
  batchStartDate: defaultBatchDateRange.startDate,
  batchEndDate: defaultBatchDateRange.endDate,
  filterJournal: '',
};

let readerStateSnapshot = DEFAULT_READER_STATE_SNAPSHOT;
const onDidChangeReaderStateEmitter = new EventEmitter<void>();

function updateReaderState(updater: ReaderStateUpdater) {
  const nextSnapshot = updater(readerStateSnapshot);
  if (Object.is(nextSnapshot, readerStateSnapshot)) {
    return;
  }

  readerStateSnapshot = nextSnapshot;
  onDidChangeReaderStateEmitter.fire();
}

export function subscribeReaderState(listener: () => void) {
  return onDidChangeReaderStateEmitter.event(listener);
}

export function getReaderStateSnapshot() {
  return readerStateSnapshot;
}

export function setBatchStartDate(nextBatchStartDate: string) {
  updateReaderState((current) => {
    if (current.batchStartDate === nextBatchStartDate) {
      return current;
    }

    return {
      ...current,
      batchStartDate: nextBatchStartDate,
    };
  });
}

export function setBatchEndDate(nextBatchEndDate: string) {
  updateReaderState((current) => {
    if (current.batchEndDate === nextBatchEndDate) {
      return current;
    }

    return {
      ...current,
      batchEndDate: nextBatchEndDate,
    };
  });
}

export function setFilterJournal(nextFilterJournal: string) {
  updateReaderState((current) => {
    if (current.filterJournal === nextFilterJournal) {
      return current;
    }

    return {
      ...current,
      filterJournal: nextFilterJournal,
    };
  });
}

export function resetReaderFilters() {
  setFilterJournal('');
}

export function selectFilteredArticles(
  snapshot: ReaderStateSnapshot,
  articles: ReadonlyArray<Article>,
) {
  const journal = snapshot.filterJournal.trim().toLowerCase();
  if (!journal) {
    return articles.slice();
  }

  return articles.filter(
    (article) =>
      article.sourceUrl.toLowerCase().includes(journal) ||
      String(article.journalTitle ?? '')
        .toLowerCase()
        .includes(journal),
  );
}

export function selectHasData(articles: ReadonlyArray<Article>) {
  return articles.length > 0;
}

export function selectReaderDerivedState(
  snapshot: ReaderStateSnapshot,
  articles: ReadonlyArray<Article>,
): ReaderDerivedState {
  return {
    filteredArticles: selectFilteredArticles(snapshot, articles),
    hasData: selectHasData(articles),
  };
}
