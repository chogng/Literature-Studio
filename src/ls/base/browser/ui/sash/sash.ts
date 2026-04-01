import 'ls/base/browser/ui/sash/sash.css';

type Listener<T> = (event: T) => void;
type Disposer = () => void;

class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>();

  event(listener: Listener<T>): Disposer {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  fire(event: T) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  dispose() {
    this.listeners.clear();
  }
}

export const enum Orientation {
  VERTICAL,
  HORIZONTAL,
}

export const enum SashState {
  Disabled,
  AtMinimum,
  AtMaximum,
  Enabled,
}

export type ISashEvent = {
  startX: number;
  currentX: number;
  startY: number;
  currentY: number;
  altKey: boolean;
};

type SashOptions = {
  size?: number;
};

function getPointerPosition(event: MouseEvent | PointerEvent) {
  const x =
    Number.isFinite(event.pageX) && (event.pageX !== 0 || event.clientX === 0)
      ? event.pageX
      : event.clientX;
  const y =
    Number.isFinite(event.pageY) && (event.pageY !== 0 || event.clientY === 0)
      ? event.pageY
      : event.clientY;

  return {
    x,
    y,
  };
}

export class Sash {
  private readonly element = document.createElement('div');
  private readonly onDidStartEmitter = new Emitter<ISashEvent>();
  private readonly onDidChangeEmitter = new Emitter<ISashEvent>();
  private readonly onDidResetEmitter = new Emitter<void>();
  private readonly onDidEndEmitter = new Emitter<void>();
  private readonly size: number;
  private readonly prefersPointerEvents =
    typeof window !== 'undefined' && typeof window.PointerEvent !== 'undefined';
  private state = SashState.Enabled;
  private active = false;
  private removeDragListeners: Disposer | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly orientation: Orientation,
    options: SashOptions = {},
  ) {
    this.size = options.size ?? 10;
    this.element.className = [
      'sash',
      this.orientation === Orientation.VERTICAL ? 'vertical' : 'horizontal',
    ].join(' ');
    this.container.append(this.element);

    if (this.prefersPointerEvents) {
      this.element.addEventListener('pointerdown', this.handlePointerDown);
    } else {
      this.element.addEventListener('mousedown', this.handleMouseDown);
    }

    this.element.addEventListener('mouseenter', this.handleMouseEnter);
    this.element.addEventListener('mouseleave', this.handleMouseLeave);
    this.element.addEventListener('dblclick', this.handleDoubleClick);
  }

  getElement() {
    return this.element;
  }

  onDidStart(listener: Listener<ISashEvent>) {
    return this.onDidStartEmitter.event(listener);
  }

  onDidChange(listener: Listener<ISashEvent>) {
    return this.onDidChangeEmitter.event(listener);
  }

  onDidReset(listener: Listener<void>) {
    return this.onDidResetEmitter.event(listener);
  }

  onDidEnd(listener: Listener<void>) {
    return this.onDidEndEmitter.event(listener);
  }

  setState(state: SashState) {
    if (this.state === state) {
      return;
    }

    this.state = state;
    this.renderState();
  }

  layout(offset: number, orthogonalSize: number) {
    if (this.orientation === Orientation.VERTICAL) {
      this.element.style.left = `${offset}px`;
      this.element.style.top = '0';
      this.element.style.width = `${this.size}px`;
      this.element.style.height = `${orthogonalSize}px`;
      return;
    }

    this.element.style.left = '0';
    this.element.style.top = `${offset}px`;
    this.element.style.width = `${orthogonalSize}px`;
    this.element.style.height = `${this.size}px`;
  }

  dispose() {
    this.removeDragListeners?.();
    this.removeDragListeners = null;

    if (this.prefersPointerEvents) {
      this.element.removeEventListener('pointerdown', this.handlePointerDown);
    } else {
      this.element.removeEventListener('mousedown', this.handleMouseDown);
    }

    this.element.removeEventListener('mouseenter', this.handleMouseEnter);
    this.element.removeEventListener('mouseleave', this.handleMouseLeave);
    this.element.removeEventListener('dblclick', this.handleDoubleClick);
    this.element.remove();
    this.onDidStartEmitter.dispose();
    this.onDidChangeEmitter.dispose();
    this.onDidResetEmitter.dispose();
    this.onDidEndEmitter.dispose();
  }

  private renderState() {
    this.element.classList.toggle('disabled', this.state === SashState.Disabled);
    this.element.classList.toggle('minimum', this.state === SashState.AtMinimum);
    this.element.classList.toggle('maximum', this.state === SashState.AtMaximum);
  }

  private readonly handleMouseEnter = () => {
    if (!this.active && this.state !== SashState.Disabled) {
      this.element.classList.add('hover');
    }
  };

  private readonly handleMouseLeave = () => {
    if (!this.active) {
      this.element.classList.remove('hover');
    }
  };

  private readonly handleDoubleClick = () => {
    if (this.state === SashState.Disabled) {
      return;
    }

    this.onDidResetEmitter.fire();
  };

  private readonly handleMouseDown = (event: MouseEvent) => {
    this.beginDrag(event);
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.beginDrag(event);
  };

  private beginDrag(event: MouseEvent | PointerEvent) {
    if (this.state === SashState.Disabled || event.button !== 0) {
      return;
    }

    const { x: startX, y: startY } = getPointerPosition(event);
    this.removeDragListeners?.();
    this.active = true;
    this.element.classList.remove('hover');
    this.element.classList.add('active');
    event.preventDefault();

    this.onDidStartEmitter.fire({
      startX,
      currentX: startX,
      startY,
      currentY: startY,
      altKey: event.altKey,
    });

    const handleMove = (nextEvent: MouseEvent | PointerEvent) => {
      const { x: currentX, y: currentY } = getPointerPosition(nextEvent);
      this.onDidChangeEmitter.fire({
        startX,
        currentX,
        startY,
        currentY,
        altKey: nextEvent.altKey,
      });
    };

    const handleEnd = () => {
      this.removeDragListeners?.();
      this.removeDragListeners = null;
      this.active = false;
      this.element.classList.remove('active');
      this.onDidEndEmitter.fire();
    };

    if (this.prefersPointerEvents) {
      const pointerMoveListener = (nextEvent: PointerEvent) => {
        handleMove(nextEvent);
      };
      const pointerUpListener = () => {
        handleEnd();
      };

      window.addEventListener('pointermove', pointerMoveListener);
      window.addEventListener('pointerup', pointerUpListener);
      window.addEventListener('pointercancel', pointerUpListener);
      this.removeDragListeners = () => {
        window.removeEventListener('pointermove', pointerMoveListener);
        window.removeEventListener('pointerup', pointerUpListener);
        window.removeEventListener('pointercancel', pointerUpListener);
      };
      return;
    }

    const mouseMoveListener = (nextEvent: MouseEvent) => {
      handleMove(nextEvent);
    };
    const mouseUpListener = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', mouseMoveListener);
    window.addEventListener('mouseup', mouseUpListener);
    this.removeDragListeners = () => {
      window.removeEventListener('mousemove', mouseMoveListener);
      window.removeEventListener('mouseup', mouseUpListener);
    };
  }
}

export default Sash;
