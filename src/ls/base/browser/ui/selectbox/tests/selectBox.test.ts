import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let SelectBox: typeof import('ls/base/browser/ui/selectbox/selectBox').SelectBox;

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ SelectBox } = await import('ls/base/browser/ui/selectbox/selectBox'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('selectbox renders a native select with configured options', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const selectBox = new SelectBox(
    [
      { text: 'System', value: 'system' },
      { text: 'Light', value: 'light', isDisabled: true },
      { text: 'Dark', value: 'dark' },
    ],
    2,
    undefined,
  );

  try {
    selectBox.render(container);

    const select = container.querySelector('select');
    if (!(select instanceof HTMLElement)) {
      throw new Error('Expected a native select element.');
    }

    assert.equal(select.classList.contains('ls-select-box'), true);
    assert.equal(select.getAttribute('aria-label'), null);
    assert.equal((select as HTMLSelectElement).options.length, 3);
    assert.equal((select as HTMLSelectElement).selectedIndex, 2);
    assert.equal((select as HTMLSelectElement).options[1]?.disabled, true);
  } finally {
    selectBox.dispose();
    document.body.replaceChildren();
  }
});

test('selectbox fires onDidSelect when the selected option changes', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const selectBox = new SelectBox(
    [
      { text: 'Chinese', value: 'zh-CN' },
      { text: 'English', value: 'en-US' },
    ],
    0,
    undefined,
  );
  const events: Array<{ index: number; selected: string }> = [];
  const subscription = selectBox.onDidSelect((event) => {
    events.push(event);
  });

  try {
    selectBox.render(container);
    const select = selectBox.domNode;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(events, [{ index: 1, selected: 'en-US' }]);
  } finally {
    subscription.dispose();
    selectBox.dispose();
    document.body.replaceChildren();
  }
});

test('selectbox keeps selected index in range when options change', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const selectBox = new SelectBox(
    [
      { text: 'A' },
      { text: 'B' },
    ],
    0,
    undefined,
  );

  try {
    selectBox.render(container);
    selectBox.select(9);
    assert.equal(selectBox.domNode.selectedIndex, 1);

    selectBox.setOptions([{ text: 'Only' }]);
    assert.equal(selectBox.domNode.options.length, 1);
    assert.equal(selectBox.domNode.selectedIndex, 0);
  } finally {
    selectBox.dispose();
    document.body.replaceChildren();
  }
});

test('selectbox supports style() and setFocusable()', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const selectBox = new SelectBox([{ text: 'Default' }], 0, undefined);

  try {
    selectBox.render(container);
    selectBox.style({
      selectBackground: 'rgb(1, 2, 3)',
      selectForeground: 'rgb(4, 5, 6)',
      selectBorder: 'rgb(7, 8, 9)',
      focusBorder: 'rgb(10, 11, 12)',
    });

    assert.equal(selectBox.domNode.style.backgroundColor, 'rgb(1, 2, 3)');
    assert.equal(selectBox.domNode.style.color, 'rgb(4, 5, 6)');
    assert.equal(selectBox.domNode.style.borderColor, 'rgb(7, 8, 9)');
    assert.equal(
      selectBox.domNode.style.getPropertyValue('--monaco-select-focusBorder'),
      'rgb(10, 11, 12)',
    );

    selectBox.setFocusable(false);
    assert.equal(selectBox.domNode.tabIndex, -1);
    selectBox.setFocusable(true);
    assert.equal(selectBox.domNode.tabIndex, 0);
  } finally {
    selectBox.dispose();
    document.body.replaceChildren();
  }
});

test('selectbox custom drawn mode opens contextview menu and selects an option', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const selectBox = new SelectBox(
    [
      { text: 'Chinese', value: 'zh-CN' },
      { text: 'English', value: 'en-US' },
    ],
    0,
    undefined,
    {},
    { useCustomDrawn: true },
  );
  const events: Array<{ index: number; selected: string }> = [];
  const subscription = selectBox.onDidSelect((event) => {
    events.push(event);
  });

  try {
    selectBox.render(container);
    selectBox.domNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const menu = document.body.querySelector('.ls-select-box-dropdown');
    if (!(menu instanceof HTMLElement)) {
      throw new Error('Expected custom drawn selectbox menu.');
    }

    const options = menu.querySelectorAll<HTMLElement>('.ls-select-box-option');
    assert.equal(options.length, 2);
    options[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    assert.equal(selectBox.domNode.value, 'en-US');
    assert.deepEqual(events, [{ index: 1, selected: 'en-US' }]);
  } finally {
    subscription.dispose();
    selectBox.dispose();
    document.body.replaceChildren();
  }
});
