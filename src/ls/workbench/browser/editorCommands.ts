import type { LocaleMessages } from '../../../language/locales';
import type { DraftEditorCommandId } from './parts/editor/panes/draftEditorCommands';

export type WorkbenchEditorCommandHandlers = {
  executeActiveDraftCommand: (commandId: DraftEditorCommandId) => boolean;
};

export type WorkbenchEditorCommandDefinition = {
  id: DraftEditorCommandId;
  label: (ui: LocaleMessages) => string;
  shortcutLabel: string;
};

export const workbenchEditorCommandDefinitions: ReadonlyArray<WorkbenchEditorCommandDefinition> =
  [
    {
      id: 'insertCitation',
      label: (ui) => ui.editorInsertCitation,
      shortcutLabel: 'Mod+Shift+C',
    },
    {
      id: 'insertFigure',
      label: (ui) => ui.editorInsertFigure,
      shortcutLabel: 'Mod+Shift+F',
    },
    {
      id: 'insertFigureRef',
      label: (ui) => ui.editorInsertFigureRef,
      shortcutLabel: 'Mod+Shift+R',
    },
  ] as const;

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
  return (
    workbenchEditorCommandHandlers?.executeActiveDraftCommand(commandId) ?? false
  );
}

export function getWorkbenchEditorCommandDefinition(
  commandId: DraftEditorCommandId,
) {
  return workbenchEditorCommandDefinitions.find(
    (definition) => definition.id === commandId,
  );
}
