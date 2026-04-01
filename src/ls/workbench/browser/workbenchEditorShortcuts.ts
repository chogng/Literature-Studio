import {
  executeWorkbenchEditorCommand,
  type WorkbenchEditorCommandDefinition,
  workbenchEditorCommandDefinitions,
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

function matchesShortcut(
  definition: WorkbenchEditorCommandDefinition,
  event: KeyboardEvent,
) {
  if (!hasPrimaryModifier(event) || !event.shiftKey || event.altKey) {
    return false;
  }

  const expectedKey = definition.shortcutLabel.split('+').at(-1)?.toLowerCase();
  return Boolean(expectedKey) && event.key.toLowerCase() === expectedKey;
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

  const matchingDefinition = workbenchEditorCommandDefinitions.find((definition) =>
    matchesShortcut(definition, event),
  );
  if (!matchingDefinition) {
    return false;
  }

  const handled = executeWorkbenchEditorCommand(matchingDefinition.id);
  if (!handled) {
    return false;
  }

  event.preventDefault();
  return true;
}
