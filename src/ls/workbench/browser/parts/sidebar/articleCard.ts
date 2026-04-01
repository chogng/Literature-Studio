import type { ArticleDetailsModalLabels } from 'ls/base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../../../language/i18n';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic.js';
import {
  getPdfDownloadStatus,
  subscribePdfDownloadStatus,
} from 'ls/workbench/browser/pdfDownloadStatus';
import type { SidebarArticle } from 'ls/workbench/browser/parts/sidebar/secondarySidebarPart';

type ArticleCardLabels = ArticleDetailsModalLabels;

export type ArticleCardProps = {
  article: SidebarArticle;
  locale: Locale;
  labels: ArticleCardLabels;
  onDownloadPdf: (article: SidebarArticle) => Promise<void>;
  onOpenArticleDetails: (
    article: SidebarArticle,
    labels: ArticleDetailsModalLabels
  ) => void | Promise<void>;
  isSelectionModeEnabled: boolean;
  isSelected: boolean;
  onToggleSelected: (article: SidebarArticle) => void;
};

const DOWNLOAD_PDF_LABEL = 'Download PDF';
const VIEW_DETAILS_LABEL = 'View details';
const DOWNLOADED_PDF_LABEL = 'PDF downloaded';

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

function formatPublishedDate(
  value: string | null,
  locale: Locale,
  fallback: string,
) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return fallback;
  }

  const dateOnlyMatched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatched) {
    const year = Number.parseInt(dateOnlyMatched[1], 10);
    const month = Number.parseInt(dateOnlyMatched[2], 10);
    const day = Number.parseInt(dateOnlyMatched[3], 10);
    const localDate = new Date(year, month - 1, day);

    if (!Number.isNaN(localDate.getTime())) {
      return localDate.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN');
    }
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return parsed.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN');
}

function createMetaText(
  article: SidebarArticle,
  locale: Locale,
  unknownLabel: string,
) {
  const articleType =
    typeof article.articleType === 'string' ? article.articleType.trim() : '';
  const publishedDate = formatPublishedDate(
    article.publishedAt,
    locale,
    unknownLabel,
  );

  return `${articleType || unknownLabel} | ${publishedDate}`;
}

export class ArticleCard {
  private props: ArticleCardProps;
  private readonly element = createElement('li');
  private readonly mainElement = createElement(
    'div',
    'secondary-sidebar-article-card-main',
  );
  private readonly titleElement = createElement(
    'h3',
    'secondary-sidebar-article-card-title',
  );
  private readonly metaElement = createElement(
    'span',
    'secondary-sidebar-article-card-meta',
  );
  private readonly toolbarElement = createElement(
    'div',
    'secondary-sidebar-article-card-toolbar-actions',
  );
  private readonly downloadButton = createElement(
    'button',
    'secondary-sidebar-article-card-icon-btn btn-base btn-ghost btn-mode-icon btn-sm',
  );
  private readonly detailsButton = createElement(
    'button',
    'secondary-sidebar-article-card-icon-btn btn-base btn-ghost btn-mode-icon btn-sm',
  );
  private readonly unsubscribeDownloadStatus: () => void;

  constructor(props: ArticleCardProps) {
    this.props = props;
    this.element.append(this.mainElement, this.toolbarElement);
    this.mainElement.append(this.titleElement, this.metaElement);
    this.toolbarElement.append(this.downloadButton, this.detailsButton);
    this.element.addEventListener('click', this.handleCardClick);
    this.element.addEventListener('keydown', this.handleCardKeyDown);
    this.downloadButton.addEventListener('click', this.handleDownloadClick);
    this.detailsButton.addEventListener('click', this.handleDetailsClick);
    this.unsubscribeDownloadStatus = subscribePdfDownloadStatus(this.render);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: ArticleCardProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.unsubscribeDownloadStatus();
    this.element.removeEventListener('click', this.handleCardClick);
    this.element.removeEventListener('keydown', this.handleCardKeyDown);
    this.downloadButton.removeEventListener('click', this.handleDownloadClick);
    this.detailsButton.removeEventListener('click', this.handleDetailsClick);
    this.element.replaceChildren();
  }

  private readonly render = () => {
    const { article, locale, labels, isSelectionModeEnabled, isSelected } =
      this.props;
    const title = article.title || labels.untitled;
    const metaText = createMetaText(article, locale, labels.unknown);
    const downloadStatus = getPdfDownloadStatus(article.sourceUrl);
    const isDownloading = downloadStatus.isDownloading;
    const hasDownloaded = downloadStatus.hasSucceeded;

    this.element.className = [
      'secondary-sidebar-article-card',
      isSelectionModeEnabled ? 'is-selection-mode' : '',
      isSelected ? 'is-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (isSelectionModeEnabled) {
      this.element.setAttribute('role', 'button');
      this.element.tabIndex = 0;
      this.element.setAttribute('aria-pressed', String(isSelected));
    } else {
      this.element.removeAttribute('role');
      this.element.removeAttribute('tabindex');
      this.element.removeAttribute('aria-pressed');
    }

    this.titleElement.textContent = title;
    this.titleElement.title = title;
    this.metaElement.textContent = metaText;

    this.downloadButton.type = 'button';
    this.downloadButton.className = [
      'secondary-sidebar-article-card-icon-btn',
      'btn-base',
      'btn-ghost',
      'btn-mode-icon',
      'btn-sm',
      hasDownloaded ? 'is-downloaded' : '',
    ]
      .filter(Boolean)
      .join(' ');
    this.downloadButton.replaceChildren(
      isDownloading
        ? createLxIcon('sync')
        : hasDownloaded
          ? createLxIcon(lxIconSemanticMap.articleCard.downloaded)
          : createLxIcon(lxIconSemanticMap.articleCard.download),
    );
    this.downloadButton.disabled = isDownloading;
    this.downloadButton.setAttribute('aria-label', DOWNLOAD_PDF_LABEL);
    this.downloadButton.title = hasDownloaded
      ? DOWNLOADED_PDF_LABEL
      : DOWNLOAD_PDF_LABEL;

    this.detailsButton.type = 'button';
    this.detailsButton.className =
      'secondary-sidebar-article-card-icon-btn btn-base btn-ghost btn-mode-icon btn-sm';
    this.detailsButton.replaceChildren(createLxIcon(lxIconSemanticMap.articleCard.details));
    this.detailsButton.setAttribute('aria-label', VIEW_DETAILS_LABEL);
    this.detailsButton.title = VIEW_DETAILS_LABEL;
    this.detailsButton.setAttribute('aria-haspopup', 'dialog');
  };

  private readonly handleCardClick = () => {
    if (!this.props.isSelectionModeEnabled) {
      return;
    }

    this.props.onToggleSelected(this.props.article);
  };

  private readonly handleCardKeyDown = (event: Event) => {
    if (!this.props.isSelectionModeEnabled) {
      return;
    }

    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
      return;
    }

    keyboardEvent.preventDefault();
    this.props.onToggleSelected(this.props.article);
  };

  private readonly handleDownloadClick = async (event: Event) => {
    event.stopPropagation();
    if (!this.props.article.sourceUrl) {
      return;
    }

    try {
      await this.props.onDownloadPdf(this.props.article);
    } catch {
      // Shared download handler owns user-facing error feedback.
    }
  };

  private readonly handleDetailsClick = (event: Event) => {
    event.stopPropagation();
    void this.props.onOpenArticleDetails(this.props.article, this.props.labels);
  };
}

export function createArticleCard(props: ArticleCardProps) {
  return new ArticleCard(props);
}

export default ArticleCard;
