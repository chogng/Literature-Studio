export type PdfSelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfSelection = {
  page: number;
  rects: readonly PdfSelectionRect[];
  text: string;
};

export function createPdfSelection(params: {
  page: number;
  rects?: readonly PdfSelectionRect[];
  text?: string;
}): PdfSelection {
  return {
    page: params.page,
    rects: params.rects ?? [],
    text: params.text ?? '',
  };
}

export function isPdfSelectionEmpty(selection: PdfSelection | null | undefined) {
  if (!selection) {
    return true;
  }

  return selection.rects.length === 0 && !selection.text.trim();
}
