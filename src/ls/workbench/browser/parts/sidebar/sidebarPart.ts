import { jsx, jsxs } from 'react/jsx-runtime';
import { CalendarRange, CheckSquare, Download } from 'lucide-react';
import type { ChangeEvent, Ref } from 'react';
import type {
  ArticleDetailsModalLabels,
  LibraryDocumentSummary,
  LibraryDocumentsResult,
  RagAnswerResult,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../../../base/browser/ui/button/button';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import { DateRangePicker } from '../../../../base/browser/ui/dateRangePicker/dateRangePicker';
import {
  requestFocusTitlebarWebUrlInput,
  requestOpenAddressBarSourceMenu,
} from '../titlebar/titlebarActions';
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
  sourceId?: string | null;
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
  emptyAllQuickSourceAction: string;
  emptyAllConnector: string;
  emptyAllInputLinkAction: string;
  emptyAllInputLinkSuffix: string;
  startDate: string;
  endDate: string;
  fetchLatestBusy: string;
  fetchLatest: string;
  selectionModeEnterMulti: string;
  selectionModeSelectAll: string;
  selectionModeExit: string;
  loading: string;
  refresh: string;
  libraryTitle: string;
  libraryDescription: string;
  libraryEmpty: string;
  libraryDocuments: string;
  libraryFiles: string;
  libraryQueuedJobs: string;
  libraryDbFile: string;
  libraryFilesDir: string;
  libraryCacheDir: string;
  libraryStatusRegistered: string;
  libraryStatusQueued: string;
  libraryStatusRunning: string;
  libraryStatusFailed: string;
  assistantTitle: string;
  assistantDescriptionEnabled: string;
  assistantDescriptionDisabled: string;
  assistantModeOn: string;
  assistantModeOff: string;
  assistantReady: string;
  assistantPlaceholderEnabled: string;
  assistantPlaceholderDisabled: string;
  assistantSend: string;
  assistantSendBusy: string;
  assistantQuestion: string;
  assistantQuestionPlaceholder: string;
  assistantContext: string;
  assistantContextPlaceholder: string;
  assistantAnswerTitle: string;
  assistantEvidenceTitle: string;
  assistantSources: string;
  assistantNoArticles: string;
  assistantQuestionRequired: string;
  assistantRerankOn: string;
  assistantRerankOff: string;
};

export type SidebarSelectionModePhase = 'off' | 'multi' | 'all';

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
    article: SidebarArticle,
  ) => Promise<void>;
  onOpenArticleDetails: (
    article: SidebarArticle,
    labels: ArticleDetailsModalLabels,
  ) => void | Promise<void>;
  isBatchLoading: boolean;
  isSelectionModeEnabled: boolean;
  selectionModePhase: SidebarSelectionModePhase;
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
  selectionModePhase: SidebarSelectionModePhase;
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
    emptyAllQuickSourceAction: ui.emptyAllQuickSourceAction,
    emptyAllConnector: ui.emptyAllConnector,
    emptyAllInputLinkAction: ui.emptyAllInputLinkAction,
    emptyAllInputLinkSuffix: ui.emptyAllInputLinkSuffix,
    startDate: ui.startDate,
    endDate: ui.endDate,
    fetchLatestBusy: ui.fetchLatestBusy,
    fetchLatest: ui.fetchLatest,
    selectionModeEnterMulti: ui.sidebarSelectionModeEnterMulti,
    selectionModeSelectAll: ui.sidebarSelectionModeSelectAll,
    selectionModeExit: ui.sidebarSelectionModeExit,
    loading: ui.settingsLoading,
    refresh: ui.titlebarRefresh,
    libraryTitle: ui.settingsLibraryTitle,
    libraryDescription: ui.knowledgeBaseSidebarDescription,
    libraryEmpty: ui.knowledgeBaseSidebarEmpty,
    libraryDocuments: ui.settingsLibraryStatusDocuments,
    libraryFiles: ui.settingsLibraryStatusFiles,
    libraryQueuedJobs: ui.settingsLibraryStatusQueuedJobs,
    libraryDbFile: ui.settingsLibraryDbFile,
    libraryFilesDir: ui.settingsLibraryFilesDir,
    libraryCacheDir: ui.settingsLibraryCacheDir,
    libraryStatusRegistered: ui.settingsLibraryDocumentRegistered,
    libraryStatusQueued: ui.settingsLibraryDocumentQueued,
    libraryStatusRunning: ui.settingsLibraryDocumentRunning,
    libraryStatusFailed: ui.settingsLibraryDocumentFailed,
    assistantTitle: ui.assistantSidebarTitle,
    assistantDescriptionEnabled: ui.assistantSidebarDescriptionEnabled,
    assistantDescriptionDisabled: ui.assistantSidebarDescriptionDisabled,
    assistantModeOn: ui.assistantSidebarModeOn,
    assistantModeOff: ui.assistantSidebarModeOff,
    assistantReady: ui.assistantSidebarReady,
    assistantPlaceholderEnabled: ui.assistantSidebarPlaceholderEnabled,
    assistantPlaceholderDisabled: ui.assistantSidebarPlaceholderDisabled,
    assistantSend: ui.assistantSidebarSend,
    assistantSendBusy: ui.assistantSidebarSendBusy,
    assistantQuestion: ui.assistantSidebarQuestion,
    assistantQuestionPlaceholder: ui.assistantSidebarQuestionPlaceholder,
    assistantContext: ui.assistantSidebarContext,
    assistantContextPlaceholder: ui.assistantSidebarContextPlaceholder,
    assistantAnswerTitle: ui.assistantSidebarAnswerTitle,
    assistantEvidenceTitle: ui.assistantSidebarEvidenceTitle,
    assistantSources: ui.assistantSidebarSources,
    assistantNoArticles: ui.assistantSidebarNoArticles,
    assistantQuestionRequired: ui.assistantSidebarQuestionRequired,
    assistantRerankOn: ui.assistantSidebarRerankOn,
    assistantRerankOff: ui.assistantSidebarRerankOff,
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
    selectionModePhase,
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
    selectionModePhase,
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
  if (hasData) {
    return jsx('div', { className: 'sidebar-empty-state', children: labels.emptyFiltered });
  }

  return jsxs('div', {
    className: 'sidebar-empty-state',
    children: [
      jsx('button', {
        type: 'button',
        className: 'sidebar-empty-state-action',
        onClick: requestOpenAddressBarSourceMenu,
        children: labels.emptyAllQuickSourceAction,
      }),
      ` ${labels.emptyAllConnector} `,
      jsx('button', {
        type: 'button',
        className: 'sidebar-empty-state-action',
        onClick: requestFocusTitlebarWebUrlInput,
        children: labels.emptyAllInputLinkAction,
      }),
      labels.emptyAllInputLinkSuffix ? ` ${labels.emptyAllInputLinkSuffix}` : labels.emptyAll,
    ],
  });
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
  selectionModePhase,
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
  | 'selectionModePhase'
  | 'onToggleSelectionMode'
> & {
  hasSelectableArticles: boolean;
}) {
  const selectionButtonLabel =
    selectionModePhase === 'off'
      ? labels.selectionModeEnterMulti
      : selectionModePhase === 'multi'
        ? labels.selectionModeSelectAll
        : labels.selectionModeExit;

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
        disabled: !hasSelectableArticles && !isSelectionModeEnabled,
        'aria-pressed': isSelectionModeEnabled,
        children: selectionButtonLabel,
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
  selectionModePhase,
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
    selectionModePhase,
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

function formatLibraryDate(value: string | null) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized;
}

function resolveLibraryDocumentStatusLabel(
  labels: Pick<
    SidebarLabels,
    | 'libraryStatusRegistered'
    | 'libraryStatusQueued'
    | 'libraryStatusRunning'
    | 'libraryStatusFailed'
  >,
  document: LibraryDocumentSummary,
) {
  if (document.latestJobStatus === 'failed' || document.ingestStatus === 'failed') {
    return labels.libraryStatusFailed;
  }

  if (document.latestJobStatus === 'running' || document.ingestStatus === 'indexing') {
    return labels.libraryStatusRunning;
  }

  if (document.latestJobStatus === 'queued' || document.ingestStatus === 'queued') {
    return labels.libraryStatusQueued;
  }

  return labels.libraryStatusRegistered;
}

function renderLibraryDocumentItem(
  document: LibraryDocumentSummary,
  index: number,
  labels: SidebarLabels,
) {
  const title = document.title?.trim() || labels.untitled;
  const authors = document.authors.length > 0 ? document.authors.join(', ') : labels.unknown;
  const journal = document.journalTitle?.trim() || labels.unknown;
  const publishedAt = formatLibraryDate(document.publishedAt);
  const statusLabel = resolveLibraryDocumentStatusLabel(labels, document);

  return jsxs(
    'li',
    {
      className: 'library-doc-card',
      children: [
        jsxs('div', {
          className: 'library-doc-card-main',
          children: [
            jsx('h3', { className: 'library-doc-card-title', title, children: title }),
            jsx('p', { className: 'library-doc-card-meta', children: authors }),
            jsx('p', {
              className: 'library-doc-card-meta',
              children: [journal, publishedAt].filter(Boolean).join(' | ') || labels.unknown,
            }),
          ],
        }),
        jsxs('div', {
          className: 'library-doc-card-aside',
          children: [
            jsx('span', {
              className: `library-doc-status library-doc-status-${document.ingestStatus}`,
              children: statusLabel,
            }),
            jsx('span', { className: 'library-doc-count', children: document.fileCount }),
          ],
        }),
      ],
    },
    `${document.documentId}-${index}`,
  );
}

function renderPrimarySidebarContent({
  labels,
  librarySnapshot,
  isLibraryLoading,
  onRefreshLibrary,
}: {
  labels: SidebarLabels;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
}) {
  return jsxs('div', {
    className: 'sidebar-primary-content',
    children: [
      jsxs('div', {
        className: 'sidebar-workbench-header',
        children: [
          jsxs('div', {
            className: 'sidebar-workbench-header-main',
            children: [
              jsx('h2', { className: 'sidebar-workbench-title', children: labels.libraryTitle }),
              jsx('p', {
                className: 'sidebar-workbench-description',
                children: labels.libraryDescription,
              }),
            ],
          }),
          jsx(Button, {
            type: 'button',
            className: 'sidebar-refresh-btn',
            variant: 'secondary',
            size: 'sm',
            mode: 'text',
            textMode: 'with',
            iconMode: 'without',
            onClick: onRefreshLibrary,
            disabled: isLibraryLoading || !onRefreshLibrary,
            children: isLibraryLoading ? labels.loading : labels.refresh,
          }),
        ],
      }),
      jsxs('div', {
        className: 'sidebar-stats-grid',
        children: [
          jsxs('div', {
            className: 'sidebar-stat-card',
            children: [
              jsx('span', { children: labels.libraryDocuments }),
              jsx('strong', { children: librarySnapshot.totalCount }),
            ],
          }),
          jsxs('div', {
            className: 'sidebar-stat-card',
            children: [
              jsx('span', { children: labels.libraryFiles }),
              jsx('strong', { children: librarySnapshot.fileCount }),
            ],
          }),
          jsxs('div', {
            className: 'sidebar-stat-card',
            children: [
              jsx('span', { children: labels.libraryQueuedJobs }),
              jsx('strong', { children: librarySnapshot.queuedJobCount }),
            ],
          }),
        ],
      }),
      jsxs('div', {
        className: 'sidebar-path-stack',
        children: [
          jsxs('p', {
            children: [
              `${labels.libraryDbFile}: `,
              jsx('code', { children: librarySnapshot.libraryDbFile || labels.unknown }),
            ],
          }),
          jsxs('p', {
            children: [
              `${labels.libraryFilesDir}: `,
              jsx('code', {
                children: librarySnapshot.defaultManagedDirectory || labels.unknown,
              }),
            ],
          }),
          jsxs('p', {
            children: [
              `${labels.libraryCacheDir}: `,
              jsx('code', { children: librarySnapshot.ragCacheDir || labels.unknown }),
            ],
          }),
        ],
      }),
      librarySnapshot.items.length > 0
        ? jsx('ul', {
            className: 'library-doc-list',
            children: librarySnapshot.items.map((document, index) =>
              renderLibraryDocumentItem(document, index, labels),
            ),
          })
        : jsx('div', {
            className: 'sidebar-empty-state sidebar-empty-state-library',
            children: labels.libraryEmpty,
          }),
    ],
  });
}

export function PrimarySidebarPartView({
  partRef,
  labels,
  librarySnapshot,
  isLibraryLoading,
  onRefreshLibrary,
}: {
  partRef?: Ref<HTMLElement>;
  labels: SidebarLabels;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
}) {
  return jsx('section', {
    ref: partRef,
    className: 'panel sidebar-panel sidebar-panel-primary',
    children: renderPrimarySidebarContent({
      labels,
      librarySnapshot,
      isLibraryLoading,
      onRefreshLibrary,
    }),
  });
}

function renderAuxiliarySidebarContent({
  labels,
  isKnowledgeBaseModeEnabled,
  librarySnapshot,
  question,
  onQuestionChange,
  writingContext,
  onWritingContextChange,
  result,
  isAsking,
  errorMessage,
  onAsk,
  availableArticleCount,
}: {
  labels: SidebarLabels;
  isKnowledgeBaseModeEnabled: boolean;
  librarySnapshot: LibraryDocumentsResult;
  question: string;
  onQuestionChange: (value: string) => void;
  writingContext: string;
  onWritingContextChange: (value: string) => void;
  result: RagAnswerResult | null;
  isAsking: boolean;
  errorMessage: string | null;
  onAsk: () => void;
  availableArticleCount: number;
}) {
  return jsxs('div', {
    className: 'sidebar-auxiliary-content',
    children: [
      jsxs('div', {
        className: 'sidebar-workbench-header',
        children: [
          jsxs('div', {
            className: 'sidebar-workbench-header-main',
            children: [
              jsx('h2', { className: 'sidebar-workbench-title', children: labels.assistantTitle }),
              jsx('p', {
                className: 'sidebar-workbench-description',
                children: isKnowledgeBaseModeEnabled
                  ? labels.assistantDescriptionEnabled
                  : labels.assistantDescriptionDisabled,
              }),
            ],
          }),
          jsx('span', {
            className: `sidebar-mode-pill ${isKnowledgeBaseModeEnabled ? 'is-enabled' : 'is-disabled'}`,
            children: isKnowledgeBaseModeEnabled
              ? labels.assistantModeOn
              : labels.assistantModeOff,
          }),
        ],
      }),
      jsxs('div', {
        className: 'sidebar-stats-grid',
        children: [
          jsxs('div', {
            className: 'sidebar-stat-card',
            children: [
              jsx('span', { children: labels.libraryDocuments }),
              jsx('strong', { children: librarySnapshot.totalCount }),
            ],
          }),
          jsxs('div', {
            className: 'sidebar-stat-card',
            children: [
              jsx('span', { children: labels.assistantSources }),
              jsx('strong', { children: availableArticleCount }),
            ],
          }),
          jsxs('div', {
            className: 'sidebar-stat-card',
            children: [
              jsx('span', { children: labels.libraryQueuedJobs }),
              jsx('strong', { children: librarySnapshot.queuedJobCount }),
            ],
          }),
        ],
      }),
      jsxs('div', {
        className: 'sidebar-chat-placeholder',
        children: [
          jsxs('label', {
            className: 'sidebar-chat-field',
            children: [
              jsx('span', { className: 'sidebar-chat-label', children: labels.assistantQuestion }),
              jsx('textarea', {
                className: 'sidebar-chat-input',
                rows: 4,
                value: question,
                onChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
                  onQuestionChange(event.target.value),
                placeholder: isKnowledgeBaseModeEnabled
                  ? labels.assistantQuestionPlaceholder
                  : labels.assistantPlaceholderDisabled,
                disabled: !isKnowledgeBaseModeEnabled || isAsking,
              }),
            ],
          }),
          jsxs('label', {
            className: 'sidebar-chat-field',
            children: [
              jsx('span', { className: 'sidebar-chat-label', children: labels.assistantContext }),
              jsx('textarea', {
                className: 'sidebar-chat-input sidebar-chat-context-input',
                rows: 5,
                value: writingContext,
                onChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
                  onWritingContextChange(event.target.value),
                placeholder: labels.assistantContextPlaceholder,
                disabled: !isKnowledgeBaseModeEnabled || isAsking,
              }),
            ],
          }),
          errorMessage
            ? jsx('p', {
                className: 'sidebar-chat-error',
                children: errorMessage,
              })
            : null,
          !errorMessage && isKnowledgeBaseModeEnabled && availableArticleCount === 0
            ? jsx('p', {
                className: 'sidebar-chat-error',
                children: labels.assistantNoArticles,
              })
            : null,
          jsx(Button, {
            type: 'button',
            className: 'sidebar-chat-send-btn',
            variant: 'secondary',
            size: 'md',
            mode: 'text',
            textMode: 'with',
            iconMode: 'without',
            disabled:
              !isKnowledgeBaseModeEnabled || isAsking || availableArticleCount === 0 || !question.trim(),
            onClick: onAsk,
            children: isAsking ? labels.assistantSendBusy : labels.assistantSend,
          }),
          result
            ? jsxs('div', {
                className: 'sidebar-chat-result',
                children: [
                  jsxs('div', {
                    className: 'sidebar-chat-result-header',
                    children: [
                      jsx('strong', { children: labels.assistantAnswerTitle }),
                      jsx('span', {
                        className: `sidebar-mode-pill ${result.rerankApplied ? 'is-enabled' : 'is-disabled'}`,
                        children: result.rerankApplied
                          ? labels.assistantRerankOn
                          : labels.assistantRerankOff,
                      }),
                    ],
                  }),
                  jsx('p', {
                    className: 'sidebar-chat-answer',
                    children: result.answer,
                  }),
                  result.evidence.length > 0
                    ? jsxs('div', {
                        className: 'sidebar-chat-evidence',
                        children: [
                          jsx('strong', { children: labels.assistantEvidenceTitle }),
                          jsx('ul', {
                            className: 'sidebar-chat-evidence-list',
                            children: result.evidence.map((item) =>
                              jsxs(
                                'li',
                                {
                                  className: 'sidebar-chat-evidence-item',
                                  children: [
                                    jsx('strong', {
                                      className: 'sidebar-chat-evidence-title',
                                      children: `[${item.rank}] ${item.title}`,
                                    }),
                                    jsx('p', {
                                      className: 'sidebar-chat-evidence-meta',
                                      children: [item.journalTitle, item.publishedAt]
                                        .filter(Boolean)
                                        .join(' | '),
                                    }),
                                    jsx('p', {
                                      className: 'sidebar-chat-evidence-text',
                                      children: item.excerpt,
                                    }),
                                  ],
                                },
                                `${item.sourceUrl}-${item.rank}`,
                              ),
                            ),
                          }),
                        ],
                      })
                    : null,
                ],
              })
            : jsx('textarea', {
            className: 'sidebar-chat-input',
            rows: 6,
            readOnly: true,
            value: isKnowledgeBaseModeEnabled
              ? labels.assistantPlaceholderEnabled
              : labels.assistantPlaceholderDisabled,
          }),
        ],
      }),
    ],
  });
}

export function AuxiliarySidebarPartView({
  partRef,
  labels,
  isKnowledgeBaseModeEnabled,
  librarySnapshot,
  question,
  onQuestionChange,
  writingContext,
  onWritingContextChange,
  result,
  isAsking,
  errorMessage,
  onAsk,
  availableArticleCount,
}: {
  partRef?: Ref<HTMLElement>;
  labels: SidebarLabels;
  isKnowledgeBaseModeEnabled: boolean;
  librarySnapshot: LibraryDocumentsResult;
  question: string;
  onQuestionChange: (value: string) => void;
  writingContext: string;
  onWritingContextChange: (value: string) => void;
  result: RagAnswerResult | null;
  isAsking: boolean;
  errorMessage: string | null;
  onAsk: () => void;
  availableArticleCount: number;
}) {
  return jsx('section', {
    ref: partRef,
    className: 'panel sidebar-panel sidebar-panel-auxiliary',
    children: renderAuxiliarySidebarContent({
      labels,
      isKnowledgeBaseModeEnabled,
      librarySnapshot,
      question,
      onQuestionChange,
      writingContext,
      onWritingContextChange,
      result,
      isAsking,
      errorMessage,
      onAsk,
      availableArticleCount,
    }),
  });
}
