import { appError } from './app-error.js';
import { cleanText } from './text.js';

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
