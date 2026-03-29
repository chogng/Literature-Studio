import { jsx } from 'react/jsx-runtime';
import type { WritingWorkspacePreviewTab } from '../../../writingEditorModel';
import ViewPartView from '../../views/viewPartView';
import type { ViewPartProps } from '../../views/viewPartView';
import type { EditorPartLabels } from '../editorPartView';

export type PreviewEditorPaneProps = {
  labels: EditorPartLabels;
  previewTab: WritingWorkspacePreviewTab;
  viewPartProps: ViewPartProps;
};

export default function PreviewEditorPane({
  labels: _labels,
  previewTab: _previewTab,
  viewPartProps,
}: PreviewEditorPaneProps) {
  return jsx('div', {
    className: 'editor-source-pane',
    children: jsx('div', {
      className: 'editor-source-body',
      // Reuse the shared native preview surface directly here. This pane no longer renders
      // a separate source header row, so the source pane layout must remain a single body row.
      children: jsx(ViewPartView, { ...viewPartProps }),
    }),
  });
}
