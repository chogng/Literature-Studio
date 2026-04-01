import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import type { WritingEditorStableSelectionTarget } from 'ls/editor/common/writingEditorDocument';
import { DraftEditorPane } from 'ls/workbench/browser/parts/editor/panes/draftEditorPane';
import type { EditorPaneRenderer } from 'ls/workbench/browser/parts/editor/panes/editorPaneRegistry';

export type DraftEditorSurfaceActionId = 'undo' | 'redo';

export type ActiveDraftEditorCommandExecutor = {
  execute: (commandId: DraftEditorCommandId) => boolean;
  runAction: (actionId: DraftEditorSurfaceActionId) => boolean;
  getStableSelectionTarget: () => WritingEditorStableSelectionTarget | null;
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
    runAction(actionId) {
      const activePaneRenderer = getActivePaneRenderer();
      if (!(activePaneRenderer instanceof DraftEditorPane)) {
        return false;
      }

      return activePaneRenderer.executeEditorAction(actionId);
    },
    getStableSelectionTarget() {
      const activePaneRenderer = getActivePaneRenderer();
      if (!(activePaneRenderer instanceof DraftEditorPane)) {
        return null;
      }

      return activePaneRenderer.getStableSelectionTarget();
    },
  };
}
