// Common event primitives shared by browser, node, and electron-main code.
// Keep this module free of DOM dependencies.

import type { DisposableHandle, DisposableLike } from 'ls/base/common/lifecycle';
import { toDisposable } from 'ls/base/common/lifecycle';

export type Listener<T> = (event: T) => void;

export type Event<T> = (listener: Listener<T>) => DisposableHandle;

export class EventEmitter<T> implements DisposableLike {
  private readonly listeners = new Set<Listener<T>>();
  private disposed = false;

  readonly event: Event<T> = (listener) => {
    if (this.disposed) {
      return toDisposable(() => {});
    }

    this.listeners.add(listener);
    return toDisposable(() => {
      this.listeners.delete(listener);
    });
  };

  fire(event: T): void {
    if (this.disposed || this.listeners.size === 0) {
      return;
    }

    // Fire against a snapshot so subscription changes do not affect this turn.
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.listeners.clear();
  }
}
