import { jsx } from 'react/jsx-runtime';
import type {
  WritingEditorDocument,
  WritingWorkspaceTab,
} from '../../writingEditorModel';
import { WORKBENCH_PART_IDS, createWorkbenchPartRef } from '../../layout';
import type { ViewPartProps } from '../views/viewPartView';
import type { EditorStatusLabels } from './editorStatus';
import type { WritingEditorSurfaceLabels } from './prosemirror/prosemirrorEditor';
import { EditorGroupView } from './editorGroupView';
import './media/editor.css';

export type EditorPartLabels = {
  draftMode: string;
  sourceMode: string;
  pdfMode: string;
  close: string;
  draftBodyPlaceholder: string;
  sourceTitle: string;
  pdfTitle: string;
  status: EditorStatusLabels;
} & WritingEditorSurfaceLabels;

export type EditorPartProps = {
  labels: EditorPartLabels;
  viewPartProps: ViewPartProps;
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateDraftTab: () => void;
  onCreatePdfTab: () => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
};

export default function EditorPartView(props: EditorPartProps) {
  const editorPartRef = createWorkbenchPartRef(WORKBENCH_PART_IDS.editor);

  return jsx('section', {
    ref: editorPartRef,
    className: 'panel web-panel',
    children: jsx(EditorGroupView, { ...props }),
  });
}
