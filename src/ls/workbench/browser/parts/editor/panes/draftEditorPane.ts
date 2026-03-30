import type { WritingEditorDocument, WritingWorkspaceDraftTab } from '../../../writingEditorModel';
import type { DraftEditorRuntimeState } from '../editorStatus';
import type { EditorPartLabels } from '../editorPartView';
import { ProseMirrorEditor } from '../prosemirror/prosemirrorEditor';

export type DraftEditorPaneProps = {
  labels: EditorPartLabels;
  draftTab: WritingWorkspaceDraftTab;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onStatusChange?: (status: DraftEditorRuntimeState) => void;
};

export class DraftEditorPane {
  private readonly element = document.createElement('div');
  private readonly editor: ProseMirrorEditor;

  constructor(props: DraftEditorPaneProps) {
    this.element.className = 'editor-draft-pane';
    this.editor = new ProseMirrorEditor(this.toEditorProps(props));
    this.element.append(this.editor.getElement());
  }

  getElement() {
    return this.element;
  }

  setProps(props: DraftEditorPaneProps) {
    this.editor.setProps(this.toEditorProps(props));
  }

  dispose() {
    this.editor.dispose();
    this.element.replaceChildren();
  }

  private toEditorProps(props: DraftEditorPaneProps) {
    return {
      document: props.draftTab.document,
      placeholder: props.labels.draftBodyPlaceholder,
      statusLabels: {
        blockFigure: props.labels.status.blockFigure,
      },
      labels: {
        paragraph: props.labels.paragraph,
        heading1: props.labels.heading1,
        heading2: props.labels.heading2,
        heading3: props.labels.heading3,
        bold: props.labels.bold,
        italic: props.labels.italic,
        bulletList: props.labels.bulletList,
        orderedList: props.labels.orderedList,
        blockquote: props.labels.blockquote,
        undo: props.labels.undo,
        redo: props.labels.redo,
        insertCitation: props.labels.insertCitation,
        insertFigure: props.labels.insertFigure,
        insertFigureRef: props.labels.insertFigureRef,
        citationPrompt: props.labels.citationPrompt,
        figureUrlPrompt: props.labels.figureUrlPrompt,
        figureCaptionPrompt: props.labels.figureCaptionPrompt,
        figureRefPrompt: props.labels.figureRefPrompt,
      },
      onDocumentChange: props.onDraftDocumentChange,
      onStatusChange: props.onStatusChange,
    };
  }
}

export function createDraftEditorPane(props: DraftEditorPaneProps) {
  return new DraftEditorPane(props);
}

export default DraftEditorPane;
