import type {
  AppErrorCode,
  AppErrorPayload,
} from '../parts/sandbox/common/desktopTypes.js';

export const APP_ERROR_PREFIX = '__APP_ERROR__:';

const appErrorCodes: AppErrorCode[] = [
  'MAIN_WINDOW_UNAVAILABLE',
  'UNKNOWN_COMMAND',
  'URL_EMPTY',
  'URL_PROTOCOL_UNSUPPORTED',
  'DATE_START_INVALID',
  'DATE_END_INVALID',
  'DATE_RANGE_INVALID',
  'HTTP_REQUEST_FAILED',
  'BATCH_PAGE_URLS_EMPTY',
  'BATCH_SOURCE_FETCH_FAILED',
  'BATCH_NO_MATCH_IN_DATE_RANGE',
  'BATCH_NO_VALID_ARTICLES',
  'PDF_LINK_NOT_FOUND',
  'PDF_DOWNLOAD_FAILED',
  'DOCX_EXPORT_NO_ARTICLES',
  'DOCX_EXPORT_FAILED',
  'PREVIEW_NOT_READY',
  'UNKNOWN_ERROR',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && appErrorCodes.includes(value as AppErrorCode);
}

export class AppError extends Error {
  code: AppErrorCode;
  details?: Record<string, unknown>;

  constructor(code: AppErrorCode, details?: Record<string, unknown>) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function appError(code: AppErrorCode, details?: Record<string, unknown>) {
  return new AppError(code, details);
}

export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof AppError ||
    (isRecord(error) && isAppErrorCode(error.code) && (error.details === undefined || isRecord(error.details)))
  );
}

export function serializeAppError(error: unknown): string {
  if (isAppError(error)) {
    const payload: AppErrorPayload = {
      code: error.code,
      details: error.details,
    };
    return `${APP_ERROR_PREFIX}${JSON.stringify(payload)}`;
  }

  const fallbackPayload: AppErrorPayload = {
    code: 'UNKNOWN_ERROR',
    details: {
      message: error instanceof Error ? error.message : String(error),
    },
  };
  return `${APP_ERROR_PREFIX}${JSON.stringify(fallbackPayload)}`;
}

export function parseSerializedAppError(message: string): AppErrorPayload | null {
  const markerIndex = message.lastIndexOf(APP_ERROR_PREFIX);
  if (markerIndex < 0) return null;

  const raw = message.slice(markerIndex + APP_ERROR_PREFIX.length).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isAppErrorCode(parsed.code)) return null;
    const details = parsed.details;
    if (details !== undefined && !isRecord(details)) return null;

    return {
      code: parsed.code,
      details: details as Record<string, unknown> | undefined,
    };
  } catch {
    return null;
  }
}
