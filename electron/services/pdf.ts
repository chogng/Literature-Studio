import path from 'node:path';
import { promises as fs } from 'node:fs';
import { load } from 'cheerio';

import type { PreviewDownloadPdfPayload } from '../types.js';
import { cleanText } from '../utils/text.js';
import { normalizeUrl } from '../utils/url.js';
import { appError } from '../utils/app-error.js';
import { fetchHtml } from './article-fetcher.js';

function pickMetaContent($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr('content'));
    if (value) return value;
  }

  return '';
}

function toAbsoluteHttpUrl(rawUrl: string, pageUrl: string) {
  try {
    const resolved = new URL(rawUrl, pageUrl);
    if (!/^https?:$/i.test(resolved.protocol)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function scorePdfLinkCandidate(
  href: string,
  absoluteUrl: string,
  contextText: string,
  mimeType: string,
  rel: string,
  hasDownloadAttribute: boolean,
) {
  const hrefText = `${href} ${absoluteUrl}`.toLowerCase();
  const context = contextText.toLowerCase();
  const loweredMime = mimeType.toLowerCase();
  const loweredRel = rel.toLowerCase();

  let score = 0;

  if (/\.pdf(?:$|[?#])/i.test(hrefText)) score += 220;
  if (/\bapplication\/pdf\b/i.test(loweredMime)) score += 200;
  if (hasDownloadAttribute) score += 150;

  if (/(?:[?&](?:format|filetype|type|mime)=pdf(?:[&#]|$)|\/pdf(?:[/?#]|$))/i.test(hrefText)) {
    score += 140;
  }

  if (/\b(download|fulltext|full-text|getpdf|viewpdf|pdfviewer)\b/i.test(hrefText)) {
    score += 70;
  }

  if (/\b(pdf|download\s*pdf|view\s*pdf|full\s*text)\b/i.test(context)) {
    score += 90;
  }

  if (/\b(?:alternate|attachment)\b/i.test(loweredRel)) {
    score += 30;
  }

  if (/\b(citation|bibtex|endnote|ris|supplement|dataset|metadata|xml|fig(ure)?s?)\b/i.test(`${hrefText} ${context}`)) {
    score -= 140;
  }

  if (/\.(zip|csv|xml|json|docx?|pptx?|xlsx?)(?:$|[?#])/i.test(hrefText)) {
    score -= 260;
  }

  return score;
}

export function extractPdfUrl(pageUrl: string, html: string) {
  const $ = load(html);
  const fromMeta = pickMetaContent($, [
    'meta[name="citation_pdf_url"]',
    'meta[property="citation_pdf_url"]',
    'meta[name="wkhealth_pdf_url"]',
    'meta[name="pdf_url"]',
    'meta[property="pdf_url"]',
  ]);
  if (fromMeta) {
    return toAbsoluteHttpUrl(fromMeta, pageUrl) ?? fromMeta;
  }

  const scoredCandidates = new Map<string, number>();
  const hrefNodes = $('a[href], link[href], area[href]').toArray();

  for (const node of hrefNodes) {
    const element = $(node);
    const href = cleanText(element.attr('href'));
    if (!href) continue;

    const absoluteUrl = toAbsoluteHttpUrl(href, pageUrl);
    if (!absoluteUrl) continue;

    const textParts = [
      cleanText(element.text()),
      cleanText(element.attr('title')),
      cleanText(element.attr('aria-label')),
      cleanText(element.attr('data-track-action')),
      cleanText(element.attr('data-track-label')),
      cleanText(element.attr('class')),
    ].filter(Boolean);

    const contextText = textParts.join(' ');
    const mimeType = cleanText(element.attr('type'));
    const rel = cleanText(element.attr('rel'));
    const hasDownloadAttribute = element.attr('download') !== undefined;

    const score = scorePdfLinkCandidate(
      href,
      absoluteUrl,
      contextText,
      mimeType,
      rel,
      hasDownloadAttribute,
    );
    const existingScore = scoredCandidates.get(absoluteUrl) ?? Number.NEGATIVE_INFINITY;
    if (score > existingScore) {
      scoredCandidates.set(absoluteUrl, score);
    }
  }

  if (scoredCandidates.size > 0) {
    const best = [...scoredCandidates.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 100) {
      return best[0];
    }
  }

  const hrefCandidates = [...scoredCandidates.keys()];
  for (const href of hrefCandidates) {
    if (!/\.pdf(?:$|[?#])/i.test(href)) continue;

    return href;
  }

  const regexMatch = html.match(/https?:\/\/[^\s"'<>]+\.pdf(?:\?[^\s"'<>]*)?/i);
  return regexMatch ? regexMatch[0] : null;
}

function safePdfFileName(fileName: unknown) {
  const raw = cleanText(fileName) || `article-${Date.now()}.pdf`;
  const sanitized = raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

export async function previewDownloadPdf(
  payload: PreviewDownloadPdfPayload = {},
  defaultDownloadDir: string,
  previewPageHtml: string | null = null,
) {
  const pageUrl = normalizeUrl(payload.pageUrl ?? '');
  const customDownloadDir =
    typeof payload.customDownloadDir === 'string' ? cleanText(payload.customDownloadDir) : '';
  const downloadDir = customDownloadDir || defaultDownloadDir;
  await fs.mkdir(downloadDir, { recursive: true });

  const html = typeof previewPageHtml === 'string' && previewPageHtml.trim() ? previewPageHtml : await fetchHtml(pageUrl);
  const pdfUrl = extractPdfUrl(pageUrl, html);
  if (!pdfUrl) {
    throw appError('PDF_LINK_NOT_FOUND', { pageUrl });
  }

  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw appError('PDF_DOWNLOAD_FAILED', {
      status: response.status,
      statusText: response.statusText,
      pdfUrl,
    });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const parsed = new URL(pdfUrl);
  const fallbackName = path.basename(parsed.pathname) || `article-${Date.now()}.pdf`;
  const fileName = safePdfFileName(decodeURIComponent(fallbackName));
  const filePath = path.join(downloadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    filePath,
    sourceUrl: pdfUrl,
  };
}
