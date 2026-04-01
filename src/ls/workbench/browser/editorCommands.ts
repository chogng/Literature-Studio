import type { LocaleMessages } from 'language/locales';
import {
  getDraftEditorCommandIds,
  getDraftEditorWorkbenchLabel,
  getDraftEditorShortcutLabel,
} from 'ls/editor/browser/text/editorCommandRegistry';
import type { WritingEditorStableSelectionTarget } from 'ls/editor/common/writingEditorDocument';
import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';

export type WorkbenchEditorCommandHandlers = {
  executeActiveDraftCommand: (commandId: DraftEditorCommandId) => boolean;
  canExecuteActiveDraftCommand: (commandId: DraftEditorCommandId) => boolean;
  getActiveDraftStableSelectionTarget: () => WritingEditorStableSelectionTarget | null;
};

export type WorkbenchEditorCommandDefinition = {
  id: DraftEditorCommandId;
  label: (ui: LocaleMessages) => string;
  shortcutLabel: string;
  enabled: boolean;
};

function createWorkbenchEditorCommandDefinition(
  id: DraftEditorCommandId,
): WorkbenchEditorCommandDefinition {
  return {
    id,
    label: (ui: LocaleMessages) => getDraftEditorWorkbenchLabel(id, ui),
    shortcutLabel: getDraftEditorShortcutLabel(id),
    enabled: canExecuteWorkbenchEditorCommand(id),
  };
}

export function getWorkbenchEditorCommandDefinitions(): ReadonlyArray<WorkbenchEditorCommandDefinition> {
  return getDraftEditorCommandIds().map((id) =>
    createWorkbenchEditorCommandDefinition(id),
  );
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

export function executeWorkbenchEditorCommand(commandId: DraftEditorCommandId) {
  if (!workbenchEditorCommandHandlers?.canExecuteActiveDraftCommand(commandId)) {
    return false;
  }

  return (
    workbenchEditorCommandHandlers?.executeActiveDraftCommand(commandId) ?? false
  );
}

export function canExecuteWorkbenchEditorCommand(commandId: DraftEditorCommandId) {
  return workbenchEditorCommandHandlers?.canExecuteActiveDraftCommand(commandId) ?? false;
}

export function getWorkbenchActiveDraftStableSelectionTarget() {
  return (
    workbenchEditorCommandHandlers?.getActiveDraftStableSelectionTarget() ?? null
  );
}

export function getWorkbenchEditorCommandDefinition(
  commandId: DraftEditorCommandId,
) {
  return createWorkbenchEditorCommandDefinition(commandId);
}
