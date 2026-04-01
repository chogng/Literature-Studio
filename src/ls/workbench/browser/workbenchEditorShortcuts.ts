import { matchesShortcutLabel } from 'ls/editor/browser/text/editorCommandRegistry';
import {
  canExecuteWorkbenchEditorCommand,
  executeWorkbenchEditorCommand,
  getWorkbenchEditorCommandDefinitions,
} from 'ls/workbench/browser/editorCommands';

import { showWorkbenchEditorCommandPalette } from 'ls/workbench/browser/workbenchEditorPalette';

function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function hasPrimaryModifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}

export function handleWorkbenchEditorShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || isEditableEventTarget(event.target)) {
    return false;
  }

  if (hasPrimaryModifier(event) && event.shiftKey && !event.altKey && event.key.toLowerCase() === 'p') {
    const handled = showWorkbenchEditorCommandPalette();
    if (!handled) {
      return false;
    }

    event.preventDefault();
    return true;
  }

  const matchingDefinition = getWorkbenchEditorCommandDefinitions().find((definition) =>
    matchesShortcutLabel(definition.shortcutLabel, event),
  );
  if (!matchingDefinition) {
    return false;
  }

  if (!canExecuteWorkbenchEditorCommand(matchingDefinition.id)) {
    return false;
  }

  const handled = executeWorkbenchEditorCommand(matchingDefinition.id);
  if (!handled) {
    return false;
  }

  event.preventDefault();
  return true;
}
