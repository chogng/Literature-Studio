import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import Sidebar from '../sidebar';
import type { ReaderViewProps } from './types';

export default function ReaderView({
  isSidebarOpen,
  filteredArticles,
  hasData,
  homepageUrl,
  onHomepageUrlChange,
  filterKeyword,
  onFilterKeywordChange,
  batchStartDate,
  onBatchStartDateChange,
  batchEndDate,
  onBatchEndDateChange,
  filterJournal,
  onFilterJournalChange,
  onFetchLatestBatch,
  isBatchLoading,
  onResetFilters,
  filteredCount,
  totalCount,
  browserUrl,
  iframeReloadKey,
  electronRuntime,
  labels,
}: ReaderViewProps) {
  const webviewRef = useRef<DesktopWebviewTag | null>(null);

  // 把 browserUrl 变化同步给已挂载的 webview（src 变了 React 不一定重建元素）
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !browserUrl) return;
    if ((wv as HTMLElement & { src?: string }).src !== browserUrl) {
      (wv as HTMLElement & { src?: string }).src = browserUrl;
    }
  }, [browserUrl]);
  return (
    <main className={`content-grid ${isSidebarOpen ? '' : 'is-sidebar-collapsed'}`.trim()}>
      {isSidebarOpen ? (
        <Sidebar
          articles={filteredArticles}
          hasData={hasData}
          labels={{
            resultPanelTitle: labels.resultPanelTitle,
            untitled: labels.untitled,
            unknown: labels.unknown,
            authors: labels.authors,
            abstract: labels.abstract,
            publishedAt: labels.publishedAt,
            source: labels.source,
            fetchedAt: labels.fetchedAt,
            emptyFiltered: labels.emptyFiltered,
            emptyAll: labels.emptyAll,
          }}
          homepageUrl={homepageUrl}
          onHomepageUrlChange={onHomepageUrlChange}
          filterKeyword={filterKeyword}
          onFilterKeywordChange={onFilterKeywordChange}
          homepageUrlPlaceholder={labels.homepageUrlPlaceholder}
          keywordFilterPlaceholder={labels.keywordFilterPlaceholder}
        />
      ) : null}

      <section className="panel web-panel">
        <header className="content-header">
          <div className="date-filters">
            <label className="inline-field">
              {labels.startDate}
              <input
                type="date"
                className="date-input"
                value={batchStartDate}
                onChange={(event) => onBatchStartDateChange(event.target.value)}
              />
            </label>
            <label className="inline-field">
              {labels.endDate}
              <input
                type="date"
                className="date-input"
                value={batchEndDate}
                onChange={(event) => onBatchEndDateChange(event.target.value)}
              />
            </label>
          </div>

          <input
            className="filter-input pill-input source-filter"
            type="text"
            value={filterJournal}
            onChange={(event) => onFilterJournalChange(event.target.value)}
            placeholder={labels.journalFilterPlaceholder}
          />

          <div className="content-actions">
            <button
              type="button"
              className="primary-btn fetch-btn"
              onClick={onFetchLatestBatch}
              disabled={isBatchLoading}
            >
              {isBatchLoading ? labels.fetchLatestBusy : labels.fetchLatest}
            </button>
            <button
              className="icon-btn"
              type="button"
              onClick={onResetFilters}
              disabled={!filterKeyword && !filterJournal}
              title={labels.resetFilter}
            >
              <RotateCcw size={16} />
            </button>
            <span className="count-display">
              {labels.showing} {filteredCount} / {labels.total} {totalCount}
            </span>
          </div>
        </header>
        <div className="web-frame-container">
          <div className="native-webview-host">
            {browserUrl ? (
              electronRuntime ? (
                // Electron 环境：用 <webview> 绕过 X-Frame-Options / CSP 限制
                <webview
                  ref={(el) => { webviewRef.current = el as DesktopWebviewTag | null; }}
                  key={`wv-${browserUrl}`}
                  src={browserUrl}
                  className="web-frame"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                // 浏览器环境：回退 iframe
                <iframe
                  key={`${browserUrl}-${iframeReloadKey}`}
                  className="web-frame"
                  src={browserUrl}
                  title="Web Preview"
                  sandbox="allow-forms allow-scripts allow-same-origin"
                  scrolling="yes"
                />
              )
            ) : (
              <div className="empty-state">{labels.emptyState}</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
