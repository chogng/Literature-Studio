import { cleanText, parseDateString } from '../utils/text.js';

const MONTH_NAME_RE =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_HINT_PATTERNS = [
  /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/i,
  new RegExp(`\\b\\d{1,2}\\s+${MONTH_NAME_RE}\\s+\\d{4}\\b`, 'i'),
  new RegExp(`\\b${MONTH_NAME_RE}\\s+\\d{1,2},?\\s+\\d{4}\\b`, 'i'),
];

export function parseDateHintFromText(value: unknown) {
  const normalized = cleanText(value);
  if (!normalized) return null;

  const direct = parseDateString(normalized);
  if (direct) return direct;

  for (const pattern of DATE_HINT_PATTERNS) {
    const matched = normalized.match(pattern);
    if (!matched) continue;

    const parsed = parseDateString(matched[0]);
    if (parsed) return parsed;
  }

  return null;
}
