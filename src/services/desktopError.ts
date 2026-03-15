export type DesktopErrorCode =
  | 'MAIN_WINDOW_UNAVAILABLE'
  | 'UNKNOWN_COMMAND'
  | 'URL_EMPTY'
  | 'URL_PROTOCOL_UNSUPPORTED'
  | 'DATE_START_INVALID'
  | 'DATE_END_INVALID'
  | 'DATE_RANGE_INVALID'
  | 'HTTP_REQUEST_FAILED'
  | 'BATCH_PAGE_URLS_EMPTY'
  | 'BATCH_SOURCE_FETCH_FAILED'
  | 'BATCH_NO_MATCH_IN_DATE_RANGE'
  | 'BATCH_NO_VALID_ARTICLES'
  | 'PDF_LINK_NOT_FOUND'
  | 'PDF_DOWNLOAD_FAILED'
  | 'DOCX_EXPORT_NO_ARTICLES'
  | 'DOCX_EXPORT_FAILED'
  | 'PREVIEW_NOT_READY'
  | 'UNKNOWN_ERROR';

export type DesktopInvokeErrorData = {
  code?: DesktopErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseDesktopInvokeError(error: unknown): DesktopInvokeErrorData {
  if (isRecord(error)) {
    const code = typeof error.code === 'string' ? error.code : undefined;
    const message = typeof error.message === 'string' ? error.message : String(error);
    const details = isRecord(error.details) ? error.details : undefined;

    return { code, message, details };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
  };
}
