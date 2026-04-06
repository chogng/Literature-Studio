import type {
  WritingEditorDocument,
  WritingWorkspaceBrowserTab,
  WritingWorkspaceDraftTab,
  WritingWorkspacePdfTab,
  WritingWorkspaceTab,
} from 'ls/workbench/browser/writingEditorModel';
import type { DraftEditorStatusState } from 'ls/editor/browser/text/draftEditorStatusState';
import type { ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import { ContentEditorPane } from 'ls/workbench/browser/parts/editor/panes/contentEditorPane';
import type { ContentEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/contentEditorPane';
import { DraftEditorPane } from 'ls/workbench/browser/parts/editor/panes/draftEditorPane';
import type {
  AnyEditorPane,
  EditorPaneDescriptor,
  EditorPaneResolution,
  EditorPane,
} from 'ls/workbench/browser/parts/editor/panes/editorPane';
import type { DraftEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/draftEditorPane';
import { PdfEditorPane } from 'ls/workbench/browser/parts/editor/panes/pdfEditorPane';
import type { PdfEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/pdfEditorPane';

export type EditorPaneResolverContext = {
  labels: EditorPartLabels;
  viewPartProps: ViewPartProps;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onDraftStatusChange: (tabId: string, status: DraftEditorStatusState) => void;
};

export type WritingEditorPaneId = 'draft' | 'browser' | 'pdf';

export type ResolvedEditorPane = {
} & EditorPaneResolution<AnyEditorPane, WritingEditorPaneId>;

type WritingEditorPaneDescriptor<
  TInput extends WritingWorkspaceTab,
  TProps,
  TPane extends EditorPane<TProps, any>,
  TPaneId extends WritingEditorPaneId,
> = EditorPaneDescriptor<
  WritingWorkspaceTab,
  TInput,
  EditorPaneResolverContext,
  TPane,
  TPaneId
>;

type EditorPaneDescriptorOptions<
  TInput extends WritingWorkspaceTab,
  TProps,
  TPane extends EditorPane<TProps, any>,
  TPaneId extends WritingEditorPaneId,
> = {
  paneId: TPaneId;
  contentClassNames: readonly string[];
  acceptsInput: (input: WritingWorkspaceTab) => input is TInput;
  createPaneKey: (input: TInput) => string;
  createPaneProps: (input: TInput, context: EditorPaneResolverContext) => TProps;
  createPane: (props: TProps) => TPane;
};

type AnyWritingEditorPaneDescriptor = WritingEditorPaneDescriptor<
  any,
  any,
  AnyEditorPane,
  WritingEditorPaneId
>;

function createEditorPaneDescriptor<
  TInput extends WritingWorkspaceTab,
  TProps,
  TPane extends EditorPane<TProps, any>,
  TPaneId extends WritingEditorPaneId,
>(
  options: EditorPaneDescriptorOptions<TInput, TProps, TPane, TPaneId>,
): WritingEditorPaneDescriptor<TInput, TProps, TPane, TPaneId> {
  return {
    paneId: options.paneId,
    acceptsInput: options.acceptsInput,
    resolvePane: (input, context) => {
      const paneProps = options.createPaneProps(input, context);
      return {
        paneId: options.paneId,
        paneKey: options.createPaneKey(input),
        contentClassNames: options.contentClassNames,
        createPane: () => options.createPane(paneProps),
        updatePane: (pane) => {
          pane.setProps(paneProps);
        },
      };
    },
  };
}

function createDraftPaneProps(
  tab: WritingWorkspaceDraftTab,
  context: EditorPaneResolverContext,
): DraftEditorPaneProps {
  return {
    labels: context.labels,
    draftTab: tab,
    onDraftDocumentChange: context.onDraftDocumentChange,
    onStatusChange: (status: DraftEditorStatusState) =>
      context.onDraftStatusChange(tab.id, status),
  };
}

function createContentPaneProps(
  tab: WritingWorkspaceBrowserTab | WritingWorkspacePdfTab,
  context: EditorPaneResolverContext,
): ContentEditorPaneProps {
  return {
    labels: context.labels,
    contentTab: tab,
    viewPartProps: context.viewPartProps,
  };
}

function createPdfPaneProps(
  tab: WritingWorkspacePdfTab,
  context: EditorPaneResolverContext,
): PdfEditorPaneProps {
  return {
    labels: context.labels,
    pdfTab: tab,
    viewPartProps: context.viewPartProps,
  };
}

function isDraftWorkspaceTab(
  input: WritingWorkspaceTab,
): input is WritingWorkspaceDraftTab {
  return input.kind === 'draft';
}

function isBrowserWorkspaceTab(
  input: WritingWorkspaceTab,
): input is WritingWorkspaceBrowserTab {
  return input.kind === 'browser';
}

function isPdfWorkspaceTab(
  input: WritingWorkspaceTab,
): input is WritingWorkspacePdfTab {
  return input.kind === 'pdf';
}

const draftEditorPaneDescriptor = createEditorPaneDescriptor({
  paneId: 'draft',
  contentClassNames: ['is-mode-draft'] as const,
  acceptsInput: isDraftWorkspaceTab,
  createPaneKey: (tab) => `draft:${tab.id}`,
  createPaneProps: createDraftPaneProps,
  createPane: (props) => new DraftEditorPane(props),
});

const browserEditorPaneDescriptor = createEditorPaneDescriptor({
  paneId: 'browser',
  contentClassNames: ['is-mode-browser'] as const,
  acceptsInput: isBrowserWorkspaceTab,
  createPaneKey: (tab) => `browser:${tab.id}`,
  createPaneProps: createContentPaneProps,
  createPane: (props) => new ContentEditorPane(props),
});

const pdfEditorPaneDescriptor = createEditorPaneDescriptor({
  paneId: 'pdf',
  contentClassNames: ['is-mode-pdf'] as const,
  acceptsInput: isPdfWorkspaceTab,
  createPaneKey: (tab) => `pdf:${tab.id}`,
  createPaneProps: createPdfPaneProps,
  createPane: (props) => new PdfEditorPane(props),
});

export const editorPaneDescriptors = [
  draftEditorPaneDescriptor,
  browserEditorPaneDescriptor,
  pdfEditorPaneDescriptor,
] as const;

export function resolveEditorPane(
  activeTab: WritingWorkspaceTab,
  context: EditorPaneResolverContext,
): ResolvedEditorPane {
  for (const descriptor of editorPaneDescriptors as unknown as readonly AnyWritingEditorPaneDescriptor[]) {
    if (!descriptor.acceptsInput(activeTab)) {
      continue;
    }

    const resolvedPane = descriptor.resolvePane(activeTab, context);
    if (resolvedPane) {
      return resolvedPane;
    }
  }

  throw new Error(`No editor pane descriptor found for input kind "${activeTab.kind}"`);
}
