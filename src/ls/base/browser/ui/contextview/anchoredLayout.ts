// Shared geometry helpers for anchored overlay UI.
// Keep this module pure (no DOM queries, no service dependencies) so both
// contextview and electron overlay menu rendering can reuse exactly the same
// horizontal clamping and vertical placement logic.

export type AnchoredAlignment = 'start' | 'end' | 'center';
export type AnchoredPlacement = 'above' | 'below';
export type AnchoredPlacementPreference = 'auto' | AnchoredPlacement;

export type AnchoredRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AnchoredVerticalPlacementResult = {
  placement: AnchoredPlacement;
  canFitAbove: boolean;
  canFitBelow: boolean;
  spaceAbove: number;
  spaceBelow: number;
};

export type OneDimensionalLayoutMode = 'align' | 'avoid';
export type OneDimensionalLayoutPosition = 'before' | 'after';

export type OneDimensionalLayoutAnchor = {
  offset: number;
  size: number;
  mode?: OneDimensionalLayoutMode;
  position: OneDimensionalLayoutPosition;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Shared one-dimensional placement primitive adapted from upstream contextview
// semantics. `align` keeps the overlay edge aligned with the anchor edge,
// while `avoid` treats the anchor span as blocked space and tries the opposite
// side before falling back to overlap.
export function layout(
  viewportSize: number,
  viewSize: number,
  anchor: OneDimensionalLayoutAnchor,
) {
  const mode = anchor.mode ?? 'avoid';
  const layoutAfterAnchorBoundary =
    mode === 'align' ? anchor.offset : anchor.offset + anchor.size;
  const layoutBeforeAnchorBoundary =
    mode === 'align' ? anchor.offset + anchor.size : anchor.offset;

  if (anchor.position === 'before') {
    if (viewSize <= viewportSize - layoutAfterAnchorBoundary) {
      return layoutAfterAnchorBoundary;
    }

    if (viewSize <= layoutBeforeAnchorBoundary) {
      return layoutBeforeAnchorBoundary - viewSize;
    }

    return Math.max(viewportSize - viewSize, 0);
  }

  if (viewSize <= layoutBeforeAnchorBoundary) {
    return layoutBeforeAnchorBoundary - viewSize;
  }

  if (viewSize <= viewportSize - layoutAfterAnchorBoundary) {
    return layoutAfterAnchorBoundary;
  }

  return 0;
}

export function resolveAnchoredHorizontalLeft(options: {
  anchorRect: AnchoredRect;
  overlayWidth: number;
  viewportWidth: number;
  viewportMargin: number;
  alignment?: AnchoredAlignment;
}) {
  const {
    anchorRect,
    overlayWidth,
    viewportWidth,
    viewportMargin,
    alignment = 'start',
  } = options;

  const preferredLeft =
    alignment === 'center'
      ? anchorRect.x + (anchorRect.width - overlayWidth) / 2
      : alignment === 'end'
        ? anchorRect.x + anchorRect.width - overlayWidth
        : anchorRect.x;

  return clamp(
    preferredLeft,
    viewportMargin,
    Math.max(viewportMargin, viewportWidth - overlayWidth - viewportMargin),
  );
}

export function resolveAnchoredVerticalPlacement(options: {
  anchorRect: AnchoredRect;
  overlayHeight: number;
  viewportHeight: number;
  viewportMargin: number;
  offset: number;
  preference?: AnchoredPlacementPreference;
}): AnchoredVerticalPlacementResult {
  const {
    anchorRect,
    overlayHeight,
    viewportHeight,
    viewportMargin,
    offset,
    preference = 'auto',
  } = options;

  const spaceBelow =
    viewportHeight - anchorRect.y - anchorRect.height - viewportMargin;
  const spaceAbove = anchorRect.y - viewportMargin;
  const canFitBelow = spaceBelow >= overlayHeight + offset;
  const canFitAbove = spaceAbove >= overlayHeight + offset;

  const placement =
    preference === 'above'
      ? 'above'
      : preference === 'below'
        ? 'below'
        : canFitBelow || !canFitAbove
          ? 'below'
          : 'above';

  return {
    placement,
    canFitAbove,
    canFitBelow,
    spaceAbove,
    spaceBelow,
  };
}

export function resolveAnchoredVerticalTop(options: {
  anchorRect: AnchoredRect;
  overlayHeight: number;
  viewportHeight: number;
  viewportMargin: number;
  offset: number;
  placement: AnchoredPlacement;
}) {
  const {
    anchorRect,
    overlayHeight,
    viewportHeight,
    viewportMargin,
    offset,
    placement,
  } = options;

  const nextTop =
    placement === 'above'
      ? anchorRect.y - overlayHeight - offset
      : anchorRect.y + anchorRect.height + offset;

  const maxTop = Math.max(
    viewportMargin,
    viewportHeight - overlayHeight - viewportMargin,
  );

  return clamp(
    nextTop,
    viewportMargin,
    maxTop,
  );
}
