import 'ls/base/browser/ui/contextview/contextview.css';
import {
  resolveAnchoredHorizontalLeft,
  resolveAnchoredVerticalPlacement,
  resolveAnchoredVerticalTop,
} from 'ls/base/browser/ui/contextview/anchoredLayout';

export type ContextViewAlignment = 'start' | 'end';
export type ContextViewPosition = 'auto' | 'above' | 'below';

export type ContextViewOptions = {
  anchor: HTMLElement;
  render: () => Node;
  className?: string;
  onHide?: (data?: unknown) => void;
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
const DEFAULT_OFFSET_PX = 8;

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

export class ContextViewController implements ContextViewHandle {
  private readonly element = createElement('div', 'ls-context-view');
  private readonly content = createElement('div', 'ls-context-view-content');
  private options: ContextViewOptions | null = null;
  private visible = false;
  private disposed = false;
  private suppressHide = false;

  constructor() {
    this.element.append(this.content);
    this.content.addEventListener('mousedown', this.handleContentMouseDown, true);
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

  dispose = () => {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.options = null;
    this.visible = false;
    this.unmount();
    this.content.removeEventListener('mousedown', this.handleContentMouseDown, true);
  };

  private mount() {
    if (!this.visible) {
      this.visible = true;
      document.body.append(this.element);
      document.addEventListener('mousedown', this.handleDocumentMouseDown, true);
      document.addEventListener('keydown', this.handleDocumentKeyDown, true);
      document.addEventListener('scroll', this.handleDocumentScroll, true);
      window.addEventListener('resize', this.handleWindowResize);
      return;
    }

    if (!this.element.isConnected) {
      document.body.append(this.element);
    }
  }

  private unmount() {
    this.element.remove();
    document.removeEventListener('mousedown', this.handleDocumentMouseDown, true);
    document.removeEventListener('keydown', this.handleDocumentKeyDown, true);
    document.removeEventListener('scroll', this.handleDocumentScroll, true);
    window.removeEventListener('resize', this.handleWindowResize);
  }

  layout() {
    if (!this.options) {
      return;
    }

    const {
      anchor,
      alignment = 'start',
      position = 'auto',
      offset = DEFAULT_OFFSET_PX,
      matchAnchorWidth = false,
      minWidth,
    } = this.options;

    const anchorRect = anchor.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    this.element.style.left = `${VIEWPORT_MARGIN_PX}px`;
    this.element.style.top = `${VIEWPORT_MARGIN_PX}px`;
    this.content.style.minWidth = `${Math.max(minWidth ?? 0, matchAnchorWidth ? anchorRect.width : 0)}px`;

    const overlayRect = this.element.getBoundingClientRect();
    const resolvedPosition = resolveAnchoredVerticalPlacement({
      anchorRect: {
        x: anchorRect.x,
        y: anchorRect.y,
        width: anchorRect.width,
        height: anchorRect.height,
      },
      overlayHeight: overlayRect.height,
      viewportHeight,
      viewportMargin: VIEWPORT_MARGIN_PX,
      offset,
      preference: position,
    }).placement;

    const top = resolveAnchoredVerticalTop({
      anchorRect: {
        x: anchorRect.x,
        y: anchorRect.y,
        width: anchorRect.width,
        height: anchorRect.height,
      },
      overlayHeight: overlayRect.height,
      viewportHeight,
      viewportMargin: VIEWPORT_MARGIN_PX,
      offset,
      placement: resolvedPosition,
    });

    const left = resolveAnchoredHorizontalLeft({
      anchorRect: {
        x: anchorRect.x,
        y: anchorRect.y,
        width: anchorRect.width,
        height: anchorRect.height,
      },
      overlayWidth: overlayRect.width,
      viewportWidth,
      viewportMargin: VIEWPORT_MARGIN_PX,
      alignment,
    });

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

    if (this.element.contains(targetNode) || this.options?.anchor.contains(targetNode)) {
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
}

export function createContextViewController() {
  return new ContextViewController();
}
