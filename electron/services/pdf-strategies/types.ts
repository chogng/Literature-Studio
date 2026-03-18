import type { PdfDownloadResult } from '../../types.js';

export type PdfDownloadRequest = {
  pageUrl: string;
  explicitDownloadUrl: string | null;
  doi: string | null;
  articleTitle: string;
  journalTitle: string;
  downloadDir: string;
  previewPageHtml: string | null;
  scienceCandidateUrls: string[];
  natureCandidateUrls: string[];
};

export type PdfDownloadStrategyDisposition = 'exclusive' | 'preferred' | 'fallback';

export interface PdfDownloadStrategy {
  id: string;
  disposition: PdfDownloadStrategyDisposition;
  matches(request: PdfDownloadRequest): boolean;
  download(request: PdfDownloadRequest): Promise<PdfDownloadResult>;
}
