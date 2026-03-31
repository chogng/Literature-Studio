import type { Annotation } from '../../common/annotation';

const PDF_ANNOTATION_STORAGE_PREFIX = 'ls.pdfAnnotations';

function getPdfAnnotationStorageKey(targetId: string) {
  return `${PDF_ANNOTATION_STORAGE_PREFIX}.${targetId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeAnnotation(value: unknown, targetId: string): Annotation | null {
  if (!isRecord(value)) {
    return null;
  }

  const anchor = value.anchor;
  if (
    typeof value.id !== 'string' ||
    value.kind !== 'pdf' ||
    typeof value.comment !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !isRecord(anchor) ||
    typeof anchor.page !== 'number' ||
    !Array.isArray(anchor.rects)
  ) {
    return null;
  }

  const rects = anchor.rects
    .filter((rect) => isRecord(rect))
    .map((rect) => ({
      x: typeof rect.x === 'number' ? rect.x : 0,
      y: typeof rect.y === 'number' ? rect.y : 0,
      width: typeof rect.width === 'number' ? rect.width : 0,
      height: typeof rect.height === 'number' ? rect.height : 0,
    }));

  return {
    id: value.id,
    kind: 'pdf',
    targetId,
    anchor: {
      page: anchor.page,
      rects,
      quote: typeof anchor.quote === 'string' ? anchor.quote : undefined,
    },
    comment: value.comment,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function readStoredPdfAnnotations(targetId: string): readonly Annotation[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(getPdfAnnotationStorageKey(targetId));
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((annotation) => normalizeAnnotation(annotation, targetId))
      .filter((annotation): annotation is Annotation => annotation !== null);
  } catch {
    return [];
  }
}

export function writeStoredPdfAnnotations(
  targetId: string,
  annotations: readonly Annotation[],
) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (annotations.length === 0) {
      window.localStorage.removeItem(getPdfAnnotationStorageKey(targetId));
      return;
    }

    window.localStorage.setItem(
      getPdfAnnotationStorageKey(targetId),
      JSON.stringify(annotations),
    );
  } catch {
    // Ignore local storage failures so the PDF surface still works in restricted runtimes.
  }
}

