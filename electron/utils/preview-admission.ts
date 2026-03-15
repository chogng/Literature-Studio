import { normalizeUrl } from './url.js';

export type PreviewSourceInput = { pageUrl?: unknown } | null | undefined;

export type PreviewExtractionAdmissionSnapshot = {
  extraction?: {
    candidates?: unknown[] | null;
    diagnostics?: Record<string, unknown> | null;
  } | null;
  previewUrl?: string | null;
  isLoading?: boolean | null;
};

export type PreviewAdmissionConfig = {
  stablePolls: number;
  stableMs: number;
  trailingSectionStablePolls: number;
  trailingSectionStableMs: number;
};

export type PreviewAdmissionStatus = {
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

export const DEFAULT_PREVIEW_ADMISSION_CONFIG: PreviewAdmissionConfig = {
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

export function safeNormalizePreviewUrl(value: unknown) {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

export function resolvePreviewSourcePageUrl(source: PreviewSourceInput) {
  return safeNormalizePreviewUrl(source?.pageUrl);
}

export function normalizePreviewTargetUrl(value: unknown) {
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

export function matchesPreviewTargetUrl(left: unknown, right: unknown) {
  const normalizedLeft = normalizePreviewTargetUrl(left);
  const normalizedRight = normalizePreviewTargetUrl(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function collectMatchedPreviewPageUrls(
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

export function buildPreviewAdmissionKey(snapshot: PreviewExtractionAdmissionSnapshot) {
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

export function evaluatePreviewAdmissionStatus(
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
