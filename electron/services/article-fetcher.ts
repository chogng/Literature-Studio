import { load } from 'cheerio';

import type { Article, DateRange, FetchLatestArticlesPayload, StorageService } from '../types.js';
import { buildArticleFromHtml, isProbablyArticle, scoreCandidate } from './article-parser.js';
import { createFetchTraceId, elapsedMs, shortenForLog, timingLog } from './fetch-timing.js';
import { isWithinDateRange, normalizeUrl, parseDateRange, cleanText } from '../utils/text.js';
import { appError, isAppError } from '../utils/app-error.js';

const ARTICLE_LIMIT_MAX = 20;
const DEFAULT_BATCH_LIMIT = 5;
const DEFAULT_FETCH_TIMEOUT_MS = 12000;
const HOMEPAGE_FETCH_TIMEOUT_MS = 12000;
const ARTICLE_FETCH_TIMEOUT_MS = 8000;
const CANDIDATE_FETCH_CONCURRENCY = 4;
const SOURCE_FETCH_CONCURRENCY = 3;
const MIN_CANDIDATE_ATTEMPTS = 24;
const ATTEMPTS_PER_LIMIT = 8;

type FetchHtmlOptions = {
  timeoutMs?: number;
  traceId?: string;
  stage?: string;
};

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

function toTimeoutMs(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function isAbortError(error: unknown) {
  return Boolean(error && typeof error === 'object' && (error as { name?: string }).name === 'AbortError');
}

function hasStrongArticleSignals(candidateUrl: string, article: Article) {
  const pathname = new URL(candidateUrl).pathname.toLowerCase();
  if (/(?:\/article|\/articles|\/paper|\/papers|\/doi|\/abs|\/content)/.test(pathname)) {
    return true;
  }
  if (article.doi) return true;
  if (article.abstractText && article.abstractText.length > 60) return true;
  return false;
}

export async function fetchHtml(url: string, options: FetchHtmlOptions = {}) {
  const traceId = cleanText(options.traceId) || 'fetch';
  const stage = cleanText(options.stage) || 'html';
  const timeoutMs = toTimeoutMs(options.timeoutMs, DEFAULT_FETCH_TIMEOUT_MS);
  const requestStartedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      timingLog(traceId, `${stage}:http_error`, {
        ms: elapsedMs(requestStartedAt),
        status: response.status,
        statusText: response.statusText,
        timeoutMs,
        url: shortenForLog(url),
      });
      throw appError('HTTP_REQUEST_FAILED', {
        status: response.status,
        statusText: response.statusText,
        url,
      });
    }

    const html = await response.text();
    timingLog(traceId, `${stage}:ok`, {
      ms: elapsedMs(requestStartedAt),
      status: response.status,
      timeoutMs,
      url: shortenForLog(url),
      size: html.length,
    });
    return html;
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    if (isAbortError(error)) {
      timingLog(traceId, `${stage}:timeout`, {
        ms: elapsedMs(requestStartedAt),
        timeoutMs,
        url: shortenForLog(url),
      });
      throw appError('HTTP_REQUEST_FAILED', {
        status: 'TIMEOUT',
        statusText: `Request timed out after ${timeoutMs}ms`,
        url,
      });
    }

    timingLog(traceId, `${stage}:network_error`, {
      ms: elapsedMs(requestStartedAt),
      timeoutMs,
      url: shortenForLog(url),
      message: error instanceof Error ? error.message : String(error),
    });
    throw appError('HTTP_REQUEST_FAILED', {
      status: 'NETWORK_ERROR',
      statusText: error instanceof Error ? error.message : String(error),
      url,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchArticle(urlValue: unknown, storage: StorageService) {
  const traceId = createFetchTraceId('single');
  const totalStartedAt = Date.now();
  const normalized = normalizeUrl(urlValue);
  timingLog(traceId, 'fetch_article:start', {
    url: shortenForLog(normalized),
  });

  try {
    const html = await fetchHtml(normalized, {
      traceId,
      stage: 'single_page',
    });
    const parseStartedAt = Date.now();
    const article = buildArticleFromHtml(normalized, html);
    timingLog(traceId, 'fetch_article:parsed', {
      ms: elapsedMs(parseStartedAt),
      hasTitle: Boolean(article.title),
      hasDoi: Boolean(article.doi),
      hasAbstract: Boolean(article.abstractText),
      authorCount: article.authors.length,
      publishedAt: article.publishedAt,
    });

    const saveStartedAt = Date.now();
    await storage.saveFetchedArticles([article]);
    timingLog(traceId, 'fetch_article:saved', {
      ms: elapsedMs(saveStartedAt),
      count: 1,
    });
    timingLog(traceId, 'fetch_article:done', {
      totalMs: elapsedMs(totalStartedAt),
    });
    return article;
  } catch (error) {
    timingLog(traceId, 'fetch_article:failed', {
      totalMs: elapsedMs(totalStartedAt),
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function normalizeHomepageSources(payload: FetchLatestArticlesPayload): HomepageSource[] {
  const payloadSources = Array.isArray(payload.sources) ? payload.sources : [];
  const mapped = payloadSources
    .map((item, index) => {
      const homepageUrl = safeNormalizeUrl(cleanText(item?.homepageUrl));
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

async function fetchLatestArticlesFromHomepage(
  sourceId: string,
  homepageUrl: string,
  journalTitle: string,
  limit: number,
  sameDomainOnly: boolean,
  dateRange: DateRange,
  traceId: string,
): Promise<Article[]> {
  const sourceStartedAt = Date.now();
  timingLog(traceId, 'source:start', {
    sourceId,
    homepageUrl: shortenForLog(homepageUrl),
    limit,
    sameDomainOnly,
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
  });

  try {
    const homepage = new URL(homepageUrl);
    const html = await fetchHtml(homepageUrl, {
      timeoutMs: HOMEPAGE_FETCH_TIMEOUT_MS,
      traceId,
      stage: 'source_homepage',
    });
    const homepageParseStartedAt = Date.now();
    const homepageArticle = buildArticleFromHtml(homepageUrl, html);
    const $ = load(html);
    timingLog(traceId, 'source:homepage_parsed', {
      ms: elapsedMs(homepageParseStartedAt),
      hasTitle: Boolean(homepageArticle.title),
      hasDoi: Boolean(homepageArticle.doi),
      hasAbstract: Boolean(homepageArticle.abstractText),
      publishedAt: homepageArticle.publishedAt,
    });

    const fetched: Article[] = [];
    const fetchedSourceUrls = new Set<string>();

    if (
      hasStrongArticleSignals(homepageUrl, homepageArticle) &&
      isWithinDateRange(homepageArticle.publishedAt, dateRange)
    ) {
      homepageArticle.sourceId = sourceId;
      if (journalTitle) {
        homepageArticle.journalTitle = journalTitle;
      }
      fetchedSourceUrls.add(homepageArticle.sourceUrl);
      fetched.push(homepageArticle);
      timingLog(traceId, 'source:homepage_accepted', {
        sourceUrl: shortenForLog(homepageArticle.sourceUrl),
      });
      if (fetched.length >= limit) {
        timingLog(traceId, 'source:done', {
          totalMs: elapsedMs(sourceStartedAt),
          fetchedCount: fetched.length,
          candidateAttempted: 0,
          candidateResolved: 0,
          candidateAccepted: 0,
          usedHomepageOnly: true,
        });
        return fetched;
      }
    }

    const links = $('a[href]')
      .map((_, node) => $(node).attr('href'))
      .get()
      .map((href) => cleanText(href))
      .filter(Boolean);

    const candidates: Array<{ url: string; score: number; order: number }> = [];
    const seen = new Set<string>();
    for (const href of links) {
      try {
        const candidateUrl = new URL(href, homepageUrl);
        if (!/^https?:$/i.test(candidateUrl.protocol)) continue;
        if (sameDomainOnly && candidateUrl.host !== homepage.host) continue;
        if (/\.(pdf|jpg|jpeg|png|svg|gif|zip|rar|xml|rss|css|js|woff2?)$/i.test(candidateUrl.pathname)) continue;

        const normalized = candidateUrl.toString();
        if (seen.has(normalized)) continue;

        seen.add(normalized);
        candidates.push({
          url: normalized,
          score: scoreCandidate(homepage, normalized),
          order: candidates.length,
        });
      } catch {
        continue;
      }
    }

    const sortedCandidates = [...candidates].sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return a.order - b.order;
    });
    const prioritizedCandidates = sortedCandidates.filter((candidate) => candidate.score >= -40);
    const candidatesForAttempt = prioritizedCandidates.length > 0 ? prioritizedCandidates : sortedCandidates;
    const attemptBudget = Math.min(
      candidatesForAttempt.length,
      Math.max(MIN_CANDIDATE_ATTEMPTS, limit * ATTEMPTS_PER_LIMIT),
    );
    const candidatesToFetch = candidatesForAttempt.slice(0, attemptBudget);
    const maxAttempts = candidatesToFetch.length;
    timingLog(traceId, 'source:candidates_ready', {
      linkCount: links.length,
      candidateCount: candidates.length,
      prioritizedCount: prioritizedCandidates.length,
      attemptBudget,
    });

    let candidateAttempted = 0;
    let candidateResolved = 0;
    let candidateAccepted = 0;

    for (let index = 0; index < maxAttempts; index += CANDIDATE_FETCH_CONCURRENCY) {
      if (fetched.length >= limit) break;

      const batch = candidatesToFetch.slice(index, index + CANDIDATE_FETCH_CONCURRENCY);
      candidateAttempted += batch.length;
      const settled = await Promise.allSettled(
        batch.map(async (candidate, batchOffset) => {
          const candidateOrder = index + batchOffset + 1;
          const articleHtml = await fetchHtml(candidate.url, {
            timeoutMs: ARTICLE_FETCH_TIMEOUT_MS,
            traceId,
            stage: `candidate#${candidateOrder}`,
          });
          const parseStartedAt = Date.now();
          const article = buildArticleFromHtml(candidate.url, articleHtml);
          timingLog(traceId, 'candidate:parsed', {
            candidateOrder,
            ms: elapsedMs(parseStartedAt),
            score: candidate.score,
            url: shortenForLog(candidate.url),
            hasTitle: Boolean(article.title),
            hasDoi: Boolean(article.doi),
            hasAbstract: Boolean(article.abstractText),
            publishedAt: article.publishedAt,
          });
          return { candidate, article };
        }),
      );

      let acceptedInBatch = 0;
      for (const result of settled) {
        if (fetched.length >= limit) break;
        if (result.status !== 'fulfilled') continue;
        candidateResolved += 1;

        const { candidate, article } = result.value;
        if (!isProbablyArticle(candidate.url, article)) continue;
        if (!isWithinDateRange(article.publishedAt, dateRange)) continue;
        if (fetchedSourceUrls.has(article.sourceUrl)) continue;
        article.sourceId = sourceId;
        if (journalTitle) {
          article.journalTitle = journalTitle;
        }

        fetchedSourceUrls.add(article.sourceUrl);
        fetched.push(article);
        acceptedInBatch += 1;
        candidateAccepted += 1;
      }

      timingLog(traceId, 'source:candidate_batch_done', {
        batchStartOrder: index + 1,
        batchSize: batch.length,
        candidateResolved,
        acceptedInBatch,
        totalFetched: fetched.length,
      });
    }

    timingLog(traceId, 'source:done', {
      totalMs: elapsedMs(sourceStartedAt),
      fetchedCount: fetched.length,
      candidateAttempted,
      candidateResolved,
      candidateAccepted,
      usedHomepageOnly: false,
    });
    return fetched;
  } catch (error) {
    timingLog(traceId, 'source:failed', {
      totalMs: elapsedMs(sourceStartedAt),
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function fetchLatestArticles(payload: FetchLatestArticlesPayload = {}, storage: StorageService) {
  const traceId = createFetchTraceId('batch');
  const totalStartedAt = Date.now();
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
  let rawFetchedCount = 0;
  timingLog(traceId, 'batch:start', {
    sourceCount: homepageSources.length,
    limit,
    sameDomainOnly,
    dateStart: dateRange.start,
    dateEnd: dateRange.end,
  });

  for (let index = 0; index < homepageSources.length; index += SOURCE_FETCH_CONCURRENCY) {
    const batch = homepageSources.slice(index, index + SOURCE_FETCH_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (source) => {
        try {
          const homepageArticles = await fetchLatestArticlesFromHomepage(
            source.sourceId,
            source.homepageUrl,
            source.journalTitle,
            limit,
            sameDomainOnly,
            dateRange,
            `${traceId}:${source.sourceId}`,
          );

          return {
            ok: true as const,
            source,
            articles: homepageArticles,
          };
        } catch (error) {
          return {
            ok: false as const,
            source,
            error,
          };
        }
      }),
    );

    for (const result of settled) {
      if (result.ok) {
        const { articles } = result;
        rawFetchedCount += articles.length;
        timingLog(traceId, 'batch:source_ok', {
          sourceId: result.source.sourceId,
          sourceUrl: shortenForLog(result.source.homepageUrl),
          fetchedCount: articles.length,
        });
        for (const article of articles) {
          const dedupeKey = `${article.sourceId ?? ''}::${article.sourceUrl}`;
          if (seenSourceUrls.has(dedupeKey)) continue;
          seenSourceUrls.add(dedupeKey);
          fetched.push(article);
        }
        continue;
      }

      const { source, error } = result;
      timingLog(traceId, 'batch:source_failed', {
        sourceId: source.sourceId,
        sourceUrl: shortenForLog(source.homepageUrl),
        message: error instanceof Error ? error.message : String(error),
      });
      if (isAppError(error)) {
        failedSources.push({
          sourceId: source.sourceId,
          homepageUrl: source.homepageUrl,
          code: error.code,
          details: error.details,
        });
      } else {
        failedSources.push({
          sourceId: source.sourceId,
          homepageUrl: source.homepageUrl,
          code: 'UNKNOWN_ERROR',
          details: { message: error instanceof Error ? error.message : String(error) },
        });
      }
    }
  }

  if (fetched.length === 0) {
    timingLog(traceId, 'batch:failed_no_articles', {
      totalMs: elapsedMs(totalStartedAt),
      failedSourceCount: failedSources.length,
      dateStart: dateRange.start,
      dateEnd: dateRange.end,
    });
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

  const saveStartedAt = Date.now();
  await storage.saveFetchedArticles(fetched);
  timingLog(traceId, 'batch:save_done', {
    ms: elapsedMs(saveStartedAt),
    count: fetched.length,
  });
  timingLog(traceId, 'batch:done', {
    totalMs: elapsedMs(totalStartedAt),
    sourceCount: homepageSources.length,
    rawFetchedCount,
    dedupedCount: fetched.length,
    dedupeDropped: Math.max(0, rawFetchedCount - fetched.length),
    failedSourceCount: failedSources.length,
  });
  return fetched;
}
