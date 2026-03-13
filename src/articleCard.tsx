import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from './components/Button';
import Modal from './components/Modal';

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
};

type ArticleCardProps = {
  article: ArticleCardData;
  labels: ArticleCardLabels;
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ArticleCard({ article, labels }: ArticleCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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

  return (
    <>
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
            onClick={() => setIsDetailsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isDetailsOpen}
            aria-label="View details"
            title="View details"
          >
            <ChevronDown size={14} strokeWidth={1.7} />
          </Button>
        </div>
      </li>

      <Modal
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={article.title || labels.untitled}
        closeLabel="Close details"
        ariaLabel={article.title || labels.untitled}
        panelClassName="article-details-modal"
      >
        <div className="article-card-details article-card-modal-details">
          <p>
            <strong>DOI:</strong>
            {article.doi ?? labels.unknown}
          </p>
          <p>
            <strong>{labels.authors}</strong>
            {article.authors.length > 0 ? article.authors.join(', ') : labels.unknown}
          </p>
          <p>
            <strong>{labels.abstract}</strong>
            {article.abstractText ?? labels.unknown}
          </p>
          <p>
            <strong>{labels.publishedAt}</strong>
            {article.publishedAt ?? labels.unknown}
          </p>
          <p>
            <strong>{labels.source}</strong>
            {article.sourceUrl}
          </p>
          <p>
            <strong>{labels.fetchedAt}</strong>
            {formatTime(article.fetchedAt)}
          </p>
        </div>
      </Modal>
    </>
  );
}
