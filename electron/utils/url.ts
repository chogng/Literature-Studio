import { appError } from './app-error.js';
import { cleanText } from './text.js';

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

function trimTrailingUrlPunctuation(input: unknown) {
  let normalized = cleanText(input);
  if (!normalized) {
    return '';
  }

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

export function normalizeUrl(input: unknown) {
  const trimmed = trimTrailingUrlPunctuation(input);
  if (!trimmed) {
    throw appError('URL_EMPTY');
  }

  const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(value);
  if (!/^https?:$/i.test(url.protocol)) {
    throw appError('URL_PROTOCOL_UNSUPPORTED', { protocol: url.protocol });
  }

  return url.toString();
}
