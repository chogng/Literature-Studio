import { ScrollbarVisibility, resolveScrollableElementOptions } from 'ls/base/browser/ui/scrollbar/scrollableElementOptions';
import type { ScrollableElementChangeOptions, ScrollableElementCreationOptions, ScrollableElementResolvedOptions } from 'ls/base/browser/ui/scrollbar/scrollableElementOptions';
import { HorizontalScrollbarState, VerticalScrollbarState } from 'ls/base/browser/ui/scrollbar/scrollbarState';
import { ScrollbarVisibilityController } from 'ls/base/browser/ui/scrollbar/scrollbarVisibilityController';
import type {
  INewScrollDimensions,
  INewScrollPosition,
  IScrollDimensions,
  IScrollPosition,
  ScrollEvent,
} from 'ls/base/common/scrollable';

import 'ls/base/browser/ui/scrollbar/media/verticalScrollbar.css';

type Listener<T> = (event: T) => void;

class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>();

  event(listener: Listener<T>) {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  fire(event: T) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export class AbstractScrollableElement {
  private static readonly SCROLLBAR_REVEAL_DURATION = 500;
  protected readonly element: HTMLElement;
  protected readonly domNode: HTMLDivElement;
  protected options: ScrollableElementResolvedOptions;
  private readonly onScrollEmitter = new Emitter<ScrollEvent>();
  private readonly onWillScrollEmitter = new Emitter<ScrollEvent>();
  private readonly resizeObserver?: ResizeObserver;
  private readonly mutationObserver?: MutationObserver;
  private readonly horizontalScrollbarState: HorizontalScrollbarState;
  private readonly verticalScrollbarState: VerticalScrollbarState;
  private readonly horizontalVisibilityController: ScrollbarVisibilityController;
  private readonly verticalVisibilityController: ScrollbarVisibilityController;
  private scrollDimensions: IScrollDimensions;
  private scrollPosition: IScrollPosition;
  private scrollbarHideTimeout: number | null = null;
  private isHovered = false;

  constructor(
    element: HTMLElement,
    options: ScrollableElementCreationOptions = {},
  ) {
    this.element = element;
    this.options = resolveScrollableElementOptions(options);
    this.domNode = document.createElement('div');
    this.domNode.className = 'scrollable-element-root';
    this.domNode.append(this.element);

    this.element.classList.add('scrollable-content');
    this.element.style.minHeight = this.element.style.minHeight || '0';
    this.element.style.minWidth = this.element.style.minWidth || '0';

    this.scrollDimensions = {
      width: this.element.clientWidth,
      height: this.element.clientHeight,
      scrollWidth: this.element.scrollWidth,
      scrollHeight: this.element.scrollHeight,
    };
    this.scrollPosition = {
      scrollLeft: this.element.scrollLeft,
      scrollTop: this.element.scrollTop,
    };
    this.horizontalScrollbarState = new HorizontalScrollbarState({
      arrowSize: 0,
      scrollbarSize:
        this.options.horizontal === ScrollbarVisibility.Hidden
          ? 0
          : this.options.horizontalScrollbarSize,
      oppositeScrollbarSize:
        this.options.vertical === ScrollbarVisibility.Hidden
          ? 0
          : this.options.verticalScrollbarSize,
      visibleSize: this.scrollDimensions.width,
      scrollSize: this.scrollDimensions.scrollWidth,
      scrollPosition: this.scrollPosition.scrollLeft,
    });
    this.verticalScrollbarState = new VerticalScrollbarState({
      arrowSize: 0,
      scrollbarSize:
        this.options.vertical === ScrollbarVisibility.Hidden
          ? 0
          : this.options.verticalScrollbarSize,
      oppositeScrollbarSize: 0,
      visibleSize: this.scrollDimensions.height,
      scrollSize: this.scrollDimensions.scrollHeight,
      scrollPosition: this.scrollPosition.scrollTop,
    });
    this.horizontalVisibilityController = new ScrollbarVisibilityController(
      this.options.horizontal,
      'is-horizontal-scrollbar-visible',
      'is-horizontal-scrollbar-hidden',
    );
    this.verticalVisibilityController = new ScrollbarVisibilityController(
      this.options.vertical,
      'is-vertical-scrollbar-visible',
      'is-vertical-scrollbar-hidden',
    );
    this.horizontalVisibilityController.setIsNeeded(this.horizontalScrollbarState.isNeeded());
    this.verticalVisibilityController.setIsNeeded(this.verticalScrollbarState.isNeeded());
    this.horizontalVisibilityController.setDomNode(this.domNode);
    this.verticalVisibilityController.setDomNode(this.domNode);

    this.applyOptions();

    this.element.addEventListener('scroll', this.handleElementScroll, { passive: true });
    this.domNode.addEventListener('mouseenter', this.handleMouseEnter);
    this.domNode.addEventListener('mouseleave', this.handleMouseLeave);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scanDomNode();
      });
      this.resizeObserver.observe(this.element);
      this.resizeObserver.observe(this.domNode);
    }

    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => {
        this.scanDomNode();
      });
      this.mutationObserver.observe(this.element, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }

    this.scanDomNode();
  }

  getDomNode() {
    return this.domNode;
  }

  onScroll(listener: Listener<ScrollEvent>) {
    return this.onScrollEmitter.event(listener);
  }

  onWillScroll(listener: Listener<ScrollEvent>) {
    return this.onWillScrollEmitter.event(listener);
  }

  getScrollPosition(): IScrollPosition {
    return { ...this.scrollPosition };
  }

  setScrollPosition(update: INewScrollPosition) {
    const nextScrollLeft = update.scrollLeft ?? this.element.scrollLeft;
    const nextScrollTop = update.scrollTop ?? this.element.scrollTop;
    this.element.scrollLeft = nextScrollLeft;
    this.element.scrollTop = nextScrollTop;
    this.captureState();
  }

  getScrollDimensions(): IScrollDimensions {
    return { ...this.scrollDimensions };
  }

  getHorizontalScrollbarState() {
    return this.horizontalScrollbarState;
  }

  getVerticalScrollbarState() {
    return this.verticalScrollbarState;
  }

  setScrollDimensions(update: INewScrollDimensions) {
    this.scrollDimensions = {
      width: update.width ?? this.element.clientWidth,
      height: update.height ?? this.element.clientHeight,
      scrollWidth: update.scrollWidth ?? this.element.scrollWidth,
      scrollHeight: update.scrollHeight ?? this.element.scrollHeight,
    };
    this.horizontalScrollbarState.setDimensions(
      this.scrollDimensions.width,
      this.scrollDimensions.scrollWidth,
    );
    this.verticalScrollbarState.setDimensions(
      this.scrollDimensions.height,
      this.scrollDimensions.scrollHeight,
    );
    this.refreshDomState();
  }

  updateOptions(update: ScrollableElementChangeOptions) {
    this.options = {
      ...this.options,
      ...update,
    };
    this.applyOptions();
    this.refreshDomState();
  }

  scanDomNode() {
    this.captureState();
  }

  delegateScrollFromMouseWheelEvent(browserEvent: WheelEvent) {
    if (!this.options.handleMouseWheel) {
      return;
    }
    this.element.dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: browserEvent.deltaX,
        deltaY: browserEvent.deltaY,
        deltaMode: browserEvent.deltaMode,
      }),
    );
  }

  delegateVerticalScrollbarPointerDown(_browserEvent: PointerEvent) {
    // Future custom scrollbar work can hook into this. The base implementation
    // keeps the API shape without introducing synthetic drag logic yet.
  }

  dispose() {
    this.clearScrollbarHideTimeout();
    this.element.removeEventListener('scroll', this.handleElementScroll);
    this.domNode.removeEventListener('mouseenter', this.handleMouseEnter);
    this.domNode.removeEventListener('mouseleave', this.handleMouseLeave);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.horizontalVisibilityController.dispose();
    this.verticalVisibilityController.dispose();
    this.onScrollEmitter.clear();
    this.onWillScrollEmitter.clear();
  }

  private readonly handleElementScroll = () => {
    const previous = this.scrollPosition;
    const next = {
      scrollLeft: this.element.scrollLeft,
      scrollTop: this.element.scrollTop,
    };
    const event: ScrollEvent = {
      ...next,
      scrollLeftChanged: previous.scrollLeft !== next.scrollLeft,
      scrollTopChanged: previous.scrollTop !== next.scrollTop,
    };
    this.onWillScrollEmitter.fire(event);
    this.revealScrollbarsTemporarily();
    this.captureState();
    this.onScrollEmitter.fire(event);
  };

  private readonly handleMouseEnter = () => {
    this.isHovered = true;
    this.clearScrollbarHideTimeout();
    this.setScrollbarsVisible(true);
  };

  private readonly handleMouseLeave = () => {
    this.isHovered = false;
    this.scheduleScrollbarHide();
  };

  private applyOptions() {
    const classNames = ['scrollable-element-root'];
    if (this.options.className) {
      classNames.push(this.options.className);
    }
    if (this.options.useShadows) {
      classNames.push('use-shadows');
    }
    this.domNode.className = classNames.join(' ');
    this.domNode.style.setProperty(
      '--scrollbar-size-vertical',
      `${this.options.verticalScrollbarSize}px`,
    );
    this.domNode.style.setProperty(
      '--scrollbar-size-horizontal',
      `${this.options.horizontalScrollbarSize}px`,
    );
    this.horizontalScrollbarState.setScrollbarSize(
      this.options.horizontal === ScrollbarVisibility.Hidden
        ? 0
        : this.options.horizontalScrollbarSize,
    );
    this.horizontalScrollbarState.setOppositeScrollbarSize(
      this.options.vertical === ScrollbarVisibility.Hidden
        ? 0
        : this.options.verticalScrollbarSize,
    );
    this.verticalScrollbarState.setScrollbarSize(
      this.options.vertical === ScrollbarVisibility.Hidden
        ? 0
        : this.options.verticalScrollbarSize,
    );
    this.verticalScrollbarState.setOppositeScrollbarSize(0);
    this.horizontalVisibilityController.setVisibility(this.options.horizontal);
    this.verticalVisibilityController.setVisibility(this.options.vertical);
    this.syncScrollbarVisibility();
  }

  private captureState() {
    this.scrollPosition = {
      scrollLeft: this.element.scrollLeft,
      scrollTop: this.element.scrollTop,
    };
    this.scrollDimensions = {
      width: this.element.clientWidth,
      height: this.element.clientHeight,
      scrollWidth: this.element.scrollWidth,
      scrollHeight: this.element.scrollHeight,
    };
    this.horizontalScrollbarState.setDimensions(
      this.scrollDimensions.width,
      this.scrollDimensions.scrollWidth,
    );
    this.horizontalScrollbarState.setScrollLeft(this.scrollPosition.scrollLeft);
    this.verticalScrollbarState.setDimensions(
      this.scrollDimensions.height,
      this.scrollDimensions.scrollHeight,
    );
    this.verticalScrollbarState.setScrollTop(this.scrollPosition.scrollTop);
    this.refreshDomState();
  }

  private refreshDomState() {
    const needsVertical = this.verticalScrollbarState.isNeeded();
    const needsHorizontal = this.horizontalScrollbarState.isNeeded();
    this.horizontalVisibilityController.setIsNeeded(needsHorizontal);
    this.verticalVisibilityController.setIsNeeded(needsVertical);

    this.domNode.classList.toggle(
      'is-scrollbar-needed',
      needsVertical || needsHorizontal,
    );
    this.domNode.classList.toggle(
      'has-top-shadow',
      this.options.useShadows && this.scrollPosition.scrollTop > 0,
    );
    this.syncScrollbarVisibility();
  }

  private revealScrollbarsTemporarily() {
    this.setScrollbarsVisible(true);
    if (!this.isHovered) {
      this.scheduleScrollbarHide();
    }
  }

  private setScrollbarsVisible(visible: boolean) {
    this.horizontalVisibilityController.setShouldBeVisible(visible);
    this.verticalVisibilityController.setShouldBeVisible(visible);
  }

  private scheduleScrollbarHide() {
    this.clearScrollbarHideTimeout();
    this.scrollbarHideTimeout = window.setTimeout(() => {
      this.scrollbarHideTimeout = null;
      if (!this.isHovered) {
        this.setScrollbarsVisible(false);
      }
    }, AbstractScrollableElement.SCROLLBAR_REVEAL_DURATION);
  }

  private clearScrollbarHideTimeout() {
    if (this.scrollbarHideTimeout === null) {
      return;
    }

    window.clearTimeout(this.scrollbarHideTimeout);
    this.scrollbarHideTimeout = null;
  }

  private syncScrollbarVisibility() {
    if (this.options.horizontal === ScrollbarVisibility.Visible) {
      this.horizontalVisibilityController.setShouldBeVisible(true);
    } else if (!this.isHovered && this.scrollbarHideTimeout === null) {
      this.horizontalVisibilityController.setShouldBeVisible(false);
    }

    if (this.options.vertical === ScrollbarVisibility.Visible) {
      this.verticalVisibilityController.setShouldBeVisible(true);
    } else if (!this.isHovered && this.scrollbarHideTimeout === null) {
      this.verticalVisibilityController.setShouldBeVisible(false);
    }
  }
}

export class ScrollableElement extends AbstractScrollableElement {}

export class SmoothScrollableElement extends AbstractScrollableElement {}

export class DomScrollableElement extends AbstractScrollableElement {}
