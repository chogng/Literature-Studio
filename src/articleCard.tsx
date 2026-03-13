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
  return (
    <li className="article-card">
      <h3>{article.title || labels.untitled}</h3>
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
    </li>
  );
}
