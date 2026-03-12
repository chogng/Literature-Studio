import { useCallback, useEffect, useRef } from 'react';
import Sidebar from '../sidebar';
import type { ReaderViewProps } from './types';

export default function ReaderView({
  isSidebarOpen,
  filteredArticles,
  hasData,
  batchStartDate,
  onBatchStartDateChange,
  batchEndDate,
  onBatchEndDateChange,
  onFetchLatestBatch,
  isBatchLoading,
  browserUrl,
  previewCurrentUrl,
  iframeReloadKey,
  electronRuntime,
  previewRuntime,
  labels,
}: ReaderViewProps) {
  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const hasPreviewSurface = Boolean(browserUrl);

  const handleDatePickerOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!previewRuntime || !window.electronAPI?.preview) return;
      if (!browserUrl) return;
      window.electronAPI.preview.setVisible(!isOpen);
    },
    [browserUrl, previewRuntime],
  );

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) return;

    const preview = window.electronAPI.preview;
    const syncBounds = () => {
      const host = previewHostRef.current;
      if (!host) {
        preview.setBounds(null);
        return;
      }

      const rect = host.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      if (width <= 0 || height <= 0) {
        preview.setBounds(null);
        return;
      }

      preview.setBounds({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width,
        height,
      });
    };

    const host = previewHostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(syncBounds);
    observer.observe(host);

    const frameId = window.requestAnimationFrame(syncBounds);
    window.addEventListener('resize', syncBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncBounds);
      window.cancelAnimationFrame(frameId);
      preview.setBounds(null);
    };
  }, [hasPreviewSurface, previewRuntime]);

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) return;

    const preview = window.electronAPI.preview;
    if (!browserUrl) {
      preview.setVisible(false);
      preview.setBounds(null);
      return;
    }

    preview.setVisible(true);
    if (browserUrl !== previewCurrentUrl) {
      void preview.navigate(browserUrl).catch(() => {
        preview.setVisible(false);
      });
    }
  }, [browserUrl, previewCurrentUrl, previewRuntime]);

  useEffect(() => {
    if (!previewRuntime || !window.electronAPI?.preview) return;

    const preview = window.electronAPI.preview;
    return () => {
      preview.setVisible(false);
      preview.setBounds(null);
    };
  }, [previewRuntime]);

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
            startDate: labels.startDate,
            endDate: labels.endDate,
            fetchLatestBusy: labels.fetchLatestBusy,
            fetchLatest: labels.fetchLatest,
          }}
          batchStartDate={batchStartDate}
          onBatchStartDateChange={onBatchStartDateChange}
          batchEndDate={batchEndDate}
          onBatchEndDateChange={onBatchEndDateChange}
          onDatePickerOpenChange={handleDatePickerOpenChange}
          onFetchLatestBatch={onFetchLatestBatch}
          isBatchLoading={isBatchLoading}
        />
      ) : null}

      <section className="panel web-panel">
        <div className="web-frame-container">
          <div className="native-webview-host">
            {browserUrl ? (
              electronRuntime ? (
                previewRuntime ? (
                  <div ref={previewHostRef} className="web-frame web-frame-placeholder" aria-hidden="true" />
                ) : (
                  <div className="empty-state preview-runtime-warning">{labels.previewUnavailable}</div>
                )
              ) : (
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
