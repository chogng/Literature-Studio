import { useCallback, useMemo, useState } from 'react';
import type { Article } from '../services/article/articleFetch';
import { buildDefaultBatchDateRange } from '../common/dateRange';

type UseReaderStateParams = {
  articles: Article[];
};

export function useReaderState({ articles }: UseReaderStateParams) {
  const initialBatchDateRange = useMemo(() => buildDefaultBatchDateRange(), []);
  const [batchStartDate, setBatchStartDate] = useState(initialBatchDateRange.startDate);
  const [batchEndDate, setBatchEndDate] = useState(initialBatchDateRange.endDate);
  const [filterJournal, setFilterJournal] = useState('');

  const filteredArticles = useMemo(() => {
    const journal = filterJournal.trim().toLowerCase();
    return articles.filter(
      (article) =>
        !journal ||
        article.sourceUrl.toLowerCase().includes(journal) ||
        String(article.journalTitle ?? '')
          .toLowerCase()
          .includes(journal),
    );
  }, [articles, filterJournal]);

  const hasData = articles.length > 0;

  const handleResetFilters = useCallback(() => {
    setFilterJournal('');
  }, []);

  return {
    batchStartDate,
    setBatchStartDate,
    batchEndDate,
    setBatchEndDate,
    filterJournal,
    setFilterJournal,
    filteredArticles,
    hasData,
    handleResetFilters,
  };
}
