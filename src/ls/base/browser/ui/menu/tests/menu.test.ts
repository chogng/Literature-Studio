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
