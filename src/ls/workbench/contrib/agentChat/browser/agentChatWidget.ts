import type { AssistantChatMessage, AssistantConversation } from 'ls/workbench/browser/assistantModel';
import {
  createActionBarView,
  type ActionBarActionItem,
  type ActionBarItem,
} from 'ls/base/browser/ui/actionbar/actionbar';
import {
  createDropdownMenuActionViewItem,
  DropdownMenuActionViewItem,
} from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';
import type { DropdownOption } from 'ls/base/browser/ui/dropdown/dropdown';
import { applyHover } from 'ls/base/browser/ui/hover/hover';
import { HorizontalScrollbar } from 'ls/base/browser/ui/scrollbar/horizontalScrollbar';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import type { AuxiliaryBarLabels } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybarLabels';
import 'ls/workbench/browser/parts/auxiliarybar/media/auxiliarybar.css';
import 'ls/workbench/contrib/agentChat/browser/media/agentChatWidget.css';

export type AgentChatWidgetProps = {
  labels: AuxiliaryBarLabels;
  isKnowledgeBaseModeEnabled: boolean;
  messages: AssistantChatMessage[];
  question: string;
  onQuestionChange: (value: string) => void;
  isAsking: boolean;
  errorMessage: string | null;
  onAsk: () => void;
  onApplyPatch: (messageId: string) => void;
  availableArticleCount: number;
  conversations: AssistantConversation[];
  activeConversationId: string;
  llmModelOptions: DropdownOption[];
  activeLlmModelOptionValue: string;
  onCreateConversation: () => void;
  onActivateConversation: (conversationId: string) => void;
  onCloseConversation: (conversationId: string) => void;
  onCloseAuxiliarySidebar: () => void;
  onSelectLlmModel: (value: string) => void;
  onOpenModelSettings: () => void;
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

export class AgentChatWidget {
  private props: AgentChatWidgetProps;
  private readonly element = createElement('div', 'auxiliarybar-content');
  private readonly renderDisposables = new Set<() => void>();
  private tabStripScrollLeft = 0;

  constructor(props: AgentChatWidgetProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: AgentChatWidgetProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.disposeRenderDisposables();
    this.element.replaceChildren();
  }

  private render() {
    this.disposeRenderDisposables();
    const canSend = !this.props.isAsking && this.props.question.trim().length > 0;
    this.element.replaceChildren(
      this.renderTopbar(),
      this.renderShell(canSend),
    );
  }

  private renderTopbar() {
    const topbar = createElement('div', 'auxiliarybar-topbar');
    const stripHost = createElement(
      'div',
      'auxiliarybar-tab-scroll-host horizontal-scrollbar-host',
    );
    const strip = createElement(
      'div',
      'auxiliarybar-tab-strip horizontal-scrollbar-strip',
    );
    let activeTabButton: HTMLButtonElement | null = null;
    for (const conversation of this.props.conversations) {
      const item = createElement('div', 'auxiliarybar-tab-item');
      const button = createElement(
        'button',
        [
          'auxiliarybar-tab',
          conversation.id === this.props.activeConversationId ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
      button.type = 'button';
      button.textContent = conversation.title;
      applyHover(button, conversation.title);
      if (conversation.id === this.props.activeConversationId) {
        activeTabButton = button;
      }
      button.addEventListener('click', () =>
        this.props.onActivateConversation(conversation.id),
      );

      const close = createElement(
        'button',
        'auxiliarybar-tab-close btn-base btn-ghost btn-mode-icon',
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

    const scrollbarTrack = createElement(
      'div',
      'auxiliarybar-tab-scrollbar horizontal-scrollbar-track',
    );
    scrollbarTrack.setAttribute('aria-hidden', 'true');
    const scrollbarThumb = createElement(
      'div',
      'auxiliarybar-tab-scrollbar-thumb horizontal-scrollbar-thumb',
    );
    scrollbarThumb.setAttribute('aria-hidden', 'true');
    scrollbarTrack.append(scrollbarThumb);
    stripHost.append(strip, scrollbarTrack);

    const tabStripScrollbar = new HorizontalScrollbar(
      stripHost,
      strip,
      scrollbarTrack,
      scrollbarThumb,
      {
        activeItem: activeTabButton,
        initialScrollLeft: this.tabStripScrollLeft,
        mouseWheelSmoothScroll: false,
        consumeMouseWheelIfScrollbarIsNeeded: true,
        onScrollLeftChange: (scrollLeft) => {
          this.tabStripScrollLeft = scrollLeft;
        },
      },
    );
    this.renderDisposables.add(() => {
      tabStripScrollbar.dispose();
    });

    const topbarItems: ActionBarItem[] = [
      this.createTopbarActionItem(
        this.props.labels.assistantNewConversation,
        lxIconSemanticMap.assistant.newConversation,
        this.props.onCreateConversation,
      ),
      this.createTopbarHistoryActionItem(),
      this.createTopbarMoreActionItem(),
    ];

    const actionsView = createActionBarView({
      className: 'sidebar-action-bar',
      ariaRole: 'group',
      items: topbarItems,
    });
    this.renderDisposables.add(() => {
      actionsView.dispose();
    });
    topbar.append(stripHost, actionsView.getElement());
    return topbar;
  }

  private renderShell(canSend: boolean) {
    const shell = createElement('div', 'auxiliarybar-shell');
    if (this.props.errorMessage) {
      const error = createElement('div', 'auxiliarybar-error');
      error.textContent = this.props.errorMessage;
      shell.append(error);
    }
    shell.append(this.renderThread(), this.renderComposer(canSend));
    return shell;
  }

  private renderHistoryPopover() {
    const popover = createElement('div', 'auxiliarybar-popover');
    const section = createElement('div', 'auxiliarybar-popover-section');
    const title = createElement('strong', 'auxiliarybar-popover-title');
    title.textContent = this.props.labels.assistantHistory;
    const list = createElement('div', 'auxiliarybar-history-list');
    for (const conversation of this.props.conversations) {
      const item = createElement(
        'button',
        [
          'auxiliarybar-history-item',
          conversation.id === this.props.activeConversationId ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
      item.type = 'button';
      item.addEventListener('click', () => this.props.onActivateConversation(conversation.id));
      const titleNode = createElement('span', 'auxiliarybar-history-item-title');
      titleNode.textContent = conversation.title;
      const meta = createElement('span', 'auxiliarybar-history-item-meta');
      meta.textContent = `${conversation.messages.length} messages`;
      item.append(titleNode, meta);
      list.append(item);
    }
    section.append(title, list);
    popover.append(section);
    return popover;
  }

  private renderThread() {
    const thread = createElement(
      'div',
      [
        'auxiliarybar-thread',
        this.props.messages.length === 0 ? 'is-empty' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    for (const message of this.props.messages) {
      if (message.role === 'user') {
        const item = createElement(
          'div',
          'auxiliarybar-message auxiliarybar-message-user',
        );
        const text = createElement('p', 'auxiliarybar-message-text');
        text.textContent = message.content;
        item.append(text);
        thread.append(item);
        continue;
      }

      const item = createElement(
        'div',
        'auxiliarybar-message auxiliarybar-message-assistant',
      );
      const body = createElement('div', 'auxiliarybar-message-body');
      const header = createElement('div', 'auxiliarybar-result-header');
      const strong = document.createElement('strong');
      strong.textContent = this.props.labels.assistantAnswerTitle;
      const pill = createElement(
        'span',
        `auxiliarybar-mode-pill ${message.result.rerankApplied ? 'is-enabled' : 'is-disabled'}`,
      );
      pill.textContent = message.result.rerankApplied
        ? this.props.labels.assistantRerankOn
        : this.props.labels.assistantRerankOff;
      header.append(strong, pill);
      const answer = createElement('p', 'auxiliarybar-answer');
      answer.textContent = message.content;
      body.append(header, answer);

      if (message.result.evidence.length > 0) {
        const evidence = createElement('div', 'auxiliarybar-evidence');
        const title = document.createElement('strong');
        title.textContent = this.props.labels.assistantEvidenceTitle;
        const list = createElement('ul', 'auxiliarybar-evidence-list');
        for (const evidenceItem of message.result.evidence) {
          const li = createElement('li', 'auxiliarybar-evidence-item');
          const titleNode = createElement('strong', 'auxiliarybar-evidence-title');
          titleNode.textContent = `[${evidenceItem.rank}] ${evidenceItem.title}`;
          const meta = createElement('p', 'auxiliarybar-evidence-meta');
          meta.textContent = [evidenceItem.journalTitle, evidenceItem.publishedAt]
            .filter(Boolean)
            .join(' | ');
          const text = createElement('p', 'auxiliarybar-evidence-text');
          text.textContent = evidenceItem.excerpt;
          li.append(titleNode, meta, text);
          list.append(li);
        }
        evidence.append(title, list);
        body.append(evidence);
      }

      const patchProposal = this.renderPatchProposal(message);
      if (patchProposal) {
        body.append(patchProposal);
      }

      item.append(body);
      thread.append(item);
    }
    return thread;
  }

  private renderPatchProposal(
    message: Extract<AssistantChatMessage, { role: 'assistant' }>,
  ) {
    const patchProposal = message.patchProposal ?? null;
    if (!patchProposal) {
      return null;
    }

    const card = createElement('div', 'auxiliarybar-patch-card');
    const header = createElement('div', 'auxiliarybar-patch-header');
    const label = createElement('strong', 'auxiliarybar-patch-label');
    label.textContent = patchProposal.patch.label;
    header.append(label);

    if (patchProposal.isApplied) {
      const status = createElement('span', 'auxiliarybar-mode-pill is-enabled');
      status.textContent = this.props.labels.assistantPatchApplied;
      header.append(status);
    } else if (patchProposal.requiresCustomExecutor) {
      const status = createElement('span', 'auxiliarybar-mode-pill is-disabled');
      status.textContent = this.props.labels.assistantPatchRequiresExecutor;
      header.append(status);
    }

    card.append(header);

    if (patchProposal.patch.summary) {
      const summary = createElement('p', 'auxiliarybar-patch-summary');
      summary.textContent = patchProposal.patch.summary;
      card.append(summary);
    }

    const errorText = patchProposal.validationError || patchProposal.applyError;
    if (errorText) {
      const error = createElement('p', 'auxiliarybar-patch-error');
      error.textContent = errorText;
      card.append(error);
    }

    if (
      patchProposal.accepted &&
      !patchProposal.requiresCustomExecutor &&
      !patchProposal.validationError &&
      !patchProposal.isApplied
    ) {
      const footer = createElement('div', 'auxiliarybar-patch-footer');
      const applyButton = createElement(
        'button',
        'auxiliarybar-patch-btn btn-base btn-secondary btn-sm',
      );
      applyButton.type = 'button';
      applyButton.textContent = this.props.labels.assistantPatchApply;
      applyButton.addEventListener('click', () =>
        this.props.onApplyPatch(message.id),
      );
      footer.append(applyButton);
      card.append(footer);
    }

    return card;
  }

  private createModelDropdownActionViewItem() {
    const currentOption =
      this.props.llmModelOptions.find(
        (option) => option.value === this.props.activeLlmModelOptionValue,
      ) ?? null;

    return new DropdownMenuActionViewItem({
      label: currentOption?.label ?? 'Switch model',
      title: 'Switch model',
      mode: 'custom',
      buttonClassName: 'auxiliarybar-model-switch-btn',
      className: 'auxiliarybar-model-switch',
      disabled: this.props.llmModelOptions.length === 0,
      menuClassName: 'auxiliarybar-model-switch-context-view',
      overlayRole: 'dialog',
      minWidth: 280,
      content: () => this.renderModelDropdownTrigger(currentOption),
      renderOverlay: ({ hide }: { hide: () => void }) => this.renderModelDropdownMenu(hide),
    });
  }

  private renderModelDropdownTrigger(currentOption: DropdownOption | null) {
    const trigger = createElement('span', 'auxiliarybar-model-switch-trigger');
    const activeIcon = currentOption?.icon
      ? createLxIcon(currentOption.icon, 'auxiliarybar-model-switch-icon')
      : null;
    const label = createElement('span', 'auxiliarybar-model-switch-label');
    label.textContent = currentOption?.label ?? 'Select model';
    const chevron = createLxIcon('chevron-down', 'auxiliarybar-model-switch-chevron');

    if (activeIcon) {
      trigger.append(activeIcon);
    }
    trigger.append(label, chevron);
    return trigger;
  }

  private renderModelDropdownMenu(hide: () => void) {
    const menu = createElement('div', 'auxiliarybar-model-menu');
    menu.setAttribute('role', 'group');
    menu.append(
      this.renderModelMenuSectionLabel('Mode'),
      this.createModelMenuItem({
        label: 'Auto Max mode',
        description: 'Let the app route to the recommended model automatically.',
        icon: 'agent',
        checked: this.props.activeLlmModelOptionValue === 'auto',
        onClick: () => {
          this.props.onSelectLlmModel('auto');
          hide();
        },
      }),
      this.createModelMenuItem({
        label: 'Use multiple models',
        description: 'Not available yet.',
        icon: 'reasoning',
        disabled: true,
      }),
      this.renderModelMenuSeparator(),
      this.renderModelMenuSectionLabel('Models'),
      ...this.props.llmModelOptions
        .filter((option) => option.value !== 'auto')
        .map((option) =>
          this.createModelMenuItem({
            label: option.label,
            description: option.title,
            icon: option.icon,
            checked: this.props.activeLlmModelOptionValue === option.value,
            disabled: option.disabled,
            onClick: () => {
              this.props.onSelectLlmModel(option.value);
              hide();
            },
          })),
      this.renderModelMenuSeparator(),
      this.createModelMenuItem({
        label: 'Add models',
        description: 'Open Settings to manage enabled models.',
        icon: 'gear',
        onClick: () => {
          this.props.onOpenModelSettings();
          hide();
        },
      }),
    );
    return menu;
  }

  private renderModelMenuSectionLabel(label: string) {
    const element = createElement('div', 'auxiliarybar-model-menu-section-label');
    element.textContent = label;
    return element;
  }

  private renderModelMenuSeparator() {
    return createElement('div', 'auxiliarybar-model-menu-separator');
  }

  private createModelMenuItem(options: {
    label: string;
    description?: string;
    icon?: LxIconName;
    checked?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }) {
    const item = createElement(
      'button',
      [
        'auxiliarybar-model-menu-item',
        options.checked ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    item.type = 'button';
    item.disabled = Boolean(options.disabled);
    item.setAttribute('aria-pressed', String(Boolean(options.checked)));

    const content = createElement('span', 'auxiliarybar-model-menu-item-content');
    if (options.icon) {
      content.append(createLxIcon(options.icon, 'auxiliarybar-model-menu-item-icon'));
    }

    const copy = createElement('span', 'auxiliarybar-model-menu-item-copy');
    const label = createElement('span', 'auxiliarybar-model-menu-item-label');
    label.textContent = options.label;
    copy.append(label);
    if (options.description) {
      const description = createElement('span', 'auxiliarybar-model-menu-item-description');
      description.textContent = options.description;
      copy.append(description);
    }
    content.append(copy);

    const check = createElement('span', 'auxiliarybar-model-menu-item-check');
    if (options.checked) {
      check.append(createLxIcon('check'));
    }

    item.append(content, check);
    item.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (options.disabled) {
        return;
      }
      options.onClick?.();
    });
    return item;
  }

  private renderComposer(canSend: boolean) {
    const composer = createElement(
      'div',
      [
        'auxiliarybar-composer',
        this.props.messages.length === 0 ? 'is-empty-state' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    const textarea = createElement('textarea', 'auxiliarybar-input');
    textarea.rows = 2;
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

    const toolbar = createElement('div', 'auxiliarybar-composer-toolbar');
    const modelDropdownView = this.createModelDropdownActionViewItem();
    modelDropdownView.render(toolbar);
    this.renderDisposables.add(() => {
      modelDropdownView.dispose();
    });
    const sendLabel = this.props.isAsking
      ? this.props.labels.assistantSendBusy
      : this.props.labels.assistantSend;
    const actionsView = createActionBarView({
      className: 'auxiliarybar-composer-actions',
      ariaRole: 'group',
      items: [
        this.createComposerActionItem(
          this.props.labels.assistantImage,
          'image-filled',
          'auxiliarybar-composer-tool-action',
        ),
        {
          label: sendLabel,
          title: sendLabel,
          content: createLxIcon(
            this.props.isAsking
              ? lxIconSemanticMap.assistant.busy
              : 'voice-circle-filled',
          ),
          buttonClassName: 'auxiliarybar-composer-send-action',
          onClick: () => this.props.onAsk(),
        },
      ],
    });
    this.renderDisposables.add(() => {
      actionsView.dispose();
    });
    toolbar.append(actionsView.getElement());
    composer.append(textarea, toolbar);
    return composer;
  }

  private createTopbarActionItem(
    label: string,
    icon: LxIconName,
    onClick?: () => void,
    isActive = false,
    isToggle = false,
    triggerId?: string,
  ): ActionBarActionItem {
    return {
      label,
      content: createLxIcon(icon),
      buttonClassName: 'sidebar-action-btn',
      checked: isToggle ? isActive : undefined,
      active: isActive,
      buttonAttributes: triggerId
        ? {
            'data-auxiliarybar-trigger': triggerId,
          }
        : undefined,
      onClick: onClick ? () => onClick() : undefined,
    };
  }

  private createComposerActionItem(
    label: string,
    icon: LxIconName,
    buttonClassName = 'auxiliarybar-composer-tool-action',
  ): ActionBarActionItem {
    return {
      label,
      title: label,
      content: createLxIcon(icon),
      buttonClassName,
    };
  }

  private createTopbarMoreActionItem(): ActionBarItem {
    return createDropdownMenuActionViewItem({
      label: this.props.labels.assistantMore,
      title: this.props.labels.assistantMore,
      content: createLxIcon(lxIconSemanticMap.assistant.more),
      buttonClassName: 'sidebar-action-btn',
      menuClassName: 'auxiliarybar-context-view',
      menu: [
        {
          label: this.props.labels.assistantNewConversation,
          onClick: () => {
            this.props.onCreateConversation();
          },
        },
      ],
    });
  }

  private createTopbarHistoryActionItem(): ActionBarItem {
    return createDropdownMenuActionViewItem({
      label: this.props.labels.assistantHistory,
      title: this.props.labels.assistantHistory,
      content: createLxIcon(lxIconSemanticMap.assistant.history),
      buttonClassName: 'sidebar-action-btn',
      menuClassName: 'auxiliarybar-context-view',
      overlayRole: 'dialog',
      minWidth: 280,
      renderOverlay: ({ hide }) => {
        const popover = this.renderHistoryPopover();
        for (const button of popover.querySelectorAll<HTMLButtonElement>('.auxiliarybar-history-item')) {
          button.addEventListener('click', () => hide(), { once: true });
        }
        return popover;
      },
    });
  }

  private disposeRenderDisposables() {
    for (const dispose of this.renderDisposables) {
      dispose();
    }
    this.renderDisposables.clear();
  }
}

export function createAgentChatWidget(props: AgentChatWidgetProps) {
  return new AgentChatWidget(props);
}

export default AgentChatWidget;
