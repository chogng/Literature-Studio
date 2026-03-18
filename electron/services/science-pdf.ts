import { cleanText } from '../utils/text.js';

const SCIENCE_DOI_PATH_RE = /^\/doi\/(?:abs\/|epdf\/|pdf\/)?(.+)$/i;
const DOI_VALUE_RE = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;

function isScienceHost(hostname: string) {
  const normalized = cleanText(hostname).toLowerCase();
  return normalized === 'science.org' || normalized === 'www.science.org';
}

function extractScienceDoiValue(value: string | null | undefined) {
  const normalized = cleanText(value);
  if (!normalized) {
    return '';
  }

  const matched = normalized.match(DOI_VALUE_RE);
  return cleanText(matched?.[0] ?? '');
}

function resolveScienceOriginAndDoiPath(inputUrl: string, doi?: string | null) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(inputUrl);
  } catch {
    parsed = null;
  }

  if (!parsed || !isScienceHost(parsed.hostname)) {
    return null;
  }

  const normalizedPathname = cleanText(parsed.pathname).replace(/\/+$/, '');
  const matched = normalizedPathname.match(SCIENCE_DOI_PATH_RE);
  const doiPath = extractScienceDoiValue(doi) || cleanText(matched?.[1] ?? '');
  if (!doiPath) {
    return null;
  }

  return {
    origin: parsed.origin,
    doiPath,
  };
}

export function buildScienceDirectPdfDownloadCandidates(inputUrl: string, doi?: string | null) {
  const resolved = resolveScienceOriginAndDoiPath(inputUrl, doi);
  if (!resolved) {
    return [];
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  const addCandidate = (value: string) => {
    const cleaned = cleanText(value);
    if (!cleaned || seen.has(cleaned)) {
      return;
    }

    seen.add(cleaned);
    candidates.push(cleaned);
  };

  const pdfPath = `/doi/pdf/${resolved.doiPath}`;
  const downloadUrl = new URL(pdfPath, resolved.origin);
  downloadUrl.searchParams.set('download', 'true');
  addCandidate(downloadUrl.toString());
  addCandidate(new URL(pdfPath, resolved.origin).toString());

  return candidates;
}

export function buildSciencePdfDownloadUrl(inputUrl: string, doi?: string | null) {
  return buildScienceDirectPdfDownloadCandidates(inputUrl, doi)[0] ?? null;
}

export function buildScienceEpdfPageUrl(inputUrl: string, doi?: string | null) {
  const resolved = resolveScienceOriginAndDoiPath(inputUrl, doi);
  if (!resolved) {
    return null;
  }

  return new URL(`/doi/epdf/${resolved.doiPath}`, resolved.origin).toString();
}
