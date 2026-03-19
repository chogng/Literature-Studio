const FETCH_TIMING_LOG_ENABLED = process.env.READER_FETCH_TIMING !== '0';

export function createFetchTraceId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function elapsedMs(startedAt: number) {
  return Date.now() - startedAt;
}

export function shortenForLog(value: string, maxLength = 120) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

export function timingLog(traceId: string, stage: string, details: Record<string, unknown> = {}) {
  if (!FETCH_TIMING_LOG_ENABLED) return;

  let encodedDetails = '';
  try {
    encodedDetails = JSON.stringify(details);
  } catch {
    encodedDetails = '{"error":"unserializable_log_details"}';
  }

  console.info(`[fetch-timing][${traceId}] ${stage} ${encodedDetails}`);
}
