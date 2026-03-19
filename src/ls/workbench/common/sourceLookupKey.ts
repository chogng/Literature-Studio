import { normalizeUrl } from './url';

export function createSourceLookupKey(input: unknown) {
  const normalized = normalizeUrl(String(input ?? ''));
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    return `${hostname}${pathname}`;
  } catch {
    return '';
  }
}
