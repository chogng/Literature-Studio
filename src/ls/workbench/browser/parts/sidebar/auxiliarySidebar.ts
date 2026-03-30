import type { AssistantChatMessage } from '../../assistantModel';
import { createLxIcon, type LxIconName } from '../../../../base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from '../../../../base/browser/ui/lxicon/lxiconSemantic.js';
import type { SidebarLabels } from './secondarySidebarPart';
import './media/auxiliarySidebar.css';

export type AuxiliarySidebarProps = {
  labels: SidebarLabels;
  isKnowledgeBaseModeEnabled: boolean;
  messages: AssistantChatMessage[];
  question: string;
  onQuestionChange: (value: string) => void;
  isAsking: boolean;
  errorMessage: string | null;
  onAsk: () => void;
  availableArticleCount: number;
  conversations: Array<{
    id: string;
    title: string;
    messages: AssistantChatMessage[];
  }>;
  activeConversationId: string;
  isHistoryOpen: boolean;
  isMoreMenuOpen: boolean;
  onCreateConversation: () => void;
  onActivateConversation: (conversationId: string) => void;
  onCloseConversation: (conversationId: string) => void;
  onCloseAuxiliarySidebar: () => void;
  onToggleHistory: () => void;
  onToggleMoreMenu: () => void;
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

export class AuxiliarySidebar {
  private props: AuxiliarySidebarProps;
  private readonly element = createElement('div', 'sidebar-auxiliary-content');

  constructor(props: AuxiliarySidebarProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: AuxiliarySidebarProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.element.replaceChildren();
  }

  private render() {
    const canSend = !this.props.isAsking && this.props.question.trim().length > 0;
    this.element.replaceChildren(
      this.renderTopbar(),
      this.renderShell(canSend),
    );
  }

  private renderTopbar() {
    const topbar = createElement('div', 'sidebar-chat-topbar');
    const strip = createElement('div', 'sidebar-chat-tab-strip');
    for (const conversation of this.props.conversations) {
      const item = createElement('div', 'sidebar-chat-tab-item');
      const button = createElement(
        'button',
        [
          'sidebar-chat-tab',
          'btn-base',
          'btn-ghost',
          'btn-md',
          conversation.id === this.props.activeConversationId ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
      button.type = 'button';
      button.textContent = conversation.title;
      button.title = conversation.title;
      button.addEventListener('click', () =>
        this.props.onActivateConversation(conversation.id),
      );

      const close = createElement(
        'button',
        'sidebar-chat-tab-close btn-base btn-ghost btn-mode-icon btn-sm',
      );
      close.type = 'button';
      close.append(createLxIcon(lxIconSemanticMap.assistant.closeConversation));
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        if (this.props.conversations.length === 1) {
          this.props.onCloseAuxiliarySidebar();
          return;
        }
        this.props.onCloseConversation(conversation.id);
      });
      item.append(button, close);
      strip.append(item);
    }

    const actions = createElement('div', 'sidebar-chat-action-bar');
    actions.append(
      this.createActionButton(lxIconSemanticMap.assistant.newConversation, this.props.onCreateConversation),
      this.createActionButton(lxIconSemanticMap.assistant.history, this.props.onToggleHistory, this.props.isHistoryOpen),
      this.createActionButton(lxIconSemanticMap.assistant.more, this.props.onToggleMoreMenu, this.props.isMoreMenuOpen),
    );
    topbar.append(strip, actions);
    return topbar;
  }

  private renderShell(canSend: boolean) {
    const shell = createElement('div', 'sidebar-chat-shell');
    if (this.props.isHistoryOpen) {
      shell.append(this.renderHistoryPopover());
    }
    if (this.props.isMoreMenuOpen) {
      shell.append(this.renderMorePopover());
    }
    if (this.props.errorMessage) {
      const error = createElement('div', 'sidebar-chat-error');
      error.textContent = this.props.errorMessage;
      shell.append(error);
    }
    shell.append(this.renderThread(), this.renderComposer(canSend));
    return shell;
  }

  private renderHistoryPopover() {
    const popover = createElement('div', 'sidebar-chat-popover');
    const section = createElement('div', 'sidebar-chat-popover-section');
    const title = createElement('strong', 'sidebar-chat-popover-title');
    title.textContent = 'History';
    const list = createElement('div', 'sidebar-chat-history-list');
    for (const conversation of this.props.conversations) {
      const item = createElement(
        'button',
        [
          'sidebar-chat-history-item',
          conversation.id === this.props.activeConversationId ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
      item.type = 'button';
      item.addEventListener('click', () =>
        this.props.onActivateConversation(conversation.id),
      );
      const titleNode = createElement('span', 'sidebar-chat-history-item-title');
      titleNode.textContent = conversation.title;
      const meta = createElement('span', 'sidebar-chat-history-item-meta');
      meta.textContent = `${conversation.messages.length} messages`;
      item.append(titleNode, meta);
      list.append(item);
    }
    section.append(title, list);
    popover.append(section);
    return popover;
  }

  private renderMorePopover() {
    const popover = createElement('div', 'sidebar-chat-popover');
    const section = createElement('div', 'sidebar-chat-popover-section');
    const title = createElement('strong', 'sidebar-chat-popover-title');
    title.textContent = 'More';
    const list = createElement('div', 'sidebar-chat-menu-list');
    const newConversation = createElement('button', 'sidebar-chat-menu-item');
    newConversation.type = 'button';
    newConversation.textContent = 'New Conversation';
    newConversation.addEventListener('click', this.props.onCreateConversation);
    const history = createElement('button', 'sidebar-chat-menu-item');
    history.type = 'button';
    history.textContent = 'History';
    history.addEventListener('click', this.props.onToggleHistory);
    list.append(newConversation, history);
    section.append(title, list);
    popover.append(section);
    return popover;
  }

  private renderThread() {
    const thread = createElement(
      'div',
      [
        'sidebar-chat-thread',
        this.props.messages.length === 0 ? 'is-empty' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    for (const message of this.props.messages) {
      if (message.role === 'user') {
        const item = createElement(
          'div',
          'sidebar-chat-message sidebar-chat-message-user',
        );
        const text = createElement('p', 'sidebar-chat-message-text');
        text.textContent = message.content;
        item.append(text);
        thread.append(item);
        continue;
      }

      const item = createElement(
        'div',
        'sidebar-chat-message sidebar-chat-message-assistant',
      );
      const body = createElement('div', 'sidebar-chat-message-body');
      const header = createElement('div', 'sidebar-chat-result-header');
      const strong = document.createElement('strong');
      strong.textContent = this.props.labels.assistantAnswerTitle;
      const pill = createElement(
        'span',
        `sidebar-mode-pill ${message.result.rerankApplied ? 'is-enabled' : 'is-disabled'}`,
      );
      pill.textContent = message.result.rerankApplied
        ? this.props.labels.assistantRerankOn
        : this.props.labels.assistantRerankOff;
      header.append(strong, pill);
      const answer = createElement('p', 'sidebar-chat-answer');
      answer.textContent = message.content;
      body.append(header, answer);

      if (message.result.evidence.length > 0) {
        const evidence = createElement('div', 'sidebar-chat-evidence');
        const title = document.createElement('strong');
        title.textContent = this.props.labels.assistantEvidenceTitle;
        const list = createElement('ul', 'sidebar-chat-evidence-list');
        for (const evidenceItem of message.result.evidence) {
          const li = createElement('li', 'sidebar-chat-evidence-item');
          const titleNode = createElement('strong', 'sidebar-chat-evidence-title');
          titleNode.textContent = `[${evidenceItem.rank}] ${evidenceItem.title}`;
          const meta = createElement('p', 'sidebar-chat-evidence-meta');
          meta.textContent = [evidenceItem.journalTitle, evidenceItem.publishedAt]
            .filter(Boolean)
            .join(' | ');
          const text = createElement('p', 'sidebar-chat-evidence-text');
          text.textContent = evidenceItem.excerpt;
          li.append(titleNode, meta, text);
          list.append(li);
        }
        evidence.append(title, list);
        body.append(evidence);
      }

      item.append(body);
      thread.append(item);
    }
    return thread;
  }

  private renderComposer(canSend: boolean) {
    const composer = createElement('div', 'sidebar-chat-composer');
    const textarea = createElement('textarea', 'sidebar-chat-input');
    textarea.rows = 3;
    textarea.value = this.props.question;
    textarea.placeholder = this.props.labels.assistantQuestionPlaceholder;
    textarea.disabled = this.props.isAsking;
    textarea.setAttribute('aria-label', this.props.labels.assistantQuestion);
    textarea.addEventListener('input', () =>
      this.props.onQuestionChange(textarea.value),
    );
    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
        return;
      }
      event.preventDefault();
      if (canSend) {
        this.props.onAsk();
      }
    });

    const toolbar = createElement('div', 'sidebar-chat-composer-toolbar');
    const tools = createElement('div', 'sidebar-chat-composer-tools');
    tools.append(
      this.createComposerButton(this.props.labels.assistantVoice, lxIconSemanticMap.assistant.voice),
      this.createComposerButton(this.props.labels.assistantImage, lxIconSemanticMap.assistant.image),
    );
    const send = createElement(
      'button',
      'sidebar-chat-send-btn sidebar-chat-send-icon-btn btn-base btn-primary btn-mode-icon btn-md',
    );
    send.type = 'button';
    send.replaceChildren(
      this.props.isAsking
        ? createLxIcon(lxIconSemanticMap.assistant.busy)
        : createLxIcon(lxIconSemanticMap.assistant.send),
    );
    send.disabled = !canSend;
    send.title = this.props.isAsking
      ? this.props.labels.assistantSendBusy
      : this.props.labels.assistantSend;
    send.setAttribute('aria-label', send.title);
    send.addEventListener('click', this.props.onAsk);
    toolbar.append(tools, send);
    composer.append(textarea, toolbar);
    return composer;
  }

  private createActionButton(icon: LxIconName, onClick: () => void, isActive = false) {
    const button = createElement(
      'button',
      ['sidebar-chat-topbar-action-btn', 'btn-base', 'btn-ghost', 'btn-mode-icon', 'btn-sm', isActive ? 'is-active' : '']
        .filter(Boolean)
        .join(' '),
    );
    button.type = 'button';
    button.append(createLxIcon(icon));
    button.addEventListener('click', onClick);
    return button;
  }

  private createComposerButton(label: string, icon: LxIconName) {
    const button = createElement(
      'button',
      'sidebar-chat-composer-tool-btn btn-base btn-ghost btn-mode-icon btn-sm',
    );
    button.type = 'button';
    button.append(createLxIcon(icon));
    button.title = label;
    button.setAttribute('aria-label', label);
    return button;
  }
}

export function createAuxiliarySidebar(props: AuxiliarySidebarProps) {
  return new AuxiliarySidebar(props);
}

export default AuxiliarySidebar;
