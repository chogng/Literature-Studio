import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let createDropdownView: typeof import('ls/base/browser/ui/dropdown/dropdown').createDropdownView;

type RectInit = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function createDomRect({ x, y, width, height }: RectInit) {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {
      return this;
    },
  } as DOMRect;
}

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createDropdownView } = await import('ls/base/browser/ui/dropdown/dropdown'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('dropdown portal menu renders in document.body and follows the trigger rect', () => {
  const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 720,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      if (this.classList.contains('dropdown-menu')) {
        const minWidth = Number.parseInt(
          (this as HTMLElement).style.minWidth || '0',
          10,
        );
        return Math.max(Number.isNaN(minWidth) ? 0 : minWidth, 140);
      }
      return 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      if (this.classList.contains('dropdown-menu')) {
        return 84;
      }
      return 0;
    },
  });

  try {
    const dropdownView = createDropdownView({
      menuMode: 'dom',
      domMenuLayer: 'portal',
      value: 'nature',
      options: [
        { value: 'nature', label: 'Nature' },
        { value: 'science', label: 'Science' },
      ],
    });
    const dropdown = dropdownView.getElement();
    dropdown.getBoundingClientRect = () =>
      createDomRect({ x: 40, y: 120, width: 96, height: 32 });
    document.body.append(dropdown);

    dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const menu = document.body.querySelector('.dropdown-menu-portal');
    assert(menu instanceof HTMLElement);
    assert.equal(dropdown.contains(menu), false);
    assert.equal(menu.style.left, '40px');
    assert.equal(menu.style.top, '156px');
    assert.equal(menu.style.minWidth, '96px');
    assert.equal(menu.classList.contains('dropdown-menu-bottom'), true);

    dropdownView.dispose();
  } finally {
    document.body.replaceChildren();
    if (originalInnerWidth) {
      Object.defineProperty(window, 'innerWidth', originalInnerWidth);
    }
    if (originalInnerHeight) {
      Object.defineProperty(window, 'innerHeight', originalInnerHeight);
    }
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    }
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
  }
});

test('dropdown external mode delegates menu lifecycle without rendering a DOM menu', () => {
  const requests: Array<
    | import('ls/base/browser/ui/dropdown/dropdown').DropdownExternalMenuRequest
    | null
  > = [];
  const dropdownView = createDropdownView({
    menuMode: 'external',
    value: 'nature',
    options: [
      { value: 'nature', label: 'Nature' },
      { value: 'science', label: 'Science' },
    ],
    onExternalMenuChange: (request) => {
      requests.push(request);
    },
  });
  const dropdown = dropdownView.getElement();
  dropdown.getBoundingClientRect = () =>
    createDomRect({ x: 80, y: 60, width: 120, height: 32 });
  document.body.append(dropdown);

  try {
    dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    assert.equal(document.body.querySelector('.dropdown-menu'), null);
    assert.equal(requests.length > 0, true);
    assert.deepEqual(requests.at(-1), {
      source: 'open',
      triggerRect: {
        x: 80,
        y: 60,
        width: 120,
        height: 32,
      },
      align: 'start',
      options: [
        { value: 'nature', label: 'Nature' },
        { value: 'science', label: 'Science' },
      ],
      value: 'nature',
    });

    dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert.equal(requests.at(-1), null);
  } finally {
    dropdownView.dispose();
    document.body.replaceChildren();
  }
});

test('dropdown portal menu closes when focus moves to another control', async () => {
  const dropdownView = createDropdownView({
    menuMode: 'dom',
    domMenuLayer: 'portal',
    value: 'nature',
    options: [
      { value: 'nature', label: 'Nature' },
      { value: 'science', label: 'Science' },
    ],
  });
  const dropdown = dropdownView.getElement();
  dropdown.getBoundingClientRect = () =>
    createDomRect({ x: 24, y: 80, width: 120, height: 32 });
  const otherButton = document.createElement('button');
  otherButton.textContent = 'Other';
  document.body.append(dropdown, otherButton);

  try {
    dropdown.focus();
    dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert(document.body.querySelector('.dropdown-menu-portal') instanceof HTMLElement);

    otherButton.focus();
    await delay(0);

    assert.equal(document.body.querySelector('.dropdown-menu-portal'), null);
    assert.equal(dropdown.getAttribute('aria-expanded'), 'false');
  } finally {
    dropdownView.dispose();
    document.body.replaceChildren();
  }
});

test('dropdown external mode falls back to DOM rendering when no external host is provided', () => {
  const dropdownView = createDropdownView({
    menuMode: 'external',
    value: 'nature',
    options: [
      { value: 'nature', label: 'Nature' },
      { value: 'science', label: 'Science' },
    ],
  });
  const dropdown = dropdownView.getElement();
  document.body.append(dropdown);

  try {
    dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const inlineMenu = dropdown.querySelector('.dropdown-menu');
    assert(inlineMenu instanceof HTMLElement);
    assert.equal(document.body.querySelector('.dropdown-menu-portal'), null);
  } finally {
    dropdownView.dispose();
    document.body.replaceChildren();
  }
});

test('dropdown exposes basic aria metadata and keyboard selection for DOM menus', () => {
  const selections: string[] = [];
  const dropdownView = createDropdownView({
    menuMode: 'dom',
    value: 'nature',
    options: [
      { value: 'nature', label: 'Nature' },
      { value: 'science', label: 'Science' },
    ],
    onChange: ({ target }) => {
      selections.push(target.value);
    },
  });
  const dropdown = dropdownView.getElement();
  document.body.append(dropdown);

  try {
    assert.equal(dropdown.getAttribute('role'), 'combobox');
    assert.equal(dropdown.getAttribute('aria-haspopup'), 'listbox');
    assert.equal(dropdown.getAttribute('aria-expanded'), 'false');

    dropdown.focus();
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const menu = dropdown.querySelector('.dropdown-menu');
    assert(menu instanceof HTMLElement);
    assert.equal(dropdown.getAttribute('aria-expanded'), 'true');
    assert.equal(dropdown.getAttribute('aria-controls'), menu.id);
    assert.equal(dropdown.getAttribute('aria-activedescendant'), `${menu.id}-option-1`);

    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    assert.deepEqual(selections, ['science']);
    assert.equal(dropdown.querySelector('.dropdown-menu'), null);
  } finally {
    dropdownView.dispose();
    document.body.replaceChildren();
  }
});
