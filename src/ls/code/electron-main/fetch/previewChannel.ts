import type {
  FetchLatestArticlesPayload,
  PreviewDownloadPdfPayload,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import { normalizeUrl } from '../../../base/common/url.js';
import {
  getPreviewDocumentSnapshot,
  getPreviewListingCandidateSnapshot,
  getPreviewState,
} from '../../../platform/windows/electron-main/previewView.js';
import type { PreviewExtractionSnapshot, PreviewSnapshot } from './fetchStrategy.js';
import { shouldAllowSciencePreviewWhileLoading } from './scienceValidationRules.js';

const BATCH_PREVIEW_EXTRACTION_TIMEOUT_MS = 2500;
const BATCH_PREVIEW_SNAPSHOT_TIMEOUT_MS = 1500;
const BATCH_PREVIEW_EXTRACTION_GATE_TIMEOUT_MS = 5000;
const BATCH_PREVIEW_EXTRACTION_GATE_POLL_MS = 120;
type PreviewBatchSource = NonNullable<FetchLatestArticlesPayload['sources']>[number];
type PreviewSourceInput = { pageUrl?: unknown } | null | undefined;
type PreviewExtractionAdmissionSnapshot = {
  extraction?: {
    candidates?: unknown[] | null;
    diagnostics?: Record<string, unknown> | null;
  } | null;
  previewUrl?: string | null;
  isLoading?: boolean | null;
};
type PreviewAdmissionConfig = {
  stablePolls: number;
  stableMs: number;
  trailingSectionStablePolls: number;
  trailingSectionStableMs: number;
};
type PreviewAdmissionStatus = {
  candidateCount: number;
  sectionCount: number | null;
  selectedSectionIndex: number | null;
  structurallyReady: boolean;
  trailingSection: boolean;
  requiredStablePolls: number;
  requiredStableMs: number;
  stabilityReady: boolean;
  ready: boolean;
};

const DEFAULT_PREVIEW_ADMISSION_CONFIG: PreviewAdmissionConfig = {
  stablePolls: 4,
  stableMs: 450,
  trailingSectionStablePolls: 8,
  trailingSectionStableMs: 900,
};

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPreviewExtractionDiagnostics(snapshot: PreviewExtractionAdmissionSnapshot) {
  const diagnostics = snapshot?.extraction?.diagnostics;
  if (!diagnostics || typeof diagnostics !== 'object' || Array.isArray(diagnostics)) {
    return null;
  }

  return diagnostics;
}

function safeNormalizePreviewUrl(value: unknown) {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

function resolvePreviewSourcePageUrl(source: PreviewSourceInput) {
  return safeNormalizePreviewUrl(source?.pageUrl);
}

function normalizePreviewTargetUrl(value: unknown) {
  const normalized = safeNormalizePreviewUrl(value);
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
  const normalizedLeft = normalizePreviewTargetUrl(left);
  const normalizedRight = normalizePreviewTargetUrl(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function collectMatchedPreviewPageUrls(
  sources: ReadonlyArray<PreviewSourceInput>,
  previewUrl: unknown,
) {
  const matchedPageUrls = new Set<string>();
  const normalizedPreviewUrl = safeNormalizePreviewUrl(previewUrl);
  if (!normalizedPreviewUrl) {
    return matchedPageUrls;
  }

  for (const source of sources) {
    const pageUrl = resolvePreviewSourcePageUrl(source);
    if (pageUrl && matchesPreviewTargetUrl(pageUrl, normalizedPreviewUrl)) {
      matchedPageUrls.add(pageUrl);
    }
  }

  return matchedPageUrls;
}

function buildPreviewAdmissionKey(snapshot: PreviewExtractionAdmissionSnapshot) {
  const diagnostics = getPreviewExtractionDiagnostics(snapshot);
  return JSON.stringify({
    candidateCount: snapshot?.extraction?.candidates?.length ?? 0,
    sectionCount: toFiniteNumber(diagnostics?.sectionCount),
    cardCount: toFiniteNumber(diagnostics?.cardCount),
    datedCandidateCount: toFiniteNumber(diagnostics?.datedCandidateCount),
    summarizedCandidateCount: toFiniteNumber(diagnostics?.summarizedCandidateCount),
    selectedSectionIndex: toFiniteNumber(diagnostics?.selectedSectionIndex),
    previewUrl: safeNormalizePreviewUrl(snapshot?.previewUrl ?? ''),
  });
}

function evaluatePreviewAdmissionStatus(
  snapshot: PreviewExtractionAdmissionSnapshot,
  stability: { stablePolls: number; stableMs: number },
  config: PreviewAdmissionConfig = DEFAULT_PREVIEW_ADMISSION_CONFIG,
): PreviewAdmissionStatus {
  const candidateCount = snapshot?.extraction?.candidates?.length ?? 0;
  if (!snapshot || candidateCount === 0) {
    return {
      candidateCount,
      sectionCount: null,
      selectedSectionIndex: null,
      structurallyReady: false,
      trailingSection: false,
      requiredStablePolls: config.stablePolls,
      requiredStableMs: config.stableMs,
      stabilityReady: false,
      ready: false,
    };
  }

  const diagnostics = getPreviewExtractionDiagnostics(snapshot);
  const sectionCount = toFiniteNumber(diagnostics?.sectionCount);
  const selectedSectionIndex = toFiniteNumber(diagnostics?.selectedSectionIndex);
  const trailingSection = Boolean(
    snapshot.isLoading &&
      sectionCount !== null &&
      selectedSectionIndex !== null &&
      selectedSectionIndex >= sectionCount - 1,
  );
  const requiredStablePolls = trailingSection
    ? config.trailingSectionStablePolls
    : config.stablePolls;
  const requiredStableMs = trailingSection
    ? config.trailingSectionStableMs
    : config.stableMs;
  const structurallyReady = candidateCount > 0;
  const stabilityReady = Boolean(
    !snapshot.isLoading ||
      (stability.stablePolls >= requiredStablePolls && stability.stableMs >= requiredStableMs),
  );

  return {
    candidateCount,
    sectionCount,
    selectedSectionIndex,
    structurallyReady,
    trailingSection,
    requiredStablePolls,
    requiredStableMs,
    stabilityReady,
    ready: structurallyReady && stabilityReady,
  };
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


