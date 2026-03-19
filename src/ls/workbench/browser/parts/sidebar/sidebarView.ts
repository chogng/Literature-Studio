import { jsx, jsxs } from 'react/jsx-runtime';
import type { Ref } from 'react';
import { Button } from '../../../../base/browser/ui/button/button';
import ArticleCard from './articleCard';
import DateRangePicker from './dateRangePicker';
import type { SidebarProps } from './sidebarModel';
import './media/sidebar.css';

type SidebarViewProps = SidebarProps & {
  partRef?: Ref<HTMLElement>;
};

function createArticleCardLabels(labels: SidebarProps['labels']) {
  return {
    untitled: labels.untitled,
    unknown: labels.unknown,
    authors: labels.authors,
    abstract: labels.abstract,
    description: labels.description,
    publishedAt: labels.publishedAt,
    source: labels.source,
    fetchedAt: labels.fetchedAt,
    close: labels.close,
  };
}

function renderSidebarContent({
  articles,
  hasData,
  locale,
  labels,
  onDownloadPdf,
}: Pick<SidebarViewProps, 'articles' | 'hasData' | 'locale' | 'labels' | 'onDownloadPdf'>) {
  if (articles.length > 0) {
    const articleCardLabels = createArticleCardLabels(labels);

    return jsx('ul', {
      className: 'article-list',
      children: articles.map((article, index) =>
        jsx(
          ArticleCard,
          {
            article,
            locale,
            labels: articleCardLabels,
            onDownloadPdf,
          },
          `${article.sourceUrl}-${article.fetchedAt}-${index}`,
        ),
      ),
    });
  }

  return hasData
    ? jsx('div', { className: 'sidebar-empty-state', children: labels.emptyFiltered })
    : jsx('div', { className: 'sidebar-empty-state', children: labels.emptyAll });
}

function renderActionBar({
  labels,
  batchStartDate,
  onBatchStartDateChange,
  batchEndDate,
  onBatchEndDateChange,
  onFetchLatestBatch,
  isBatchLoading,
}: Pick<
  SidebarViewProps,
  | 'labels'
  | 'batchStartDate'
  | 'onBatchStartDateChange'
  | 'batchEndDate'
  | 'onBatchEndDateChange'
  | 'onFetchLatestBatch'
  | 'isBatchLoading'
>) {
  return jsxs('div', {
    className: 'sidebar-action-bar',
    children: [
      jsx(DateRangePicker, {
        className: 'sidebar-date-picker',
        startDate: batchStartDate,
        endDate: batchEndDate,
        labels: {
          startDate: labels.startDate,
          endDate: labels.endDate,
        },
        onStartDateChange: onBatchStartDateChange,
        onEndDateChange: onBatchEndDateChange,
      }),
      jsx(Button, {
        type: 'button',
        className: 'sidebar-fetch-btn',
        variant: 'primary',
        mode: 'text',
        textMode: 'with',
        iconMode: 'without',
        onClick: onFetchLatestBatch,
        disabled: isBatchLoading,
        children: isBatchLoading ? labels.fetchLatestBusy : labels.fetchLatest,
      }),
    ],
  });
}

export default function SidebarView({
  partRef,
  articles,
  hasData,
  locale,
  labels,
  batchStartDate,
  onBatchStartDateChange,
  batchEndDate,
  onBatchEndDateChange,
  onFetchLatestBatch,
  onDownloadPdf,
  isBatchLoading,
}: SidebarViewProps) {
  const actionBarView = renderActionBar({
    labels,
    batchStartDate,
    onBatchStartDateChange,
    batchEndDate,
    onBatchEndDateChange,
    onFetchLatestBatch,
    isBatchLoading,
  });
  const contentView = renderSidebarContent({
    articles,
    hasData,
    locale,
    labels,
    onDownloadPdf,
  });

  return jsxs('section', {
    ref: partRef,
    className: 'panel sidebar-panel',
    children: [actionBarView, contentView],
  });
}
