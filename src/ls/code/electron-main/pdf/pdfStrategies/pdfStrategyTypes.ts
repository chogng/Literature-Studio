import type { PdfDownloadResult } from '../../../../base/parts/sandbox/common/desktopTypes.js';

export type PdfDownloadContext = {
  pageUrl: string;
  requestedDownloadUrl: string | null;
  doi: string | null;
  articleTitle: string;
  journalTitle: string;
  downloadDir: string;
  previewHtmlSnapshot: string | null;
  sciencePdfCandidateUrls: string[];
  naturePdfCandidateUrls: string[];
};

export type PdfDownloadStrategyPriority = 'exclusive' | 'preferred' | 'fallback';

export interface PdfDownloadStrategy {
  id: string;
  priority: PdfDownloadStrategyPriority;
  matches(request: PdfDownloadContext): boolean;
  download(request: PdfDownloadContext): Promise<PdfDownloadResult | null>;
}

