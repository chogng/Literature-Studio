import { jsx, jsxs } from 'react/jsx-runtime';
import type { Ref } from 'react';
import type { ArticleDetailsModalLabels } from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../../../base/browser/ui/button/button';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
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

export type SidebarPartState = {
  ui: LocaleMessages;
  locale: Locale;
  articles: SidebarArticle[];
  hasData: boolean;
  batchStartDate: string;
  batchEndDate: string;
  isBatchLoading: boolean;
};

export type SidebarPartActions = {
  onBatchStartDateChange: (value: string) => void;
  onBatchEndDateChange: (value: string) => void;
  onFetchLatestBatch: () => void;
  onDownloadPdf: SidebarProps['onDownloadPdf'];
  onOpenArticleDetails: SidebarProps['onOpenArticleDetails'];
};

type CreateSidebarPartLabelsParams = {
  ui: LocaleMessages;
};

type CreateSidebarPartPropsParams = {
  state: SidebarPartState;
  actions: SidebarPartActions;
};

// Keep sidebar label mapping centralized in the workbench part layer.
export function createSidebarPartLabels({
  ui,
}: CreateSidebarPartLabelsParams): SidebarLabels {
  return {
    untitled: ui.untitled,
    unknown: ui.unknown,
    authors: ui.authors,
    abstract: ui.abstract,
    description: ui.description,
    publishedAt: ui.publishedAt,
    source: ui.source,
    fetchedAt: ui.fetchedAt,
    close: ui.titlebarClose,
    emptyFiltered: ui.emptyFiltered,
    emptyAll: ui.emptyAll,
    startDate: ui.startDate,
    endDate: ui.endDate,
    fetchLatestBusy: ui.fetchLatestBusy,
    fetchLatest: ui.fetchLatest,
  };
}

export function createSidebarPartProps({
  state: {
    ui,
    locale,
    articles,
    hasData,
    batchStartDate,
    batchEndDate,
    isBatchLoading,
  },
  actions: {
    onBatchStartDateChange,
    onBatchEndDateChange,
    onFetchLatestBatch,
    onDownloadPdf,
    onOpenArticleDetails,
  },
}: CreateSidebarPartPropsParams): SidebarProps {
  return {
    articles,
    hasData,
    locale,
    labels: createSidebarPartLabels({ ui }),
    batchStartDate,
    onBatchStartDateChange,
    batchEndDate,
    onBatchEndDateChange,
    onFetchLatestBatch,
    onDownloadPdf,
    onOpenArticleDetails,
    isBatchLoading,
  };
}

export type SidebarPartViewProps = SidebarProps & {
  partRef?: Ref<HTMLElement>;
};

function createArticleCardLabels(labels: SidebarProps['labels']): ArticleDetailsModalLabels {
  // Keep modal labels aligned with card labels so both views stay localized consistently.
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
  SidebarPartViewProps,
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

  // Distinguish "no data fetched yet" from "fetched but filtered out".
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
  SidebarPartViewProps,
  | 'labels'
  | 'batchStartDate'
  | 'onBatchStartDateChange'
  | 'batchEndDate'
  | 'onBatchEndDateChange'
  | 'onFetchLatestBatch'
  | 'isBatchLoading'
>) {
  // Date range + fetch trigger are grouped as the sticky command surface of the sidebar.
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

export function SidebarPartView({
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
}: SidebarPartViewProps) {
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
