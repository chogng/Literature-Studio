import { jsx, jsxs } from 'react/jsx-runtime';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from '../../../../base/browser/ui/button/button';
import type { Locale } from '../../../../../language/i18n';
import { usePdfDownloadStatus } from '../../../services/document/pdfDownloadStatus';

type ArticleCardData = {
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

type ArticleCardLabels = {
  untitled: string;
  unknown: string;
  authors: string;
  abstract: string;
  description?: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  close: string;
};

type ArticleCardProps = {
  article: ArticleCardData;
  locale: Locale;
  labels: ArticleCardLabels;
  onDownloadPdf: (
    sourceUrl: string,
    articleTitle?: string,
    journalTitle?: string | null,
    doi?: string | null,
  ) => Promise<void>;
};

type ToolbarButtonConfig = {
  className: string;
  ariaLabel: string;
  title: string;
  onClick: () => void;
  isLoading?: boolean;
  ariaHasPopup?: 'dialog';
  icon: ReturnType<typeof jsx>;
};

const DOWNLOAD_PDF_LABEL = 'Download PDF';
const VIEW_DETAILS_LABEL = 'View details';
const DOWNLOADED_PDF_LABEL = 'PDF downloaded';

function formatPublishedDate(value: string | null, locale: Locale, fallback: string) {
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

function createMetaText(article: ArticleCardData, locale: Locale, unknownLabel: string) {
  const articleType = typeof article.articleType === 'string' ? article.articleType.trim() : '';
  const publishedDate = formatPublishedDate(article.publishedAt, locale, unknownLabel);

  return `${articleType || unknownLabel} | ${publishedDate}`;
}

async function openArticleDetails(article: ArticleCardData, labels: ArticleCardLabels, locale: Locale) {
  if (!window.electronAPI?.invoke) {
    window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    await window.electronAPI.invoke('open_article_details_modal', {
      article,
      labels,
      locale,
    });
  } catch {
    window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
  }
}

function renderToolbarButton({
  className,
  ariaLabel,
  title,
  onClick,
  isLoading,
  ariaHasPopup,
  icon,
}: ToolbarButtonConfig) {
  return jsx(Button, {
    className,
    type: 'button',
    variant: 'ghost',
    size: 'sm',
    mode: 'icon',
    iconMode: 'with',
    textMode: 'without',
    isLoading,
    onClick,
    'aria-label': ariaLabel,
    'aria-haspopup': ariaHasPopup,
    title,
    children: icon,
  });
}

function renderToolbarActions({
  hasDownloaded,
  isDownloading,
  onDownload,
  onOpenDetails,
}: {
  hasDownloaded: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  onOpenDetails: () => void;
}) {
  const downloadButtonTitle = hasDownloaded ? DOWNLOADED_PDF_LABEL : DOWNLOAD_PDF_LABEL;
  const downloadButtonClassName = [
    'article-card-icon-btn',
    hasDownloaded ? 'is-downloaded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return jsxs('div', {
    className: 'article-card-toolbar-actions',
    children: [
      renderToolbarButton({
        className: downloadButtonClassName,
        ariaLabel: DOWNLOAD_PDF_LABEL,
        title: downloadButtonTitle,
        isLoading: isDownloading,
        onClick: onDownload,
        icon: jsx(Download, { size: 14, strokeWidth: 1.7 }),
      }),
      renderToolbarButton({
        className: 'article-card-icon-btn',
        ariaLabel: VIEW_DETAILS_LABEL,
        title: VIEW_DETAILS_LABEL,
        onClick: onOpenDetails,
        ariaHasPopup: 'dialog',
        icon: jsx(ChevronDown, { size: 14, strokeWidth: 1.7 }),
      }),
    ],
  });
}

export default function ArticleCard({ article, locale, labels, onDownloadPdf }: ArticleCardProps) {
  const metaText = createMetaText(article, locale, labels.unknown);
  const downloadStatus = usePdfDownloadStatus(article.sourceUrl);
  const isDownloading = downloadStatus.isDownloading;
  const hasDownloaded = downloadStatus.hasSucceeded;
  const title = article.title || labels.untitled;

  const handleDownload = async () => {
    if (!article.sourceUrl || isDownloading) {
      return;
    }

    try {
      await onDownloadPdf(article.sourceUrl, article.title, article.journalTitle, article.doi);
    } catch {
      // The shared download handler is responsible for user-facing error messages.
    }
  };

  const handleOpenDetails = () => {
    void openArticleDetails(article, labels, locale);
  };

  const toolbarActionsView = renderToolbarActions({
    hasDownloaded,
    isDownloading,
    onDownload: () => void handleDownload(),
    onOpenDetails: handleOpenDetails,
  });

  return jsxs('li', {
    className: 'article-card',
    children: [
      jsx('h3', { children: title }),
      jsxs('div', {
        className: 'article-card-toolbar',
        children: [
          jsx('span', { className: 'article-card-meta', children: metaText }),
          toolbarActionsView,
        ],
      }),
    ],
  });
}
