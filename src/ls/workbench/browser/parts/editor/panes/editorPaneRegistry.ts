import { jsx } from 'react/jsx-runtime';
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

type EditorPaneView = ReturnType<typeof jsx>;

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
  view: EditorPaneView;
};

type EditorPaneDescriptor<TInput extends EditorPaneInput = EditorPaneInput> = {
  id: TInput['paneId'];
  matches: (input: EditorPaneInput) => input is TInput;
  render: (
    input: TInput,
    context: EditorPaneResolverContext,
  ) => EditorPaneView;
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
      draftTab: input.tab,
      onDraftDocumentChange: context.onDraftDocumentChange,
      onStatusChange: (status: DraftEditorRuntimeState) =>
        context.onDraftStatusChange(
          input.tab.id,
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
  render: (
    input: Extract<EditorPaneInput, { paneId: 'web-preview' }>,
    context,
  ) => renderPreviewPaneView(input, context),
};

const pdfPreviewEditorPaneDescriptor: EditorPaneDescriptor<
  Extract<EditorPaneInput, { paneId: 'pdf-preview' }>
> = {
  id: 'pdf-preview',
  matches: (input): input is Extract<EditorPaneInput, { paneId: 'pdf-preview' }> =>
    input.paneId === 'pdf-preview',
  render: (
    input: Extract<EditorPaneInput, { paneId: 'pdf-preview' }>,
    context,
  ) => renderPreviewPaneView(input, context),
};

const editorPaneDescriptors = {
  draft: draftEditorPaneDescriptor,
  'web-preview': webPreviewEditorPaneDescriptor,
  'pdf-preview': pdfPreviewEditorPaneDescriptor,
} as const;

// Keep the tab-to-pane mapping in one place so the editor shell stays focused on layout and activation.
export function resolveEditorPane(
  activeTab: WritingWorkspaceTab,
  context: EditorPaneResolverContext,
): ResolvedEditorPane {
  const input = createEditorPaneInput(activeTab);

  switch (input.paneId) {
    case 'draft':
      return {
        paneId: editorPaneDescriptors.draft.id,
        contentClassNames: input.contentClassNames,
        view: editorPaneDescriptors.draft.render(input, context),
      };
    case 'web-preview':
      return {
        paneId: editorPaneDescriptors['web-preview'].id,
        contentClassNames: input.contentClassNames,
        view: editorPaneDescriptors['web-preview'].render(input, context),
      };
    case 'pdf-preview':
      return {
        paneId: editorPaneDescriptors['pdf-preview'].id,
        contentClassNames: input.contentClassNames,
        view: editorPaneDescriptors['pdf-preview'].render(input, context),
      };
  }
}
