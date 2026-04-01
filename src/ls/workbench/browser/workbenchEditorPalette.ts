import { getLocaleMessages } from '../../../language/i18n';
import { localeService } from 'ls/workbench/contrib/localization/browser/localeService';
import {
  executeWorkbenchEditorCommand,
  workbenchEditorCommandDefinitions,
} from 'ls/workbench/browser/editorCommands';
import { showWorkbenchCommandPaletteModal } from 'ls/workbench/browser/workbenchEditorModals';

export function showWorkbenchEditorCommandPalette() {
  const ui = getLocaleMessages(localeService.getLocale());
  showWorkbenchCommandPaletteModal({
    title: ui.editorCommandPaletteTitle,
    ui,
    commands: workbenchEditorCommandDefinitions.map((definition) => ({
      ...definition,
      labelText: definition.label(ui),
    })),
    onSelect: (commandId) => {
      executeWorkbenchEditorCommand(commandId);
    },
  });
  return true;
}
