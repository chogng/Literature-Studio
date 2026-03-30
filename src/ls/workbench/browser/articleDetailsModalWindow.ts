import { jsx, jsxs } from 'react/jsx-runtime';
import { useSyncExternalStore } from 'react';
import type { NativeModalState } from '../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../base/browser/ui/button/button';
import { detectInitialLocale, getLocaleMessages } from '../../../language/i18n';
import ChildWindowShell from './parts/window/childWindowShell';
import {
  connectWorkbenchWindowControls,
  getWindowStateSnapshot,
  performWorkbenchWindowControl,
  subscribeWindowState,
} from './window';
import './media/articleDetailsModalContent.css';

type ArticleDetailsModalWindowState = Extract<
  NativeModalState,
  { kind: 'article-details' }
>;

type DetailRow = {
  label: string;
  value: string;
  wide?: boolean;
};

type ArticleDetailsModalSnapshot = {
  isLoading: boolean;
  modalState: ArticleDetailsModalWindowState | null;
  isWindowMaximized: boolean;
};

const fallbackUi = getLocaleMessages(detectInitialLocale());

function normalizeLabel(label: string) {
  const trimmed = label.trimEnd();
  const lastCharacter = trimmed.charAt(trimmed.length - 1);

  if (lastCharacter === ':' || lastCharacter === String.fromCharCode(0xff1a)) {
    return trimmed.slice(0, -1).trimEnd();
  }

  return trimmed;
}

function detailValue(value: string | null | undefined, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function formatDateTime(value: string, locale: 'zh' | 'en') {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN');
}

function createDetailRows(modalState: ArticleDetailsModalWindowState): DetailRow[] {
  const { article, labels, locale } = modalState;

  return [
    {
      label: 'DOI',
      value: detailValue(article.doi, labels.unknown),
    },
    {
      label: normalizeLabel(labels.articleType),
      value: detailValue(article.articleType, labels.unknown),
    },
    {
      label: normalizeLabel(labels.authors),
      value: article.authors.length > 0 ? article.authors.join(', ') : labels.unknown,
    },
    {
      label: normalizeLabel(labels.publishedAt),
      value: detailValue(article.publishedAt, labels.unknown),
    },
    {
      label: normalizeLabel(labels.source),
      value: detailValue(article.sourceUrl, labels.unknown),
      wide: true,
    },
    {
      label: normalizeLabel(labels.fetchedAt),
      value: formatDateTime(article.fetchedAt, locale),
    },
  ];
}

function renderPlaceholderShell({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return jsx('main', {
    className: 'child-window-shell-page',
    children: jsxs('section', {
      className: 'child-window-shell-surface child-window-shell-surface-loading',
      children: [
        jsx('p', {
          className: 'article-details-placeholder',
          children: message,
        }),
        actionLabel && onAction
          ? jsx(Button, {
              type: 'button',
              variant: 'secondary',
              onClick: onAction,
              children: actionLabel,
            })
          : null,
      ],
    }),
  });
}

function renderDetailGrid(detailRows: DetailRow[]) {
  return jsx('dl', {
    className: 'article-details-grid',
    children: detailRows.map((row) =>
      jsxs(
        'div',
        {
          className: `article-details-row ${row.wide ? 'article-details-row-wide' : ''}`.trim(),
          children: [jsx('dt', { children: row.label }), jsx('dd', { children: row.value })],
        },
        `${row.label}-${row.value}`,
      ),
    ),
  });
}

function renderTextSection({
  sectionId,
  title,
  value,
}: {
  sectionId: string;
  title: string;
  value: string;
}) {
  return jsxs('section', {
    className: 'article-details-section',
    'aria-labelledby': sectionId,
    children: [jsx('h2', { id: sectionId, children: title }), jsx('p', { children: value })],
  });
}

class ArticleDetailsModalController {
  private readonly listeners = new Set<() => void>();
  private snapshot: ArticleDetailsModalSnapshot = {
    isLoading: true,
    modalState: null,
    isWindowMaximized: getWindowStateSnapshot().isMaximized,
  };
  private disposed = false;
  private disposeWindowControls = () => {};
  private disposeWindowStateListener = () => {};
  private disposeModalStateListener = () => {};

  constructor() {
    const electronRuntime =
      typeof window !== 'undefined' &&
      typeof window.electronAPI?.windowControls?.perform === 'function';
    this.disposeWindowControls = connectWorkbenchWindowControls(electronRuntime);
    this.disposeWindowStateListener = subscribeWindowState(() => {
      this.setSnapshot({
        isWindowMaximized: getWindowStateSnapshot().isMaximized,
      });
    });
    this.initializeModalState();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.disposeModalStateListener();
    this.disposeWindowStateListener();
    this.disposeWindowControls();
    this.listeners.clear();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setSnapshot(partial: Partial<ArticleDetailsModalSnapshot>) {
    if (this.disposed) {
      return;
    }

    const nextSnapshot = { ...this.snapshot, ...partial };
    if (
      nextSnapshot.isLoading === this.snapshot.isLoading &&
      nextSnapshot.modalState === this.snapshot.modalState &&
      nextSnapshot.isWindowMaximized === this.snapshot.isWindowMaximized
    ) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.emit();
  }

  private applyModalState(state: NativeModalState | null) {
    if (state?.kind === 'article-details') {
      this.setSnapshot({
        modalState: state,
        isLoading: false,
      });
      this.applyDocumentMetadata(state);
      return;
    }

    this.setSnapshot({ isLoading: false });
  }

  private async initializeModalState() {
    if (typeof window === 'undefined') {
      this.setSnapshot({ isLoading: false });
      return;
    }

    const modalApi = window.electronAPI?.modal;
    if (!modalApi?.getState) {
      this.setSnapshot({ isLoading: false });
      return;
    }

    this.disposeModalStateListener =
      typeof modalApi.onStateChange === 'function'
        ? modalApi.onStateChange((state) => this.applyModalState(state))
        : () => {};

    try {
      const state = await modalApi.getState();
      this.applyModalState(state);
    } catch {
      this.setSnapshot({ isLoading: false });
    }
  }

  private applyDocumentMetadata(state: ArticleDetailsModalWindowState) {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = state.locale === 'en' ? 'en' : 'zh-CN';
    document.title = detailValue(state.article.title, state.labels.untitled);
  }
}

let articleDetailsModalController: ArticleDetailsModalController | null = null;

function getArticleDetailsModalController() {
  if (!articleDetailsModalController) {
    articleDetailsModalController = new ArticleDetailsModalController();
  }
  return articleDetailsModalController;
}

export default function ArticleDetailsModalWindow() {
  const controller = getArticleDetailsModalController();
  const { isLoading, modalState, isWindowMaximized } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const detailRows = modalState ? createDetailRows(modalState) : [];

  const handleClose = () => performWorkbenchWindowControl('close');

  if (isLoading) {
    return renderPlaceholderShell({ message: fallbackUi.articleDetailsLoading });
  }

  if (!modalState) {
    return renderPlaceholderShell({
      message: fallbackUi.articleDetailsUnavailable,
      actionLabel: fallbackUi.titlebarClose,
      onAction: handleClose,
    });
  }

  const { article, labels } = modalState;
  const title = detailValue(article.title, labels.untitled);
  const abstractValue = detailValue(article.abstractText, labels.unknown);
  const descriptionValue = detailValue(article.descriptionText, labels.unknown);
  const windowControlLabels = {
    controlsAriaLabel: labels.controlsAriaLabel,
    minimizeLabel: labels.minimize,
    maximizeLabel: labels.maximize,
    restoreLabel: labels.restore,
    closeLabel: labels.close,
  };

  return jsx('main', {
    className: 'child-window-shell-page',
    children: jsxs(ChildWindowShell, {
      title,
      titleId: 'article-details-title',
      classNames: {
        root: 'child-window-shell-surface',
        header: 'child-window-shell-titlebar',
        heading: 'child-window-shell-titlebar-heading',
        title: 'child-window-shell-titlebar-title',
        controls: 'child-window-shell-titlebar-controls',
        content: 'child-window-shell-content-body',
        footer: 'article-details-footer',
      },
      controlLabels: windowControlLabels,
      isWindowMaximized,
      onWindowControl: performWorkbenchWindowControl,
      footer: jsx(Button, {
        type: 'button',
        variant: 'secondary',
        onClick: handleClose,
        children: labels.close,
      }),
      children: [
        renderDetailGrid(detailRows),
        renderTextSection({
          sectionId: 'article-details-abstract-title',
          title: normalizeLabel(labels.abstract),
          value: abstractValue,
        }),
        renderTextSection({
          sectionId: 'article-details-description-title',
          title: normalizeLabel(labels.description),
          value: descriptionValue,
        }),
      ],
    }),
  });
}
