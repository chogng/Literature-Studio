import { jsx, jsxs } from 'react/jsx-runtime';
import type { Ref } from 'react';
import type { ArticleDetailsModalLabels } from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../../../base/browser/ui/button/button';
import type { Locale } from '../../../../../language/i18n';
import { DateRangePicker } from '../../../../base/browser/ui/dateRangePicker/dateRangePicker';
import ArticleCard from './articleCard';
import './media/sidebar.css';

export type SidebarArticle = {
  title: string;
  articleType: string | null;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  descriptionText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
  journalTitle?: string | null;
};

export type SidebarLabels = {
  untitled: string;
  unknown: string;
  authors: string;
  abstract: string;
  description?: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  close: string;
  emptyFiltered: string;
  emptyAll: string;
  startDate: string;
  endDate: string;
  fetchLatestBusy: string;
  fetchLatest: string;
};

export type SidebarProps = {
  articles: SidebarArticle[];
  hasData: boolean;
  locale: Locale;
  labels: SidebarLabels;
  batchStartDate: string;
  onBatchStartDateChange: (value: string) => void;
  batchEndDate: string;
  onBatchEndDateChange: (value: string) => void;
  onFetchLatestBatch: () => void;
  onDownloadPdf: (
    sourceUrl: string,
    articleTitle?: string,
    journalTitle?: string | null,
    doi?: string | null,
  ) => Promise<void>;
  onOpenArticleDetails: (
    article: SidebarArticle,
    labels: ArticleDetailsModalLabels,
  ) => void | Promise<void>;
  isBatchLoading: boolean;
};

type SidebarViewProps = SidebarProps & {
  partRef?: Ref<HTMLElement>;
};

function createArticleCardLabels(labels: SidebarProps['labels']): ArticleDetailsModalLabels {
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
  onOpenArticleDetails,
}: Pick<
  SidebarViewProps,
  'articles' | 'hasData' | 'locale' | 'labels' | 'onDownloadPdf' | 'onOpenArticleDetails'
>) {
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
            onOpenArticleDetails,
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
  onOpenArticleDetails,
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
    onOpenArticleDetails,
  });

  return jsxs('section', {
    ref: partRef,
    className: 'panel sidebar-panel',
    children: [actionBarView, contentView],
  });
}
