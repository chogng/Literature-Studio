import type { DateRange } from '../types.js';

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
    throw new Error('链接不能为空');
  }

  const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(value);
  if (!/^https?:$/i.test(url.protocol)) {
    throw new Error('仅支持 http/https 链接');
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
    throw new Error(`开始日期格式无效：${normalizedStart}`);
  }
  if (normalizedEnd && !end) {
    throw new Error(`结束日期格式无效：${normalizedEnd}`);
  }
  if (start && end && start > end) {
    throw new Error('开始日期不能晚于结束日期');
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
