import { normalizeUrl } from '../utils/url';

const batchLimitMin = 1;
const batchLimitMax = 20;

export const defaultBatchHomepageUrl = 'https://arxiv.org/list/cs/new';
export const defaultBatchHomepageUrls = [defaultBatchHomepageUrl];
export const defaultBatchLimit = 5;
export const defaultSameDomainOnly = true;

export function normalizeBatchLimit(input: unknown, fallback: number = defaultBatchLimit): number {
  const parsed = Number.parseInt(String(input), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(batchLimitMax, Math.max(batchLimitMin, parsed));
}

export function sanitizeBatchHomepageUrls(input: unknown): string[] {
  const values = Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

export function prepareBatchHomepageUrls(input: unknown): string[] {
  const sanitized = sanitizeBatchHomepageUrls(input);
  return [...new Set(sanitized.map((url) => normalizeUrl(url)).filter(Boolean))];
}

export function normalizeBatchHomepageUrls(
  input: unknown,
  fallback: string[] = defaultBatchHomepageUrls,
): string[] {
  const normalized = sanitizeBatchHomepageUrls(input);
  return normalized.length > 0 ? normalized : [...fallback];
}
