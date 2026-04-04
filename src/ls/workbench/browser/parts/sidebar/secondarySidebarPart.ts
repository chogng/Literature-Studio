import type {
  ArticleDetailsModalLabels,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { LifecycleOwner, LifecycleStore, toDisposable } from 'ls/base/common/lifecycle';
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
  fetchTitle: string;
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

function addDisposableListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options);
  return toDisposable(() => {
    target.removeEventListener(type, listener, options);
  });
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
    fetchTitle: ui.sidebarFetchTitle,
    selectionModeEnterMulti: ui.sidebarSelectionModeEnterMulti,
    selectionModeSelectAll: ui.sidebarSelectionModeSelectAll,
    selectionModeExit: ui.sidebarSelectionModeExit,
    loading: ui.settingsLoading,
    refresh: ui.titlebarRefresh,
    libraryTitle: ui.sidebarLibraryAction,
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

export class FetchPaneContentView extends LifecycleOwner {
  private props: SecondarySidebarProps;
  private readonly element = createElement('div', 'fetch-pane-content');
  private readonly contentElement = createElement('div');
  private readonly renderDisposables = new LifecycleStore();
  private cards = new Map<string, ArticleCard>();
  private disposed = false;

  constructor(props: SecondarySidebarProps) {
    super();
    this.props = props;
    this.register(this.renderDisposables);
    this.element.append(this.contentElement);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: SecondarySidebarProps) {
    if (this.disposed) {
      return;
    }

    this.props = props;
    this.render();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    super.dispose();
    for (const card of this.cards.values()) {
      card.dispose();
    }
    this.cards.clear();
    this.element.replaceChildren();
  }

  private render() {
    if (this.disposed) {
      return;
    }

    this.renderContent();
  }

  private renderContent() {
    this.renderDisposables.clear();

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
      const list = createElement('ul', 'fetch-pane-article-list');
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

    const empty = createElement('div', 'fetch-pane-empty-state');
    if (this.props.hasData) {
      empty.textContent = this.props.labels.emptyFiltered;
      this.contentElement.replaceChildren(empty);
      return;
    }

    const quickSource = createElement(
      'button',
      'fetch-pane-empty-state-action',
    );
    quickSource.type = 'button';
    quickSource.textContent = this.props.labels.emptyAllQuickSourceAction;
    this.renderDisposables.add(
      addDisposableListener(quickSource, 'click', requestOpenAddressBarSourceMenu),
    );

    const inputLink = createElement(
      'button',
      'fetch-pane-empty-state-action',
    );
    inputLink.type = 'button';
    inputLink.textContent = this.props.labels.emptyAllInputLinkAction;
    this.renderDisposables.add(
      addDisposableListener(inputLink, 'click', requestFocusTitlebarWebUrlInput),
    );

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

export class SecondarySidebarPartView extends LifecycleOwner {
  private readonly element = createElement(
    'section',
    'panel sidebar-panel secondary-sidebar-panel',
  );
  private readonly placeholder = createElement(
    'div',
    'secondary-sidebar-placeholder',
  );
  private disposed = false;

  constructor(_props: SecondarySidebarProps) {
    super();
    this.element.append(this.placeholder);
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.secondarySidebar,
      this.element,
    );
  }

  getElement() {
    return this.element;
  }

  setProps(props: SecondarySidebarProps) {
    if (this.disposed) {
      return;
    }
    void props;
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    super.dispose();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.secondarySidebar, null);
    this.element.replaceChildren();
  }
}

export function createSecondarySidebarPartView(props: SecondarySidebarProps) {
  return new SecondarySidebarPartView(props);
}
