import { useSyncExternalStore } from 'react';
import {
  getPdfDownloadStatus,
  subscribePdfDownloadStatus,
} from '../services/document/pdfDownloadStatus';

const EMPTY_PDF_DOWNLOAD_STATUS = getPdfDownloadStatus('');

export function usePdfDownloadStatus(pageUrl: string) {
  return useSyncExternalStore(
    subscribePdfDownloadStatus,
    () => getPdfDownloadStatus(pageUrl),
    () => EMPTY_PDF_DOWNLOAD_STATUS,
  );
}
