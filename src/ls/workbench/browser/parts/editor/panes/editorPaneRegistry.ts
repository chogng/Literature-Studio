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
import type { DraftEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/draftEditorPane';
import { PdfEditorPane } from 'ls/workbench/browser/parts/editor/panes/pdfEditorPane';
import type { PdfEditorPaneProps } from 'ls/workbench/browser/parts/editor/panes/pdfEditorPane';

export type EditorPaneRenderer = {
  getElement: () => HTMLElement;
  setProps: (props: any) => void;
  dispose: () => void;
};

export type EditorPaneResolverContext = {
  labels: EditorPartLabels;
  viewPartProps: ViewPartProps;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onDraftStatusChange: (tabId: string, status: DraftEditorStatusState) => void;
};

export type EditorPaneInput =
  | {
      paneId: 'draft';
      contentClassNames: readonly ['is-mode-draft'];
      tab: WritingWorkspaceDraftTab;
    }
  | {
      paneId: 'browser';
      contentClassNames: readonly ['is-mode-browser'];
      tab: WritingWorkspaceBrowserTab;
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
    paneId: 'browser',
    contentClassNames: ['is-mode-browser'],
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
    onStatusChange: (status: DraftEditorStatusState) =>
      context.onDraftStatusChange(input.tab.id, status),
  };
}

function createContentPaneProps(
  input: Extract<EditorPaneInput, { paneId: 'browser' | 'pdf' }>,
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
    case 'browser': {
      const paneProps = createContentPaneProps(input, context);
      return {
        paneId: 'browser',
        paneKey: `browser:${input.tab.id}`,
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
