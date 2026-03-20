import { jsx, jsxs } from 'react/jsx-runtime';
import { CalendarRange, CheckSquare, Download } from 'lucide-react';
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
  articleType: string;
  authors: string;
  abstract: string;
  description: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  controlsAriaLabel: string;
  minimize: string;
  maximize: string;
  restore: string;
  close: string;
  emptyFiltered: string;
  emptyAll: string;
  startDate: string;
  endDate: string;
  fetchLatestBusy: string;
  fetchLatest: string;
  selectionMode: string;
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
  isSelectionModeEnabled: boolean;
  selectedArticleKeys: ReadonlySet<string>;
  onToggleSelectionMode: () => void;
  onToggleArticleSelected: (article: SidebarArticle) => void;
};

export type SidebarPartState = {
  ui: LocaleMessages;
  locale: Locale;
  articles: SidebarArticle[];
  hasData: boolean;
  batchStartDate: string;
  batchEndDate: string;
  isBatchLoading: boolean;
  isSelectionModeEnabled: boolean;
  selectedArticleKeys: ReadonlySet<string>;
};

export type SidebarPartActions = {
  onBatchStartDateChange: (value: string) => void;
  onBatchEndDateChange: (value: string) => void;
  onFetchLatestBatch: () => void;
  onDownloadPdf: SidebarProps['onDownloadPdf'];
  onOpenArticleDetails: SidebarProps['onOpenArticleDetails'];
  onToggleSelectionMode: SidebarProps['onToggleSelectionMode'];
  onToggleArticleSelected: SidebarProps['onToggleArticleSelected'];
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
    articleType: ui.articleType,
    authors: ui.authors,
    abstract: ui.abstract,
    description: ui.description,
    publishedAt: ui.publishedAt,
    source: ui.source,
    fetchedAt: ui.fetchedAt,
    controlsAriaLabel: ui.titlebarControls,
    minimize: ui.titlebarMinimize,
    maximize: ui.titlebarMaximize,
    restore: ui.titlebarRestore,
    close: ui.titlebarClose,
    emptyFiltered: ui.emptyFiltered,
    emptyAll: ui.emptyAll,
    startDate: ui.startDate,
    endDate: ui.endDate,
    fetchLatestBusy: ui.fetchLatestBusy,
    fetchLatest: ui.fetchLatest,
    selectionMode: ui.sidebarSelectionMode,
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
    isSelectionModeEnabled,
    selectedArticleKeys,
  },
  actions: {
    onBatchStartDateChange,
    onBatchEndDateChange,
    onFetchLatestBatch,
    onDownloadPdf,
    onOpenArticleDetails,
    onToggleSelectionMode,
    onToggleArticleSelected,
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
    isSelectionModeEnabled,
    selectedArticleKeys,
    onToggleSelectionMode,
    onToggleArticleSelected,
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
    articleType: labels.articleType,
    authors: labels.authors,
    abstract: labels.abstract,
    description: labels.description,
    publishedAt: labels.publishedAt,
    source: labels.source,
    fetchedAt: labels.fetchedAt,
    controlsAriaLabel: labels.controlsAriaLabel,
    minimize: labels.minimize,
    maximize: labels.maximize,
    restore: labels.restore,
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
  isSelectionModeEnabled,
  selectedArticleKeys,
  onToggleArticleSelected,
}: Pick<
  SidebarPartViewProps,
  | 'articles'
  | 'hasData'
  | 'locale'
  | 'labels'
  | 'onDownloadPdf'
  | 'onOpenArticleDetails'
  | 'isSelectionModeEnabled'
  | 'selectedArticleKeys'
  | 'onToggleArticleSelected'
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
            isSelectionModeEnabled,
            isSelected: selectedArticleKeys.has(`${article.sourceUrl}::${article.fetchedAt}`),
            onToggleSelected: onToggleArticleSelected,
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
  isSelectionModeEnabled,
  onToggleSelectionMode,
  hasSelectableArticles,
}: Pick<
  SidebarPartViewProps,
  | 'labels'
  | 'batchStartDate'
  | 'onBatchStartDateChange'
  | 'batchEndDate'
  | 'onBatchEndDateChange'
  | 'onFetchLatestBatch'
  | 'isBatchLoading'
  | 'isSelectionModeEnabled'
  | 'onToggleSelectionMode'
> & {
  hasSelectableArticles: boolean;
}) {
  // Date range + fetch trigger are grouped as the sticky command surface of the sidebar.
  return jsxs('div', {
    className: 'sidebar-action-bar',
    children: [
      jsx(DateRangePicker, {
        className: 'sidebar-date-picker',
        startDate: batchStartDate,
        endDate: batchEndDate,
        triggerIcon: jsx(CalendarRange, { size: 14, strokeWidth: 1.8 }),
        labels: {
          startDate: labels.startDate,
          endDate: labels.endDate,
        },
        onStartDateChange: onBatchStartDateChange,
        onEndDateChange: onBatchEndDateChange,
      }),
      jsx(Button, {
        type: 'button',
        className: ['sidebar-select-btn', isSelectionModeEnabled ? 'is-active' : '']
          .filter(Boolean)
          .join(' '),
        variant: 'secondary',
        size: 'md',
        mode: 'text',
        textMode: 'with',
        iconMode: 'with',
        leftIcon: jsx(CheckSquare, { size: 14, strokeWidth: 1.8 }),
        onClick: onToggleSelectionMode,
        disabled: !hasSelectableArticles,
        'aria-pressed': isSelectionModeEnabled,
        children: labels.selectionMode,
      }),
      jsx(Button, {
        type: 'button',
        className: 'sidebar-fetch-btn',
        variant: 'primary',
        size: 'md',
        mode: 'text',
        textMode: 'with',
        iconMode: 'with',
        leftIcon: jsx(Download, { size: 14, strokeWidth: 1.8 }),
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
  isSelectionModeEnabled,
  selectedArticleKeys,
  onToggleSelectionMode,
  onToggleArticleSelected,
}: SidebarPartViewProps) {
  const actionBarView = renderActionBar({
    labels,
    batchStartDate,
    onBatchStartDateChange,
    batchEndDate,
    onBatchEndDateChange,
    onFetchLatestBatch,
    isBatchLoading,
    isSelectionModeEnabled,
    onToggleSelectionMode,
    hasSelectableArticles: articles.length > 0,
  });
  const contentView = renderSidebarContent({
    articles,
    hasData,
    locale,
    labels,
    onDownloadPdf,
    onOpenArticleDetails,
    isSelectionModeEnabled,
    selectedArticleKeys,
    onToggleArticleSelected,
  });

  return jsxs('section', {
    ref: partRef,
    className: 'panel sidebar-panel',
    children: [actionBarView, contentView],
  });
}
