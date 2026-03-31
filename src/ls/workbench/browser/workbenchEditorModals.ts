import type { LocaleMessages } from '../../../language/locales';
import { createInputView } from '../../base/browser/ui/input/input';
import { createModalView } from '../../base/browser/ui/modal/modal';
import type { WorkbenchEditorCommandDefinition } from './editorCommands';
import './media/workbenchEditorModals.css';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

export function showWorkbenchTextInputModal(params: {
  title: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  ui: LocaleMessages;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const inputView = createInputView({
      value: params.defaultValue ?? '',
      placeholder: params.placeholder ?? '',
      className: 'workbench-editor-modal-input',
    });
    const body = createElement('div', 'workbench-editor-modal-body');
    const label = createElement('label', 'workbench-editor-modal-label', params.label);
    const actions = createElement('div', 'workbench-editor-modal-actions');
    const cancelButton = createElement(
      'button',
      'btn-base btn-secondary btn-md',
      params.ui.editorModalCancel,
    ) as HTMLButtonElement;
    const submitButton = createElement(
      'button',
      'btn-base btn-primary btn-md',
      params.ui.editorModalConfirm,
    ) as HTMLButtonElement;

    let resolved = false;
    const finish = (value: string | null) => {
      if (resolved) {
        return;
      }

      resolved = true;
      modal.dispose();
      inputView.dispose();
      resolve(value);
    };

    cancelButton.type = 'button';
    submitButton.type = 'button';
    cancelButton.addEventListener('click', () => finish(null));
    submitButton.addEventListener('click', () => finish(inputView.getValue().trim()));

    const inputElement = inputView.getElement().querySelector('input');
    inputElement?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(inputView.getValue().trim());
      }
    });

    actions.append(cancelButton, submitButton);
    body.append(label, inputView.getElement(), actions);

    const modal = createModalView({
      open: true,
      title: params.title,
      content: body,
      closeLabel: params.ui.toastClose,
      onClose: () => finish(null),
      panelClassName: 'workbench-editor-modal-panel',
    });

    modal.open();
    queueMicrotask(() => inputView.focus());
  });
}

export function showWorkbenchCommandPaletteModal(params: {
  title: string;
  ui: LocaleMessages;
  commands: ReadonlyArray<WorkbenchEditorCommandDefinition & { labelText: string }>;
  onSelect: (commandId: WorkbenchEditorCommandDefinition['id']) => void;
}) {
  const body = createElement('div', 'workbench-command-palette-body');
  const list = createElement('div', 'workbench-command-palette-list');

  const modal = createModalView({
    open: true,
    title: params.title,
    content: body,
    closeLabel: params.ui.toastClose,
    onClose: () => modal.dispose(),
    panelClassName: 'workbench-command-palette-panel',
  });

  for (const command of params.commands) {
    const button = createElement(
      'button',
      'workbench-command-palette-item btn-base btn-secondary btn-md',
    ) as HTMLButtonElement;
    const text = createElement('span', 'workbench-command-palette-text', command.labelText);
    const shortcut = createElement(
      'span',
      'workbench-command-palette-shortcut',
      command.shortcutLabel,
    );
    button.type = 'button';
    button.append(text, shortcut);
    button.addEventListener('click', () => {
      params.onSelect(command.id);
      modal.dispose();
    });
    list.append(button);
  }

  body.append(list);
  modal.open();
}
