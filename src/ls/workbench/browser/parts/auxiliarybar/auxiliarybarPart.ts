import type { AssistantModelSnapshot } from '../../assistantModel';
import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from '../../layout';
import { AuxiliaryBar, type AuxiliaryBarProps } from './auxiliarybar';
import { createAuxiliaryBarLabels } from './auxiliarybarLabels';

export type { AuxiliaryBarProps } from './auxiliarybar';

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
  };
  actions: {
    onQuestionChange: (value: string) => void;
    onAsk: () => void;
    onCreateConversation: () => void;
    onActivateConversation: (conversationId: string) => void;
    onCloseConversation: (conversationId: string) => void;
    onCloseAuxiliarySidebar: () => void;
    onToggleHistory: () => void;
    onToggleMoreMenu: () => void;
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
  },
  actions: {
    onQuestionChange,
    onAsk,
    onCreateConversation,
    onActivateConversation,
    onCloseConversation,
    onCloseAuxiliarySidebar,
    onToggleHistory,
    onToggleMoreMenu,
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
    availableArticleCount,
    conversations,
    activeConversationId,
    isHistoryOpen,
    isMoreMenuOpen,
    onCreateConversation,
    onActivateConversation,
    onCloseConversation,
    onCloseAuxiliarySidebar,
    onToggleHistory,
    onToggleMoreMenu,
  };
}

export class AuxiliaryBarPartView {
  private readonly element = createElement(
    'section',
    'panel sidebar-panel sidebar-panel-auxiliary',
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
