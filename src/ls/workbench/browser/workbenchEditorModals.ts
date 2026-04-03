import type { LocaleMessages } from 'language/locales';
import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { createModalView } from 'ls/base/browser/ui/modal/modal';
import type { WorkbenchEditorCommandDefinition } from 'ls/workbench/browser/editorCommands';
import 'ls/workbench/browser/media/workbenchEditorModals.css';

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
    const body = createElement('div', 'workbench-editor-modal-body');
    const label = createElement('label', 'workbench-editor-modal-label', params.label);
    const inputHost = createElement('div');
    const inputBox = new InputBox(inputHost, undefined, {
      value: params.defaultValue ?? '',
      placeholder: params.placeholder ?? '',
      className: 'workbench-editor-modal-input',
    });
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
      inputBox.dispose();
      resolve(value);
    };

    cancelButton.type = 'button';
    submitButton.type = 'button';
    cancelButton.addEventListener('click', () => finish(null));
    submitButton.addEventListener('click', () => finish(inputBox.value.trim()));

    inputBox.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(inputBox.value.trim());
      }
    });

    actions.append(cancelButton, submitButton);
    body.append(label, inputHost, actions);

    const modal = createModalView({
      open: true,
      title: params.title,
      content: body,
      closeLabel: params.ui.toastClose,
      onClose: () => finish(null),
      panelClassName: 'workbench-editor-modal-panel',
    });

    modal.open();
    queueMicrotask(() => inputBox.focus());
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
    button.disabled = !command.enabled;
    button.append(text, shortcut);
    button.addEventListener('click', () => {
      if (!command.enabled) {
        return;
      }
      params.onSelect(command.id);
      modal.dispose();
    });
    list.append(button);
  }

  body.append(list);
  modal.open();
}
