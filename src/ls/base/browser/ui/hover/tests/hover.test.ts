import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let createHoverController: typeof import('ls/base/browser/ui/hover/hover').createHoverController;
let createButtonView: typeof import('ls/base/browser/ui/button/button').createButtonView;

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createHoverController } = await import('ls/base/browser/ui/hover/hover'));
  ({ createButtonView } = await import('ls/base/browser/ui/button/button'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('hover controller renders actions and runs them from the overlay', async () => {
  let actionRuns = 0;
  const target = document.createElement('button');
  document.body.append(target);

  const hover = createHoverController(target, {
    content: 'Download PDF',
    subtitle: 'Article title',
    delay: 0,
    actions: [
      {
        label: 'View details',
        run: () => {
          actionRuns += 1;
        },
      },
    ],
  });

  target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  await delay(0);

  const overlayAction = document.querySelector('.ls-hover-action');
  assert(overlayAction instanceof HTMLButtonElement);
  assert.equal(overlayAction.textContent, 'View details');

  overlayAction.click();
  assert.equal(actionRuns, 1);
  assert.equal(document.querySelector('.ls-hover-card'), null);

  hover.dispose();
});

test('button view uses shared hover content instead of native title tooltips', async () => {
  const buttonView = createButtonView({
    mode: 'icon',
    title: 'Settings',
    hover: {
      content: 'Settings',
      delay: 0,
    },
    content: document.createTextNode('S'),
  });
  const button = buttonView.getElement();
  document.body.append(button);

  try {
    assert.equal(button.getAttribute('title'), null);

    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await delay(0);

    const overlayContent = document.querySelector('.ls-hover-content');
    assert(overlayContent instanceof HTMLElement);
    assert.equal(overlayContent.textContent, 'Settings');
  } finally {
    buttonView.dispose();
  }
});

test('string hover input hides when the pointer leaves the target', async () => {
  const target = document.createElement('button');
  document.body.append(target);

  const hover = createHoverController(target, {
    content: 'Plain hover',
    delay: 0,
  });

  try {
    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await delay(0);
    assert(document.querySelector('.ls-hover-card') instanceof HTMLElement);

    target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await delay(0);
    assert.equal(document.querySelector('.ls-hover-card'), null);
  } finally {
    hover.dispose();
  }
});

test('hover with actions stays open when the pointer moves into the overlay', async () => {
  const target = document.createElement('button');
  document.body.append(target);

  const hover = createHoverController(target, {
    content: 'Action hover',
    delay: 0,
    actions: [
      {
        label: 'Run',
        run: () => {},
      },
    ],
  });

  try {
    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await delay(0);

    const overlay = document.querySelector('.ls-hover-card');
    assert(overlay instanceof HTMLElement);

    target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    overlay.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await delay(0);

    assert(document.querySelector('.ls-hover-card') instanceof HTMLElement);
  } finally {
    hover.dispose();
  }
});

test('compact hover applies the compact class', async () => {
  const target = document.createElement('button');
  document.body.append(target);

  const hover = createHoverController(target, {
    content: 'Compact hover',
    compact: true,
    delay: 0,
  });

  try {
    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await delay(0);

    const overlay = document.querySelector('.ls-hover-card');
    assert(overlay instanceof HTMLElement);
    assert.equal(overlay.classList.contains('compact'), true);
  } finally {
    hover.dispose();
  }
});
