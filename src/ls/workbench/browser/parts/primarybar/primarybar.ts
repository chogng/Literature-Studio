import type {
  LibraryDocumentSummary,
  LibraryDocumentsResult,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
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
  FetchPaneContentView,
  type FetchPaneProps,
  type SidebarLabels,
} from 'ls/workbench/browser/parts/sidebar/fetchPanePart';
import { getWindowChromeLayout } from 'ls/platform/window/common/window';

import 'ls/workbench/browser/parts/primarybar/media/primarybar.css';

const WINDOW_CHROME_LAYOUT = getWindowChromeLayout();

export type PrimaryBarLabels = SidebarLabels;

export type PrimaryBarProps = {
  labels: PrimaryBarLabels;
  accountLabel?: string;
  moreLabel?: string;
  settingsLabel?: string;
  fetchPaneProps: FetchPaneProps;
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
  topbarActionsElement?: HTMLElement | null;
  footerActionsElement?: HTMLElement | null;
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
    headerSize?: number,
    headerContent?: HTMLElement,
    classNames?: Partial<PaneClassNames>,
  ) {
    super({
      title,
      minimumBodySize,
      expanded: true,
      headerSize,
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
  private readonly topbarElement = createElement(
    'div',
    'primarybar-topbar',
  );
  private readonly leadingWindowControlsSpacer = createElement(
    'div',
    'primarybar-topbar-window-controls-spacer',
  );
  private readonly contentElement = createElement('div', 'primarybar-content');
  private readonly footerElement = createElement(
    'footer',
    'primarybar-footer',
  );
  private readonly paneView = new PaneView({
    orientation: Orientation.HORIZONTAL,
    reserveSashSpace: false,
  });
  private readonly librarySection = createElement(
    'div',
    'primarybar-pane-content primarybar-library-pane-content',
  );
  private readonly libraryToolbar = createElement(
    'div',
    'primarybar-pane-toolbar',
  );
  private readonly actionsView = createActionBarView({
    className: 'pane-header-actionbar',
    ariaRole: 'group',
  });
  private readonly fetchActionsView = createActionBarView({
    className: 'pane-header-actionbar fetch-pane-actionbar',
    ariaRole: 'group',
  });
  private readonly libraryView: LibraryView;
  private readonly fetchContentView: FetchPaneContentView;
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
    this.fetchContentView = new FetchPaneContentView({
      ...props.fetchPaneProps,
      labels: props.labels,
    });
    this.libraryToolbar.append(this.actionsView.getElement());
    this.librarySection.append(this.libraryView.getElement());
    this.libraryPane = new ContentPane(
      props.labels.libraryTitle,
      this.librarySection,
      220,
      35,
      this.libraryToolbar,
      createPrimaryBarPaneClassNames('library'),
    );
    this.fetchPane = new ContentPane(
      props.labels.fetchTitle,
      this.fetchContentView.getElement(),
      260,
      35,
      this.fetchActionsView.getElement(),
      createPrimaryBarPaneClassNames('fetch'),
    );
    this.paneView.addPane(this.libraryPane, 280, { flex: true });
    this.paneView.addPane(this.fetchPane, 360, { flex: true });
    if (WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx > 0) {
      this.leadingWindowControlsSpacer.style.setProperty(
        '--window-controls-width',
        `${WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx}px`,
      );
      this.topbarElement.append(this.leadingWindowControlsSpacer);
    }
    this.contentElement.append(this.paneView.element);
    this.element.append(this.topbarElement, this.contentElement, this.footerElement);
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
    this.fetchContentView.setProps({
      ...props.fetchPaneProps,
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
    this.fetchActionsView.dispose();
    this.libraryView.dispose();
    this.fetchContentView.dispose();
    this.paneView.dispose();
    this.element.replaceChildren();
  }

  private render() {
    const { labels } = this.props;
    this.syncTopbarActions(this.props.topbarActionsElement ?? null);
    this.syncFooterActions(this.props.footerActionsElement ?? null);
    this.actionsView.setProps({
      className: 'pane-header-actionbar',
      ariaRole: 'group',
      items: [
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
      this.props.fetchPaneProps.selectionModePhase === 'off'
        ? labels.selectionModeEnterMulti
        : this.props.fetchPaneProps.selectionModePhase === 'multi'
          ? labels.selectionModeSelectAll
          : labels.selectionModeExit;
    this.fetchActionsView.setProps({
      className: 'pane-header-actionbar fetch-pane-actionbar',
      ariaRole: 'group',
      items: [
        {
          label: selectionButtonLabel,
          title: selectionButtonLabel,
          mode: 'icon',
          active: this.props.fetchPaneProps.isSelectionModeEnabled,
          checked: this.props.fetchPaneProps.isSelectionModeEnabled,
          disabled:
            !this.props.fetchPaneProps.articles.length &&
            !this.props.fetchPaneProps.isSelectionModeEnabled,
          buttonClassName: 'fetch-pane-select-action',
          content: createLxIcon(lxIconSemanticMap.sidebar.selectionMode),
          onClick: () => this.props.fetchPaneProps.onToggleSelectionMode(),
        },
        {
          label: this.props.fetchPaneProps.isFetchLoading
            ? labels.fetchLatestBusy
            : labels.fetchLatest,
          title: this.props.fetchPaneProps.isFetchLoading
            ? labels.fetchLatestBusy
            : labels.fetchLatest,
          mode: 'icon',
          disabled: this.props.fetchPaneProps.isFetchLoading,
          buttonClassName: 'sidebar-fetch-btn fetch-pane-trigger-btn',
          content: createLxIcon(
            this.props.fetchPaneProps.isFetchLoading ? 'sync' : lxIconSemanticMap.fetch.batchDownload,
          ),
          onClick: () => this.props.fetchPaneProps.onFetch(),
        },
      ],
    });
    this.layoutPanes();
  }

  private syncTopbarActions(topbarActionsElement: HTMLElement | null) {
    const currentTopbarActionsElement = this.topbarElement.querySelector(
      '.sidebar-topbar-actions-host',
    );
    if (topbarActionsElement) {
      if (currentTopbarActionsElement !== topbarActionsElement) {
        this.topbarElement.append(topbarActionsElement);
      }
      return;
    }

    currentTopbarActionsElement?.remove();
  }

  private syncFooterActions(footerActionsElement: HTMLElement | null) {
    const currentFooterActionsElement = this.footerElement.firstElementChild;
    if (footerActionsElement) {
      if (currentFooterActionsElement !== footerActionsElement) {
        this.footerElement.replaceChildren(footerActionsElement);
      }
      return;
    }

    if (currentFooterActionsElement) {
      this.footerElement.replaceChildren();
    }
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
