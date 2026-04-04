import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';

let cleanupDomEnvironment: (() => void) | null = null;
let ListWidget: typeof import('ls/base/browser/ui/list/listWidget').ListWidget;

type ListItem = {
  id: string;
  label: string;
};

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ ListWidget } = await import('ls/base/browser/ui/list/listWidget'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

function createList(selected: string[] = []) {
  const items: ListItem[] = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
  ];

  const list = new ListWidget<ListItem>(
    {
      renderElement: (item) => {
        const element = document.createElement('div');
        element.textContent = item.label;
        return element;
      },
    },
    {
      getId: (item) => item.id,
      getLabel: (item) => item.label,
      onDidChangeSelection: (item) => {
        selected.push(item?.id ?? 'null');
      },
    },
  );

  return { items, list };
}

test('list widget typeahead focuses the matching item and click selects it', () => {
  const selected: string[] = [];
  const { items, list } = createList(selected);
  document.body.append(list.getElement());
  list.setItems(items);

  try {
    list.getElement().dispatchEvent(new window.FocusEvent('focus'));
    list.getElement().dispatchEvent(new window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'b',
    }));

    const betaNode = list.getElement().querySelector<HTMLElement>(
      '[data-list-item-id="beta"]',
    );
    assert(betaNode instanceof HTMLElement);
    assert.equal(betaNode.classList.contains('is-focused'), true);

    betaNode.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.equal(list.getSelection()?.id, 'beta');
    assert.deepEqual(selected, ['beta']);
  } finally {
    list.dispose();
    document.body.replaceChildren();
  }
});

test('list widget applies expected DOM classes and keyboard navigation', () => {
  const opened: string[] = [];
  const { items } = createList();
  const listWithOpen = new ListWidget<ListItem>(
    {
      renderElement: (item) => {
        const element = document.createElement('div');
        element.textContent = item.label;
        return element;
      },
    },
    {
      getId: (item) => item.id,
      getLabel: (item) => item.label,
      onDidOpen: (item) => {
        opened.push(item.id);
      },
    },
  );
  document.body.append(listWithOpen.getElement());
  listWithOpen.setItems(items);

  try {
    assert.equal(listWithOpen.getElement().classList.contains('list-view'), true);

    listWithOpen.getElement().dispatchEvent(new window.FocusEvent('focus'));
    listWithOpen.getElement().dispatchEvent(new window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'ArrowDown',
    }));

    const betaNode = listWithOpen.getElement().querySelector<HTMLElement>(
      '[data-list-item-id="beta"]',
    );
    assert(betaNode instanceof HTMLElement);
    assert.equal(betaNode.classList.contains('list-view-row'), true);
    assert.equal(betaNode.classList.contains('is-focused'), true);

    listWithOpen.getElement().dispatchEvent(new window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter',
    }));

    assert.equal(listWithOpen.getSelection()?.id, 'beta');
    assert.deepEqual(opened, ['beta']);
  } finally {
    listWithOpen.dispose();
    document.body.replaceChildren();
  }
});
