import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from './components/Button';
import type { Locale } from './language/i18n';

type ArticleCardData = {
  title: string;
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

export default function ArticleCard({ article, locale, labels }: ArticleCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

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
    </li>
  );
}
