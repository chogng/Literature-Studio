const TRAILING_URL_PUNCTUATION_RE = /[、，。；：！？,.;:!?]+$/u;

const TRAILING_URL_CLOSER_PAIRS: Record<string, string> = {
  ')': '(',
  ']': '[',
  '}': '{',
  '>': '<',
  '）': '（',
  '】': '【',
  '》': '《',
  '」': '「',
  '』': '『',
};

function countOccurrences(value: string, target: string) {
  let count = 0;
  for (const char of value) {
    if (char === target) {
      count += 1;
    }
  }
  return count;
}

export function sanitizeUrlInput(input: string) {
  let normalized = input.trim();
  if (!normalized) return '';

  normalized = normalized.replace(TRAILING_URL_PUNCTUATION_RE, '');
  while (normalized) {
    const lastChar = normalized.charAt(normalized.length - 1);
    const openingChar = TRAILING_URL_CLOSER_PAIRS[lastChar];
    if (!openingChar) {
      break;
    }

    const openingCount = countOccurrences(normalized, openingChar);
    const closingCount = countOccurrences(normalized, lastChar);
    if (closingCount <= openingCount) {
      break;
    }

    normalized = normalized.slice(0, -1).trimEnd().replace(TRAILING_URL_PUNCTUATION_RE, '');
  }

  return normalized;
}

export function normalizeUrl(input: string): string {
  const trimmed = sanitizeUrlInput(input);
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

const SCIENCE_DOI_PATH_RE = /^\/doi\/(?:abs\/|epdf\/|pdf\/)?(.+)$/i;
const SCIENCE_CURRENT_TOC_PATH_RE = /^\/toc\/[^/]+\/current\/?$/i;
const NATURE_ARTICLE_PATH_RE = /^\/articles\/([^/]+?)(?:\.pdf|_reference\.pdf)?\/?$/i;
const NATURE_ARTICLE_DOWNLOAD_PATH_RE = /^\/articles\/[^/]+(?:\.pdf|_reference\.pdf)$/i;

export function buildSciencePdfDownloadUrl(input: string) {
  const normalized = normalizeUrl(input);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'science.org' && hostname !== 'www.science.org') {
      return '';
    }

    const matched = parsed.pathname.replace(/\/+$/, '').match(SCIENCE_DOI_PATH_RE);
    const doiPath = matched?.[1]?.trim();
    if (!doiPath) {
      return '';
    }

    const downloadUrl = new URL(`/doi/pdf/${doiPath}`, parsed.origin);
    downloadUrl.searchParams.set('download', 'true');
    return downloadUrl.toString();
  } catch {
    return '';
  }
}

export function isScienceCurrentTocUrl(input: string) {
  const normalized = normalizeUrl(input);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'science.org' && hostname !== 'www.science.org') {
      return false;
    }

    return SCIENCE_CURRENT_TOC_PATH_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isNatureHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'nature.com' || normalized.endsWith('.nature.com');
}

export function buildNatureResearchPdfDownloadUrl(input: string) {
  const normalized = normalizeUrl(input);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    if (!isNatureHost(parsed.hostname)) {
      return '';
    }

    const normalizedPathname = parsed.pathname.replace(/\/+$/, '');
    if (NATURE_ARTICLE_DOWNLOAD_PATH_RE.test(normalizedPathname)) {
      return parsed.toString();
    }

    const matched = normalizedPathname.match(NATURE_ARTICLE_PATH_RE);
    const articleId = matched?.[1]?.trim();
    if (!articleId) {
      return '';
    }

    return new URL(`/articles/${articleId}.pdf`, parsed.origin).toString();
  } catch {
    return '';
  }
}
