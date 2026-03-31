import { getLocaleMessages } from '../../../language/i18n';
import { localeService } from '../contrib/localization/browser/localeService';
import {
  executeWorkbenchEditorCommand,
  workbenchEditorCommandDefinitions,
} from './editorCommands';
import { showWorkbenchCommandPaletteModal } from './workbenchEditorModals';

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
