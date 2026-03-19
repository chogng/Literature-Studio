import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import type { SidebarArticle, SidebarLabels, SidebarProps } from './sidebarView';

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

// Keep sidebar mapping in the workbench part layer so the view stays focused on rendering.
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
