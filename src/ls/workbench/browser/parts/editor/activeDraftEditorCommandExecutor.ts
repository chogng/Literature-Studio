import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import { DraftEditorPane } from 'ls/workbench/browser/parts/editor/panes/draftEditorPane';
import type { EditorPaneRenderer } from 'ls/workbench/browser/parts/editor/panes/editorPaneRegistry';

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
