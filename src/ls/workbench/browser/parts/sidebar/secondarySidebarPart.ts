import type {
  ArticleDetailsModalLabels,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import {
  createDateRangePickerView,
  type DateRangePickerView,
} from 'ls/base/browser/ui/dateRangePicker/dateRangePicker';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import type { Locale } from 'language/i18n';
import type { LocaleMessages } from 'language/locales';
import {
  requestFocusTitlebarWebUrlInput,
  requestOpenAddressBarSourceMenu,
} from 'ls/workbench/browser/parts/titlebar/titlebarActions';
import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from 'ls/workbench/browser/layout';
import { ArticleCard } from 'ls/workbench/browser/parts/sidebar/articleCard';
import 'ls/workbench/browser/parts/sidebar/media/secondarySidebar.css';

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
  contextRename: string;
  contextEditSourceUrl: string;
  contextDelete: string;
  assistantTitle: string;
  assistantDescriptionEnabled: string;
  assistantDescriptionDisabled: string;
  assistantModeOn: string;
  assistantModeOff: string;
  assistantReady: string;
  assistantPlaceholderEnabled: string;
  assistantPlaceholderDisabled: string;
  assistantVoice: string;
  assistantImage: string;
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
  onDownloadPdf: SecondarySidebarProps['onDownloadPdf'];
  onOpenArticleDetails: SecondarySidebarProps['onOpenArticleDetails'];
  onToggleSelectionMode: SecondarySidebarProps['onToggleSelectionMode'];
  onToggleArticleSelected: SecondarySidebarProps['onToggleArticleSelected'];
};

type CreateSidebarPartLabelsParams = {
  ui: LocaleMessages;
};
type CreateSecondarySidebarPartPropsParams = {
  state: SidebarPartState;
  actions: SidebarPartActions;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

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
    contextRename: ui.libraryContextRename,
    contextEditSourceUrl: ui.libraryContextEditSourceUrl,
    contextDelete: ui.libraryContextDelete,
    assistantTitle: ui.assistantSidebarTitle,
    assistantDescriptionEnabled: ui.assistantSidebarDescriptionEnabled,
    assistantDescriptionDisabled: ui.assistantSidebarDescriptionDisabled,
    assistantModeOn: ui.assistantSidebarModeOn,
    assistantModeOff: ui.assistantSidebarModeOff,
    assistantReady: ui.assistantSidebarReady,
    assistantPlaceholderEnabled: ui.assistantSidebarPlaceholderEnabled,
    assistantPlaceholderDisabled: ui.assistantSidebarPlaceholderDisabled,
    assistantVoice: ui.assistantSidebarVoice,
    assistantImage: ui.assistantSidebarImage,
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

function createArticleCardLabels(
  labels: SecondarySidebarProps['labels'],
): ArticleDetailsModalLabels {
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

export class SecondarySidebarPartView {
  private props: SecondarySidebarProps;
  private readonly element = createElement('section', 'panel sidebar-panel');
  private readonly actionBarElement = createElement(
    'div',
    'secondary-sidebar-action-bar',
  );
  private readonly contentElement = createElement('div');
  private readonly dateRangePicker: DateRangePickerView;
  private readonly selectionActionsView = createActionBarView({
    className: 'secondary-sidebar-selection-actionbar',
    ariaRole: 'group',
  });
  private readonly fetchButton = createElement('button');
  private cards = new Map<string, ArticleCard>();

  constructor(props: SecondarySidebarProps) {
    this.props = props;
    this.dateRangePicker = createDateRangePickerView({
      startDate: this.props.batchStartDate,
      endDate: this.props.batchEndDate,
      labels: {
        startDate: this.props.labels.startDate,
        endDate: this.props.labels.endDate,
      },
      onStartDateChange: (value) => this.props.onBatchStartDateChange(value),
      onEndDateChange: (value) => this.props.onBatchEndDateChange(value),
      className: 'sidebar-date-picker',
      triggerIcon: createLxIcon('calendar'),
      triggerMode: 'icon',
    });
    this.fetchButton.type = 'button';
    this.fetchButton.addEventListener('click', () =>
      this.props.onFetchLatestBatch(),
    );
    this.actionBarElement.append(
      this.dateRangePicker.getElement(),
      this.selectionActionsView.getElement(),
      this.fetchButton,
    );
    this.element.append(this.actionBarElement, this.contentElement);
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.secondarySidebar,
      this.element,
    );
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: SecondarySidebarProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.dateRangePicker.dispose();
    this.selectionActionsView.dispose();
    for (const card of this.cards.values()) {
      card.dispose();
    }
    this.cards.clear();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.secondarySidebar, null);
    this.element.replaceChildren();
  }

  private render() {
    const selectionButtonLabel =
      this.props.selectionModePhase === 'off'
        ? this.props.labels.selectionModeEnterMulti
        : this.props.selectionModePhase === 'multi'
          ? this.props.labels.selectionModeSelectAll
          : this.props.labels.selectionModeExit;

    this.dateRangePicker.setProps({
      startDate: this.props.batchStartDate,
      endDate: this.props.batchEndDate,
      labels: {
        startDate: this.props.labels.startDate,
        endDate: this.props.labels.endDate,
      },
      onStartDateChange: (value) => this.props.onBatchStartDateChange(value),
      onEndDateChange: (value) => this.props.onBatchEndDateChange(value),
      className: 'sidebar-date-picker',
      triggerIcon: createLxIcon('calendar'),
      triggerMode: 'icon',
    });

    this.selectionActionsView.setProps({
      className: 'secondary-sidebar-selection-actionbar',
      ariaRole: 'group',
      items: [
        {
          label: selectionButtonLabel,
          title: selectionButtonLabel,
          mode: 'icon',
          active: this.props.isSelectionModeEnabled,
          checked: this.props.isSelectionModeEnabled,
          disabled:
            !this.props.articles.length && !this.props.isSelectionModeEnabled,
          buttonClassName: 'secondary-sidebar-select-action',
          content: createLxIcon(lxIconSemanticMap.sidebar.selectionMode),
          onClick: () => this.props.onToggleSelectionMode(),
        },
      ],
    });

    this.fetchButton.className = [
      'btn-base',
      'btn-primary',
      'btn-md',
      'secondary-sidebar-fetch-btn',
    ].join(' ');
    this.fetchButton.textContent = this.props.isBatchLoading
      ? this.props.labels.fetchLatestBusy
      : this.props.labels.fetchLatest;
    this.fetchButton.disabled = this.props.isBatchLoading;

    this.renderContent();
  }

  private renderContent() {
    for (const [key, card] of this.cards) {
      if (
        !this.props.articles.some(
          (article, index) => `${article.sourceUrl}-${article.fetchedAt}-${index}` === key,
        )
      ) {
        card.dispose();
        this.cards.delete(key);
      }
    }

    if (this.props.articles.length > 0) {
      const articleCardLabels = createArticleCardLabels(this.props.labels);
      const list = createElement('ul', 'secondary-sidebar-article-list');
      this.props.articles.forEach((article, index) => {
        const key = `${article.sourceUrl}-${article.fetchedAt}-${index}`;
        const isSelected = this.props.selectedArticleKeys.has(
          `${article.sourceUrl}::${article.fetchedAt}`,
        );
        let card = this.cards.get(key);
        if (!card) {
          card = new ArticleCard({
            article,
            locale: this.props.locale,
            labels: articleCardLabels,
            onDownloadPdf: this.props.onDownloadPdf,
            onOpenArticleDetails: this.props.onOpenArticleDetails,
            isSelectionModeEnabled: this.props.isSelectionModeEnabled,
            isSelected,
            onToggleSelected: this.props.onToggleArticleSelected,
          });
          this.cards.set(key, card);
        } else {
          card.setProps({
            article,
            locale: this.props.locale,
            labels: articleCardLabels,
            onDownloadPdf: this.props.onDownloadPdf,
            onOpenArticleDetails: this.props.onOpenArticleDetails,
            isSelectionModeEnabled: this.props.isSelectionModeEnabled,
            isSelected,
            onToggleSelected: this.props.onToggleArticleSelected,
          });
        }
        list.append(card.getElement());
      });
      this.contentElement.replaceChildren(list);
      return;
    }

    const empty = createElement('div', 'secondary-sidebar-empty-state');
    if (this.props.hasData) {
      empty.textContent = this.props.labels.emptyFiltered;
      this.contentElement.replaceChildren(empty);
      return;
    }

    const quickSource = createElement(
      'button',
      'secondary-sidebar-empty-state-action',
    );
    quickSource.type = 'button';
    quickSource.textContent = this.props.labels.emptyAllQuickSourceAction;
    quickSource.addEventListener('click', requestOpenAddressBarSourceMenu);

    const inputLink = createElement(
      'button',
      'secondary-sidebar-empty-state-action',
    );
    inputLink.type = 'button';
    inputLink.textContent = this.props.labels.emptyAllInputLinkAction;
    inputLink.addEventListener('click', requestFocusTitlebarWebUrlInput);

    empty.append(
      quickSource,
      document.createTextNode(` ${this.props.labels.emptyAllConnector} `),
      inputLink,
      document.createTextNode(
        this.props.labels.emptyAllInputLinkSuffix
          ? ` ${this.props.labels.emptyAllInputLinkSuffix}`
          : this.props.labels.emptyAll,
      ),
    );
    this.contentElement.replaceChildren(empty);
  }
}

export function createSecondarySidebarPartView(props: SecondarySidebarProps) {
  return new SecondarySidebarPartView(props);
}
