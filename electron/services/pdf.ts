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

export function extractPdfUrl(pageUrl: string, html: string) {
  const $ = load(html);
  const fromMeta = pickMetaContent($, ['meta[name="citation_pdf_url"]', 'meta[name="wkhealth_pdf_url"]']);
  if (fromMeta) {
    try {
      return new URL(fromMeta, pageUrl).toString();
    } catch {
      return fromMeta;
    }
  }

  const hrefCandidates = $('a[href], link[href]')
    .map((_, node) => cleanText($(node).attr('href')))
    .get()
    .filter(Boolean);

  for (const href of hrefCandidates) {
    if (!/\.pdf(?:$|[?#])/i.test(href)) continue;

    try {
      return new URL(href, pageUrl).toString();
    } catch {
      continue;
    }
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
) {
  const pageUrl = normalizeUrl(payload.pageUrl ?? '');
  const customDownloadDir =
    typeof payload.customDownloadDir === 'string' ? cleanText(payload.customDownloadDir) : '';
  const downloadDir = customDownloadDir || defaultDownloadDir;
  await fs.mkdir(downloadDir, { recursive: true });

  const html = await fetchHtml(pageUrl);
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
