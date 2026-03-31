import type { EditorStatusItem } from '../../../../editor/browser/shared/editorStatus';

export function createStatusbarItemElement(item: EditorStatusItem) {
  const itemElement = document.createElement('span');
  itemElement.className = [
    'editor-statusbar-item',
    item.tone ? `is-${item.tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelElement = document.createElement('span');
  labelElement.className = 'editor-statusbar-item-label';
  labelElement.textContent = item.label;

  const valueElement = document.createElement('span');
  valueElement.className = 'editor-statusbar-item-value';
  valueElement.title = item.value;
  valueElement.textContent = item.value;

  itemElement.append(labelElement, valueElement);
  return itemElement;
}
