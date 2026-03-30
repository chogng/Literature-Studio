import { jsx, jsxs } from "react/jsx-runtime";
import {
  ArrowUp,
  Bot,
  Ellipsis,
  History,
  Image,
  Mic,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Button } from "../../../../base/browser/ui/button/button";
import type { AssistantChatMessage } from "../../assistantModel";
import type { SidebarLabels } from "./secondarySidebarPart";
import "./media/auxiliarySidebar.css";

type AuxiliarySidebarProps = {
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

export default function AuxiliarySidebar({
  labels,
  isKnowledgeBaseModeEnabled: _isKnowledgeBaseModeEnabled,
  messages,
  question,
  onQuestionChange,
  isAsking,
  errorMessage,
  onAsk,
  availableArticleCount: _availableArticleCount,
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
}: AuxiliarySidebarProps) {
  const tabStripRef = useRef<HTMLDivElement | null>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    const tabStrip = tabStripRef.current;
    const activeTab = activeTabRef.current;
    if (!tabStrip || !activeTab) {
      return;
    }

    const activeIndex = conversations.findIndex(
      (conversation) => conversation.id === activeConversationId
    );
    const alignToEnd = activeIndex === conversations.length - 1;
    activeTab.scrollIntoView({
      block: "nearest",
      inline: alignToEnd ? "end" : "nearest",
      behavior: "auto",
    });
  }, [activeConversationId, conversations.length]);

  const canSend = !isAsking && question.trim().length > 0;
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    if (canSend) {
      onAsk();
    }
  };

  return jsxs("div", {
    className: "sidebar-auxiliary-content",
    children: [
      jsxs("div", {
        className: "sidebar-chat-topbar",
        children: [
          jsx("div", {
            className: "sidebar-chat-tab-strip",
            ref: tabStripRef,
            children: conversations.map((conversation) =>
              jsxs(
                "div",
                {
                  className: "sidebar-chat-tab-item",
                  children: [
                    jsx("button", {
                      type: "button",
                      className: [
                        "sidebar-chat-tab",
                        conversation.id === activeConversationId ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" "),
                      ref:
                        conversation.id === activeConversationId
                          ? activeTabRef
                          : undefined,
                      onClick: () => onActivateConversation(conversation.id),
                      title: conversation.title,
                      children: conversation.title,
                    }),
                    jsx("button", {
                      type: "button",
                      className: "sidebar-chat-tab-close",
                      title:
                        conversations.length === 1 ? "关闭辅助侧栏" : "关闭对话",
                      "aria-label":
                        conversations.length === 1
                          ? "关闭辅助侧栏"
                          : `关闭对话：${conversation.title}`,
                      onClick: (event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        if (conversations.length === 1) {
                          onCloseAuxiliarySidebar();
                          return;
                        }
                        onCloseConversation(conversation.id);
                      },
                      children: jsx(X, { size: 11, strokeWidth: 2.5 }),
                    }),
                  ],
                },
                conversation.id
              )
            ),
          }),
          jsxs("div", {
            className: "sidebar-chat-action-bar",
            children: [
              jsx(Button, {
                type: "button",
                className: "sidebar-chat-topbar-action-btn",
                variant: "ghost",
                size: "sm",
                mode: "icon",
                leftIcon: jsx(Plus, { size: 16, strokeWidth: 2 }),
                title: "添加新对话",
                "aria-label": "添加新对话",
                onClick: onCreateConversation,
              }),
              jsx(Button, {
                type: "button",
                className: [
                  "sidebar-chat-topbar-action-btn",
                  isHistoryOpen ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" "),
                variant: "ghost",
                size: "sm",
                mode: "icon",
                leftIcon: jsx(History, { size: 16, strokeWidth: 2 }),
                title: "查看历史对话",
                "aria-label": "查看历史对话",
                onClick: onToggleHistory,
              }),
              jsx(Button, {
                type: "button",
                className: [
                  "sidebar-chat-topbar-action-btn",
                  isMoreMenuOpen ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" "),
                variant: "ghost",
                size: "sm",
                mode: "icon",
                leftIcon: jsx(Ellipsis, { size: 16, strokeWidth: 2 }),
                title: "更多设置",
                "aria-label": "更多设置",
                onClick: onToggleMoreMenu,
              }),
            ],
          }),
        ],
      }),
      jsxs("div", {
        className: "sidebar-chat-shell",
        children: [
          isHistoryOpen
            ? jsx("div", {
                className: "sidebar-chat-popover",
                children: jsxs("div", {
                  className: "sidebar-chat-popover-section",
                  children: [
                    jsx("strong", {
                      className: "sidebar-chat-popover-title",
                      children: "历史对话",
                    }),
                    jsx("div", {
                      className: "sidebar-chat-history-list",
                      children: conversations.map((conversation) =>
                        jsxs(
                          "button",
                          {
                            type: "button",
                            className: [
                              "sidebar-chat-history-item",
                              conversation.id === activeConversationId
                                ? "is-active"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" "),
                            onClick: () =>
                              onActivateConversation(conversation.id),
                            children: [
                              jsx("span", {
                                className: "sidebar-chat-history-item-title",
                                children: conversation.title,
                              }),
                              jsx("span", {
                                className: "sidebar-chat-history-item-meta",
                                children: `${conversation.messages.length} 条消息`,
                              }),
                            ],
                          },
                          conversation.id
                        )
                      ),
                    }),
                  ],
                }),
              })
            : null,
          isMoreMenuOpen
            ? jsx("div", {
                className: "sidebar-chat-popover",
                children: jsxs("div", {
                  className: "sidebar-chat-popover-section",
                  children: [
                    jsx("strong", {
                      className: "sidebar-chat-popover-title",
                      children: "更多设置",
                    }),
                    jsxs("div", {
                      className: "sidebar-chat-menu-list",
                      children: [
                        jsx("button", {
                          type: "button",
                          className: "sidebar-chat-menu-item",
                          onClick: onCreateConversation,
                          children: "新建对话",
                        }),
                        jsx("button", {
                          type: "button",
                          className: "sidebar-chat-menu-item",
                          onClick: onToggleHistory,
                          children: "查看历史",
                        }),
                      ],
                    }),
                  ],
                }),
              })
            : null,
          errorMessage
            ? jsx("div", {
                className: "sidebar-chat-error",
                children: errorMessage,
              })
            : null,

          jsx("div", {
            className: [
              "sidebar-chat-thread",
              messages.length === 0 ? "is-empty" : "",
            ]
              .filter(Boolean)
              .join(" "),
            children:
              messages.length === 0
                ? null
                : messages.map((message) =>
                    message.role === "user"
                      ? jsxs(
                          "div",
                          {
                            className:
                              "sidebar-chat-message sidebar-chat-message-user",
                            children: [
                              jsx("span", {
                                className:
                                  "sidebar-chat-avatar sidebar-chat-avatar-user",
                                children: jsx(UserRound, {
                                  size: 14,
                                  strokeWidth: 2,
                                }),
                              }),
                              jsx("p", {
                                className: "sidebar-chat-message-text",
                                children: message.content,
                              }),
                            ],
                          },
                          message.id
                        )
                      : jsxs(
                          "div",
                          {
                            className:
                              "sidebar-chat-message sidebar-chat-message-assistant",
                            children: [
                              jsx("span", {
                                className:
                                  "sidebar-chat-avatar sidebar-chat-avatar-assistant",
                                children: jsx(Bot, {
                                  size: 14,
                                  strokeWidth: 2,
                                }),
                              }),
                              jsxs("div", {
                                className: "sidebar-chat-message-body",
                                children: [
                                  jsxs("div", {
                                    className: "sidebar-chat-result-header",
                                    children: [
                                      jsx("strong", {
                                        children: labels.assistantAnswerTitle,
                                      }),
                                      jsx("span", {
                                        className: `sidebar-mode-pill ${
                                          message.result.rerankApplied
                                            ? "is-enabled"
                                            : "is-disabled"
                                        }`,
                                        children: message.result.rerankApplied
                                          ? labels.assistantRerankOn
                                          : labels.assistantRerankOff,
                                      }),
                                    ],
                                  }),
                                  jsx("p", {
                                    className: "sidebar-chat-answer",
                                    children: message.content,
                                  }),
                                  message.result.evidence.length > 0
                                    ? jsxs("div", {
                                        className: "sidebar-chat-evidence",
                                        children: [
                                          jsx("strong", {
                                            children:
                                              labels.assistantEvidenceTitle,
                                          }),
                                          jsx("ul", {
                                            className:
                                              "sidebar-chat-evidence-list",
                                            children:
                                              message.result.evidence.map(
                                                (item) =>
                                                  jsxs(
                                                    "li",
                                                    {
                                                      className:
                                                        "sidebar-chat-evidence-item",
                                                      children: [
                                                        jsx("strong", {
                                                          className:
                                                            "sidebar-chat-evidence-title",
                                                          children: `[${item.rank}] ${item.title}`,
                                                        }),
                                                        jsx("p", {
                                                          className:
                                                            "sidebar-chat-evidence-meta",
                                                          children: [
                                                            item.journalTitle,
                                                            item.publishedAt,
                                                          ]
                                                            .filter(Boolean)
                                                            .join(" | "),
                                                        }),
                                                        jsx("p", {
                                                          className:
                                                            "sidebar-chat-evidence-text",
                                                          children:
                                                            item.excerpt,
                                                        }),
                                                      ],
                                                    },
                                                    `${item.sourceUrl}-${item.rank}`
                                                  )
                                              ),
                                          }),
                                        ],
                                      })
                                    : null,
                                ],
                              }),
                            ],
                          },
                          message.id
                        )
                  ),
          }),
          jsxs("div", {
            className: "sidebar-chat-composer",
            children: [
              jsx("textarea", {
                className: "sidebar-chat-input",
                rows: 3,
                value: question,
                onChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
                  onQuestionChange(event.target.value),
                onKeyDown: handleComposerKeyDown,
                "aria-label": labels.assistantQuestion,
                placeholder: labels.assistantQuestionPlaceholder,
                disabled: isAsking,
              }),
              jsxs("div", {
                className: "sidebar-chat-composer-toolbar",
                children: [
                  jsxs("div", {
                    className: "sidebar-chat-composer-tools",
                    children: [
                      jsx(Button, {
                        type: "button",
                        className: "sidebar-chat-composer-tool-btn",
                        variant: "ghost",
                        size: "sm",
                        mode: "icon",
                        leftIcon: jsx(Mic, { size: 16, strokeWidth: 2 }),
                        "aria-label": labels.assistantVoice,
                        title: labels.assistantVoice,
                      }),
                      jsx(Button, {
                        type: "button",
                        className: "sidebar-chat-composer-tool-btn",
                        variant: "ghost",
                        size: "sm",
                        mode: "icon",
                        leftIcon: jsx(Image, { size: 16, strokeWidth: 2 }),
                        "aria-label": labels.assistantImage,
                        title: labels.assistantImage,
                      }),
                    ],
                  }),
                  jsx(Button, {
                    type: "button",
                    className: "sidebar-chat-send-btn sidebar-chat-send-icon-btn",
                    variant: "primary",
                    size: "md",
                    mode: "icon",
                    leftIcon: jsx(ArrowUp, { size: 16, strokeWidth: 2.2 }),
                    disabled: !canSend,
                    onClick: onAsk,
                    "aria-label": isAsking
                      ? labels.assistantSendBusy
                      : labels.assistantSend,
                    title: isAsking
                      ? labels.assistantSendBusy
                      : labels.assistantSend,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
