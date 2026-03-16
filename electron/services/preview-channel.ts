import type { FetchLatestArticlesPayload, PreviewDownloadPdfPayload } from '../types.js';
import {
  getPreviewDocumentSnapshot,
  getPreviewListingCandidateSnapshot,
  getPreviewState,
} from '../preview-view.js';
import {
  buildPreviewAdmissionKey,
  collectMatchedPreviewPageUrls,
  DEFAULT_PREVIEW_ADMISSION_CONFIG,
  evaluatePreviewAdmissionStatus,
  matchesPreviewTargetUrl,
  resolvePreviewSourcePageUrl,
  safeNormalizePreviewUrl,
} from '../utils/preview-admission.js';
import type { PreviewExtractionSnapshot, PreviewSnapshot } from './fetch-strategy.js';
import { shouldAllowSciencePreviewWhileLoading } from './science-validation.js';

const BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS = 2500;
const BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS = 1500;
const BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS = 5000;
const BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS = 120;
type PreviewBatchSource = NonNullable<FetchLatestArticlesPayload['sources']>[number];

function logPreviewBatchDiagnostic(event: string, details: Record<string, unknown>) {
  try {
    console.info(`[preview-batch] ${event} ${JSON.stringify(details)}`);
  } catch {
    console.info(`[preview-batch] ${event}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectMatchedPreviewSources(
  sources: ReadonlyArray<PreviewBatchSource>,
  previewUrl: unknown,
) {
  const matchedSources: PreviewBatchSource[] = [];
  const normalizedPreviewUrl = safeNormalizePreviewUrl(previewUrl);
  if (!normalizedPreviewUrl) {
    return matchedSources;
  }

  for (const source of sources) {
    const pageUrl = resolvePreviewSourcePageUrl(source);
    if (pageUrl && matchesPreviewTargetUrl(pageUrl, normalizedPreviewUrl)) {
      matchedSources.push(source);
    }
  }

  return matchedSources;
}

function resolvePreferredExtractorIdForPreviewSources(
  sources: ReadonlyArray<PreviewBatchSource>,
) {
  for (const source of sources) {
    const preferredExtractorId = String(source.preferredExtractorId ?? '').trim();
    if (preferredExtractorId) {
      return preferredExtractorId;
    }
  }

  return null;
}

async function waitForPreviewPageExtraction({
  previewUrl,
  matchedPageUrls,
  preferredExtractorId,
}: {
  previewUrl: string;
  matchedPageUrls: string[];
  preferredExtractorId?: string | null;
}) {
  const startedAt = Date.now();
  let attempts = 0;
  let lastStableKey = '';
  let stableSince = 0;
  let stablePolls = 0;
  let bestCandidateCount = 0;
  let bestSectionCount: number | null = null;

  logPreviewBatchDiagnostic('extraction_gate_started', {
    previewUrl,
    matchedPageUrls,
    preferredExtractorId: preferredExtractorId ?? null,
    gateTimeoutMs: BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS,
    pollMs: BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS,
    stablePollsRequired: DEFAULT_PREVIEW_ADMISSION_CONFIG.stablePolls,
    stableMsRequired: DEFAULT_PREVIEW_ADMISSION_CONFIG.stableMs,
  });

  while (Date.now() - startedAt < BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS) {
    attempts += 1;

    const currentPreviewState = getPreviewState();
    const currentPreviewUrl = safeNormalizePreviewUrl(currentPreviewState.url ?? '');
    if (
      !currentPreviewUrl ||
      !matchedPageUrls.some((pageUrl) => matchesPreviewTargetUrl(pageUrl, currentPreviewUrl))
    ) {
      logPreviewBatchDiagnostic('extraction_gate_aborted', {
        reason: 'preview_url_changed',
        previewUrl,
        currentPreviewUrl,
        matchedPageUrls,
        preferredExtractorId: preferredExtractorId ?? null,
        attempts,
        waitMs: Date.now() - startedAt,
      });
      return null;
    }

    const extraction = await getPreviewListingCandidateSnapshot({
      timeoutMs: BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS,
      preferredExtractorId,
    });
    const extractionUrl = safeNormalizePreviewUrl(extraction?.previewUrl ?? '');
    const allowExtractionWhileLoading = extractionUrl
      ? shouldAllowSciencePreviewWhileLoading(extractionUrl)
      : false;
    if (
      extraction &&
      extractionUrl &&
      (!extraction.isLoading || allowExtractionWhileLoading) &&
      matchedPageUrls.some((pageUrl) => matchesPreviewTargetUrl(pageUrl, extractionUrl))
    ) {
      const now = Date.now();
      const candidateCount = extraction.extraction.candidates.length;
      bestCandidateCount = Math.max(bestCandidateCount, candidateCount);

      const stableKey = buildPreviewAdmissionKey(extraction);
      if (stableKey === lastStableKey) {
        stablePolls += 1;
      } else {
        lastStableKey = stableKey;
        stableSince = now;
        stablePolls = 1;
      }

      const stableMs = stableSince > 0 ? now - stableSince : 0;
      const gateStatus = evaluatePreviewAdmissionStatus(
        extraction,
        {
          stablePolls,
          stableMs,
        },
      );
      if (gateStatus.sectionCount !== null) {
        bestSectionCount =
          bestSectionCount === null
            ? gateStatus.sectionCount
            : Math.max(bestSectionCount, gateStatus.sectionCount);
      }

      if (gateStatus.ready) {
        logPreviewBatchDiagnostic('extraction_gate_ready', {
          previewUrl,
          extractionUrl,
          candidateCount: gateStatus.candidateCount,
          sectionCount: gateStatus.sectionCount,
          selectedSectionIndex: gateStatus.selectedSectionIndex,
          preferredExtractorId: preferredExtractorId ?? null,
          attempts,
          waitMs: Date.now() - startedAt,
          extractionIsLoading: extraction.isLoading,
          trailingSection: gateStatus.trailingSection,
          stablePolls,
          stableMs,
          requiredStablePolls: gateStatus.requiredStablePolls,
          requiredStableMs: gateStatus.requiredStableMs,
        });
        return extraction;
      }
    }

    await sleep(BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS);
  }

  logPreviewBatchDiagnostic('extraction_gate_timeout', {
    previewUrl,
    matchedPageUrls,
    preferredExtractorId: preferredExtractorId ?? null,
    attempts,
    waitMs: Date.now() - startedAt,
    bestCandidateCount,
    bestSectionCount,
  });

  return null;
}

export async function resolvePreviewSnapshotHtml(payload: PreviewDownloadPdfPayload = {}) {
  const requestedUrl = safeNormalizePreviewUrl(payload.pageUrl ?? '');
  if (!requestedUrl) return null;

  const previewState = getPreviewState();
  const previewUrl = safeNormalizePreviewUrl(previewState.url ?? '');
  if (!previewUrl || !matchesPreviewTargetUrl(previewUrl, requestedUrl)) {
    return null;
  }

  const snapshot = await getPreviewDocumentSnapshot();
  const snapshotUrl = safeNormalizePreviewUrl(snapshot?.url ?? '');
  if (!snapshot || !snapshotUrl || !matchesPreviewTargetUrl(snapshotUrl, requestedUrl)) {
    return null;
  }

  return snapshot.html;
}

export async function resolveBatchPreviewSnapshots(payload: FetchLatestArticlesPayload = {}) {
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  if (sources.length === 0) {
    return new Map<string, PreviewSnapshot>();
  }

  const previewState = getPreviewState();
  const previewUrl = safeNormalizePreviewUrl(previewState.url ?? '');
  if (!previewUrl) {
    return new Map<string, PreviewSnapshot>();
  }

  const matchedPageUrls = collectMatchedPreviewPageUrls(sources, previewUrl);

  if (matchedPageUrls.size === 0) {
    logPreviewBatchDiagnostic('snapshot_skipped', {
      reason: 'preview_url_not_matched',
      previewUrl,
      sourceUrls: sources
        .map((source) => resolvePreviewSourcePageUrl(source))
        .filter(Boolean),
    });
    return new Map<string, PreviewSnapshot>();
  }

  const allowWhileLoading = shouldAllowSciencePreviewWhileLoading(previewUrl);
  if (previewState.isLoading && !allowWhileLoading) {
    return new Map<string, PreviewSnapshot>();
  }

  const snapshot = await getPreviewDocumentSnapshot({
    timeoutMs: BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS,
  });
  const snapshotUrl = safeNormalizePreviewUrl(snapshot?.url ?? '');
  const allowSnapshotWhileLoading = snapshotUrl ? shouldAllowSciencePreviewWhileLoading(snapshotUrl) : false;
  if (
    !snapshot ||
    !snapshotUrl ||
    (snapshot.isLoading && !allowSnapshotWhileLoading) ||
    ![...matchedPageUrls].some((pageUrl) => matchesPreviewTargetUrl(pageUrl, snapshotUrl))
  ) {
    logPreviewBatchDiagnostic('snapshot_skipped', {
      reason: !snapshot
        ? 'snapshot_unavailable'
        : !snapshotUrl
          ? 'snapshot_url_empty'
          : snapshot.isLoading && !allowSnapshotWhileLoading
            ? 'snapshot_loading_blocked'
            : 'snapshot_url_not_matched',
      previewUrl,
      snapshotUrl,
      previewIsLoading: previewState.isLoading,
      snapshotIsLoading: snapshot?.isLoading ?? null,
      matchedPageUrls: [...matchedPageUrls],
    });
    return new Map<string, PreviewSnapshot>();
  }

  const resolvedSnapshot: PreviewSnapshot = {
    html: snapshot.html,
    previewUrl: snapshotUrl,
    captureMs: snapshot.captureMs,
    isLoading: snapshot.isLoading,
  };
  const snapshots = new Map<string, PreviewSnapshot>();

  for (const pageUrl of matchedPageUrls) {
    snapshots.set(pageUrl, resolvedSnapshot);
  }

  return snapshots;
}

export async function resolveBatchPreviewExtractions(payload: FetchLatestArticlesPayload = {}) {
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  if (sources.length === 0) {
    return new Map<string, PreviewExtractionSnapshot>();
  }

  const previewState = getPreviewState();
  const previewUrl = safeNormalizePreviewUrl(previewState.url ?? '');
  if (!previewUrl) {
    return new Map<string, PreviewExtractionSnapshot>();
  }

  const matchedSources = collectMatchedPreviewSources(sources, previewUrl);
  const matchedPageUrls = new Set(
    matchedSources
      .map((source) => resolvePreviewSourcePageUrl(source))
      .filter((pageUrl): pageUrl is string => Boolean(pageUrl)),
  );
  const preferredExtractorId = resolvePreferredExtractorIdForPreviewSources(matchedSources);

  if (matchedPageUrls.size === 0) {
    logPreviewBatchDiagnostic('extraction_skipped', {
      reason: 'preview_url_not_matched',
      previewUrl,
      sourceUrls: sources
        .map((source) => resolvePreviewSourcePageUrl(source))
        .filter(Boolean),
    });
    return new Map<string, PreviewExtractionSnapshot>();
  }

  const allowWhileLoading = shouldAllowSciencePreviewWhileLoading(previewUrl);
  if (previewState.isLoading && !allowWhileLoading) {
    return new Map<string, PreviewExtractionSnapshot>();
  }

  const extraction =
    previewState.isLoading && allowWhileLoading
      ? await waitForPreviewPageExtraction({
          previewUrl,
          matchedPageUrls: [...matchedPageUrls],
          preferredExtractorId,
        })
      : await getPreviewListingCandidateSnapshot({
          timeoutMs: BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS,
          preferredExtractorId,
        });
  const extractionUrl = safeNormalizePreviewUrl(extraction?.previewUrl ?? '');
  const allowExtractionWhileLoading = extractionUrl ? shouldAllowSciencePreviewWhileLoading(extractionUrl) : false;
  if (
    !extraction ||
    !extractionUrl ||
    (extraction.isLoading && !allowExtractionWhileLoading) ||
    ![...matchedPageUrls].some((pageUrl) => matchesPreviewTargetUrl(pageUrl, extractionUrl))
  ) {
    logPreviewBatchDiagnostic('extraction_skipped', {
      reason: !extraction
        ? 'extraction_unavailable'
        : !extractionUrl
          ? 'extraction_url_empty'
          : extraction.isLoading && !allowExtractionWhileLoading
            ? 'extraction_loading_blocked'
            : 'extraction_url_not_matched',
      previewUrl,
      extractionUrl,
      preferredExtractorId: preferredExtractorId ?? null,
      previewIsLoading: previewState.isLoading,
      extractionIsLoading: extraction?.isLoading ?? null,
      matchedPageUrls: [...matchedPageUrls],
    });
    return new Map<string, PreviewExtractionSnapshot>();
  }

  const resolvedExtraction: PreviewExtractionSnapshot = {
    extraction: extraction.extraction,
    extractorId: extraction.extractorId,
    previewUrl: extractionUrl,
    captureMs: extraction.captureMs,
    isLoading: extraction.isLoading,
    nextPageUrl: extraction.nextPageUrl,
  };
  const extractions = new Map<string, PreviewExtractionSnapshot>();
  for (const pageUrl of matchedPageUrls) {
    extractions.set(pageUrl, resolvedExtraction);
  }

  return extractions;
}
