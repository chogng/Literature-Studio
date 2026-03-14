import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from './components/Button';
import type { Locale } from './language/i18n';

type ArticleCardData = {
  title: string;
  articleType: string | null;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
};

type ArticleCardLabels = {
  untitled: string;
  unknown: string;
  authors: string;
  abstract: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  close: string;
};

type ArticleCardProps = {
  article: ArticleCardData;
  locale: Locale;
  labels: ArticleCardLabels;
};

function formatPublishedDate(value: string | null, locale: Locale, fallback: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return fallback;

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
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN');
}

export default function ArticleCard({ article, locale, labels }: ArticleCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const articleType = typeof article.articleType === 'string' ? article.articleType.trim() : '';
  const publishedDate = formatPublishedDate(article.publishedAt, locale, labels.unknown);
  const metaText = `${articleType || labels.unknown} · ${publishedDate}`;

  const handleDownload = async () => {
    if (!article.sourceUrl || isDownloading) return;

    if (!window.electronAPI?.invoke) {
      window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      setIsDownloading(true);
      await window.electronAPI.invoke('preview_download_pdf', {
        pageUrl: article.sourceUrl,
        customDownloadDir: null,
      });
    } catch {
      window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenDetails = async () => {
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
  };

  return (
    <li className="article-card">
      <h3>{article.title || labels.untitled}</h3>
      <div className="article-card-toolbar">
        <span className="article-card-meta">{metaText}</span>
        <div className="article-card-toolbar-actions">
          <Button
            className="article-card-icon-btn"
            type="button"
            variant="ghost"
            size="sm"
            mode="icon"
            iconMode="with"
            textMode="without"
            isLoading={isDownloading}
            onClick={() => void handleDownload()}
            aria-label="Download PDF"
            title="Download PDF"
          >
            <Download size={14} strokeWidth={1.7} />
          </Button>
          <Button
            className="article-card-icon-btn"
            type="button"
            variant="ghost"
            size="sm"
            mode="icon"
            iconMode="with"
            textMode="without"
            onClick={() => void handleOpenDetails()}
            aria-haspopup="dialog"
            aria-label="View details"
            title="View details"
          >
            <ChevronDown size={14} strokeWidth={1.7} />
          </Button>
        </div>
      </div>
    </li>
  );
}
