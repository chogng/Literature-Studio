import type { LocaleMessages } from 'language/locales';
import {
  getDraftEditorCommandIds,
  getDraftEditorWorkbenchLabel,
  getDraftEditorShortcutLabel,
} from 'ls/editor/browser/text/editorCommandRegistry';
import type { WritingEditorStableSelectionTarget } from 'ls/editor/common/writingEditorDocument';
import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';

export type WorkbenchEditorCommandId = DraftEditorCommandId | 'saveDraft';

export type WorkbenchEditorCommandHandlers = {
  executeActiveDraftCommand: (commandId: DraftEditorCommandId) => boolean;
  canExecuteActiveDraftCommand: (commandId: DraftEditorCommandId) => boolean;
  getActiveDraftStableSelectionTarget: () => WritingEditorStableSelectionTarget | null;
  saveActiveDraft: () => boolean;
  canSaveActiveDraft: () => boolean;
};

export type WorkbenchEditorCommandDefinition = {
  id: WorkbenchEditorCommandId;
  label: (ui: LocaleMessages) => string;
  shortcutLabel: string;
  enabled: boolean;
};

function createWorkbenchEditorCommandDefinition(
  id: WorkbenchEditorCommandId,
): WorkbenchEditorCommandDefinition {
  if (id === 'saveDraft') {
    return {
      id,
      label: (ui: LocaleMessages) => ui.editorSaveDraft,
      shortcutLabel: 'Mod+S',
      enabled: canExecuteWorkbenchEditorCommand(id),
    };
  }

  return {
    id,
    label: (ui: LocaleMessages) => getDraftEditorWorkbenchLabel(id, ui),
    shortcutLabel: getDraftEditorShortcutLabel(id),
    enabled: canExecuteWorkbenchEditorCommand(id),
  };
}

export function getWorkbenchEditorCommandDefinitions(): ReadonlyArray<WorkbenchEditorCommandDefinition> {
  return [
    createWorkbenchEditorCommandDefinition('saveDraft'),
    ...getDraftEditorCommandIds().map((id) =>
      createWorkbenchEditorCommandDefinition(id),
    ),
  ];
}

let workbenchEditorCommandHandlers: WorkbenchEditorCommandHandlers | null = null;

export function setWorkbenchEditorCommandHandlers(
  handlers: WorkbenchEditorCommandHandlers | null,
) {
  workbenchEditorCommandHandlers = handlers;
}

export function getWorkbenchEditorCommandHandlers() {
  return workbenchEditorCommandHandlers;
}

export function executeWorkbenchEditorCommand(commandId: WorkbenchEditorCommandId) {
  if (commandId === 'saveDraft') {
    if (!workbenchEditorCommandHandlers?.canSaveActiveDraft()) {
      return false;
    }

    return workbenchEditorCommandHandlers?.saveActiveDraft() ?? false;
  }

  if (!workbenchEditorCommandHandlers?.canExecuteActiveDraftCommand(commandId)) {
    return false;
  }

  return (
    workbenchEditorCommandHandlers?.executeActiveDraftCommand(commandId) ?? false
  );
}

export function canExecuteWorkbenchEditorCommand(commandId: WorkbenchEditorCommandId) {
  if (commandId === 'saveDraft') {
    return workbenchEditorCommandHandlers?.canSaveActiveDraft() ?? false;
  }

  return workbenchEditorCommandHandlers?.canExecuteActiveDraftCommand(commandId) ?? false;
}

export function getWorkbenchActiveDraftStableSelectionTarget() {
  return (
    workbenchEditorCommandHandlers?.getActiveDraftStableSelectionTarget() ?? null
  );
}

export function getWorkbenchEditorCommandDefinition(
  commandId: WorkbenchEditorCommandId,
) {
  return createWorkbenchEditorCommandDefinition(commandId);
}
