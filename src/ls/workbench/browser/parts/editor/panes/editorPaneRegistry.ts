import type {
  WritingEditorDocument,
  WritingWorkspaceDraftTab,
  WritingWorkspacePdfTab,
  WritingWorkspaceTab,
  WritingWorkspaceWebTab,
} from 'ls/workbench/browser/writingEditorModel';
import type { DraftEditorRuntimeState } from 'ls/editor/browser/shared/editorStatus';
import type { ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import { ContentEditorPane, type ContentEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/contentEditorPane';
import { DraftEditorPane, type DraftEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/draftEditorPane';
import { PdfEditorPane, type PdfEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/pdfEditorPane';

export type EditorPaneRenderer = {
  getElement: () => HTMLElement;
  setProps: (props: any) => void;
  dispose: () => void;
};

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
      paneId: 'web';
      contentClassNames: readonly ['is-mode-web'];
      tab: WritingWorkspaceWebTab;
    }
  | {
      paneId: 'pdf';
      contentClassNames: readonly ['is-mode-pdf'];
      tab: WritingWorkspacePdfTab;
    };

export type ResolvedEditorPane = {
  paneId: EditorPaneInput['paneId'];
  paneKey: string;
  contentClassNames: readonly string[];
  createRenderer: () => EditorPaneRenderer;
  updateRenderer: (renderer: EditorPaneRenderer) => void;
};

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
      paneId: 'pdf',
      contentClassNames: ['is-mode-pdf'],
      tab: activeTab,
    };
  }

  return {
    paneId: 'web',
    contentClassNames: ['is-mode-web'],
    tab: activeTab,
  };
}

function createDraftPaneProps(
  input: Extract<EditorPaneInput, { paneId: 'draft' }>,
  context: EditorPaneResolverContext,
): DraftEditorPaneProps {
  return {
    labels: context.labels,
    draftTab: input.tab,
    onDraftDocumentChange: context.onDraftDocumentChange,
    onStatusChange: (status: DraftEditorRuntimeState) =>
      context.onDraftStatusChange(input.tab.id, status),
  };
}

function createContentPaneProps(
  input: Extract<EditorPaneInput, { paneId: 'web' | 'pdf' }>,
  context: EditorPaneResolverContext,
): ContentEditorPaneProps {
  return {
    labels: context.labels,
    contentTab: input.tab,
    viewPartProps: context.viewPartProps,
  };
}

function createPdfPaneProps(
  input: Extract<EditorPaneInput, { paneId: 'pdf' }>,
  context: EditorPaneResolverContext,
): PdfEditorPaneProps {
  return {
    labels: context.labels,
    pdfTab: input.tab,
    viewPartProps: context.viewPartProps,
  };
}

export function resolveEditorPane(
  activeTab: WritingWorkspaceTab,
  context: EditorPaneResolverContext,
): ResolvedEditorPane {
  const input = createEditorPaneInput(activeTab);

  switch (input.paneId) {
    case 'draft': {
      const paneProps = createDraftPaneProps(input, context);
      return {
        paneId: 'draft',
        paneKey: `draft:${input.tab.id}`,
        contentClassNames: input.contentClassNames,
        createRenderer: () => new DraftEditorPane(paneProps),
        updateRenderer: (renderer) => {
          renderer.setProps(paneProps);
        },
      };
    }
    case 'web': {
      const paneProps = createContentPaneProps(input, context);
      return {
        paneId: 'web',
        paneKey: `web:${input.tab.id}`,
        contentClassNames: input.contentClassNames,
        createRenderer: () => new ContentEditorPane(paneProps),
        updateRenderer: (renderer) => {
          renderer.setProps(paneProps);
        },
      };
    }
    case 'pdf': {
      const paneProps = createPdfPaneProps(input, context);
      return {
        paneId: 'pdf',
        paneKey: `pdf:${input.tab.id}`,
        contentClassNames: input.contentClassNames,
        createRenderer: () => new PdfEditorPane(paneProps),
        updateRenderer: (renderer) => {
          renderer.setProps(paneProps);
        },
      };
    }
  }
}
