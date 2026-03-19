import { jsx } from 'react/jsx-runtime';
import { WORKBENCH_PART_IDS, useWorkbenchPartRef } from '../../layout';
import ViewPartView from '../views/viewPartView';
import type { ViewPartProps } from '../views/viewPartView';
import './media/editor.css';

export type EditorPartProps = {
  viewPartProps: ViewPartProps;
};

function renderEditorContent(viewPartProps: EditorPartProps['viewPartProps']) {
  return jsx(ViewPartView, { ...viewPartProps });
}

export default function EditorPartView({
  viewPartProps,
}: EditorPartProps) {
  const editorPartRef = useWorkbenchPartRef(WORKBENCH_PART_IDS.editor);
  const editorContentView = renderEditorContent(viewPartProps);

  return jsx('section', {
    ref: editorPartRef,
    className: 'panel web-panel',
    children: editorContentView,
  });
}
