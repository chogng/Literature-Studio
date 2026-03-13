import { load } from 'cheerio';

import type { Article, DateRange, FetchLatestArticlesPayload, StorageService } from '../types.js';
import { buildArticleFromHtml, isProbablyArticle, scoreCandidate } from './article-parser.js';
import { isWithinDateRange, normalizeUrl, parseDateRange, cleanText } from '../utils/text.js';
import { appError, isAppError } from '../utils/app-error.js';

const ARTICLE_LIMIT_MAX = 20;
const DEFAULT_BATCH_LIMIT = 5;
const PREVIEW_CANDIDATE_MULTIPLIER = 12;

type HomepageSource = {
  sourceId: string;
  homepageUrl: string;
  journalTitle: string;
};

function normalizeSourceId(input: unknown, homepageUrl: string, index: number) {
  const cleaned = cleanText(input);
  if (cleaned) return cleaned;

  const hostnameSeed = cleanText(homepageUrl)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);

  if (hostnameSeed) {
    return `source-${hostnameSeed}-${index + 1}`;
  }

  return `source-${index + 1}`;
}

function safeNormalizeUrl(value: string) {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

export async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw appError('HTTP_REQUEST_FAILED', {
      status: response.status,
      statusText: response.statusText,
      url,
    });
  }

  return response.text();
}

export async function fetchArticle(urlValue: unknown, storage: StorageService) {
  const normalized = normalizeUrl(urlValue);
  const html = await fetchHtml(normalized);
  const article = buildArticleFromHtml(normalized, html);
  await storage.saveFetchedArticles([article]);
  return article;
}

function normalizeHomepageSources(payload: FetchLatestArticlesPayload): HomepageSource[] {
  const payloadSources = Array.isArray(payload.sources) ? payload.sources : [];
  if (payloadSources.length > 0) {
    const mapped = payloadSources
      .map((item, index) => {
        const homepageUrl = safeNormalizeUrl(cleanText(item?.homepageUrl ?? item?.url));
        if (!homepageUrl) return null;

        return {
          sourceId: normalizeSourceId(item?.sourceId, homepageUrl, index),
          homepageUrl,
          journalTitle: cleanText(item?.journalTitle),
        } satisfies HomepageSource;
      })
      .filter((source): source is HomepageSource => Boolean(source));
    const deduped = new Map<string, HomepageSource>();

    for (const source of mapped) {
      const existing = deduped.get(source.homepageUrl);
      if (!existing) {
        deduped.set(source.homepageUrl, source);
        continue;
      }

      if (!existing.journalTitle && source.journalTitle) {
        deduped.set(source.homepageUrl, source);
      }
    }

    return [...deduped.values()];
  }

  const cleanedHomepageUrls = (Array.isArray(payload.homepageUrls) ? payload.homepageUrls : [])
    .map((value) => cleanText(value))
    .filter(Boolean)
    .map((value) => normalizeUrl(value));
  const journalTitleLookup = payload.journalTitlesByHomepageUrl;
  const titleByUrl =
    journalTitleLookup && typeof journalTitleLookup === 'object'
      ? Object.fromEntries(
          Object.entries(journalTitleLookup)
            .map(([key, value]) => [safeNormalizeUrl(cleanText(key)), cleanText(value)] as const)
            .filter(([key]) => Boolean(key)),
        )
      : {};

  const dedupedUrls = [...new Set(cleanedHomepageUrls)];
  return dedupedUrls.map((homepageUrl, index) => ({
    sourceId: normalizeSourceId('', homepageUrl, index),
    homepageUrl,
    journalTitle: cleanText(titleByUrl[homepageUrl]),
  }));
}

async function fetchLatestArticlesFromHomepage(
  sourceId: string,
  homepageUrl: string,
  journalTitle: string,
  limit: number,
  sameDomainOnly: boolean,
  dateRange: DateRange,
): Promise<Article[]> {
  const homepage = new URL(homepageUrl);
  const html = await fetchHtml(homepageUrl);
  const $ = load(html);

  const links = $('a[href]')
    .map((_, node) => $(node).attr('href'))
    .get()
    .map((href) => cleanText(href))
    .filter(Boolean);

  const candidates: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();
  for (const href of links) {
    try {
      const candidateUrl = new URL(href, homepageUrl);
      if (!/^https?:$/i.test(candidateUrl.protocol)) continue;
      if (sameDomainOnly && candidateUrl.host !== homepage.host) continue;

      const normalized = candidateUrl.toString();
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      candidates.push({
        url: normalized,
        score: scoreCandidate(homepage, normalized),
      });
    } catch {
      continue;
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const fetched: Article[] = [];
  const fetchedSourceUrls = new Set<string>();
  const maxAttempts = Math.min(candidates.length, limit * PREVIEW_CANDIDATE_MULTIPLIER);

  for (let index = 0; index < maxAttempts; index += 1) {
    if (fetched.length >= limit) break;

    const candidate = candidates[index];
    if (!candidate || candidate.score < -40) continue;

    try {
      const articleHtml = await fetchHtml(candidate.url);
      const article = buildArticleFromHtml(candidate.url, articleHtml);
      if (!isProbablyArticle(candidate.url, article)) continue;
      if (!isWithinDateRange(article.publishedAt, dateRange)) continue;
      if (fetchedSourceUrls.has(article.sourceUrl)) continue;
      article.sourceId = sourceId;
      if (journalTitle) {
        article.journalTitle = journalTitle;
      }

      fetchedSourceUrls.add(article.sourceUrl);
      fetched.push(article);
    } catch {
      continue;
    }
  }

  return fetched;
}

export async function fetchLatestArticles(payload: FetchLatestArticlesPayload = {}, storage: StorageService) {
  const homepageSources = normalizeHomepageSources(payload);
  if (homepageSources.length === 0) {
    throw appError('BATCH_HOMEPAGE_URLS_EMPTY');
  }

  const limit = Math.min(
    ARTICLE_LIMIT_MAX,
    Math.max(1, Number.parseInt(String(payload.limit ?? DEFAULT_BATCH_LIMIT), 10) || DEFAULT_BATCH_LIMIT),
  );
  const sameDomainOnly = payload.sameDomainOnly !== false;
  const dateRange = parseDateRange(payload.startDate ?? null, payload.endDate ?? null);
  const fetched: Article[] = [];
  const seenSourceUrls = new Set<string>();
  const failedSources: Array<Record<string, unknown>> = [];

  for (const source of homepageSources) {
    const { sourceId, homepageUrl, journalTitle } = source;
    try {
      const homepageArticles = await fetchLatestArticlesFromHomepage(
        sourceId,
        homepageUrl,
        journalTitle,
        limit,
        sameDomainOnly,
        dateRange,
      );

      for (const article of homepageArticles) {
        const dedupeKey = `${article.sourceId ?? ''}::${article.sourceUrl}`;
        if (seenSourceUrls.has(dedupeKey)) continue;
        seenSourceUrls.add(dedupeKey);
        fetched.push(article);
      }
    } catch (error) {
      if (isAppError(error)) {
        failedSources.push({
          sourceId,
          homepageUrl,
          code: error.code,
          details: error.details,
        });
      } else {
        failedSources.push({
          sourceId,
          homepageUrl,
          code: 'UNKNOWN_ERROR',
          details: { message: error instanceof Error ? error.message : String(error) },
        });
      }
    }
  }

  if (fetched.length === 0) {
    if (failedSources.length > 0) {
      throw appError('BATCH_SOURCE_FETCH_FAILED', { failedSources });
    }

    if (dateRange.start || dateRange.end) {
      throw appError('BATCH_NO_MATCH_IN_DATE_RANGE', {
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
    }

    throw appError('BATCH_NO_VALID_ARTICLES');
  }

  await storage.saveFetchedArticles(fetched);
  return fetched;
}
