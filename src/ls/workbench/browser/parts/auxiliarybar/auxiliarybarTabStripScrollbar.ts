const MIN_THUMB_SIZE = 24;
const ACTIVE_CLASS_TIMEOUT = 900;

type AuxiliaryBarTabStripScrollbarOptions = {
  activeItem?: HTMLElement | null;
  initialScrollLeft?: number;
  onScrollLeftChange?: (scrollLeft: number) => void;
};

export class AuxiliaryBarTabStripScrollbar {
  private readonly host: HTMLElement;
  private readonly strip: HTMLElement;
  private readonly track: HTMLElement;
  private readonly thumb: HTMLElement;
  private readonly activeItem: HTMLElement | null;
  private readonly onScrollLeftChange?: (scrollLeft: number) => void;
  private readonly resizeObserver?: ResizeObserver;
  private activeClassTimeout: number | null = null;
  private animationFrame: number | null = null;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartScrollLeft = 0;
  private thumbSize = MIN_THUMB_SIZE;
  private maxThumbOffset = 0;

  constructor(
    host: HTMLElement,
    strip: HTMLElement,
    track: HTMLElement,
    thumb: HTMLElement,
    options: AuxiliaryBarTabStripScrollbarOptions = {},
  ) {
    this.host = host;
    this.strip = strip;
    this.track = track;
    this.thumb = thumb;
    this.activeItem = options.activeItem ?? null;
    this.onScrollLeftChange = options.onScrollLeftChange;

    if (typeof options.initialScrollLeft === 'number' && options.initialScrollLeft > 0) {
      this.strip.scrollLeft = options.initialScrollLeft;
    }

    this.track.addEventListener('pointerdown', this.handleTrackPointerDown);
    this.thumb.addEventListener('pointerdown', this.handleThumbPointerDown);
    this.strip.addEventListener('scroll', this.handleStripScroll, { passive: true });

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
    this.strip.removeEventListener('scroll', this.handleStripScroll);
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

    this.host.classList.toggle('is-scrollable', isScrollable);
    if (!isScrollable) {
      this.thumb.style.width = '0px';
      this.thumb.style.transform = 'translate3d(0, 0, 0)';
      this.host.classList.remove('is-scrollbar-active');
      this.host.classList.remove('is-scrollbar-dragging');
      this.emitScrollLeft();
      return;
    }

    this.thumbSize = Math.max(
      MIN_THUMB_SIZE,
      Math.round((visibleWidth / scrollWidth) * trackWidth),
    );
    this.maxThumbOffset = Math.max(0, trackWidth - this.thumbSize);

    const thumbOffset =
      maxScrollLeft === 0
        ? 0
        : Math.round((this.strip.scrollLeft / maxScrollLeft) * this.maxThumbOffset);

    this.thumb.style.width = `${this.thumbSize}px`;
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
    if (event.button !== 0 || event.target !== this.track || !this.host.classList.contains('is-scrollable')) {
      return;
    }

    event.preventDefault();
    const trackRect = this.track.getBoundingClientRect();
    const targetOffset = event.clientX - trackRect.left - this.thumbSize / 2;
    this.setScrollLeftFromThumbOffset(targetOffset);
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

    const maxScrollLeft = Math.max(0, this.strip.scrollWidth - this.strip.clientWidth);
    if (maxScrollLeft <= 0 || this.maxThumbOffset <= 0) {
      return;
    }

    const deltaX = event.clientX - this.dragStartClientX;
    const nextScrollLeft =
      this.dragStartScrollLeft + (deltaX / this.maxThumbOffset) * maxScrollLeft;

    this.strip.scrollLeft = nextScrollLeft;
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

  private setScrollLeftFromThumbOffset(offset: number) {
    const maxScrollLeft = Math.max(0, this.strip.scrollWidth - this.strip.clientWidth);
    if (maxScrollLeft <= 0 || this.maxThumbOffset <= 0) {
      return;
    }

    const clampedOffset = Math.min(Math.max(0, offset), this.maxThumbOffset);
    this.strip.scrollLeft = (clampedOffset / this.maxThumbOffset) * maxScrollLeft;
    this.scheduleRender();
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

export default AuxiliaryBarTabStripScrollbar;
