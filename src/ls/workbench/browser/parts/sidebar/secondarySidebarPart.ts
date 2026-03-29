import { jsx, jsxs } from "react/jsx-runtime";
import { CalendarRange, CheckSquare, Download } from "lucide-react";
import type {
  ArticleDetailsModalLabels,
  LibraryDocumentsResult,
} from "../../../../base/parts/sandbox/common/desktopTypes.js";
import type { Ref } from "react";
import { Button } from "../../../../base/browser/ui/button/button";
import type { Locale } from "../../../../../language/i18n";
import type { LocaleMessages } from "../../../../../language/locales";
import { DateRangePicker } from "../../../../base/browser/ui/dateRangePicker/dateRangePicker";
import {
  requestFocusTitlebarWebUrlInput,
  requestOpenAddressBarSourceMenu,
} from "../titlebar/titlebarActions";
import type { AssistantChatMessage } from "../../assistantModel";
import ArticleCard from "./articleCard";
import AuxiliarySidebar from "./auxiliarySidebar";
import PrimarySidebar from "./primarySidebar";
import "./media/secondarySidebar.css";

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
  libraryAction: string;
  pdfDownloadAction: string;
  writingAction: string;
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

export type SidebarSelectionModePhase = "off" | "multi" | "all";
export type SecondarySidebarProps = {
  articles: SidebarArticle[];
  hasData: boolean;
  locale: Locale;
  labels: SidebarLabels;
  batchStartDate: string;
  onBatchStartDateChange: (value: string) => void;
  batchEndDate: string;
  onBatchEndDateChange: (value: string) => void;
  onFetchLatestBatch: () => void;
  onDownloadPdf: (article: SidebarArticle) => Promise<void>;
  onOpenArticleDetails: (
    article: SidebarArticle,
    labels: ArticleDetailsModalLabels
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
  onDownloadPdf: SecondarySidebarProps["onDownloadPdf"];
  onOpenArticleDetails: SecondarySidebarProps["onOpenArticleDetails"];
  onToggleSelectionMode: SecondarySidebarProps["onToggleSelectionMode"];
  onToggleArticleSelected: SecondarySidebarProps["onToggleArticleSelected"];
};

type CreateSidebarPartLabelsParams = {
  ui: LocaleMessages;
};
type CreateSecondarySidebarPartPropsParams = {
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
    libraryAction: ui.sidebarLibraryAction,
    pdfDownloadAction: ui.sidebarPdfDownloadAction,
    writingAction: ui.sidebarWritingAction,
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

export function createSecondarySidebarPartProps({
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
}: CreateSecondarySidebarPartPropsParams): SecondarySidebarProps {
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

export type SecondarySidebarPartViewProps = SecondarySidebarProps & {
  partRef?: Ref<HTMLElement>;
};

function createArticleCardLabels(
  labels: SecondarySidebarProps["labels"]
): ArticleDetailsModalLabels {
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
  SecondarySidebarPartViewProps,
  | "articles"
  | "hasData"
  | "locale"
  | "labels"
  | "onDownloadPdf"
  | "onOpenArticleDetails"
  | "isSelectionModeEnabled"
  | "selectedArticleKeys"
  | "onToggleArticleSelected"
>) {
  if (articles.length > 0) {
    const articleCardLabels = createArticleCardLabels(labels);
    return jsx("ul", {
      className: "secondary-sidebar-article-list",

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
            isSelected: selectedArticleKeys.has(
              `${article.sourceUrl}::${article.fetchedAt}`
            ),
            onToggleSelected: onToggleArticleSelected,
          },
          `${article.sourceUrl}-${article.fetchedAt}-${index}`
        )
      ),
    });
  }

  // Distinguish "no data fetched yet" from "fetched but filtered out".
  if (hasData) {
    return jsx("div", {
      className: "secondary-sidebar-empty-state",
      children: labels.emptyFiltered,
    });
  }

  return jsxs("div", {
    className: "secondary-sidebar-empty-state",
    children: [
      jsx("button", {
        type: "button",
        className: "secondary-sidebar-empty-state-action",
        onClick: requestOpenAddressBarSourceMenu,
        children: labels.emptyAllQuickSourceAction,
      }),
      ` ${labels.emptyAllConnector} `,
      jsx("button", {
        type: "button",
        className: "secondary-sidebar-empty-state-action",
        onClick: requestFocusTitlebarWebUrlInput,
        children: labels.emptyAllInputLinkAction,
      }),
      labels.emptyAllInputLinkSuffix
        ? ` ${labels.emptyAllInputLinkSuffix}`
        : labels.emptyAll,
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
  SecondarySidebarPartViewProps,
  | "labels"
  | "batchStartDate"
  | "onBatchStartDateChange"
  | "batchEndDate"
  | "onBatchEndDateChange"
  | "onFetchLatestBatch"
  | "isBatchLoading"
  | "isSelectionModeEnabled"
  | "selectionModePhase"
  | "onToggleSelectionMode"
> & {
  hasSelectableArticles: boolean;
}) {
  const selectionButtonLabel =
    selectionModePhase === "off"
      ? labels.selectionModeEnterMulti
      : selectionModePhase === "multi"
      ? labels.selectionModeSelectAll
      : labels.selectionModeExit;

  // Date range + fetch trigger are grouped as the sticky command surface of the sidebar.
  return jsxs("div", {
    className: "secondary-sidebar-action-bar",
    children: [
      jsx(DateRangePicker, {
        className: "secondary-sidebar-date-picker",
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
        type: "button",
        className: [
          "secondary-sidebar-select-btn",
          isSelectionModeEnabled ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" "),
        variant: "secondary",
        size: "md",
        mode: "text",
        textMode: "with",
        iconMode: "with",
        leftIcon: jsx(CheckSquare, { size: 14, strokeWidth: 1.8 }),
        onClick: onToggleSelectionMode,
        disabled: !hasSelectableArticles && !isSelectionModeEnabled,
        "aria-pressed": isSelectionModeEnabled,
        children: selectionButtonLabel,
      }),
      jsx(Button, {
        type: "button",
        className: "secondary-sidebar-fetch-btn",
        variant: "primary",
        size: "md",
        mode: "text",
        textMode: "with",
        iconMode: "with",
        leftIcon: jsx(Download, { size: 14, strokeWidth: 1.8 }),
        onClick: onFetchLatestBatch,
        disabled: isBatchLoading,
        children: isBatchLoading ? labels.fetchLatestBusy : labels.fetchLatest,
      }),
    ],
  });
}

export function SecondarySidebarPartView({
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
}: SecondarySidebarPartViewProps) {
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

  return jsxs("section", {
    ref: partRef,
    className: "panel sidebar-panel",
    children: [actionBarView, contentView],
  });
}

export function PrimarySidebarPartView({
  partRef,
  labels,
  librarySnapshot,
  isLibraryLoading,
  onRefreshLibrary,
  onDownloadPdf,
  onCreateDraftTab,
}: {
  partRef?: Ref<HTMLElement>;
  labels: SidebarLabels;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
  onDownloadPdf?: () => void;
  onCreateDraftTab?: () => void;
}) {
  return jsx(PrimarySidebar, {
    partRef,
    labels,
    librarySnapshot,
    isLibraryLoading,
    onRefreshLibrary,
    onDownloadPdf,
    onCreateDraftTab,
  });
}

export function AuxiliarySidebarPartView({
  partRef,
  labels,
  isKnowledgeBaseModeEnabled,
  messages,
  question,
  onQuestionChange,
  isAsking,
  errorMessage,
  onAsk,
  availableArticleCount,
  conversations,
  activeConversationId,
  isHistoryOpen,
  isMoreMenuOpen,
  onCreateConversation,
  onActivateConversation,
  onCloseConversation,
  onToggleHistory,
  onToggleMoreMenu,
}: {
  partRef?: Ref<HTMLElement>;
  labels: SidebarLabels;
  isKnowledgeBaseModeEnabled: boolean;
  messages: AssistantChatMessage[];
  question: string;
  onQuestionChange: (value: string) => void;
  isAsking: boolean;
  errorMessage: string | null;
  onAsk: () => void;
  availableArticleCount: number;
  conversations: Array<{
    id: string;
    title: string;
    messages: AssistantChatMessage[];
  }>;
  activeConversationId: string;
  isHistoryOpen: boolean;
  isMoreMenuOpen: boolean;
  onCreateConversation: () => void;
  onActivateConversation: (conversationId: string) => void;
  onCloseConversation: (conversationId: string) => void;
  onToggleHistory: () => void;
  onToggleMoreMenu: () => void;
}) {
  return jsx("section", {
    ref: partRef,
    className: "panel sidebar-panel sidebar-panel-auxiliary",
    children: jsx(AuxiliarySidebar, {
      labels,
      isKnowledgeBaseModeEnabled,
      messages,
      question,
      onQuestionChange,
      isAsking,
      errorMessage,
      onAsk,
      availableArticleCount,
      conversations,
      activeConversationId,
      isHistoryOpen,
      isMoreMenuOpen,
      onCreateConversation,
      onActivateConversation,
      onCloseConversation,
      onToggleHistory,
      onToggleMoreMenu,
    }),
  });
}
