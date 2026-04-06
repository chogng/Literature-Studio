import 'ls/base/browser/ui/contextview/contextview.css';
import {
  getDomNodePagePosition,
  getDomNodeZoomLevel,
} from 'ls/base/browser/dom';
import {
  layout,
  resolveAnchoredHorizontalLeft,
  resolveAnchoredVerticalTop,
} from 'ls/base/browser/ui/contextview/anchoredLayout';
import {
  LifecycleOwner,
  MutableLifecycle,
  combineDisposables,
  toDisposable,
  type DisposableLike,
} from 'ls/base/common/lifecycle';

export type AnchorAlignment = 'left' | 'right';
export type AnchorPosition = 'below' | 'above';
export type AnchorAxisAlignment = 'vertical' | 'horizontal';
export type ContextViewAlignment = 'start' | 'end' | 'center';
export type ContextViewPosition = 'auto' | 'above' | 'below';
export type ContextViewAnchor = HTMLElement | {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type ContextViewOptions = {
  anchor: ContextViewAnchor;
  render: () => Node;
  className?: string;
  onHide?: (data?: unknown) => void;
  anchorAlignment?: AnchorAlignment;
  anchorPosition?: AnchorPosition;
  anchorAxisAlignment?: AnchorAxisAlignment;
  alignment?: ContextViewAlignment;
  position?: ContextViewPosition;
  offset?: number;
  matchAnchorWidth?: boolean;
  minWidth?: number;
};

export type ContextViewHandle = {
  show: (options: ContextViewOptions) => void;
  hide: (data?: unknown) => void;
  isVisible: () => boolean;
  getViewElement: () => HTMLElement;
  dispose: () => void;
};

const VIEWPORT_MARGIN_PX = 8;
const DEFAULT_OFFSET_PX = 0;

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

function rangesIntersect(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function resolveAnchorAlignment(
  options: Pick<ContextViewOptions, 'anchorAlignment' | 'alignment'>,
) {
  if (options.anchorAlignment) {
    return options.anchorAlignment;
  }

  return options.alignment === 'end' ? 'right' : 'left';
}

function resolveAnchorPosition(
  options: Pick<ContextViewOptions, 'anchorPosition' | 'position'>,
): AnchorPosition | 'auto' {
  if (options.anchorPosition) {
    return options.anchorPosition;
  }

  return options.position ?? 'auto';
}

function resolveViewportAnchorRect(anchor: ContextViewAnchor) {
  if (!(anchor instanceof HTMLElement)) {
    return {
      left: anchor.x,
      top: anchor.y,
      width: anchor.width ?? 1,
      height: anchor.height ?? 2,
    };
  }

  const pagePosition = getDomNodePagePosition(anchor);
  const zoom = getDomNodeZoomLevel(anchor);

  return {
    left: pagePosition.left * zoom - window.scrollX,
    top: pagePosition.top * zoom - window.scrollY,
    width: pagePosition.width * zoom,
    height: pagePosition.height * zoom,
  };
}

function resolveRenderedVerticalPlacement(options: {
  anchorRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  overlayHeight: number;
  top: number;
  fallbackPlacement: 'above' | 'below';
}) {
  const {
    anchorRect,
    overlayHeight,
    top,
    fallbackPlacement,
  } = options;

  const overlayBottom = top + overlayHeight;
  const anchorBottom = anchorRect.top + anchorRect.height;

  if (overlayBottom <= anchorRect.top) {
    return 'above' as const;
  }

  if (top >= anchorBottom) {
    return 'below' as const;
  }

  if (top < anchorRect.top) {
    return 'above' as const;
  }

  if (overlayBottom > anchorBottom) {
    return 'below' as const;
  }

  return fallbackPlacement;
}

function resolveTopWithOffset(options: {
  anchorRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  overlayHeight: number;
  viewportHeight: number;
  viewportMargin: number;
  placement: 'above' | 'below';
  offset: number;
  baseTop: number;
}) {
  const {
    anchorRect,
    overlayHeight,
    viewportHeight,
    viewportMargin,
    placement,
    offset,
    baseTop,
  } = options;

  if (offset <= 0) {
    return baseTop;
  }

  const renderedPlacement = resolveRenderedVerticalPlacement({
    anchorRect,
    overlayHeight,
    top: baseTop,
    fallbackPlacement: placement,
  });
  const overlayBottom = baseTop + overlayHeight;
  const anchorBottom = anchorRect.top + anchorRect.height;
  const isAboveAnchor = overlayBottom <= anchorRect.top;
  const isBelowAnchor = baseTop >= anchorBottom;

  if (!isAboveAnchor && !isBelowAnchor) {
    return baseTop;
  }

  return resolveAnchoredVerticalTop({
    anchorRect: {
      x: anchorRect.left,
      y: anchorRect.top,
      width: anchorRect.width,
      height: anchorRect.height,
    },
    overlayHeight,
    viewportHeight,
    viewportMargin,
    offset,
    placement: renderedPlacement,
  });
}

function resolveOffsetAwareVerticalAnchor(options: {
  anchorRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  position: 'above' | 'below' | 'auto';
  offset: number;
}) {
  const {
    anchorRect,
    position,
    offset,
  } = options;

  return {
    offset: anchorRect.top - offset,
    size: anchorRect.height + (offset * 2),
    position: position === 'above' ? 'after' as const : 'before' as const,
  };
}

function addDisposableListener<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): DisposableLike;
function addDisposableListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): DisposableLike;
function addDisposableListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): DisposableLike;
function addDisposableListener(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options);
  return toDisposable(() => {
    target.removeEventListener(type, listener, options);
  });
}

export class ContextViewController extends LifecycleOwner implements ContextViewHandle {
  private readonly element = createElement('div', 'ls-context-view');
  private readonly content = createElement('div', 'ls-context-view-content');
  private readonly mountedListeners = new MutableLifecycle<DisposableLike>();
  private options: ContextViewOptions | null = null;
  private visible = false;
  private disposed = false;
  private suppressHide = false;
  private pendingRelayout = false;

  constructor() {
    super();
    this.element.append(this.content);
    this.register(this.mountedListeners);
    this.register(
      addDisposableListener(this.content, 'mousedown', this.handleContentMouseDown, true),
    );
  }

  show(options: ContextViewOptions) {
    if (this.disposed) {
      return;
    }

    this.options = options;
    this.content.className = 'ls-context-view-content';
    if (options.className) {
      this.content.classList.add(...options.className.split(/\s+/).filter(Boolean));
    }
    this.content.replaceChildren(options.render());
    this.mount();
    this.layout();
    this.scheduleRelayout();
  }

  hide = (data?: unknown) => {
    if (!this.visible) {
      this.options = null;
      return;
    }

    const onHide = this.options?.onHide;
    this.visible = false;
    this.options = null;
    this.unmount();
    onHide?.(data);
  };

  isVisible = () => this.visible;

  getViewElement = () => this.element;

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.options = null;
    this.visible = false;
    this.unmount();
    super.dispose();
  }

  private mount() {
    if (!this.visible) {
      this.visible = true;
      document.body.append(this.element);
      this.mountedListeners.value = combineDisposables(
        addDisposableListener(document, 'mousedown', this.handleDocumentMouseDown, true),
        addDisposableListener(document, 'keydown', this.handleDocumentKeyDown, true),
        addDisposableListener(document, 'scroll', this.handleDocumentScroll, true),
        addDisposableListener(window, 'resize', this.handleWindowResize),
      );
      return;
    }

    if (!this.element.isConnected) {
      document.body.append(this.element);
    }
  }

  private unmount() {
    this.element.remove();
    this.mountedListeners.clear();
    this.pendingRelayout = false;
  }

  layout() {
    if (!this.options) {
      return;
    }

    const {
      anchor,
      offset = DEFAULT_OFFSET_PX,
      matchAnchorWidth = false,
      minWidth,
    } = this.options;

    const anchorRect = resolveViewportAnchorRect(anchor);
    const anchoredRect = {
      x: anchorRect.left,
      y: anchorRect.top,
      width: anchorRect.width,
      height: anchorRect.height,
    };
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    this.element.style.left = `${VIEWPORT_MARGIN_PX}px`;
    this.element.style.top = `${VIEWPORT_MARGIN_PX}px`;
    this.content.style.minWidth = `${Math.max(minWidth ?? 0, matchAnchorWidth ? anchorRect.width : 0)}px`;

    const overlayRect = this.content.getBoundingClientRect();
    const requestedPosition = resolveAnchorPosition(this.options);
    const anchorAlignment = resolveAnchorAlignment(this.options);
    const anchorAxisAlignment = this.options.anchorAxisAlignment ?? 'vertical';
    const preferredPlacement =
      requestedPosition === 'above' ? 'above' : 'below';
    const usesCenteredAlignment =
      anchorAxisAlignment === 'vertical'
      && !this.options.anchorAlignment
      && this.options.alignment === 'center';
    let top: number;
    let left: number;

    if (anchorAxisAlignment === 'vertical') {
      const verticalAnchor = resolveOffsetAwareVerticalAnchor({
        anchorRect,
        position: requestedPosition,
        offset,
      });
      const horizontalAnchor = {
        offset: anchorRect.left,
        size: anchorRect.width,
        position: anchorAlignment === 'left' ? 'before' as const : 'after' as const,
        mode: 'align' as 'align' | 'avoid',
      };

      top = layout(viewportHeight, overlayRect.height, verticalAnchor);

      if (usesCenteredAlignment) {
        left = resolveAnchoredHorizontalLeft({
          anchorRect: anchoredRect,
          overlayWidth: overlayRect.width,
          viewportWidth,
          viewportMargin: VIEWPORT_MARGIN_PX,
          alignment: 'center',
        });
      } else {
        if (
          rangesIntersect(
            top,
            top + overlayRect.height,
            verticalAnchor.offset,
            verticalAnchor.offset + verticalAnchor.size,
          )
        ) {
          horizontalAnchor.mode = 'avoid';
        }

        left = layout(viewportWidth, overlayRect.width, horizontalAnchor);
      }
    } else {
      const horizontalAnchor = {
        offset: anchorRect.left,
        size: anchorRect.width,
        position: anchorAlignment === 'left' ? 'before' as const : 'after' as const,
      };
      const verticalAnchor = {
        offset: anchorRect.top,
        size: anchorRect.height,
        position: preferredPlacement === 'below' ? 'before' as const : 'after' as const,
        mode: 'align' as 'align' | 'avoid',
      };

      left = layout(viewportWidth, overlayRect.width, horizontalAnchor);

      if (
        rangesIntersect(
          left,
          left + overlayRect.width,
          horizontalAnchor.offset,
          horizontalAnchor.offset + horizontalAnchor.size,
        )
      ) {
        verticalAnchor.mode = 'avoid';
      }

      top = layout(viewportHeight, overlayRect.height, verticalAnchor);
      top = resolveTopWithOffset({
        anchorRect,
        overlayHeight: overlayRect.height,
        viewportHeight,
        viewportMargin: VIEWPORT_MARGIN_PX,
        placement: preferredPlacement,
        offset,
        baseTop: top,
      });
    }

    const renderedPlacement = resolveRenderedVerticalPlacement({
      anchorRect,
      overlayHeight: overlayRect.height,
      top,
      fallbackPlacement: preferredPlacement,
    });

    this.element.classList.remove('top', 'bottom', 'left', 'right');
    this.element.classList.add(
      renderedPlacement === 'below' ? 'bottom' : 'top',
    );
    this.element.classList.add(anchorAlignment === 'left' ? 'left' : 'right');

    this.element.style.left = `${Math.round(left)}px`;
    this.element.style.top = `${Math.round(top)}px`;
  }

  private readonly handleContentMouseDown = () => {
    this.suppressHide = true;
    queueMicrotask(() => {
      this.suppressHide = false;
    });
  };

  private readonly handleDocumentMouseDown = (event: MouseEvent) => {
    if (this.suppressHide) {
      return;
    }

    const targetNode = event.target;
    if (!(targetNode instanceof Node)) {
      this.hide();
      return;
    }

    if (this.element.contains(targetNode)) {
      return;
    }

    if (
      this.options?.anchor instanceof HTMLElement
      && this.options.anchor.contains(targetNode)
    ) {
      return;
    }

    this.hide();
  };

  private readonly handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.hide();
    }
  };

  private readonly handleDocumentScroll = () => {
    this.hide();
  };

  private readonly handleWindowResize = () => {
    this.hide();
  };

  private scheduleRelayout() {
    if (this.pendingRelayout || !this.visible) {
      return;
    }

    this.pendingRelayout = true;
    requestAnimationFrame(() => {
      this.pendingRelayout = false;
      if (!this.visible || this.disposed) {
        return;
      }
      this.layout();
    });
  }
}

export function createContextViewController() {
  return new ContextViewController();
}
