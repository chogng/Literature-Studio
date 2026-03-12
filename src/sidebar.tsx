import { Button } from './components/Button';
import DateRangePicker from './components/DateRangePicker';
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
  resultPanelTitle: string;
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
  onDatePickerOpenChange?: (isOpen: boolean) => void;
  onFetchLatestBatch: () => void;
  isBatchLoading: boolean;
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function Sidebar({
  articles,
  hasData,
  labels,
  batchStartDate,
  onBatchStartDateChange,
  batchEndDate,
  onBatchEndDateChange,
  onDatePickerOpenChange,
  onFetchLatestBatch,
  isBatchLoading,
}: SidebarProps) {
  const hasVisibleData = articles.length > 0;

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
          onOpenChange={onDatePickerOpenChange}
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
      <div className="panel-title">{labels.resultPanelTitle}</div>
      {hasVisibleData ? (
        <ul className="article-list">
          {articles.map((article, index) => (
            <li key={`${article.sourceUrl}-${article.fetchedAt}-${index}`} className="article-card">
              <h3>{article.title || labels.untitled}</h3>
              <p>
                <strong>DOI：</strong>
                {article.doi ?? labels.unknown}
              </p>
              <p>
                <strong>{labels.authors}</strong>
                {article.authors.length > 0 ? article.authors.join(', ') : labels.unknown}
              </p>
              <p>
                <strong>{labels.abstract}</strong>
                {article.abstractText ?? labels.unknown}
              </p>
              <p>
                <strong>{labels.publishedAt}</strong>
                {article.publishedAt ?? labels.unknown}
              </p>
              <p>
                <strong>{labels.source}</strong>
                {article.sourceUrl}
              </p>
              <p>
                <strong>{labels.fetchedAt}</strong>
                {formatTime(article.fetchedAt)}
              </p>
            </li>
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
