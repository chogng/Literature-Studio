import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../components/Button';
import './ArticleDetailsModalWindow.css';

type ArticleDetailsModalWindowState = Extract<DesktopNativeModalState, { kind: 'article-details' }>;

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
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN');
}

export default function ArticleDetailsModalWindow() {
  const [modalState, setModalState] = useState<ArticleDetailsModalWindowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadModalState = async () => {
      if (!window.electronAPI?.modal?.getState) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const state = await window.electronAPI.modal.getState();
        if (!mounted) return;

        if (state?.kind === 'article-details') {
          setModalState(state);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadModalState();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!modalState) return;

    document.documentElement.lang = modalState.locale === 'en' ? 'en' : 'zh-CN';
    document.title = detailValue(modalState.article.title, modalState.labels.untitled);
  }, [modalState]);

  const detailRows = useMemo(() => {
    if (!modalState) return [];

    const { article, labels, locale } = modalState;
    return [
      { label: 'DOI', value: detailValue(article.doi, labels.unknown) },
      {
        label: normalizeLabel(labels.articleType || (locale === 'en' ? 'Article type' : '文章类型')),
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
  }, [modalState]);

  const handleClose = () => {
    window.electronAPI?.windowControls?.perform('close');
  };

  if (isLoading) {
    return (
      <main className="article-details-window">
        <section className="article-details-shell article-details-shell-loading">
          <p className="article-details-placeholder">Loading article details...</p>
        </section>
      </main>
    );
  }

  if (!modalState) {
    return (
      <main className="article-details-window">
        <section className="article-details-shell article-details-shell-loading">
          <p className="article-details-placeholder">Article details are unavailable.</p>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </section>
      </main>
    );
  }

  const { article, labels } = modalState;
  const title = detailValue(article.title, labels.untitled);
  const abstractValue = detailValue(article.abstractText, labels.unknown);
  const descriptionValue = detailValue(article.descriptionText, labels.unknown);
  const descriptionLabel = labels.description || (modalState.locale === 'en' ? 'Description' : '描述');

  return (
    <main className="article-details-window">
      <section className="article-details-shell" role="document" aria-labelledby="article-details-title">
        <header className="article-details-header">
          <div className="article-details-heading">
            <h1 id="article-details-title" className="article-details-title">
              {title}
            </h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            iconMode="with"
            textMode="without"
            className="article-details-close-btn"
            onClick={handleClose}
            aria-label={labels.close}
            title={labels.close}
          >
            <X size={16} strokeWidth={1.8} />
          </Button>
        </header>

        <div className="article-details-content">
          <dl className="article-details-grid">
            {detailRows.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                className={`article-details-row ${row.wide ? 'article-details-row-wide' : ''}`.trim()}
              >
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>

          <section className="article-details-section" aria-labelledby="article-details-abstract-title">
            <h2 id="article-details-abstract-title">{normalizeLabel(labels.abstract)}</h2>
            <p>{abstractValue}</p>
          </section>

          <section className="article-details-section" aria-labelledby="article-details-description-title">
            <h2 id="article-details-description-title">{normalizeLabel(descriptionLabel)}</h2>
            <p>{descriptionValue}</p>
          </section>
        </div>

        <footer className="article-details-footer">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {labels.close}
          </Button>
        </footer>
      </section>
    </main>
  );
}
