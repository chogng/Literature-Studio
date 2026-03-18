import { load } from 'cheerio';

import type { Article } from '../types.js';
import { parseDateString } from '../utils/date.js';
import { cleanNullable, cleanText, pickFirstNonEmpty, uniq } from '../utils/text.js';
import {
  hasArticlePathScoreSignal,
  hasArticlePathSignal,
  hasNewsListingPathSignal,
  isLikelyStaticResourcePath,
} from './article-url-rules.js';

const DOI_RE = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
type StructuredDataRecord = Record<string, unknown>;

function pickMetaContent($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr('content'));
    if (value) return value;
  }

  return '';
}

function collectStructuredDataItems(input: unknown, target: StructuredDataRecord[]) {
  if (!input || typeof input !== 'object') return;

  if (Array.isArray(input)) {
    input.forEach((entry) => collectStructuredDataItems(entry, target));
    return;
  }

  const record = input as StructuredDataRecord;
  target.push(record);

  const graph = record['@graph'];
  if (Array.isArray(graph)) {
    graph.forEach((entry) => collectStructuredDataItems(entry, target));
  }
}

function extractStructuredDataItems($: ReturnType<typeof load>) {
  const items: StructuredDataRecord[] = [];

  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = $(node).html();
    if (!raw) return;

    try {
      collectStructuredDataItems(JSON.parse(raw), items);
    } catch {
      return;
    }
  });

  return items;
}

function extractAuthors($: ReturnType<typeof load>, structuredDataItems: StructuredDataRecord[]) {
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
  for (const item of structuredDataItems) {
    const author = item?.author;
    if (!author) continue;

    if (Array.isArray(author)) {
      author.forEach((entry) => {
        if (typeof entry === 'string') {
          const text = cleanText(entry);
          if (text) ldAuthors.push(text);
          return;
        }

        const text = cleanText(
          entry && typeof entry === 'object' ? (entry as { name?: unknown }).name : '',
        );
        if (text) ldAuthors.push(text);
      });
      continue;
    }

    if (typeof author === 'string') {
      const text = cleanText(author);
      if (text) ldAuthors.push(text);
      continue;
    }

    const text = cleanText(
      author && typeof author === 'object' ? (author as { name?: unknown }).name : '',
    );
    if (text) ldAuthors.push(text);
  }

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

function extractPublishedDate($: ReturnType<typeof load>, structuredDataItems: StructuredDataRecord[]) {
  const metaDateSelectors = [
    'meta[name="citation_publication_date"]',
    'meta[name="citation_online_date"]',
    'meta[name="citation_date"]',
    'meta[name="dc.date"]',
    'meta[name="dc.date.issued"]',
    'meta[name="prism.publicationDate"]',
    'meta[name="article_date_original"]',
    'meta[property="article:published_time"]',
    'meta[property="og:article:published_time"]',
    'meta[itemprop="datePublished"]',
  ];
  for (const selector of metaDateSelectors) {
    const parsed = parseDateString($(selector).first().attr('content'));
    if (parsed) return parsed;
  }

  const semanticDateCandidates = [
    $('time[datetime]').first().attr('datetime'),
    $('[itemprop="datePublished"]').first().attr('datetime'),
    $('[itemprop="datePublished"]').first().attr('content'),
    $('[itemprop="datePublished"]').first().text(),
    $('time[pubdate]').first().attr('datetime'),
    $('time[pubdate]').first().text(),
  ];
  for (const value of semanticDateCandidates) {
    const parsed = parseDateString(value);
    if (parsed) return parsed;
  }

  for (const item of structuredDataItems) {
    const structuredCandidates = [
      item.datePublished,
      item.dateCreated,
      item.dateIssued,
      item.uploadDate,
    ];
    for (const value of structuredCandidates) {
      const parsed = parseDateString(value);
      if (parsed) return parsed;
    }
  }

  return null;
}

function normalizeArticleTypeValue(value: unknown) {
  const text = cleanText(value);
  if (!text) return '';

  const withoutArticleSuffix = text.replace(/article$/i, '').trim();
  const normalized = withoutArticleSuffix || text;
  if (!normalized || /^article$/i.test(normalized)) return '';
  return normalized;
}

function collectStructuredTextCandidates(value: unknown, target: string[]) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach((entry) => collectStructuredTextCandidates(entry, target));
    return;
  }

  if (typeof value === 'string') {
    const text = cleanText(value);
    if (text) target.push(text);
    return;
  }

  if (typeof value === 'object') {
    const record = value as StructuredDataRecord;
    const name = cleanText(record.name);
    if (name) target.push(name);
    const typeName = cleanText(record['@type']);
    if (typeName) target.push(typeName);
  }
}

function collectStructuredFieldTextCandidates(value: unknown, target: string[]) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach((entry) => collectStructuredFieldTextCandidates(entry, target));
    return;
  }

  if (typeof value === 'string') {
    const text = cleanText(value);
    if (text) target.push(text);
    return;
  }

  if (typeof value === 'object') {
    const record = value as StructuredDataRecord;
    const directCandidates = [record.text, record.name, record.value, record['@value']];
    directCandidates.forEach((entry) => {
      if (typeof entry !== 'string' && typeof entry !== 'number') {
        return;
      }
      const text = cleanText(entry);
      if (text) target.push(text);
    });
  }
}

function extractArticleType($: ReturnType<typeof load>, structuredDataItems: StructuredDataRecord[]) {
  const byMeta = normalizeArticleTypeValue(
    pickMetaContent($, [
      'meta[name="citation_article_type"]',
      'meta[name="dc.type"]',
      'meta[name="prism.genre"]',
      'meta[property="article:section"]',
      'meta[property="og:type"]',
    ]),
  );
  if (byMeta) return byMeta;

  const structuredTypeCandidates: string[] = [];
  for (const item of structuredDataItems) {
    collectStructuredTextCandidates(item.articleSection, structuredTypeCandidates);
    collectStructuredTextCandidates(item.genre, structuredTypeCandidates);
    collectStructuredTextCandidates(item.additionalType, structuredTypeCandidates);
    collectStructuredTextCandidates(item['@type'], structuredTypeCandidates);
  }

  for (const candidate of structuredTypeCandidates) {
    const normalized = normalizeArticleTypeValue(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function extractAbstract($: ReturnType<typeof load>, structuredDataItems: StructuredDataRecord[]) {
  const byMeta = pickMetaContent($, [
    'meta[name="citation_abstract"]',
    'meta[name="dc.description.abstract"]',
    'meta[name="prism.abstract"]',
  ]);
  if (byMeta) return byMeta;

  const candidates = [
    cleanText($('[itemprop="abstract"] p').first().text()),
    cleanText($('[itemprop="abstract"]').first().text()),
    cleanText($('section[aria-labelledby*="abs"] p').first().text()),
    cleanText($('div.abstract p').first().text()),
    cleanText($('p.abstract').first().text()),
  ].filter(Boolean);
  if (candidates.length > 0) return candidates[0];

  const structuredCandidates: string[] = [];
  for (const item of structuredDataItems) {
    collectStructuredFieldTextCandidates(item.abstract, structuredCandidates);
  }
  if (structuredCandidates.length > 0) return structuredCandidates[0];

  return null;
}

function extractDescription($: ReturnType<typeof load>, structuredDataItems: StructuredDataRecord[]) {
  const byMeta = pickMetaContent($, [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="dc.description"]',
    'meta[name="twitter:description"]',
  ]);
  if (byMeta) return byMeta;

  const candidates = [
    cleanText($('div[data-test="article-description"][itemprop="description"] p').first().text()),
    cleanText($('div[data-test="article-description"] p').first().text()),
    cleanText($('[itemprop="description"] p').first().text()),
    cleanText($('[itemprop="description"]').first().text()),
    cleanText($('div.c-card__summary[itemprop="description"] p').first().text()),
    cleanText($('div.c-card__summary p').first().text()),
  ].filter(Boolean);
  if (candidates.length > 0) return candidates[0];

  const structuredCandidates: string[] = [];
  for (const item of structuredDataItems) {
    collectStructuredFieldTextCandidates(item.description, structuredCandidates);
  }

  return structuredCandidates[0] ?? null;
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
  const structuredDataItems = extractStructuredDataItems($);
  const title = extractTitle($);
  const articleType = extractArticleType($, structuredDataItems);
  const doi = extractDoi($, html);
  const authors = extractAuthors($, structuredDataItems);
  const abstractText = extractAbstract($, structuredDataItems);
  const descriptionText = extractDescription($, structuredDataItems);
  const publishedAt = extractPublishedDate($, structuredDataItems);

  return {
    title,
    articleType: cleanNullable(articleType),
    doi: cleanNullable(doi),
    authors,
    abstractText: cleanNullable(abstractText),
    descriptionText: cleanNullable(descriptionText),
    publishedAt,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}

export function hasStrongArticleSignals(
  candidateUrl: string,
  article: Pick<Article, 'doi' | 'abstractText' | 'descriptionText'>,
) {
  const pathname = new URL(candidateUrl).pathname.toLowerCase();
  if (hasArticlePathSignal(pathname)) return true;
  if (article.doi) return true;
  if (article.abstractText && article.abstractText.length > 60) return true;
  if (article.descriptionText && article.descriptionText.length > 60) return true;

  return false;
}

export function isProbablyArticle(candidateUrl: string, article: Article) {
  if (!article.title) return false;
  if (hasStrongArticleSignals(candidateUrl, article)) return true;

  return article.title.length >= 20;
}

export function scoreCandidate(page: URL, candidate: string) {
  const baseHost = page.host;
  const url = new URL(candidate);
  const pathname = url.pathname.toLowerCase();

  let score = 0;
  if (url.host === baseHost) score += 15;
  if (hasArticlePathScoreSignal(pathname)) score += 40;
  if (hasNewsListingPathSignal(pathname)) score -= 30;
  if (isLikelyStaticResourcePath(pathname)) score -= 80;
  if (pathname.split('/').filter(Boolean).length >= 2) score += 8;

  return score;
}
