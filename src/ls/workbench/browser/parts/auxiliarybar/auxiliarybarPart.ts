import type { AssistantModelSnapshot } from 'ls/workbench/browser/assistantModel';
import type { DropdownOption } from 'ls/base/browser/ui/dropdown/dropdown';
import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from 'ls/workbench/browser/layout';
import { AgentChatWidget } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';
import type { AgentChatWidgetProps } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';
import { getWindowChromeLayout } from 'ls/platform/window/common/window';

import { createAuxiliaryBarLabels } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarLabels';

const WINDOW_CHROME_LAYOUT = getWindowChromeLayout();

export type { AgentChatWidgetProps } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';
export type AuxiliaryBarPartProps = AgentChatWidgetProps & {
  isPrimarySidebarVisible?: boolean;
  topbarActionsElement?: HTMLElement | null;
};

type CreateAuxiliaryBarPartPropsParams = {
  state: {
    ui: Parameters<typeof createAuxiliaryBarLabels>[0];
    isKnowledgeBaseModeEnabled: boolean;
    question: string;
    messages: AssistantModelSnapshot['messages'];
    isAsking: boolean;
    errorMessage: string | null;
    availableArticleCount: number;
    conversations: AssistantModelSnapshot['conversations'];
    activeConversationId: AssistantModelSnapshot['activeConversationId'];
    llmModelOptions: DropdownOption[];
    activeLlmModelOptionValue: string;
    isSecondarySidebarVisible: boolean;
  };
  actions: {
    onQuestionChange: (value: string) => void;
    onAsk: () => void;
    onApplyPatch: (messageId: string) => void;
    onCreateConversation: () => void;
    onActivateConversation: (conversationId: string) => void;
    onCloseConversation: (conversationId: string) => void;
    onCloseAuxiliarySidebar: () => void;
    onToggleSecondarySidebar: () => void;
    onSelectLlmModel: (value: string) => void;
    onOpenModelSettings: () => void;
  };
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

export function createAuxiliaryBarPartProps({
  state: {
    ui,
    isKnowledgeBaseModeEnabled,
    question,
    messages,
    isAsking,
    errorMessage,
    availableArticleCount,
    conversations,
    activeConversationId,
    llmModelOptions,
    activeLlmModelOptionValue,
    isSecondarySidebarVisible,
  },
  actions: {
    onQuestionChange,
    onAsk,
    onApplyPatch,
    onCreateConversation,
    onActivateConversation,
    onCloseConversation,
    onCloseAuxiliarySidebar,
    onToggleSecondarySidebar,
    onSelectLlmModel,
    onOpenModelSettings,
  },
}: CreateAuxiliaryBarPartPropsParams): AuxiliaryBarPartProps {
  return {
    labels: createAuxiliaryBarLabels(ui),
    isKnowledgeBaseModeEnabled,
    question,
    messages,
    onQuestionChange,
    isAsking,
    errorMessage,
    onAsk,
    onApplyPatch,
    availableArticleCount,
    conversations,
    activeConversationId,
    llmModelOptions,
    activeLlmModelOptionValue,
    onCreateConversation,
    onActivateConversation,
    onCloseConversation,
    onCloseAuxiliarySidebar,
    isSecondarySidebarVisible,
    onToggleSecondarySidebar,
    onSelectLlmModel,
    onOpenModelSettings,
    isPrimarySidebarVisible: true,
  };
}

export class AuxiliaryBarPartView {
  private readonly element = createElement(
    'section',
    'panel sidebar-panel auxiliarybar-panel',
  );
  private readonly topbarElement = createElement(
    'div',
    'auxiliarybar-shell-topbar titlebar-segment titlebar-segment-auxiliary',
  );
  private readonly leadingWindowControlsSpacer = createElement(
    'div',
    'auxiliarybar-shell-topbar-window-controls-spacer',
  );
  private readonly sidebar: AgentChatWidget;

  constructor(props: AuxiliaryBarPartProps) {
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.auxiliarySidebar,
      this.element,
    );
    this.sidebar = new AgentChatWidget(props);
    if (WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx > 0) {
      this.leadingWindowControlsSpacer.style.setProperty(
        '--window-controls-width',
        `${WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx}px`,
      );
      this.topbarElement.append(this.leadingWindowControlsSpacer);
    }
    this.element.append(this.topbarElement, this.sidebar.getElement());
    this.renderTopbar(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: AuxiliaryBarPartProps) {
    this.sidebar.setProps(props);
    this.renderTopbar(props);
  }

  dispose() {
    this.sidebar.dispose();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.auxiliarySidebar, null);
    this.element.replaceChildren();
  }

  private renderTopbar(props: AuxiliaryBarPartProps) {
    const shouldMountPrimaryTopbarActions =
      !props.isPrimarySidebarVisible && !!props.topbarActionsElement;

    if (shouldMountPrimaryTopbarActions) {
      const topbarActionsElement = props.topbarActionsElement!;
      if (this.topbarElement.lastElementChild !== topbarActionsElement) {
        this.topbarElement.append(topbarActionsElement);
      }
      return;
    }

    const currentTopbarActionsElement = this.topbarElement.querySelector(
      '.sidebar-topbar-actions-host',
    );
    if (currentTopbarActionsElement) {
      currentTopbarActionsElement.remove();
    }
  }
}

export function createAuxiliaryBarPartView(props: AuxiliaryBarPartProps) {
  return new AuxiliaryBarPartView(props);
}
