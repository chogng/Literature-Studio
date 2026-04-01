import { ScrollbarVisibility, resolveScrollableElementOptions } from 'ls/base/browser/ui/scrollbar/scrollableElementOptions';
import type { ScrollableElementChangeOptions, ScrollableElementCreationOptions, ScrollableElementResolvedOptions } from 'ls/base/browser/ui/scrollbar/scrollableElementOptions';

import 'ls/base/browser/ui/scrollbar/media/scrollbars.css';

export interface IScrollDimensions {
  width: number;
  height: number;
  scrollWidth: number;
  scrollHeight: number;
}

export interface IScrollPosition {
  scrollLeft: number;
  scrollTop: number;
}

export interface INewScrollDimensions {
  width?: number;
  height?: number;
  scrollWidth?: number;
  scrollHeight?: number;
}

export interface INewScrollPosition {
  scrollLeft?: number;
  scrollTop?: number;
}

export interface ScrollEvent extends IScrollPosition {
  scrollLeftChanged: boolean;
  scrollTopChanged: boolean;
}

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
  protected readonly element: HTMLElement;
  protected readonly domNode: HTMLDivElement;
  protected options: ScrollableElementResolvedOptions;
  private readonly onScrollEmitter = new Emitter<ScrollEvent>();
  private readonly onWillScrollEmitter = new Emitter<ScrollEvent>();
  private readonly resizeObserver?: ResizeObserver;
  private readonly mutationObserver?: MutationObserver;
  private scrollDimensions: IScrollDimensions;
  private scrollPosition: IScrollPosition;

  constructor(
    element: HTMLElement,
    options: ScrollableElementCreationOptions = {},
  ) {
    this.element = element;
    this.options = resolveScrollableElementOptions(options);
    this.domNode = document.createElement('div');
    this.domNode.className = 'monaco-scrollable-element';
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

  setScrollDimensions(update: INewScrollDimensions) {
    this.scrollDimensions = {
      width: update.width ?? this.element.clientWidth,
      height: update.height ?? this.element.clientHeight,
      scrollWidth: update.scrollWidth ?? this.element.scrollWidth,
      scrollHeight: update.scrollHeight ?? this.element.scrollHeight,
    };
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
    this.element.removeEventListener('scroll', this.handleElementScroll);
    this.domNode.removeEventListener('mouseenter', this.handleMouseEnter);
    this.domNode.removeEventListener('mouseleave', this.handleMouseLeave);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
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
    this.captureState();
    this.onScrollEmitter.fire(event);
  };

  private readonly handleMouseEnter = () => {
    this.domNode.classList.add('is-hovered');
  };

  private readonly handleMouseLeave = () => {
    this.domNode.classList.remove('is-hovered');
  };

  private applyOptions() {
    const classNames = ['monaco-scrollable-element'];
    if (this.options.className) {
      classNames.push(this.options.className);
    }
    if (this.options.useShadows) {
      classNames.push('use-shadows');
    }
    if (
      this.options.vertical === ScrollbarVisibility.Hidden &&
      this.options.horizontal === ScrollbarVisibility.Hidden
    ) {
      classNames.push('scrollbar-visibility-hidden');
    } else if (
      this.options.vertical === ScrollbarVisibility.Visible ||
      this.options.horizontal === ScrollbarVisibility.Visible
    ) {
      classNames.push('scrollbar-visibility-visible');
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
    this.refreshDomState();
  }

  private refreshDomState() {
    const needsVertical =
      this.options.vertical !== ScrollbarVisibility.Hidden &&
      this.scrollDimensions.scrollHeight > this.scrollDimensions.height + 1;
    const needsHorizontal =
      this.options.horizontal !== ScrollbarVisibility.Hidden &&
      this.scrollDimensions.scrollWidth > this.scrollDimensions.width + 1;

    this.domNode.classList.toggle(
      'is-scrollbar-needed',
      needsVertical || needsHorizontal,
    );
    this.domNode.classList.toggle(
      'has-top-shadow',
      this.options.useShadows && this.scrollPosition.scrollTop > 0,
    );
  }
}

export class ScrollableElement extends AbstractScrollableElement {}

export class SmoothScrollableElement extends AbstractScrollableElement {}

export class DomScrollableElement extends AbstractScrollableElement {}
