import './sidebar.css';

export type SidebarArticle = {
  title: string;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
};

type SidebarLabels = {
  resultPanelTitle: string;
  untitled: string;
  unknown: string;
  authors: string;
  abstract: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  emptyFiltered: string;
  emptyAll: string;
};

type SidebarProps = {
  articles: SidebarArticle[];
  hasData: boolean;
  labels: SidebarLabels;
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function Sidebar({ articles, hasData, labels }: SidebarProps) {
  const hasVisibleData = articles.length > 0;

  return (
    <section className="panel sidebar-panel">
      <div className="panel-title">{labels.resultPanelTitle}</div>
      {hasVisibleData ? (
        <ul className="article-list">
          {articles.map((article, index) => (
            <li key={`${article.sourceUrl}-${article.fetchedAt}-${index}`} className="article-card">
              <h3>{article.title || labels.untitled}</h3>
              <p>
                <strong>DOI：</strong>
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
            </li>
          ))}
        </ul>
      ) : hasData ? (
        <div className="sidebar-empty-state">{labels.emptyFiltered}</div>
      ) : (
        <div className="sidebar-empty-state">{labels.emptyAll}</div>
      )}
    </section>
  );
}
