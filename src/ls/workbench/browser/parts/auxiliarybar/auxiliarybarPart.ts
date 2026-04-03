import type { AssistantModelSnapshot } from 'ls/workbench/browser/assistantModel';
import type { DropdownOption } from 'ls/base/browser/ui/dropdown/dropdown';
import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from 'ls/workbench/browser/layout';
import { AgentChatWidget } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';
import type { AgentChatWidgetProps } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';

import { createAuxiliaryBarLabels } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarLabels';

export type { AgentChatWidgetProps } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';

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
  };
  actions: {
    onQuestionChange: (value: string) => void;
    onAsk: () => void;
    onApplyPatch: (messageId: string) => void;
    onCreateConversation: () => void;
    onActivateConversation: (conversationId: string) => void;
    onCloseConversation: (conversationId: string) => void;
    onCloseAuxiliarySidebar: () => void;
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
  },
  actions: {
    onQuestionChange,
    onAsk,
    onApplyPatch,
    onCreateConversation,
    onActivateConversation,
    onCloseConversation,
    onCloseAuxiliarySidebar,
    onSelectLlmModel,
    onOpenModelSettings,
  },
}: CreateAuxiliaryBarPartPropsParams): AgentChatWidgetProps {
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
    onSelectLlmModel,
    onOpenModelSettings,
  };
}

export class AuxiliaryBarPartView {
  private readonly element = createElement(
    'section',
    'panel sidebar-panel auxiliarybar-panel',
  );
  private readonly sidebar: AgentChatWidget;

  constructor(props: AgentChatWidgetProps) {
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.auxiliarySidebar,
      this.element,
    );
    this.sidebar = new AgentChatWidget(props);
    this.element.append(this.sidebar.getElement());
  }

  getElement() {
    return this.element;
  }

  setProps(props: AgentChatWidgetProps) {
    this.sidebar.setProps(props);
  }

  dispose() {
    this.sidebar.dispose();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.auxiliarySidebar, null);
    this.element.replaceChildren();
  }
}

export function createAuxiliaryBarPartView(props: AgentChatWidgetProps) {
  return new AuxiliaryBarPartView(props);
}
