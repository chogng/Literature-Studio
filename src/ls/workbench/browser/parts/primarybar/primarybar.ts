import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import {
  createDateRangePickerView,
  type DateRangePickerView,
} from 'ls/base/browser/ui/dateRangePicker/dateRangePicker';
import { applyHover } from 'ls/base/browser/ui/hover/hover';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import {
  Pane,
  PaneView,
  Orientation,
  type PaneClassNames,
} from 'ls/base/browser/ui/splitview/paneview';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import {
  MutableLifecycle,
  toDisposable,
  type DisposableLike,
} from 'ls/base/common/lifecycle';
import { LibraryView } from 'ls/workbench/contrib/knowledgeBase/browser/views/libraryView';
import {
  BatchFetchContentView,
  type SecondarySidebarProps,
  type SidebarLabels,
} from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';

import 'ls/workbench/browser/parts/primarybar/media/primarybar.css';

export type PrimaryBarLabels = SidebarLabels;

export type PrimaryBarProps = {
  labels: PrimaryBarLabels;
  batchFetchProps: SecondarySidebarProps;
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
  onRefreshLibrary?: () => void;
  onDownloadPdf?: () => void;
  onCreateDraftTab?: () => void;
  onDocumentDragStart?: (documentId: string) => void;
  onDocumentSelect?: (document: LibraryDocumentSummary | null) => void;
  onDocumentOpen?: (document: LibraryDocumentSummary) => void;
  onDocumentRename?: (document: LibraryDocumentSummary) => void;
  onDocumentEditSourceUrl?: (document: LibraryDocumentSummary) => void;
  onDocumentDelete?: (document: LibraryDocumentSummary) => void;
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

class ContentPane extends Pane {
  constructor(
    title: string,
    private readonly content: HTMLElement,
    minimumBodySize: number,
    headerContent?: HTMLElement,
    classNames?: Partial<PaneClassNames>,
  ) {
    super({
      title,
      minimumBodySize,
      expanded: true,
      headerContent,
      classNames,
    });
    this.bodyElement.append(this.content);
  }

  protected layoutBody() {
    // Body content stretches with CSS.
  }
}

function createPrimaryBarPaneClassNames(
  pane: 'library' | 'fetch',
): Partial<PaneClassNames> {
  return {
    pane: `primarybar-pane primarybar-${pane}-pane`,
    header: `primarybar-pane-header primarybar-${pane}-pane-header`,
    title: `primarybar-pane-title primarybar-${pane}-pane-title`,
    body: `primarybar-pane-body primarybar-${pane}-pane-body`,
  };
}

export class PrimaryBar {
  private props: PrimaryBarProps;
  private readonly element = createElement('div', 'primarybar-root');
  private readonly contentElement = createElement('div', 'primarybar-content');
  private readonly paneView = new PaneView({
    orientation: Orientation.HORIZONTAL,
    sashSize: 8,
  });
  private readonly librarySection = createElement(
    'div',
    'primarybar-pane-content primarybar-library-pane-content',
  );
  private readonly libraryToolbar = createElement(
    'div',
    'sidebar-workbench-header primarybar-pane-toolbar',
  );
  private readonly actionsView = createActionBarView({
    className: 'sidebar-action-bar',
    ariaRole: 'group',
  });
  private readonly fetchToolbar = createElement(
    'div',
    'actionbar batch-fetch-action-bar',
  );
  private readonly fetchDateRangePicker: DateRangePickerView;
  private readonly fetchSelectionActionsView = createActionBarView({
    className: 'batch-fetch-selection-actionbar',
    ariaRole: 'group',
  });
  private readonly fetchButton = createElement('button');
  private readonly libraryView: LibraryView;
  private readonly batchFetchView: BatchFetchContentView;
  private readonly libraryPane: ContentPane;
  private readonly fetchPane: ContentPane;
  private readonly resizeObserver = new MutableLifecycle<DisposableLike>();
  private disposed = false;

  constructor(props: PrimaryBarProps) {
    this.props = props;
    this.libraryView = new LibraryView({
      labels: props.labels,
      librarySnapshot: props.librarySnapshot,
      onDocumentDragStart: props.onDocumentDragStart,
      onDocumentSelect: props.onDocumentSelect,
      onDocumentOpen: props.onDocumentOpen,
      onDocumentRename: props.onDocumentRename,
      onDocumentEditSourceUrl: props.onDocumentEditSourceUrl,
      onDocumentDelete: props.onDocumentDelete,
    });
    this.batchFetchView = new BatchFetchContentView({
      ...props.batchFetchProps,
      labels: props.labels,
    });
    this.fetchDateRangePicker = createDateRangePickerView({
      startDate: props.batchFetchProps.batchStartDate,
      endDate: props.batchFetchProps.batchEndDate,
      labels: {
        startDate: props.labels.startDate,
        endDate: props.labels.endDate,
      },
      onStartDateChange: (value) => this.props.batchFetchProps.onBatchStartDateChange(value),
      onEndDateChange: (value) => this.props.batchFetchProps.onBatchEndDateChange(value),
      className: 'sidebar-date-picker batch-fetch-date-picker',
      triggerIcon: createLxIcon('calendar'),
      triggerMode: 'icon',
    });
    this.fetchButton.type = 'button';
    this.fetchButton.className = [
      'actionbar-action',
      'is-icon',
      'sidebar-fetch-btn',
      'batch-fetch-trigger-btn',
    ].join(' ');
    this.fetchButton.addEventListener('click', () => {
      this.props.batchFetchProps.onFetchLatestBatch();
    });
    this.fetchToolbar.append(
      this.fetchDateRangePicker.getElement(),
      this.fetchSelectionActionsView.getElement(),
      this.fetchButton,
    );
    this.libraryToolbar.append(this.actionsView.getElement());
    this.librarySection.append(this.libraryView.getElement());
    this.libraryPane = new ContentPane(
      props.labels.libraryTitle,
      this.librarySection,
      220,
      this.libraryToolbar,
      createPrimaryBarPaneClassNames('library'),
    );
    this.fetchPane = new ContentPane(
      props.labels.fetchTitle,
      this.batchFetchView.getElement(),
      260,
      this.fetchToolbar,
      createPrimaryBarPaneClassNames('fetch'),
    );
    this.paneView.addPane(this.libraryPane, 280, { flex: true });
    this.paneView.addPane(this.fetchPane, 360, { flex: true });
    this.contentElement.append(this.paneView.element);
    this.element.append(this.contentElement);
    this.installResizeObserver();
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: PrimaryBarProps) {
    if (this.disposed) {
      return;
    }

    this.props = props;
    this.libraryPane.setTitle(props.labels.libraryTitle);
    this.fetchPane.setTitle(props.labels.fetchTitle);
    this.libraryView.setProps({
      labels: props.labels,
      librarySnapshot: props.librarySnapshot,
      onDocumentDragStart: props.onDocumentDragStart,
      onDocumentSelect: props.onDocumentSelect,
      onDocumentOpen: props.onDocumentOpen,
      onDocumentRename: props.onDocumentRename,
      onDocumentEditSourceUrl: props.onDocumentEditSourceUrl,
      onDocumentDelete: props.onDocumentDelete,
    });
    this.batchFetchView.setProps({
      ...props.batchFetchProps,
      labels: props.labels,
    });
    this.render();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.resizeObserver.dispose();
    this.actionsView.dispose();
    this.fetchDateRangePicker.dispose();
    this.fetchSelectionActionsView.dispose();
    this.libraryView.dispose();
    this.batchFetchView.dispose();
    this.paneView.dispose();
    this.element.replaceChildren();
  }

  private render() {
    const { labels, isLibraryLoading } = this.props;
    this.actionsView.setProps({
      className: 'sidebar-action-bar',
      ariaRole: 'group',
      items: [
        {
          label: labels.libraryAction,
          content: createLxIcon(lxIconSemanticMap.library.refresh),
          disabled: isLibraryLoading || !this.props.onRefreshLibrary,
          buttonClassName: 'sidebar-action-btn',
          onClick: () => this.props.onRefreshLibrary?.(),
        },
        {
          label: labels.pdfDownloadAction,
          content: createLxIcon(lxIconSemanticMap.library.downloadPdf),
          disabled: !this.props.onDownloadPdf,
          buttonClassName: 'sidebar-action-btn',
          onClick: () => this.props.onDownloadPdf?.(),
        },
        {
          label: labels.writingAction,
          content: createLxIcon(lxIconSemanticMap.library.createDraft),
          disabled: !this.props.onCreateDraftTab,
          buttonClassName: 'sidebar-action-btn',
          onClick: () => this.props.onCreateDraftTab?.(),
        },
      ],
    });
    const selectionButtonLabel =
      this.props.batchFetchProps.selectionModePhase === 'off'
        ? labels.selectionModeEnterMulti
        : this.props.batchFetchProps.selectionModePhase === 'multi'
          ? labels.selectionModeSelectAll
          : labels.selectionModeExit;
    this.fetchDateRangePicker.setProps({
      startDate: this.props.batchFetchProps.batchStartDate,
      endDate: this.props.batchFetchProps.batchEndDate,
      labels: {
        startDate: labels.startDate,
        endDate: labels.endDate,
      },
      onStartDateChange: (value) => this.props.batchFetchProps.onBatchStartDateChange(value),
      onEndDateChange: (value) => this.props.batchFetchProps.onBatchEndDateChange(value),
      className: 'sidebar-date-picker batch-fetch-date-picker',
      triggerIcon: createLxIcon('calendar'),
      triggerMode: 'icon',
    });
    this.fetchSelectionActionsView.setProps({
      className: 'batch-fetch-selection-actionbar',
      ariaRole: 'group',
      items: [
        {
          label: selectionButtonLabel,
          title: selectionButtonLabel,
          mode: 'icon',
          active: this.props.batchFetchProps.isSelectionModeEnabled,
          checked: this.props.batchFetchProps.isSelectionModeEnabled,
          disabled:
            !this.props.batchFetchProps.articles.length &&
            !this.props.batchFetchProps.isSelectionModeEnabled,
          buttonClassName: 'batch-fetch-select-action',
          content: createLxIcon(lxIconSemanticMap.sidebar.selectionMode),
          onClick: () => this.props.batchFetchProps.onToggleSelectionMode(),
        },
      ],
    });
    const fetchButtonLabel = this.props.batchFetchProps.isBatchLoading
      ? labels.fetchLatestBusy
      : labels.fetchLatest;
    this.fetchButton.replaceChildren(
      createLxIcon(
        this.props.batchFetchProps.isBatchLoading ? 'sync' : lxIconSemanticMap.library.downloadPdf,
      ),
    );
    this.fetchButton.setAttribute('aria-label', fetchButtonLabel);
    applyHover(this.fetchButton, fetchButtonLabel);
    this.fetchButton.disabled = this.props.batchFetchProps.isBatchLoading;
    this.layoutPanes();
  }

  private installResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      const handleWindowResize = () => {
        this.layoutPanes();
      };
      window.addEventListener('resize', handleWindowResize);
      this.resizeObserver.value = toDisposable(() => {
        window.removeEventListener('resize', handleWindowResize);
      });
      return;
    }

    const observer = new ResizeObserver(() => {
      this.layoutPanes();
    });
    observer.observe(this.element);
    this.resizeObserver.value = toDisposable(() => {
      observer.disconnect();
    });
  }

  private layoutPanes() {
    this.paneView.layout(
      this.contentElement.clientWidth,
      this.contentElement.clientHeight,
    );
  }
}

export function createPrimaryBar(props: PrimaryBarProps) {
  return new PrimaryBar(props);
}

export default PrimaryBar;
