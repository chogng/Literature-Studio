import type { AssistantModelSnapshot } from 'ls/workbench/browser/assistantModel';
import type { DropdownOption } from 'ls/base/browser/ui/dropdown/dropdown';
import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from 'ls/workbench/browser/layout';
import { AuxiliaryBar } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybar';
import type { AuxiliaryBarProps } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybar';

import { createAuxiliaryBarLabels } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarLabels';

export type { AuxiliaryBarProps } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybar';

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
    isHistoryOpen: AssistantModelSnapshot['isHistoryOpen'];
    isMoreMenuOpen: AssistantModelSnapshot['isMoreMenuOpen'];
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
    onToggleHistory: () => void;
    onToggleMoreMenu: () => void;
    onSelectLlmModel: (value: string) => void;
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
    isHistoryOpen,
    isMoreMenuOpen,
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
    onToggleHistory,
    onToggleMoreMenu,
    onSelectLlmModel,
  },
}: CreateAuxiliaryBarPartPropsParams): AuxiliaryBarProps {
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
    isHistoryOpen,
    isMoreMenuOpen,
    llmModelOptions,
    activeLlmModelOptionValue,
    onCreateConversation,
    onActivateConversation,
    onCloseConversation,
    onCloseAuxiliarySidebar,
    onToggleHistory,
    onToggleMoreMenu,
    onSelectLlmModel,
  };
}

export class AuxiliaryBarPartView {
  private readonly element = createElement(
    'section',
    'panel sidebar-panel auxiliarybar-panel',
  );
  private readonly sidebar: AuxiliaryBar;

  constructor(props: AuxiliaryBarProps) {
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.auxiliarySidebar,
      this.element,
    );
    this.sidebar = new AuxiliaryBar(props);
    this.element.append(this.sidebar.getElement());
  }

  getElement() {
    return this.element;
  }

  setProps(props: AuxiliaryBarProps) {
    this.sidebar.setProps(props);
  }

  dispose() {
    this.sidebar.dispose();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.auxiliarySidebar, null);
    this.element.replaceChildren();
  }
}

export function createAuxiliaryBarPartView(props: AuxiliaryBarProps) {
  return new AuxiliaryBarPartView(props);
}
