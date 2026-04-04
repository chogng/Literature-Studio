import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import {
  ActionWithDropdownActionViewItem,
  createDropdownMenuActionViewItem,
  DropdownMenuActionViewItem,
} from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';

let cleanupDomEnvironment: (() => void) | null = null;

before(() => {
  if (typeof document !== 'undefined') {
    return;
  }

  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('createDropdownMenuActionViewItem returns a dropdown action view item', () => {
  const item = createDropdownMenuActionViewItem({
    label: 'More',
    buttonClassName: 'example-action',
    menuClassName: 'example-menu',
    menu: [
      { label: 'Rename' },
      { label: 'Delete', disabled: true },
    ],
  });

  assert(item instanceof DropdownMenuActionViewItem);
});

test('DropdownMenuActionViewItem renders and opens a menu overlay', async () => {
  let selected = '';
  const item = new DropdownMenuActionViewItem({
    label: 'More',
    content: 'More',
    menu: [
      {
        label: 'Archive',
        onClick: () => {
          selected = 'archive';
        },
      },
    ],
  });
  const host = document.createElement('div');
  document.body.append(host);

  try {
    item.render(host);
    const button = host.querySelector('button');
    assert(button instanceof HTMLButtonElement);

    button.click();
    await delay(0);

    const menu = document.body.querySelector('.dropdown-menu');
    assert(menu instanceof HTMLElement);

    const archiveItem = Array.from(menu.querySelectorAll('.dropdown-menu-item')).find(
      (node) => node.textContent?.includes('Archive'),
    );
    assert(archiveItem instanceof HTMLElement);
    archiveItem.click();
    await delay(0);

    assert.equal(selected, 'archive');
    assert.equal(button.getAttribute('aria-expanded'), 'false');
  } finally {
    item.dispose();
    document.body.replaceChildren();
  }
});

test('DropdownMenuActionViewItem can render a custom overlay', async () => {
  let closed = 0;
  const item = new DropdownMenuActionViewItem({
    label: 'History',
    content: 'History',
    overlayRole: 'dialog',
    renderOverlay: ({ hide }) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-history-overlay';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Close';
      button.addEventListener('click', () => {
        closed += 1;
        hide();
      });
      overlay.append(button);
      return overlay;
    },
  });
  const host = document.createElement('div');
  document.body.append(host);

  try {
    item.render(host);
    const trigger = host.querySelector('button');
    assert(trigger instanceof HTMLButtonElement);

    trigger.click();
    await delay(0);

    const overlay = document.body.querySelector('.custom-history-overlay');
    assert(overlay instanceof HTMLElement);
    assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');

    const closeButton = overlay.querySelector('button');
    assert(closeButton instanceof HTMLButtonElement);
    closeButton.click();
    await delay(0);

    assert.equal(closed, 1);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  } finally {
    item.dispose();
    document.body.replaceChildren();
  }
});

test('DropdownMenuActionViewItem delegates menu lifecycle to an injected context menu service', async () => {
  const delegates: import('ls/base/browser/contextmenu').ContextMenuDelegate[] = [];
  let visible = false;
  let hideCount = 0;
  const contextMenuService: import('ls/base/browser/contextmenu').ContextMenuService = {
    showContextMenu(delegate) {
      visible = true;
      delegates.push(delegate);
    },
    hideContextMenu() {
      if (!visible) {
        return;
      }
      visible = false;
      hideCount += 1;
      delegates.at(-1)?.onHide?.(true);
    },
    isVisible() {
      return visible;
    },
    dispose() {
      visible = false;
    },
  };
  const item = new DropdownMenuActionViewItem({
    label: 'More',
    content: 'More',
    contextMenuService,
    menu: [
      {
        label: 'Archive',
      },
    ],
  });
  const host = document.createElement('div');
  document.body.append(host);

  try {
    item.render(host);
    const button = host.querySelector('button');
    assert(button instanceof HTMLButtonElement);

    button.click();
    await delay(0);

    assert.equal(document.body.querySelector('.dropdown-menu'), null);
    assert.equal(delegates.length, 1);
    assert.equal(delegates[0]?.getAnchor(), button);
    assert.equal(button.getAttribute('aria-expanded'), 'true');

    button.click();
    await delay(0);

    assert.equal(hideCount, 1);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
  } finally {
    item.dispose();
    document.body.replaceChildren();
  }
});

test('ActionWithDropdownActionViewItem renders primary and dropdown controls', async () => {
  let primaryRan = 0;
  let selected = '';
  const item = new ActionWithDropdownActionViewItem({
    primary: {
      label: 'Run',
      content: 'Run',
      onClick: () => {
        primaryRan += 1;
      },
    },
    dropdown: {
      label: 'More',
      content: 'More',
      menu: [
        {
          label: 'Run with options',
          onClick: () => {
            selected = 'options';
          },
        },
      ],
    },
  });
  const host = document.createElement('div');
  document.body.append(host);

  try {
    item.render(host);
    const buttons = host.querySelectorAll('button');
    assert.equal(buttons.length, 2);

    const primaryButton = buttons[0] as HTMLButtonElement;
    const dropdownButton = buttons[1] as HTMLButtonElement;

    primaryButton.click();
    assert.equal(primaryRan, 1);

    dropdownButton.click();
    await delay(0);

    const menu = document.body.querySelector('.dropdown-menu');
    assert(menu instanceof HTMLElement);

    const option = Array.from(menu.querySelectorAll('.dropdown-menu-item')).find(
      (node) => node.textContent?.includes('Run with options'),
    );
    assert(option instanceof HTMLElement);
    option.click();
    await delay(0);

    assert.equal(selected, 'options');
  } finally {
    item.dispose();
    document.body.replaceChildren();
  }
});
