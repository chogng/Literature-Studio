import type { FetchLatestArticlesPayload, PreviewDownloadPdfPayload } from '../types.js';
import {
  getPreviewDocumentSnapshot,
  getPreviewListingCandidateSnapshot,
  getPreviewState,
} from '../preview-view.js';
import { normalizeUrl } from '../utils/url.js';
import type { PreviewExtractionSnapshot, PreviewSnapshot } from './fetch-strategy.js';
import { shouldAllowSciencePreviewWhileLoading } from './science-validation.js';

const BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS = 2500;
const BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS = 1500;
const BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS = 5000;
const BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS = 120;
const BATCH_PREVIEW_EXTRACTION_GATE_STABLE_POLLS = 4;
const BATCH_PREVIEW_EXTRACTION_GATE_STABLE_MS = 450;
const BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_POLLS = 8;
const BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_MS = 900;

function safeNormalizeUrl(value: unknown) {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

function resolvePayloadSourcePageUrl(source: { pageUrl?: unknown } | null | undefined) {
  return safeNormalizeUrl(source?.pageUrl);
}

function normalizePreviewMatchUrl(value: unknown) {
  const normalized = safeNormalizeUrl(value);
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    url.hash = '';
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    }
    return url.toString();
  } catch {
    return '';
  }
}

function matchesPreviewTargetUrl(left: unknown, right: unknown) {
  const normalizedLeft = normalizePreviewMatchUrl(left);
  const normalizedRight = normalizePreviewMatchUrl(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

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

function getPreviewExtractionDiagnostics(
  extraction: PreviewExtractionSnapshot | Awaited<ReturnType<typeof getPreviewListingCandidateSnapshot>>,
) {
  const diagnostics = extraction?.extraction?.diagnostics;
  if (!diagnostics || typeof diagnostics !== 'object' || Array.isArray(diagnostics)) {
    return null;
  }

  return diagnostics as Record<string, unknown>;
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPreviewExtractionGateKey(
  extraction: Awaited<ReturnType<typeof getPreviewListingCandidateSnapshot>>,
) {
  const diagnostics = getPreviewExtractionDiagnostics(extraction);
  return JSON.stringify({
    candidateCount: extraction?.extraction?.candidates?.length ?? 0,
    sectionCount: toFiniteNumber(diagnostics?.sectionCount),
    cardCount: toFiniteNumber(diagnostics?.cardCount),
    datedCandidateCount: toFiniteNumber(diagnostics?.datedCandidateCount),
    summarizedCandidateCount: toFiniteNumber(diagnostics?.summarizedCandidateCount),
    selectedSectionIndex: toFiniteNumber(diagnostics?.selectedSectionIndex),
    previewUrl: safeNormalizeUrl(extraction?.previewUrl ?? ''),
  });
}

function getPreviewExtractionStructureState(
  extraction: Awaited<ReturnType<typeof getPreviewListingCandidateSnapshot>>,
) {
  if (!extraction || extraction.extraction.candidates.length === 0) {
    return {
      structurallyReady: false,
      trailingSection: false,
    };
  }

  if (!extraction.isLoading) {
    return {
      structurallyReady: true,
      trailingSection: false,
    };
  }

  const diagnostics = getPreviewExtractionDiagnostics(extraction);
  const sectionCount = toFiniteNumber(diagnostics?.sectionCount);
  const selectedSectionIndex = toFiniteNumber(diagnostics?.selectedSectionIndex);
  const trailingSection = Boolean(
    sectionCount !== null &&
      selectedSectionIndex !== null &&
      selectedSectionIndex >= sectionCount - 1,
  );

  return {
    structurallyReady: true,
    trailingSection,
  };
}

async function waitForPreviewPageExtraction({
  previewUrl,
  matchedPageUrls,
}: {
  previewUrl: string;
  matchedPageUrls: string[];
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
    gateTimeoutMs: BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS,
    pollMs: BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS,
    stablePollsRequired: BATCH_PREVIEW_EXTRACTION_GATE_STABLE_POLLS,
    stableMsRequired: BATCH_PREVIEW_EXTRACTION_GATE_STABLE_MS,
  });

  while (Date.now() - startedAt < BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS) {
    attempts += 1;

    const currentPreviewState = getPreviewState();
    const currentPreviewUrl = safeNormalizeUrl(currentPreviewState.url ?? '');
    if (
      !currentPreviewUrl ||
      !matchedPageUrls.some((pageUrl) => matchesPreviewTargetUrl(pageUrl, currentPreviewUrl))
    ) {
      logPreviewBatchDiagnostic('extraction_gate_aborted', {
        reason: 'preview_url_changed',
        previewUrl,
        currentPreviewUrl,
        matchedPageUrls,
        attempts,
        waitMs: Date.now() - startedAt,
      });
      return null;
    }

    const extraction = await getPreviewListingCandidateSnapshot({
      timeoutMs: BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS,
    });
    const extractionUrl = safeNormalizeUrl(extraction?.previewUrl ?? '');
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
      const diagnostics = getPreviewExtractionDiagnostics(extraction);
      const sectionCount = toFiniteNumber(diagnostics?.sectionCount);
      const selectedSectionIndex = toFiniteNumber(diagnostics?.selectedSectionIndex);
      const candidateCount = extraction.extraction.candidates.length;
      bestCandidateCount = Math.max(bestCandidateCount, candidateCount);
      if (sectionCount !== null) {
        bestSectionCount = bestSectionCount === null ? sectionCount : Math.max(bestSectionCount, sectionCount);
      }

      const stableKey = buildPreviewExtractionGateKey(extraction);
      if (stableKey === lastStableKey) {
        stablePolls += 1;
      } else {
        lastStableKey = stableKey;
        stableSince = now;
        stablePolls = 1;
      }

      const stableMs = stableSince > 0 ? now - stableSince : 0;
      const structureState = getPreviewExtractionStructureState(extraction);
      const requiredStablePolls = structureState.trailingSection
        ? BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_POLLS
        : BATCH_PREVIEW_EXTRACTION_GATE_STABLE_POLLS;
      const requiredStableMs = structureState.trailingSection
        ? BATCH_PREVIEW_EXTRACTION_GATE_TRAILING_SECTION_STABLE_MS
        : BATCH_PREVIEW_EXTRACTION_GATE_STABLE_MS;
      const stabilityReady =
        !extraction.isLoading ||
        (stablePolls >= requiredStablePolls && stableMs >= requiredStableMs);

      if (structureState.structurallyReady && stabilityReady) {
        logPreviewBatchDiagnostic('extraction_gate_ready', {
          previewUrl,
          extractionUrl,
          candidateCount,
          sectionCount,
          selectedSectionIndex,
          attempts,
          waitMs: Date.now() - startedAt,
          extractionIsLoading: extraction.isLoading,
          trailingSection: structureState.trailingSection,
          stablePolls,
          stableMs,
          requiredStablePolls,
          requiredStableMs,
        });
        return extraction;
      }
    }

    await sleep(BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS);
  }

  logPreviewBatchDiagnostic('extraction_gate_timeout', {
    previewUrl,
    matchedPageUrls,
    attempts,
    waitMs: Date.now() - startedAt,
    bestCandidateCount,
    bestSectionCount,
  });

  return null;
}

export async function resolvePreviewSnapshotHtml(payload: PreviewDownloadPdfPayload = {}) {
  const requestedUrl = safeNormalizeUrl(payload.pageUrl ?? '');
  if (!requestedUrl) return null;

  const previewState = getPreviewState();
  const previewUrl = safeNormalizeUrl(previewState.url ?? '');
  if (!previewUrl || !matchesPreviewTargetUrl(previewUrl, requestedUrl)) {
    return null;
  }

  const snapshot = await getPreviewDocumentSnapshot();
  const snapshotUrl = safeNormalizeUrl(snapshot?.url ?? '');
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
  const previewUrl = safeNormalizeUrl(previewState.url ?? '');
  if (!previewUrl) {
    return new Map<string, PreviewSnapshot>();
  }

  const matchedPageUrls = new Set<string>();
  for (const source of sources) {
    const pageUrl = resolvePayloadSourcePageUrl(source);
    if (pageUrl && matchesPreviewTargetUrl(pageUrl, previewUrl)) {
      matchedPageUrls.add(pageUrl);
    }
  }

  if (matchedPageUrls.size === 0) {
    logPreviewBatchDiagnostic('snapshot_skipped', {
      reason: 'preview_url_not_matched',
      previewUrl,
      sourceUrls: sources
        .map((source) => resolvePayloadSourcePageUrl(source))
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
  const snapshotUrl = safeNormalizeUrl(snapshot?.url ?? '');
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
  const previewUrl = safeNormalizeUrl(previewState.url ?? '');
  if (!previewUrl) {
    return new Map<string, PreviewExtractionSnapshot>();
  }

  const matchedPageUrls = new Set<string>();
  for (const source of sources) {
    const pageUrl = resolvePayloadSourcePageUrl(source);
    if (pageUrl && matchesPreviewTargetUrl(pageUrl, previewUrl)) {
      matchedPageUrls.add(pageUrl);
    }
  }

  if (matchedPageUrls.size === 0) {
    logPreviewBatchDiagnostic('extraction_skipped', {
      reason: 'preview_url_not_matched',
      previewUrl,
      sourceUrls: sources
        .map((source) => resolvePayloadSourcePageUrl(source))
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
        })
      : await getPreviewListingCandidateSnapshot({
          timeoutMs: BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS,
        });
  const extractionUrl = safeNormalizeUrl(extraction?.previewUrl ?? '');
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
