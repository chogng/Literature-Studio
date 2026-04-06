import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let Menu: typeof import('ls/base/browser/ui/menu/menu').Menu;

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ Menu } = await import('ls/base/browser/ui/menu/menu'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('menu renders requested placement class', () => {
  const menu = new Menu({
    items: [
      { value: 'alpha', label: 'Alpha' },
    ],
    placement: 'top',
  });
  document.body.append(menu.getElement());

  try {
    assert.equal(menu.getElement().classList.contains('dropdown-menu-top'), true);
    assert.equal(menu.getElement().classList.contains('dropdown-menu-bottom'), false);
  } finally {
    menu.dispose();
    document.body.replaceChildren();
  }
});

test('menu uses roving item focus for keyboard navigation', () => {
  const menu = new Menu({
    items: [
      { value: 'alpha', label: 'Alpha', disabled: true },
      { value: 'beta', label: 'Beta' },
      { value: 'gamma', label: 'Gamma' },
    ],
  });
  document.body.append(menu.getElement());

  try {
    const menuItems = Array.from(
      menu.getElement().querySelectorAll<HTMLDivElement>('.dropdown-menu-item'),
    );
    assert.equal(menuItems.length, 3);

    menu.focusSelectedOrFirstEnabled();
    assert.equal(document.activeElement, menuItems[1]);
    assert.equal(menuItems[0]?.tabIndex, -1);
    assert.equal(menuItems[1]?.tabIndex, 0);
    assert.equal(menuItems[2]?.tabIndex, -1);

    menuItems[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    assert.equal(document.activeElement, menuItems[2]);
    assert.equal(menuItems[1]?.tabIndex, -1);
    assert.equal(menuItems[2]?.tabIndex, 0);
  } finally {
    menu.dispose();
    document.body.replaceChildren();
  }
});

test('menu applies and clears the data-menu attribute from options', () => {
  const menu = new Menu({
    items: [
      { value: 'alpha', label: 'Alpha' },
    ],
    dataMenu: 'editor-tab-context',
  });
  document.body.append(menu.getElement());

  try {
    assert.equal(menu.getElement().getAttribute('data-menu'), 'editor-tab-context');

    menu.setOptions({
      items: [
        { value: 'alpha', label: 'Alpha' },
      ],
    });

    assert.equal(menu.getElement().hasAttribute('data-menu'), false);
  } finally {
    menu.dispose();
    document.body.replaceChildren();
  }
});
