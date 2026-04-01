import type { EditorStatusItem } from 'ls/editor/browser/shared/editorStatus';
import { createHoverController } from 'ls/base/browser/ui/hover/hover';
import {
  canRunStatusbarCommand,
  runStatusbarCommand,
} from 'ls/workbench/browser/parts/statusbar/statusbarActions';

export function createStatusbarItemElement(item: EditorStatusItem) {
  const itemElement = document.createElement('span');
  const canRunCommand = canRunStatusbarCommand(item);
  itemElement.className = [
    'editor-statusbar-item',
    item.tone ? `is-${item.tone}` : '',
    canRunCommand ? 'is-actionable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelElement = document.createElement('span');
  labelElement.className = 'editor-statusbar-item-label';
  labelElement.textContent = item.label;

  const valueElement = document.createElement('span');
  valueElement.className = 'editor-statusbar-item-value';
  valueElement.textContent = item.value;

  createHoverController(itemElement, {
    content: item.label,
    subtitle: item.value,
    actions: canRunCommand
      ? [
          {
            label: item.label,
            run: () => {
              runStatusbarCommand(item);
            },
          },
        ]
      : [],
  });

  if (canRunCommand) {
    itemElement.tabIndex = 0;
    itemElement.setAttribute('role', 'button');
    itemElement.addEventListener('click', () => {
      runStatusbarCommand(item);
    });
    itemElement.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      runStatusbarCommand(item);
    });
  }

  itemElement.append(labelElement, valueElement);
  return itemElement;
}
