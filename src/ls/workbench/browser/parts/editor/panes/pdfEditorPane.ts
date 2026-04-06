import type { Annotation } from 'ls/editor/common/annotation';
import {
  PdfAnnotationEditor,
  type PdfAnnotationEditorViewState,
} from 'ls/editor/browser/pdf/pdfAnnotationEditor';
import {
  readStoredPdfAnnotations,
  writeStoredPdfAnnotations,
} from 'ls/editor/browser/pdf/pdfAnnotationPersistence';
import type { EditorWorkspacePdfTab } from 'ls/workbench/browser/parts/editor/editorModel';
import type { ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import { EditorPane } from 'ls/workbench/browser/parts/editor/panes/editorPane';

export type PdfEditorPaneProps = {
  labels: EditorPartLabels;
  pdfTab: EditorWorkspacePdfTab;
  viewPartProps: ViewPartProps;
};

export class PdfEditorPane extends EditorPane<
  PdfEditorPaneProps,
  PdfAnnotationEditorViewState
> {
  private props: PdfEditorPaneProps;
  private readonly editor: PdfAnnotationEditor;
  private annotations: readonly Annotation[] = [];

  constructor(props: PdfEditorPaneProps) {
    super();
    this.props = props;
    this.annotations = readStoredPdfAnnotations(props.pdfTab.id);
    this.editor = new PdfAnnotationEditor(this.toEditorProps(props));
  }

  override getElement() {
    return this.editor.getElement();
  }

  override setProps(props: PdfEditorPaneProps) {
    if (this.props.pdfTab.id !== props.pdfTab.id) {
      this.annotations = readStoredPdfAnnotations(props.pdfTab.id);
    }

    this.props = props;
    this.editor.setProps(this.toEditorProps(props));
  }

  override getViewState() {
    return this.editor.getViewState();
  }

  override restoreViewState(viewState: PdfAnnotationEditorViewState | undefined) {
    this.editor.restoreViewState(viewState);
  }

  override dispose() {
    this.editor.dispose();
  }

  private toEditorProps(props: PdfEditorPaneProps) {
    return {
      url: props.pdfTab.url,
      targetId: props.pdfTab.id,
      labels: {
        title: props.labels.pdfTitle,
        emptyState: props.labels.status.ready,
      },
      annotations: this.annotations,
      onAnnotationsChange: this.handleAnnotationsChange,
      viewPartProps: props.viewPartProps,
    };
  }

  private readonly handleAnnotationsChange = (annotations: readonly Annotation[]) => {
    this.annotations = annotations;
    writeStoredPdfAnnotations(this.props.pdfTab.id, annotations);
    this.editor.setProps(this.toEditorProps(this.props));
  };
}

export function createPdfEditorPane(props: PdfEditorPaneProps) {
  return new PdfEditorPane(props);
}

export default PdfEditorPane;
