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
