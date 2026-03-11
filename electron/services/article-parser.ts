import { load } from 'cheerio';

import type { Article } from '../types.js';
import { cleanNullable, cleanText, parseDateString, pickFirstNonEmpty, uniq } from '../utils/text.js';

const DOI_RE = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;

function pickMetaContent($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr('content'));
    if (value) return value;
  }

  return '';
}

function extractAuthors($: ReturnType<typeof load>) {
  const byMeta = [
    ...$('meta[name="citation_author"]')
      .map((_, node) => cleanText($(node).attr('content')))
      .get(),
    ...$('meta[name="dc.creator"]')
      .map((_, node) => cleanText($(node).attr('content')))
      .get(),
    ...$('meta[name="author"]')
      .map((_, node) => cleanText($(node).attr('content')))
      .get(),
  ].filter(Boolean);

  if (byMeta.length > 0) {
    return uniq(byMeta);
  }

  const ldAuthors: string[] = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = $(node).html();
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        const author = item?.author;
        if (!author) continue;

        if (Array.isArray(author)) {
          author.forEach((entry) => {
            if (typeof entry === 'string') {
              const text = cleanText(entry);
              if (text) ldAuthors.push(text);
              return;
            }

            const text = cleanText(entry?.name);
            if (text) ldAuthors.push(text);
          });
          continue;
        }

        if (typeof author === 'string') {
          const text = cleanText(author);
          if (text) ldAuthors.push(text);
          continue;
        }

        const text = cleanText(author?.name);
        if (text) ldAuthors.push(text);
      }
    } catch {
      return;
    }
  });

  return uniq(ldAuthors);
}

function extractDoi($: ReturnType<typeof load>, html: string) {
  const fromMeta = pickMetaContent($, [
    'meta[name="citation_doi"]',
    'meta[name="dc.identifier"]',
    'meta[name="prism.doi"]',
    'meta[property="og:doi"]',
  ]);
  if (fromMeta) return fromMeta;

  const text = cleanText(html);
  const matched = text.match(DOI_RE);
  return matched ? matched[0] : null;
}

function extractPublishedDate($: ReturnType<typeof load>) {
  return (
    parseDateString(
      pickMetaContent($, [
        'meta[name="citation_publication_date"]',
        'meta[name="citation_online_date"]',
        'meta[name="dc.date"]',
        'meta[name="prism.publicationDate"]',
        'meta[property="article:published_time"]',
      ]),
    ) ?? null
  );
}

function extractAbstract($: ReturnType<typeof load>) {
  const byMeta = pickMetaContent($, [
    'meta[name="description"]',
    'meta[name="citation_abstract"]',
    'meta[property="og:description"]',
    'meta[name="dc.description"]',
  ]);
  if (byMeta) return byMeta;

  const candidates = [
    cleanText($('section[aria-labelledby*="abs"] p').first().text()),
    cleanText($('div.abstract p').first().text()),
    cleanText($('p.abstract').first().text()),
  ].filter(Boolean);

  return candidates[0] ?? null;
}

function extractTitle($: ReturnType<typeof load>) {
  return pickFirstNonEmpty([
    pickMetaContent($, [
      'meta[name="citation_title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="dc.title"]',
    ]),
    cleanText($('title').first().text()),
    cleanText($('h1').first().text()),
  ]);
}

export function buildArticleFromHtml(sourceUrl: string, html: string): Article {
  const $ = load(html);
  const title = extractTitle($);
  const doi = extractDoi($, html);
  const authors = extractAuthors($);
  const abstractText = extractAbstract($);
  const publishedAt = extractPublishedDate($);

  return {
    title: title || '无标题',
    doi: cleanNullable(doi),
    authors,
    abstractText: cleanNullable(abstractText),
    publishedAt,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}

export function isProbablyArticle(candidateUrl: string, article: Article) {
  if (!article.title || article.title === '无标题') return false;

  const pathname = new URL(candidateUrl).pathname.toLowerCase();
  const articlePath = /(?:\/article|\/articles|\/paper|\/papers|\/doi|\/abs|\/content)/.test(pathname);
  if (articlePath) return true;
  if (article.doi) return true;
  if (article.abstractText && article.abstractText.length > 60) return true;

  return article.title.length >= 20;
}

export function scoreCandidate(homepage: URL, candidate: string) {
  const baseHost = homepage.host;
  const url = new URL(candidate);
  const pathname = url.pathname.toLowerCase();

  let score = 0;
  if (url.host === baseHost) score += 15;
  if (/\/(?:article|articles|paper|papers|doi|abs|content)\b/.test(pathname)) score += 40;
  if (/\/(latest|current|new|news)\b/.test(pathname)) score -= 30;
  if (/\.(pdf|jpg|jpeg|png|svg|gif|zip|rar|xml|rss|css|js|woff2?)$/i.test(pathname)) score -= 80;
  if (pathname.split('/').filter(Boolean).length >= 2) score += 8;

  return score;
}
