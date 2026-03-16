import { cleanText } from './text.js';

const INVALID_FILE_NAME_RE = /[<>:"/\\|?*\u0000-\u001F]/g;
const TRAILING_FILE_NAME_RE = /[. ]+$/g;
const PDF_EXTENSION_RE = /\.pdf$/i;
const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

function normalizePdfFileStem(value: unknown) {
  const cleaned = cleanText(value).replace(PDF_EXTENSION_RE, '');
  if (!cleaned) return '';

  const normalized = cleaned
    .replace(INVALID_FILE_NAME_RE, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TRAILING_FILE_NAME_RE, '')
    .trim();

  if (!normalized) return '';

  const trimmed = normalized.slice(0, 180).replace(TRAILING_FILE_NAME_RE, '').trim();
  if (!trimmed) return '';

  return WINDOWS_RESERVED_NAMES.has(trimmed.toUpperCase()) ? `${trimmed}_` : trimmed;
}

export function buildPdfFileName(preferredTitle: unknown, fallbackName?: unknown) {
  const preferredStem = normalizePdfFileStem(preferredTitle);
  if (preferredStem) {
    return `${preferredStem}.pdf`;
  }

  const fallbackStem = normalizePdfFileStem(fallbackName);
  if (fallbackStem) {
    return `${fallbackStem}.pdf`;
  }

  return `article-${Date.now()}.pdf`;
}
