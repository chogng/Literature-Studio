import { jsx, jsxs } from 'react/jsx-runtime';
import type { WritingWorkspacePreviewTab } from '../../../writingEditorModel';
import ViewPartView from '../../views/viewPartView';
import type { ViewPartProps } from '../../views/viewPartView';
import type { EditorPartLabels } from '../editorPartView';

export type PreviewEditorPaneProps = {
  labels: EditorPartLabels;
  previewTab: WritingWorkspacePreviewTab;
  viewPartProps: ViewPartProps;
};

function resolvePreviewHeading(
  previewTab: WritingWorkspacePreviewTab,
  labels: EditorPartLabels,
) {
  if (previewTab.kind === 'pdf') {
    return previewTab.title.trim() || labels.pdfTitle;
  }

  return previewTab.title.trim() || labels.sourceMode;
}

export default function PreviewEditorPane({
  labels,
  previewTab,
  viewPartProps,
}: PreviewEditorPaneProps) {
  return jsxs('div', {
    className: 'editor-source-pane',
    children: [
      jsxs('div', {
        className: 'editor-source-header',
        children: [
          jsxs('div', {
            className: 'editor-source-heading',
            children: [
              jsx('strong', {
                children: resolvePreviewHeading(previewTab, labels),
              }),
              previewTab.url
                ? jsx('span', {
                    className: 'editor-source-subheading',
                    children: previewTab.url,
                  })
                : null,
            ],
          }),
        ],
      }),
      jsx('div', {
        className: 'editor-source-body',
        // Reuse the existing shared webContents view here; the tab only decides which editor slot hosts it.
        children: jsx(ViewPartView, { ...viewPartProps }),
      }),
    ],
  });
}
