import 'ls/base/browser/ui/scrollbar/media/horizontalScrollbar.css';
import { HorizontalScrollbarState } from 'ls/base/browser/ui/scrollbar/scrollbarState';

const MIN_THUMB_SIZE = 24;
const ACTIVE_CLASS_TIMEOUT = 900;
const WHEEL_LINE_SIZE = 16;

export type HorizontalScrollbarOptions = {
  activeItem?: HTMLElement | null;
  initialScrollLeft?: number;
  onScrollLeftChange?: (scrollLeft: number) => void;
};

export class HorizontalScrollbar {
  private readonly host: HTMLElement;
  private readonly strip: HTMLElement;
  private readonly track: HTMLElement;
  private readonly thumb: HTMLElement;
  private readonly activeItem: HTMLElement | null;
  private readonly onScrollLeftChange?: (scrollLeft: number) => void;
  private readonly resizeObserver?: ResizeObserver;
  private readonly scrollbarState: HorizontalScrollbarState;
  private activeClassTimeout: number | null = null;
  private animationFrame: number | null = null;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartScrollLeft = 0;

  constructor(
    host: HTMLElement,
    strip: HTMLElement,
    track: HTMLElement,
    thumb: HTMLElement,
    options: HorizontalScrollbarOptions = {},
  ) {
    this.host = host;
    this.strip = strip;
    this.track = track;
    this.thumb = thumb;
    this.activeItem = options.activeItem ?? null;
    this.onScrollLeftChange = options.onScrollLeftChange;
    this.scrollbarState = new HorizontalScrollbarState({
      arrowSize: 0,
      scrollbarSize: this.track.clientHeight,
      oppositeScrollbarSize: 0,
      visibleSize: this.strip.clientWidth,
      scrollSize: this.strip.scrollWidth,
      scrollPosition: this.strip.scrollLeft,
    });

    if (
      typeof options.initialScrollLeft === 'number' &&
      options.initialScrollLeft > 0
    ) {
      this.strip.scrollLeft = options.initialScrollLeft;
    }

    this.track.addEventListener('pointerdown', this.handleTrackPointerDown);
    this.thumb.addEventListener('pointerdown', this.handleThumbPointerDown);
    this.track.addEventListener('wheel', this.handleScrollbarWheel, {
      passive: false,
    });
    this.thumb.addEventListener('wheel', this.handleScrollbarWheel, {
      passive: false,
    });
    this.strip.addEventListener('scroll', this.handleStripScroll, {
      passive: true,
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleRender();
      });
      this.resizeObserver.observe(this.host);
      this.resizeObserver.observe(this.strip);
      this.resizeObserver.observe(this.track);
    } else {
      window.addEventListener('resize', this.scheduleRender);
    }

    this.scheduleInitialLayout();
  }

  dispose() {
    this.clearActiveClassTimeout();
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.endDrag();
    this.resizeObserver?.disconnect();
    if (!this.resizeObserver) {
      window.removeEventListener('resize', this.scheduleRender);
    }

    this.track.removeEventListener('pointerdown', this.handleTrackPointerDown);
    this.thumb.removeEventListener('pointerdown', this.handleThumbPointerDown);
    this.track.removeEventListener('wheel', this.handleScrollbarWheel);
    this.thumb.removeEventListener('wheel', this.handleScrollbarWheel);
    this.strip.removeEventListener('scroll', this.handleStripScroll);
  }

  renderNow() {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.render();
  }

  private readonly scheduleInitialLayout = () => {
    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = null;
      this.revealActiveItem();
      this.render();
    });
  };

  private readonly scheduleRender = () => {
    if (this.animationFrame !== null) {
      return;
    }
    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = null;
      this.render();
    });
  };

  private render() {
    const visibleWidth = this.strip.clientWidth;
    const scrollWidth = this.strip.scrollWidth;
    const maxScrollLeft = Math.max(0, scrollWidth - visibleWidth);
    const trackWidth = this.track.clientWidth;
    const isScrollable = visibleWidth > 0 && trackWidth > 0 && maxScrollLeft > 0;
    this.scrollbarState.setScrollbarSize(this.track.clientHeight);
    this.scrollbarState.setDimensions(trackWidth, scrollWidth);
    this.scrollbarState.setScrollLeft(this.strip.scrollLeft);

    this.host.classList.toggle('horizontal-scrollbar-host', true);
    this.host.classList.toggle('is-scrollable', isScrollable);
    if (!isScrollable) {
      this.thumb.style.width = '0px';
      this.thumb.style.transform = 'translate3d(0, 0, 0)';
      this.host.classList.remove('is-scrollbar-active');
      this.host.classList.remove('is-scrollbar-dragging');
      this.emitScrollLeft();
      return;
    }

    const thumbSize = Math.max(MIN_THUMB_SIZE, this.scrollbarState.getSliderSize());
    const thumbOffset = this.scrollbarState.getSliderPosition();

    this.thumb.style.width = `${thumbSize}px`;
    this.thumb.style.transform = `translate3d(${thumbOffset}px, 0, 0)`;
    this.emitScrollLeft();
  }

  private revealActiveItem() {
    if (!this.activeItem) {
      return;
    }
    this.activeItem.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  private emitScrollLeft() {
    this.onScrollLeftChange?.(this.strip.scrollLeft);
  }

  private readonly handleStripScroll = () => {
    this.showScrollbarTemporarily();
    this.scheduleRender();
  };

  private readonly handleTrackPointerDown = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      event.target !== this.track ||
      !this.host.classList.contains('is-scrollable')
    ) {
      return;
    }

    event.preventDefault();
    const trackRect = this.track.getBoundingClientRect();
    const targetOffset = event.clientX - trackRect.left;
    this.strip.scrollLeft =
      this.scrollbarState.getDesiredScrollPositionFromOffset(targetOffset);
    this.scheduleRender();
    this.showScrollbarTemporarily();
  };

  private readonly handleThumbPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !this.host.classList.contains('is-scrollable')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragPointerId = event.pointerId;
    this.dragStartClientX = event.clientX;
    this.dragStartScrollLeft = this.strip.scrollLeft;
    this.host.classList.add('is-scrollbar-active');
    this.host.classList.add('is-scrollbar-dragging');
    this.thumb.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handleWindowPointerMove);
    window.addEventListener('pointerup', this.handleWindowPointerUp);
    window.addEventListener('pointercancel', this.handleWindowPointerUp);
  };

  private readonly handleWindowPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.dragPointerId) {
      return;
    }

    if (!this.scrollbarState.isNeeded()) {
      return;
    }

    const deltaX = event.clientX - this.dragStartClientX;
    this.strip.scrollLeft = this.dragStartScrollLeft;
    this.scrollbarState.setScrollLeft(this.dragStartScrollLeft);
    this.strip.scrollLeft =
      this.scrollbarState.getDesiredScrollPositionFromDelta(deltaX);
    this.scheduleRender();
  };

  private readonly handleWindowPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.dragPointerId) {
      return;
    }

    this.endDrag();
    this.showScrollbarTemporarily();
  };

  private endDrag() {
    if (this.dragPointerId !== null) {
      this.thumb.releasePointerCapture?.(this.dragPointerId);
    }
    this.dragPointerId = null;
    window.removeEventListener('pointermove', this.handleWindowPointerMove);
    window.removeEventListener('pointerup', this.handleWindowPointerUp);
    window.removeEventListener('pointercancel', this.handleWindowPointerUp);
    this.host.classList.remove('is-scrollbar-dragging');
  }

  private readonly handleScrollbarWheel = (event: WheelEvent) => {
    if (!this.host.classList.contains('is-scrollable')) {
      return;
    }

    const wheelDelta = this.getHorizontalWheelDelta(event);
    if (wheelDelta === 0) {
      return;
    }

    event.preventDefault();
    this.strip.scrollLeft += wheelDelta;
    this.scheduleRender();
    this.showScrollbarTemporarily();
  };

  private getHorizontalWheelDelta(event: WheelEvent) {
    const rawDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (rawDelta === 0) {
      return 0;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return rawDelta * WHEEL_LINE_SIZE;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return rawDelta * this.strip.clientWidth;
    }

    return rawDelta;
  }

  private showScrollbarTemporarily() {
    if (!this.host.classList.contains('is-scrollable')) {
      return;
    }

    this.host.classList.add('is-scrollbar-active');
    this.clearActiveClassTimeout();
    this.activeClassTimeout = window.setTimeout(() => {
      this.activeClassTimeout = null;
      if (this.dragPointerId === null) {
        this.host.classList.remove('is-scrollbar-active');
      }
    }, ACTIVE_CLASS_TIMEOUT);
  }

  private clearActiveClassTimeout() {
    if (this.activeClassTimeout === null) {
      return;
    }

    window.clearTimeout(this.activeClassTimeout);
    this.activeClassTimeout = null;
  }
}

export default HorizontalScrollbar;
