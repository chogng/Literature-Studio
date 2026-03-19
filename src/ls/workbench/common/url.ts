import {
  buildNatureResearchPdfDownloadUrl as buildSharedNatureResearchPdfDownloadUrl,
  buildSciencePdfDownloadUrl as buildSharedSciencePdfDownloadUrl,
  isScienceCurrentTocUrl as isSharedScienceCurrentTocUrl,
  sanitizeUrlInput as sanitizeSharedUrlInput,
} from '../../base/common/url';

export function sanitizeUrlInput(input: string) {
  return sanitizeSharedUrlInput(input);
}

export function normalizeUrl(input: string): string {
  const trimmed = sanitizeUrlInput(input);
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function buildSciencePdfDownloadUrl(input: string, doi?: string | null) {
  const normalized = normalizeUrl(input);
  if (!normalized) return '';
  return buildSharedSciencePdfDownloadUrl(normalized, doi) ?? '';
}

export function isScienceCurrentTocUrl(input: string) {
  const normalized = normalizeUrl(input);
  if (!normalized) return false;
  return isSharedScienceCurrentTocUrl(normalized);
}

export function buildNatureResearchPdfDownloadUrl(input: string) {
  const normalized = normalizeUrl(input);
  if (!normalized) return '';
  return buildSharedNatureResearchPdfDownloadUrl(normalized) ?? '';
}
