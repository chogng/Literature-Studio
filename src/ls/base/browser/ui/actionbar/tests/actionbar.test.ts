import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let createActionBarView: typeof import('ls/base/browser/ui/actionbar/actionbar').createActionBarView;
let createLxIcon: typeof import('ls/base/browser/ui/lxicon/lxicon').createLxIcon;

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createActionBarView } = await import('ls/base/browser/ui/actionbar/actionbar'));
  ({ createLxIcon } = await import('ls/base/browser/ui/lxicon/lxicon'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('actionbar renders actions and separators without relying on button base classes', () => {
  let refreshClicks = 0;
  const actionBarView = createActionBarView({
    ariaLabel: 'Document actions',
    items: [
      {
        id: 'refresh',
        label: 'Refresh',
        content: createLxIcon('refresh'),
        onClick: () => {
          refreshClicks += 1;
        },
      },
      {
        type: 'separator',
      },
      {
        id: 'disabled',
        label: 'Disabled action',
        content: createLxIcon('close'),
        disabled: true,
      },
    ],
  });
  const element = actionBarView.getElement();
  document.body.append(element);

  try {
    assert.equal(element.classList.contains('actionbar'), true);
    assert.equal(element.classList.contains('btn-base'), false);
    assert.equal(element.getAttribute('role'), 'toolbar');
    assert.equal(element.getAttribute('aria-label'), 'Document actions');

    const buttons = element.querySelectorAll('.actionbar-action');
    assert.equal(buttons.length, 2);
    assert(element.querySelector('.actionbar-separator') instanceof HTMLElement);

    const refreshButton = buttons[0] as HTMLButtonElement;
    const disabledButton = buttons[1] as HTMLButtonElement;
    assert.equal(refreshButton.getAttribute('aria-label'), 'Refresh');
    assert.equal(refreshButton.getAttribute('title'), null);
    assert.equal(disabledButton.disabled, true);

    refreshButton.click();
    assert.equal(refreshClicks, 1);
  } finally {
    actionBarView.dispose();
    document.body.replaceChildren();
  }
});

test('actionbar keyboard navigation skips disabled items', () => {
  const actionBarView = createActionBarView({
    items: [
      {
        label: 'Back',
        content: createLxIcon('arrow-left'),
      },
      {
        label: 'Busy',
        content: createLxIcon('sync'),
        disabled: true,
      },
      {
        label: 'Forward',
        content: createLxIcon('arrow-right'),
      },
    ],
  });
  const element = actionBarView.getElement();
  document.body.append(element);

  try {
    const buttons = element.querySelectorAll('.actionbar-action');
    const backButton = buttons[0] as HTMLButtonElement;
    const forwardButton = buttons[2] as HTMLButtonElement;

    backButton.focus();
    backButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(document.activeElement, forwardButton);

    forwardButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    assert.equal(document.activeElement, backButton);
  } finally {
    actionBarView.dispose();
    document.body.replaceChildren();
  }
});

test('actionbar actions use shared hover content instead of native title tooltips', async () => {
  const actionBarView = createActionBarView({
    items: [
      {
        label: 'Settings',
        title: 'Settings',
        hover: {
          content: 'Settings',
          delay: 0,
        },
        content: createLxIcon('gear'),
      },
    ],
  });
  const element = actionBarView.getElement();
  document.body.append(element);

  try {
    const button = element.querySelector('.actionbar-action');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Expected actionbar button.');
    }
    assert.equal(button.getAttribute('title'), null);

    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await delay(0);

    const overlayContent = document.querySelector('.ls-hover-content');
    if (!(overlayContent instanceof HTMLElement)) {
      throw new Error('Expected hover overlay content.');
    }
    assert.equal(overlayContent.textContent, 'Settings');
  } finally {
    actionBarView.dispose();
    document.body.replaceChildren();
  }
});

test('actionbar forwards custom button attributes', () => {
  const actionBarView = createActionBarView({
    items: [
      {
        label: 'Details',
        content: createLxIcon('chevron-down'),
        buttonAttributes: {
          'aria-haspopup': 'dialog',
          'data-kind': 'details',
        },
      },
    ],
  });
  const element = actionBarView.getElement();
  document.body.append(element);

  try {
    const button = element.querySelector('.actionbar-action');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Expected actionbar button.');
    }

    assert.equal(button.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(button.getAttribute('data-kind'), 'details');
  } finally {
    actionBarView.dispose();
    document.body.replaceChildren();
  }
});
