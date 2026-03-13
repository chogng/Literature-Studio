import type { DateRange } from '../types.js';
import { appError } from './app-error.js';

export function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanNullable(value: unknown) {
  const normalized = cleanText(value);
  return normalized ? normalized : null;
}

export function normalizeUrl(input: unknown) {
  const trimmed = cleanText(input);
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

export function parseDateString(value: unknown) {
  const source = cleanText(value);
  if (!source) return null;

  const isoDateMatch = source.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoDateMatch) {
    const year = Number.parseInt(isoDateMatch[1], 10);
    const month = Number.parseInt(isoDateMatch[2], 10);
    const day = Number.parseInt(isoDateMatch[3], 10);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

export function parseDateRange(startDate: unknown, endDate: unknown): DateRange {
  const normalizedStart = cleanText(startDate);
  const normalizedEnd = cleanText(endDate);
  const start = normalizedStart ? parseDateString(normalizedStart) : null;
  const end = normalizedEnd ? parseDateString(normalizedEnd) : null;

  if (normalizedStart && !start) {
    throw appError('DATE_START_INVALID', { value: normalizedStart });
  }
  if (normalizedEnd && !end) {
    throw appError('DATE_END_INVALID', { value: normalizedEnd });
  }
  if (start && end && start > end) {
    throw appError('DATE_RANGE_INVALID', { start, end });
  }

  return { start, end };
}

export function isWithinDateRange(value: string | null | undefined, range: DateRange) {
  if (!range.start && !range.end) return true;
  if (!value) return false;
  if (range.start && value < range.start) return false;
  if (range.end && value > range.end) return false;
  return true;
}

export function uniq(values: string[]) {
  return [...new Set(values)];
}

export function pickFirstNonEmpty(values: unknown[]) {
  for (const value of values) {
    const normalized = cleanText(value);
    if (normalized) return normalized;
  }

  return '';
}
