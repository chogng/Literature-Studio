import {
  type WritingEditorDocument,
  type WritingWorkspaceDraftTab,
} from 'ls/workbench/browser/writingEditorModel';
import { getLocaleMessages } from '../../../../../../language/i18n';
import type { DraftEditorRuntimeState } from 'ls/editor/browser/shared/editorStatus';
import { ProseMirrorEditor } from 'ls/editor/browser/text/editor';
import { localeService } from 'ls/workbench/contrib/localization/browser/localeService';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import {
  createDraftEditorCommandAction,
  type DraftEditorCommandId,
} from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import { showWorkbenchTextInputModal } from 'ls/workbench/browser/workbenchEditorModals';

export type DraftEditorPaneProps = {
  labels: EditorPartLabels;
  draftTab: WritingWorkspaceDraftTab;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onStatusChange?: (status: DraftEditorRuntimeState) => void;
};

export class DraftEditorPane {
  private props: DraftEditorPaneProps;
  private readonly element = document.createElement('div');
  private readonly editor: ProseMirrorEditor;

  constructor(props: DraftEditorPaneProps) {
    this.props = props;
    this.element.className = 'editor-draft-pane';
    this.editor = new ProseMirrorEditor(this.toEditorProps(props));
    this.element.append(this.editor.getElement());
  }

  getElement() {
    return this.element;
  }

  executeCommand(commandId: DraftEditorCommandId) {
    switch (commandId) {
      case 'insertCitation':
        this.handleInsertCitation();
        return;
      case 'insertFigure':
        this.handleInsertFigure();
        return;
      case 'insertFigureRef':
        this.handleInsertFigureRef();
        return;
    }
  }

  setProps(props: DraftEditorPaneProps) {
    this.props = props;
    this.editor.setProps(this.toEditorProps(props));
  }

  dispose() {
    this.editor.dispose();
    this.element.replaceChildren();
  }

  private createCommandContext = () => ({
    editor: this.editor,
    labels: {
      citationPrompt: this.props.labels.citationPrompt,
      figureUrlPrompt: this.props.labels.figureUrlPrompt,
      figureCaptionPrompt: this.props.labels.figureCaptionPrompt,
      figureRefPrompt: this.props.labels.figureRefPrompt,
    },
    prompt: (message: string, defaultValue: string) =>
      showWorkbenchTextInputModal({
        title: this.props.labels.draftMode,
        label: message,
        defaultValue,
        ui: getLocaleMessages(localeService.getLocale()),
      }),
  });

  private readonly handleInsertCitation = createDraftEditorCommandAction(
    'insertCitation',
    this.createCommandContext,
  );

  private readonly handleInsertFigure = createDraftEditorCommandAction(
    'insertFigure',
    this.createCommandContext,
  );

  private readonly handleInsertFigureRef = createDraftEditorCommandAction(
    'insertFigureRef',
    this.createCommandContext,
  );

  private toEditorProps(props: DraftEditorPaneProps) {
    return {
      document: props.draftTab.document,
      placeholder: props.labels.draftBodyPlaceholder,
      statusLabels: {
        blockFigure: props.labels.status.blockFigure,
      },
      labels: {
        textGroup: props.labels.textGroup,
        formatGroup: props.labels.formatGroup,
        insertGroup: props.labels.insertGroup,
        historyGroup: props.labels.historyGroup,
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
      onInsertCitation: this.handleInsertCitation,
      onInsertFigure: this.handleInsertFigure,
      onInsertFigureRef: this.handleInsertFigureRef,
      onDocumentChange: props.onDraftDocumentChange,
      onStatusChange: props.onStatusChange,
    };
  }
}

export function createDraftEditorPane(props: DraftEditorPaneProps) {
  return new DraftEditorPane(props);
}

export default DraftEditorPane;
