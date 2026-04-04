import assert from 'node:assert/strict';
import test from 'node:test';

import { EventEmitter } from 'ls/base/common/event';
import { toDisposable, type DisposableLike } from 'ls/base/common/lifecycle';

test('EventEmitter subscriptions can be individually disposed', () => {
  const emitter = new EventEmitter<number>();
  const events: number[] = [];
  const subscription = emitter.event((value) => {
    events.push(value);
  });

  emitter.fire(1);
  subscription.dispose();
  emitter.fire(2);

  assert.deepEqual(events, [1]);
});

test('EventEmitter dispose clears listeners and future subscriptions stay inert', () => {
  const emitter = new EventEmitter<string>();
  const events: string[] = [];

  emitter.event((value) => {
    events.push(value);
  });
  emitter.dispose();
  emitter.fire('ignored');

  const lateSubscription = emitter.event((value) => {
    events.push(`late:${value}`);
  });
  lateSubscription.dispose();
  emitter.fire('ignored-again');

  assert.deepEqual(events, []);
});

test('EventEmitter fire uses a listener snapshot for stable dispatch', () => {
  const emitter = new EventEmitter<string>();
  const events: string[] = [];
  let secondSubscription: DisposableLike = toDisposable(() => {});
  let lateSubscription: DisposableLike | undefined;

  emitter.event((value) => {
    events.push(`first:${value}`);
    secondSubscription.dispose();
    lateSubscription = emitter.event((nextValue) => {
      events.push(`late:${nextValue}`);
    });
  });
  secondSubscription = emitter.event((value) => {
    events.push(`second:${value}`);
  });

  emitter.fire('one');
  emitter.fire('two');
  lateSubscription?.dispose();

  assert.deepEqual(events, ['first:one', 'second:one', 'first:two', 'late:two']);
});
