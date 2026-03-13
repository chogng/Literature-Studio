import { Button } from './components/Button';
import DateRangePicker from './components/DateRangePicker';
import ArticleCard from './articleCard';
import './sidebar.css';

export type SidebarArticle = {
  title: string;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
};

type SidebarLabels = {
  untitled: string;
  unknown: string;
  authors: string;
  abstract: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  emptyFiltered: string;
  emptyAll: string;
  startDate: string;
  endDate: string;
  fetchLatestBusy: string;
  fetchLatest: string;
};

type SidebarProps = {
  articles: SidebarArticle[];
  hasData: boolean;
  labels: SidebarLabels;
  batchStartDate: string;
  onBatchStartDateChange: (value: string) => void;
  batchEndDate: string;
  onBatchEndDateChange: (value: string) => void;
  onFetchLatestBatch: () => void;
  isBatchLoading: boolean;
};

export default function Sidebar({
  articles,
  hasData,
  labels,
  batchStartDate,
  onBatchStartDateChange,
  batchEndDate,
  onBatchEndDateChange,
  onFetchLatestBatch,
  isBatchLoading,
}: SidebarProps) {
  const hasVisibleData = articles.length > 0;
  const articleCardLabels = {
    untitled: labels.untitled,
    unknown: labels.unknown,
    authors: labels.authors,
    abstract: labels.abstract,
    publishedAt: labels.publishedAt,
    source: labels.source,
    fetchedAt: labels.fetchedAt,
  };

  return (
    <section className="panel sidebar-panel">
      <div className="sidebar-action-bar">
        <DateRangePicker
          className="sidebar-date-picker"
          startDate={batchStartDate}
          endDate={batchEndDate}
          labels={{
            startDate: labels.startDate,
            endDate: labels.endDate,
          }}
          onStartDateChange={onBatchStartDateChange}
          onEndDateChange={onBatchEndDateChange}
        />
        <Button
          type="button"
          className="fetch-btn sidebar-fetch-btn"
          variant="primary"
          mode="text"
          textMode="with"
          iconMode="without"
          onClick={onFetchLatestBatch}
          disabled={isBatchLoading}
        >
          {isBatchLoading ? labels.fetchLatestBusy : labels.fetchLatest}
        </Button>
      </div>
      {hasVisibleData ? (
        <ul className="article-list">
          {articles.map((article, index) => (
            <ArticleCard
              key={`${article.sourceUrl}-${article.fetchedAt}-${index}`}
              article={article}
              labels={articleCardLabels}
            />
          ))}
        </ul>
      ) : hasData ? (
        <div className="sidebar-empty-state">{labels.emptyFiltered}</div>
      ) : (
        <div className="sidebar-empty-state">{labels.emptyAll}</div>
      )}
    </section>
  );
}
