import { jsx, jsxs } from 'react/jsx-runtime';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { NativeModalState } from '../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../base/browser/ui/button/button';
import './media/articleDetailsModalWindow.css';

type ArticleDetailsModalWindowState = Extract<
  NativeModalState,
  { kind: 'article-details' }
>;

type DetailRow = {
  label: string;
  value: string;
  wide?: boolean;
};

const LOADING_MESSAGE = 'Loading article details...';
const UNAVAILABLE_MESSAGE = 'Article details are unavailable.';
const FALLBACK_CLOSE_LABEL = 'Close';

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
    className: 'article-details-window',
    children: jsxs('section', {
      className: 'article-details-shell article-details-shell-loading',
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
        if (!mounted) {
          return;
        }

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
    if (!modalState) {
      return;
    }

    document.documentElement.lang = modalState.locale === 'en' ? 'en' : 'zh-CN';
    document.title = detailValue(modalState.article.title, modalState.labels.untitled);
  }, [modalState]);

  const detailRows = useMemo(() => (modalState ? createDetailRows(modalState) : []), [modalState]);

  const handleClose = () => {
    window.electronAPI?.windowControls?.perform('close');
  };

  if (isLoading) {
    return renderPlaceholderShell({ message: LOADING_MESSAGE });
  }

  if (!modalState) {
    return renderPlaceholderShell({
      message: UNAVAILABLE_MESSAGE,
      actionLabel: FALLBACK_CLOSE_LABEL,
      onAction: handleClose,
    });
  }

  const { article, labels, locale } = modalState;
  const title = detailValue(article.title, labels.untitled);
  const abstractValue = detailValue(article.abstractText, labels.unknown);
  const descriptionValue = detailValue(article.descriptionText, labels.unknown);
  const descriptionLabel = labels.description || (locale === 'en' ? 'Description' : '描述');

  return jsx('main', {
    className: 'article-details-window',
    children: jsxs('section', {
      className: 'article-details-shell',
      role: 'document',
      'aria-labelledby': 'article-details-title',
      children: [
        jsxs('header', {
          className: 'article-details-header',
          children: [
            jsx('div', {
              className: 'article-details-heading',
              children: jsx('h1', {
                id: 'article-details-title',
                className: 'article-details-title',
                children: title,
              }),
            }),
            jsx(Button, {
              type: 'button',
              variant: 'ghost',
              mode: 'icon',
              iconMode: 'with',
              textMode: 'without',
              className: 'article-details-close-btn',
              onClick: handleClose,
              'aria-label': labels.close,
              title: labels.close,
              children: jsx(X, { size: 16, strokeWidth: 1.8 }),
            }),
          ],
        }),
        jsxs('div', {
          className: 'article-details-content',
          children: [
            renderDetailGrid(detailRows),
            renderTextSection({
              sectionId: 'article-details-abstract-title',
              title: normalizeLabel(labels.abstract),
              value: abstractValue,
            }),
            renderTextSection({
              sectionId: 'article-details-description-title',
              title: normalizeLabel(descriptionLabel),
              value: descriptionValue,
            }),
          ],
        }),
        jsx('footer', {
          className: 'article-details-footer',
          children: jsx(Button, {
            type: 'button',
            variant: 'secondary',
            onClick: handleClose,
            children: labels.close,
          }),
        }),
      ],
    }),
  });
}

