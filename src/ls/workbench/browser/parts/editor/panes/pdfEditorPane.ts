import type { Annotation } from 'ls/editor/common/annotation';
import { PdfAnnotationEditor } from 'ls/editor/browser/pdf/pdfAnnotationEditor';
import {
  readStoredPdfAnnotations,
  writeStoredPdfAnnotations,
} from 'ls/editor/browser/pdf/pdfAnnotationPersistence';
import type { WritingWorkspacePdfTab } from 'ls/workbench/browser/writingEditorModel';
import type { ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';

export type PdfEditorPaneProps = {
  labels: EditorPartLabels;
  pdfTab: WritingWorkspacePdfTab;
  viewPartProps: ViewPartProps;
};

export class PdfEditorPane {
  private props: PdfEditorPaneProps;
  private readonly editor: PdfAnnotationEditor;
  private annotations: readonly Annotation[] = [];

  constructor(props: PdfEditorPaneProps) {
    this.props = props;
    this.annotations = readStoredPdfAnnotations(props.pdfTab.id);
    this.editor = new PdfAnnotationEditor(this.toEditorProps(props));
  }

  getElement() {
    return this.editor.getElement();
  }

  setProps(props: PdfEditorPaneProps) {
    if (this.props.pdfTab.id !== props.pdfTab.id) {
      this.annotations = readStoredPdfAnnotations(props.pdfTab.id);
    }

    this.props = props;
    this.editor.setProps(this.toEditorProps(props));
  }

  dispose() {
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
