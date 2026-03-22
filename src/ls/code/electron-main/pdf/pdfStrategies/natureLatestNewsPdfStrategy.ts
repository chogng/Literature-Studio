import { isLikelyNatureLatestNewsArticleUrl, tryDownloadNatureLatestNewsPdf } from '../natureLatestNewsPdf.js';
import type { PdfDownloadStrategy } from './pdfStrategyTypes.js';

export const natureLatestNewsPdfStrategy: PdfDownloadStrategy = {
  id: 'nature-latest-news-pdf',
  priority: 'preferred',
  matches(request) {
    if (typeof request.previewHtmlSnapshot === 'string' && request.previewHtmlSnapshot.trim()) {
      return request.naturePdfCandidateUrls.length > 0;
    }

    return isLikelyNatureLatestNewsArticleUrl(request.pageUrl);
  },
  async download(request) {
    return await tryDownloadNatureLatestNewsPdf(request);
  },
};
