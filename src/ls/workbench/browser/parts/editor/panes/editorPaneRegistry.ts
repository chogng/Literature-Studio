import { jsx } from 'react/jsx-runtime';
import type { ReactNode } from 'react';
import type {
  WritingEditorDocument,
  WritingWorkspaceDraftTab,
  WritingWorkspacePdfTab,
  WritingWorkspaceTab,
  WritingWorkspaceWebTab,
} from '../../../writingEditorModel';
import type { ViewPartProps } from '../../views/viewPartView';
import type { EditorPartLabels } from '../editorPartView';
import type { DraftEditorRuntimeState } from '../editorStatus';
import DraftEditorPane from './draftEditorPane';
import PreviewEditorPane from './previewEditorPane';

export type EditorPaneResolverContext = {
  labels: EditorPartLabels;
  viewPartProps: ViewPartProps;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onDraftStatusChange: (tabId: string, status: DraftEditorRuntimeState) => void;
};

export type EditorPaneInput =
  | {
      paneId: 'draft';
      contentClassNames: readonly ['is-mode-draft'];
      tab: WritingWorkspaceDraftTab;
    }
  | {
      paneId: 'web-preview';
      contentClassNames: readonly ['is-mode-preview', 'is-mode-web'];
      tab: WritingWorkspaceWebTab;
    }
  | {
      paneId: 'pdf-preview';
      contentClassNames: readonly ['is-mode-preview', 'is-mode-pdf'];
      tab: WritingWorkspacePdfTab;
    };

export type ResolvedEditorPane = {
  contentClassNames: readonly string[];
  paneId: EditorPaneInput['paneId'];
  view: ReactNode;
};

type EditorPaneDescriptor<TInput extends EditorPaneInput = EditorPaneInput> = {
  id: TInput['paneId'];
  matches: (input: EditorPaneInput) => input is TInput;
  render: (
    input: EditorPaneInput,
    context: EditorPaneResolverContext,
  ) => ReactNode;
};

// Mirror the upstream editor split: tabs carry editor input identity, and the pane registry
// decides which editor pane is allowed to render the active input.
function createEditorPaneInput(activeTab: WritingWorkspaceTab): EditorPaneInput {
  if (activeTab.kind === 'draft') {
    return {
      paneId: 'draft',
      contentClassNames: ['is-mode-draft'],
      tab: activeTab,
    };
  }

  if (activeTab.kind === 'pdf') {
    return {
      paneId: 'pdf-preview',
      contentClassNames: ['is-mode-preview', 'is-mode-pdf'],
      tab: activeTab,
    };
  }

  return {
    paneId: 'web-preview',
    contentClassNames: ['is-mode-preview', 'is-mode-web'],
    tab: activeTab,
  };
}

function renderPreviewPaneView(
  input: Extract<EditorPaneInput, { paneId: 'web-preview' | 'pdf-preview' }>,
  context: EditorPaneResolverContext,
) {
  return jsx(PreviewEditorPane, {
    labels: context.labels,
    previewTab: input.tab,
    viewPartProps: context.viewPartProps,
  });
}

const draftEditorPaneDescriptor: EditorPaneDescriptor<
  Extract<EditorPaneInput, { paneId: 'draft' }>
> = {
  id: 'draft',
  matches: (input): input is Extract<EditorPaneInput, { paneId: 'draft' }> =>
    input.paneId === 'draft',
  render: (input, context) =>
    jsx(DraftEditorPane, {
      labels: context.labels,
      draftTab: (input as Extract<EditorPaneInput, { paneId: 'draft' }>).tab,
      onDraftDocumentChange: context.onDraftDocumentChange,
      onStatusChange: (status: DraftEditorRuntimeState) =>
        context.onDraftStatusChange(
          (input as Extract<EditorPaneInput, { paneId: 'draft' }>).tab.id,
          status,
        ),
    }),
};

const webPreviewEditorPaneDescriptor: EditorPaneDescriptor<
  Extract<EditorPaneInput, { paneId: 'web-preview' }>
> = {
  id: 'web-preview',
  matches: (input): input is Extract<EditorPaneInput, { paneId: 'web-preview' }> =>
    input.paneId === 'web-preview',
  render: (input, context) =>
    renderPreviewPaneView(
      input as Extract<EditorPaneInput, { paneId: 'web-preview' }>,
      context,
    ),
};

const pdfPreviewEditorPaneDescriptor: EditorPaneDescriptor<
  Extract<EditorPaneInput, { paneId: 'pdf-preview' }>
> = {
  id: 'pdf-preview',
  matches: (input): input is Extract<EditorPaneInput, { paneId: 'pdf-preview' }> =>
    input.paneId === 'pdf-preview',
  render: (input, context) =>
    renderPreviewPaneView(
      input as Extract<EditorPaneInput, { paneId: 'pdf-preview' }>,
      context,
    ),
};

const editorPaneDescriptors = [
  draftEditorPaneDescriptor,
  webPreviewEditorPaneDescriptor,
  pdfPreviewEditorPaneDescriptor,
] as const satisfies readonly EditorPaneDescriptor[];

function getEditorPaneDescriptor(input: EditorPaneInput) {
  return (
    editorPaneDescriptors.find((candidate) => candidate.matches(input)) ??
    editorPaneDescriptors[0]
  );
}

// Keep the tab-to-pane mapping in one place so the editor shell stays focused on layout and activation.
export function resolveEditorPane(
  activeTab: WritingWorkspaceTab,
  context: EditorPaneResolverContext,
): ResolvedEditorPane {
  const input = createEditorPaneInput(activeTab);
  const descriptor = getEditorPaneDescriptor(input);

  return {
    paneId: descriptor.id,
    contentClassNames: input.contentClassNames,
    view: descriptor.render(input, context),
  };
}
