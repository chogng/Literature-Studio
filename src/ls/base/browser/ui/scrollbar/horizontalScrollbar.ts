import 'ls/base/browser/ui/scrollbar/media/horizontalScrollbar.css';
import { HorizontalScrollbarState } from 'ls/base/browser/ui/scrollbar/scrollbarState';

const MIN_THUMB_SIZE = 24;
const ACTIVE_CLASS_TIMEOUT = 900;
const WHEEL_LINE_SIZE = 16;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

export type HorizontalScrollbarOptions = {
  activeItem?: HTMLElement | null;
  initialScrollLeft?: number;
  onScrollLeftChange?: (scrollLeft: number) => void;
  handleMouseWheel?: boolean;
  mouseWheelSmoothScroll?: boolean;
  flipAxes?: boolean;
  scrollYToX?: boolean;
  consumeMouseWheelIfScrollbarIsNeeded?: boolean;
  alwaysConsumeMouseWheel?: boolean;
  mouseWheelScrollSensitivity?: number;
  fastScrollSensitivity?: number;
  scrollPredominantAxis?: boolean;
};

export class HorizontalScrollbar {
  private readonly host: HTMLElement;
  private readonly strip: HTMLElement;
  private readonly track: HTMLElement;
  private readonly thumb: HTMLElement;
  private readonly activeItem: HTMLElement | null;
  private readonly onScrollLeftChange?: (scrollLeft: number) => void;
  private readonly handleMouseWheel: boolean;
  private readonly mouseWheelSmoothScroll: boolean;
  private readonly flipAxes: boolean;
  private readonly scrollYToX: boolean;
  private readonly consumeMouseWheelIfScrollbarIsNeeded: boolean;
  private readonly alwaysConsumeMouseWheel: boolean;
  private readonly mouseWheelScrollSensitivity: number;
  private readonly fastScrollSensitivity: number;
  private readonly scrollPredominantAxis: boolean;
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
    this.handleMouseWheel = options.handleMouseWheel ?? true;
    this.mouseWheelSmoothScroll = options.mouseWheelSmoothScroll ?? true;
    this.flipAxes = options.flipAxes ?? false;
    this.scrollYToX = options.scrollYToX ?? false;
    this.consumeMouseWheelIfScrollbarIsNeeded =
      options.consumeMouseWheelIfScrollbarIsNeeded ?? false;
    this.alwaysConsumeMouseWheel = options.alwaysConsumeMouseWheel ?? false;
    this.mouseWheelScrollSensitivity = options.mouseWheelScrollSensitivity ?? 1;
    this.fastScrollSensitivity = options.fastScrollSensitivity ?? 5;
    this.scrollPredominantAxis = options.scrollPredominantAxis ?? true;
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
    this.strip.addEventListener('wheel', this.handleScrollbarWheel, {
      passive: false,
    });
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
    this.strip.removeEventListener('wheel', this.handleScrollbarWheel);
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
    if (!this.handleMouseWheel) {
      return;
    }

    const isScrollable = this.host.classList.contains('is-scrollable');
    if (!isScrollable) {
      if (this.alwaysConsumeMouseWheel) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    const wheelDelta = this.getHorizontalWheelDelta(event);
    const currentScrollLeft = this.strip.scrollLeft;
    const maxScrollLeft = Math.max(0, this.strip.scrollWidth - this.strip.clientWidth);
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, currentScrollLeft + wheelDelta),
    );
    const didScroll = nextScrollLeft !== currentScrollLeft;

    if (
      this.alwaysConsumeMouseWheel ||
      (this.consumeMouseWheelIfScrollbarIsNeeded && wheelDelta !== 0) ||
      didScroll
    ) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!didScroll) {
      return;
    }

    this.setScrollLeft(nextScrollLeft);
    this.scheduleRender();
    this.showScrollbarTemporarily();
  };

  private getHorizontalWheelDelta(event: WheelEvent) {
    let deltaX = event.deltaX * this.mouseWheelScrollSensitivity;
    let deltaY = event.deltaY * this.mouseWheelScrollSensitivity;

    if (this.scrollPredominantAxis) {
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        deltaX = 0;
      } else {
        deltaY = 0;
      }
    }

    if (this.flipAxes) {
      [deltaY, deltaX] = [deltaX, deltaY];
    }

    if ((this.scrollYToX || event.shiftKey) && deltaX === 0) {
      deltaX = deltaY;
      deltaY = 0;
    }

    if (event.altKey) {
      deltaX *= this.fastScrollSensitivity;
      deltaY *= this.fastScrollSensitivity;
    }

    const rawDelta = deltaX !== 0 ? deltaX : deltaY;
    if (rawDelta === 0) {
      return 0;
    }

    if (event.deltaMode === DOM_DELTA_LINE) {
      return rawDelta * WHEEL_LINE_SIZE;
    }

    if (event.deltaMode === DOM_DELTA_PAGE) {
      return rawDelta * this.strip.clientWidth;
    }

    return rawDelta;
  }

  private setScrollLeft(scrollLeft: number) {
    if (this.mouseWheelSmoothScroll && typeof this.strip.scrollTo === 'function') {
      this.strip.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
      return;
    }

    this.strip.scrollLeft = scrollLeft;
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
