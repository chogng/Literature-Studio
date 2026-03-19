import { cleanText } from '../utils/text.js';
import { load } from 'cheerio';

const NATURE_ARTICLE_PATH_RE = /^\/articles\/([^/]+?)(?:\.pdf|_reference\.pdf)?\/?$/i;
const NATURE_ARTICLE_DOWNLOAD_PATH_RE = /^\/articles\/[^/]+(?:\.pdf|_reference\.pdf)$/i;

function isNatureHost(hostname: string) {
  const normalized = cleanText(hostname).toLowerCase();
  return normalized === 'nature.com' || normalized.endsWith('.nature.com');
}

function extractNatureArticleId(pathname: string) {
  const normalizedPathname = cleanText(pathname).replace(/\/+$/, '');
  const matched = normalizedPathname.match(NATURE_ARTICLE_PATH_RE);
  return cleanText(matched?.[1] ?? '');
}

function toAbsoluteNatureHttpUrl(rawUrl: string, baseUrl: string) {
  try {
    const resolved = new URL(rawUrl, baseUrl);
    if (!/^https?:$/i.test(resolved.protocol)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

export function buildNatureResearchPdfDownloadCandidates(inputUrl: string) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(inputUrl);
  } catch {
    parsed = null;
  }

  if (!parsed || !isNatureHost(parsed.hostname)) {
    return [];
  }

  const articleId = extractNatureArticleId(parsed.pathname);
  if (!articleId) {
    return [];
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  const addCandidate = (value: string) => {
    const cleaned = cleanText(value);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    candidates.push(cleaned);
  };

  // Keep the current explicit URL first when it is already a concrete Nature PDF endpoint.
  const currentPath = parsed.pathname.replace(/\/+$/, '');
  if (NATURE_ARTICLE_DOWNLOAD_PATH_RE.test(currentPath)) {
    addCandidate(parsed.toString());
  }

  addCandidate(new URL(`/articles/${articleId}.pdf`, parsed.origin).toString());
  addCandidate(new URL(`/articles/${articleId}_reference.pdf`, parsed.origin).toString());

  return candidates;
}

export function buildNatureResearchPdfDownloadUrl(inputUrl: string) {
  return buildNatureResearchPdfDownloadCandidates(inputUrl)[0] ?? null;
}

export function extractNatureResearchPdfDownloadCandidatesFromHtml(
  pageUrl: string,
  html: string,
) {
  const normalizedPageUrl = cleanText(pageUrl);
  const normalizedHtml = typeof html === 'string' ? html : '';
  if (!normalizedPageUrl || !normalizedHtml.trim()) {
    return [];
  }

  const $ = load(normalizedHtml);
  const candidates: string[] = [];
  const seen = new Set<string>();
  const addCandidate = (rawUrl: string) => {
    const absolute = toAbsoluteNatureHttpUrl(rawUrl, normalizedPageUrl);
    if (!absolute || seen.has(absolute)) return;
    seen.add(absolute);
    candidates.push(absolute);
  };

  for (const node of $(
    'a[data-test="download-pdf"][href], a[data-article-pdf="true"][href], a.c-pdf-download__link[href]',
  ).toArray()) {
    addCandidate(cleanText($(node).attr('href')));
  }

  return candidates;
}
