import { load } from 'cheerio';

import type { Article, DateRange, FetchLatestArticlesPayload, StorageService } from '../types.js';
import { buildArticleFromHtml, isProbablyArticle, scoreCandidate } from './article-parser.js';
import { isWithinDateRange, normalizeUrl, parseDateRange, cleanText } from '../utils/text.js';

const ARTICLE_LIMIT_MAX = 20;
const DEFAULT_BATCH_LIMIT = 5;
const PREVIEW_CANDIDATE_MULTIPLIER = 12;

export async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${response.statusText}`);
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

function normalizeHomepageUrls(payload: FetchLatestArticlesPayload) {
  const cleanedHomepageUrls = (Array.isArray(payload.homepageUrls) ? payload.homepageUrls : [])
    .map((value) => cleanText(value))
    .filter(Boolean)
    .map((value) => normalizeUrl(value));

  return [...new Set(cleanedHomepageUrls)];
}

async function fetchLatestArticlesFromHomepage(
  homepageUrl: string,
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

      fetchedSourceUrls.add(article.sourceUrl);
      fetched.push(article);
    } catch {
      continue;
    }
  }

  return fetched;
}

export async function fetchLatestArticles(payload: FetchLatestArticlesPayload = {}, storage: StorageService) {
  const homepageUrls = normalizeHomepageUrls(payload);
  if (homepageUrls.length === 0) {
    throw new Error('请至少提供一个批量抓取 URL');
  }

  const limit = Math.min(
    ARTICLE_LIMIT_MAX,
    Math.max(1, Number.parseInt(String(payload.limit ?? DEFAULT_BATCH_LIMIT), 10) || DEFAULT_BATCH_LIMIT),
  );
  const sameDomainOnly = payload.sameDomainOnly !== false;
  const dateRange = parseDateRange(payload.startDate ?? null, payload.endDate ?? null);
  const fetched: Article[] = [];
  const seenSourceUrls = new Set<string>();
  const failedSources: string[] = [];

  for (const homepageUrl of homepageUrls) {
    try {
      const homepageArticles = await fetchLatestArticlesFromHomepage(
        homepageUrl,
        limit,
        sameDomainOnly,
        dateRange,
      );

      for (const article of homepageArticles) {
        if (seenSourceUrls.has(article.sourceUrl)) continue;
        seenSourceUrls.add(article.sourceUrl);
        fetched.push(article);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failedSources.push(`${homepageUrl}: ${message}`);
    }
  }

  if (fetched.length === 0) {
    if (failedSources.length > 0) {
      throw new Error(failedSources.join(' | '));
    }

    if (dateRange.start || dateRange.end) {
      throw new Error('已抓取候选链接，但没有命中你设置的时间区间。');
    }

    throw new Error('已抓取候选链接，但未解析出有效文章内容。');
  }

  await storage.saveFetchedArticles(fetched);
  return fetched;
}
