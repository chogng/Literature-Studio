import type { AssistantModelSnapshot } from 'ls/workbench/browser/assistantModel';
import type { DropdownOption } from 'ls/base/browser/ui/dropdown/dropdown';
import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from 'ls/workbench/browser/layout';
import { AgentChatWidget } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';
import type { AgentChatWidgetProps } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';
import { getWindowChromeLayout } from 'ls/platform/window/common/window';

import { createAgentBarLabels } from 'ls/workbench/browser/parts/agentbar/agentbarLabels';

const WINDOW_CHROME_LAYOUT = getWindowChromeLayout();

export type { AgentChatWidgetProps } from 'ls/workbench/contrib/agentChat/browser/agentChatWidget';
export type AgentBarPartProps = AgentChatWidgetProps & {
  isPrimarySidebarVisible?: boolean;
  topbarActionsElement?: HTMLElement | null;
};

type CreateAgentBarPartPropsParams = {
  state: {
    ui: Parameters<typeof createAgentBarLabels>[0];
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
    onCloseAgentBar: () => void;
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

export function createAgentBarPartProps({
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
    onCloseAgentBar,
    onSelectLlmModel,
    onOpenModelSettings,
  },
}: CreateAgentBarPartPropsParams): AgentBarPartProps {
  return {
    labels: createAgentBarLabels(ui),
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
    onCloseAgentBar,
    onSelectLlmModel,
    onOpenModelSettings,
    isPrimarySidebarVisible: true,
  };
}

export class AgentBarPartView {
  private readonly element = createElement(
    'section',
    'panel sidebar-panel agentbar-panel',
  );
  private readonly topbarElement = createElement(
    'div',
    'agentbar-topbar topbar-segment',
  );
  private readonly leadingWindowControlsSpacer = createElement(
    'div',
    'agentbar-topbar-window-controls-spacer',
  );
  private readonly sidebar: AgentChatWidget;

  constructor(props: AgentBarPartProps) {
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.agentSidebar,
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

  setProps(props: AgentBarPartProps) {
    this.sidebar.setProps(props);
    this.renderTopbar(props);
  }

  dispose() {
    this.sidebar.dispose();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.agentSidebar, null);
    this.element.replaceChildren();
  }

  private renderTopbar(props: AgentBarPartProps) {
    const shouldMountTopbarActions = !!props.topbarActionsElement;

    if (shouldMountTopbarActions) {
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

export function createAgentBarPartView(props: AgentBarPartProps) {
  return new AgentBarPartView(props);
}
