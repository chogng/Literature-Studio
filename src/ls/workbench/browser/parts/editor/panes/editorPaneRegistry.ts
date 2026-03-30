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
import { DraftEditorPane, type DraftEditorPaneProps } from './draftEditorPane';
import { PreviewEditorPane, type PreviewEditorPaneProps } from './previewEditorPane';

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

function createPreviewPaneProps(
  input: Extract<EditorPaneInput, { paneId: 'web-preview' | 'pdf-preview' }>,
  context: EditorPaneResolverContext,
): PreviewEditorPaneProps {
  return {
    labels: context.labels,
    previewTab: input.tab,
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
    case 'web-preview': {
      const paneProps = createPreviewPaneProps(input, context);
      return {
        paneId: 'web-preview',
        paneKey: `web-preview:${input.tab.id}`,
        contentClassNames: input.contentClassNames,
        createRenderer: () => new PreviewEditorPane(paneProps),
        updateRenderer: (renderer) => {
          renderer.setProps(paneProps);
        },
      };
    }
    case 'pdf-preview': {
      const paneProps = createPreviewPaneProps(input, context);
      return {
        paneId: 'pdf-preview',
        paneKey: `pdf-preview:${input.tab.id}`,
        contentClassNames: input.contentClassNames,
        createRenderer: () => new PreviewEditorPane(paneProps),
        updateRenderer: (renderer) => {
          renderer.setProps(paneProps);
        },
      };
    }
  }
}
