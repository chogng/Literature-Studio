import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import { Orientation, SplitView } from 'ls/base/browser/ui/splitview/splitview';
import type { IView } from 'ls/base/browser/ui/splitview/splitview';

let cleanupDomEnvironment: (() => void) | null = null;

class TestView implements IView {
  readonly element = document.createElement('div');
  lastLayoutSize = 0;

  constructor(
    readonly minimumSize: number,
    readonly maximumSize: number,
    readonly snap = false,
  ) {}

  layout(size: number) {
    this.lastLayoutSize = size;
  }
}

function createPointerEvent(
  type: string,
  coordinates: {
    x: number;
    y: number;
  },
) {
  const EventCtor =
    typeof window.PointerEvent !== 'undefined' ? window.PointerEvent : window.MouseEvent;
  return new EventCtor(type, {
    bubbles: true,
    button: 0,
    clientX: coordinates.x,
    clientY: coordinates.y,
  });
}

function dispatchDrag(
  sash: Element,
  coordinates: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  },
) {
  const isPointer = typeof window.PointerEvent !== 'undefined';
  sash.dispatchEvent(
    createPointerEvent(isPointer ? 'pointerdown' : 'mousedown', {
      x: coordinates.startX,
      y: coordinates.startY,
    }),
  );
  window.dispatchEvent(
    createPointerEvent(isPointer ? 'pointermove' : 'mousemove', {
      x: coordinates.endX,
      y: coordinates.endY,
    }),
  );
  window.dispatchEvent(
    createPointerEvent(isPointer ? 'pointerup' : 'mouseup', {
      x: coordinates.endX,
      y: coordinates.endY,
    }),
  );
}

before(() => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('splitview sash drag resizes adjacent views', () => {
  const splitView = new SplitView(Orientation.VERTICAL, 10);
  const leadingView = new TestView(120, 420);
  const centerView = new TestView(220, Number.POSITIVE_INFINITY);
  const trailingView = new TestView(160, 360);

  splitView.addView(leadingView, 200);
  splitView.addView(centerView, 400, { flex: true });
  splitView.addView(trailingView, 300);
  document.body.append(splitView.element);

  try {
    splitView.layout(1000, 640);

    const firstSash = splitView.element.querySelector('.sash.vertical');
    assert(firstSash);
    assert.equal(splitView.getViewSize(0), 200);
    assert.equal(splitView.getViewSize(1), 480);

    dispatchDrag(firstSash, {
      startX: 200,
      startY: 12,
      endX: 260,
      endY: 12,
    });

    assert.equal(splitView.getViewSize(0), 260);
    assert.equal(splitView.getViewSize(1), 420);
    assert.equal(leadingView.lastLayoutSize, 260);
    assert.equal(centerView.lastLayoutSize, 420);
  } finally {
    splitView.dispose();
    splitView.element.remove();
  }
});

test('splitview restores cached size after a hidden view becomes visible again', () => {
  const splitView = new SplitView(Orientation.VERTICAL, 10);
  const leadingView = new TestView(120, 420);
  const centerView = new TestView(220, Number.POSITIVE_INFINITY);

  splitView.addView(leadingView, 260);
  splitView.addView(centerView, 500, { flex: true });
  document.body.append(splitView.element);

  try {
    splitView.layout(900, 520);

    splitView.setViewVisible(0, false);
    assert.equal(splitView.isViewVisible(0), false);
    assert.equal(splitView.getViewSize(0), 260);

    splitView.setViewVisible(0, true);
    splitView.layout(900, 520);

    assert.equal(splitView.isViewVisible(0), true);
    assert.equal(splitView.getViewSize(0), 260);
    assert.equal(leadingView.lastLayoutSize, 260);
  } finally {
    splitView.dispose();
    splitView.element.remove();
  }
});

test('splitview collapses a snap-enabled view after dragging past its minimum', () => {
  const splitView = new SplitView(Orientation.VERTICAL, 10);
  const leadingView = new TestView(120, 420, true);
  const centerView = new TestView(220, Number.POSITIVE_INFINITY);
  let snappedItemIndex: number | null = null;
  const disposeSnapListener = splitView.onDidSashSnap((event) => {
    snappedItemIndex = event.itemIndex;
  });

  splitView.addView(leadingView, 200);
  splitView.addView(centerView, 500, { flex: true });
  document.body.append(splitView.element);

  try {
    splitView.layout(900, 520);

    const firstSash = splitView.element.querySelector('.sash.vertical');
    assert(firstSash);

    dispatchDrag(firstSash, {
      startX: 200,
      startY: 12,
      endX: 70,
      endY: 12,
    });

    assert.equal(snappedItemIndex, null);
    assert.equal(splitView.isViewVisible(0), true);
    assert.equal(splitView.getViewSize(0), 120);
    assert.equal(splitView.getViewSize(1), 770);

    dispatchDrag(firstSash, {
      startX: 200,
      startY: 12,
      endX: 50,
      endY: 12,
    });

    assert.equal(snappedItemIndex, 0);
    assert.equal(splitView.isViewVisible(0), false);
    assert.equal(splitView.getViewSize(0), 120);
    assert.equal(splitView.getViewSize(1), 900);
    assert.equal(centerView.lastLayoutSize, 900);
  } finally {
    disposeSnapListener();
    splitView.dispose();
    splitView.element.remove();
  }
});

test('splitview re-expands a snapped view only after crossing the reopen hysteresis', () => {
  const splitView = new SplitView(Orientation.VERTICAL, 10);
  const leadingView = new TestView(120, 420, true);
  const centerView = new TestView(220, Number.POSITIVE_INFINITY);
  const snapEvents: boolean[] = [];
  const disposeSnapListener = splitView.onDidSashSnap((event) => {
    snapEvents.push(event.visible);
  });

  splitView.addView(leadingView, 200);
  splitView.addView(centerView, 500, { flex: true });
  document.body.append(splitView.element);

  try {
    splitView.layout(900, 520);
    splitView.setViewVisible(0, false);

    const firstSash = splitView.element.querySelector('.sash.vertical');
    assert(firstSash);

    dispatchDrag(firstSash, {
      startX: 0,
      startY: 12,
      endX: 50,
      endY: 12,
    });

    assert.equal(splitView.isViewVisible(0), false);
    assert.deepEqual(snapEvents, []);

    dispatchDrag(firstSash, {
      startX: 0,
      startY: 12,
      endX: 70,
      endY: 12,
    });

    assert.equal(splitView.isViewVisible(0), true);
    assert.equal(splitView.getViewSize(0), 120);
    assert.equal(splitView.getViewSize(1), 770);
    assert.deepEqual(snapEvents, [true]);
  } finally {
    disposeSnapListener();
    splitView.dispose();
    splitView.element.remove();
  }
});

test('splitview disables snapped edge sash when start snapping is turned off', () => {
  const splitView = new SplitView(Orientation.VERTICAL, 10);
  const leadingView = new TestView(120, 420, true);
  const centerView = new TestView(220, Number.POSITIVE_INFINITY);

  splitView.addView(leadingView, 200);
  splitView.addView(centerView, 500, { flex: true });
  document.body.append(splitView.element);

  try {
    splitView.layout(900, 520);
    splitView.setViewVisible(0, false);

    const firstSash = splitView.element.querySelector('.sash.vertical');
    assert(firstSash);
    assert.equal(firstSash.classList.contains('disabled'), false);

    splitView.startSnappingEnabled = false;

    assert.equal(firstSash.classList.contains('disabled'), true);

    splitView.startSnappingEnabled = true;

    assert.equal(firstSash.classList.contains('disabled'), false);
  } finally {
    splitView.dispose();
    splitView.element.remove();
  }
});
