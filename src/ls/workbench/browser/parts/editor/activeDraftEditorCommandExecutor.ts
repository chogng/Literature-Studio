import type { DraftEditorCommandId } from './panes/draftEditorCommands';
import { DraftEditorPane } from './panes/draftEditorPane';
import type { EditorPaneRenderer } from './panes/editorPaneRegistry';

export type ActiveDraftEditorCommandExecutor = {
  execute: (commandId: DraftEditorCommandId) => boolean;
};

export function createActiveDraftEditorCommandExecutor(
  getActivePaneRenderer: () => EditorPaneRenderer | null,
): ActiveDraftEditorCommandExecutor {
  return {
    execute(commandId) {
      const activePaneRenderer = getActivePaneRenderer();
      if (!(activePaneRenderer instanceof DraftEditorPane)) {
        return false;
      }

      activePaneRenderer.executeCommand(commandId);
      return true;
    },
  };
}
