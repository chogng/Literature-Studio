import { useCallback, useState } from "react";
import { toast } from "../../base/browser/ui/toast/toast";
import type {
  Article,
  ElectronInvoke,
  LlmSettings,
  RagAnswerResult,
  RagSettings,
} from "../../base/parts/sandbox/common/desktopTypes.js";
import type { LocaleMessages } from "../../../language/locales";
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from "../services/desktop/desktopError";

type UseAssistantModelParams = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
  ui: LocaleMessages;
  isKnowledgeBaseModeEnabled: boolean;
  articles: Article[];
  llmSettings: LlmSettings;
  ragSettings: RagSettings;
  fallbackWritingContext?: string;
};

export type AssistantChatMessage =
  | {
      id: string;
      role: "user";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      result: RagAnswerResult;
    };

export type AssistantConversation = {
  id: string;
  title: string;
  question: string;
  result: RagAnswerResult | null;
  messages: AssistantChatMessage[];
  isAsking: boolean;
  errorMessage: string | null;
};

const DEFAULT_CONVERSATION_TITLE = "新对话";

export function useAssistantModel({
  desktopRuntime,
  invokeDesktop,
  ui,
  isKnowledgeBaseModeEnabled,
  articles,
  llmSettings,
  ragSettings,
  fallbackWritingContext = "",
}: UseAssistantModelParams) {
  const createMessageId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const createConversationId = () =>
    `conversation-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const createConversation = (index: number): AssistantConversation => ({
    id: createConversationId(),
    title:
      index === 0
        ? DEFAULT_CONVERSATION_TITLE
        : `${DEFAULT_CONVERSATION_TITLE} ${index + 1}`,
    question: "",
    result: null,
    messages: [],
    isAsking: false,
    errorMessage: null,
  });

  const [conversations, setConversations] = useState<AssistantConversation[]>([
    createConversation(0),
  ]);
  const [activeConversationId, setActiveConversationId] = useState(
    () => conversations[0]?.id ?? ""
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId
    ) ?? conversations[0];

  const updateActiveConversation = useCallback(
    (
      updater: (conversation: AssistantConversation) => AssistantConversation
    ) => {
      setConversations((previousConversations) =>
        previousConversations.map((conversation) =>
          conversation.id === activeConversationId
            ? updater(conversation)
            : conversation
        )
      );
    },
    [activeConversationId]
  );

  const handleQuestionChange = useCallback(
    (value: string) => {
      updateActiveConversation((conversation) => ({
        ...conversation,
        question: value,
        errorMessage: null,
      }));
    },
    [updateActiveConversation]
  );

  const handleCreateConversation = useCallback(() => {
    setConversations((previousConversations) => {
      const nextConversation = createConversation(previousConversations.length);
      setActiveConversationId(nextConversation.id);
      return [...previousConversations, nextConversation];
    });
    setIsHistoryOpen(false);
    setIsMoreMenuOpen(false);
  }, []);

  const handleActivateConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setIsHistoryOpen(false);
    setIsMoreMenuOpen(false);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setIsHistoryOpen((previousValue) => !previousValue);
    setIsMoreMenuOpen(false);
  }, []);

  const handleToggleMoreMenu = useCallback(() => {
    setIsMoreMenuOpen((previousValue) => !previousValue);
    setIsHistoryOpen(false);
  }, []);

  const handleAsk = useCallback(async () => {
    if (!activeConversation) {
      return;
    }

    const normalizedQuestion = activeConversation.question.trim();
    if (!normalizedQuestion) {
      updateActiveConversation((conversation) => ({
        ...conversation,
        errorMessage: ui.assistantSidebarQuestionRequired,
      }));
      return;
    }

    if (!desktopRuntime) {
      toast.info(ui.toastDesktopLlmTestOnly);
      return;
    }

    const userMessage: AssistantChatMessage = {
      id: createMessageId(),
      role: "user",
      content: normalizedQuestion,
    };

    updateActiveConversation((conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? normalizedQuestion.slice(0, 18) || DEFAULT_CONVERSATION_TITLE
          : conversation.title,
      messages: [...conversation.messages, userMessage],
      question: "",
      isAsking: true,
      errorMessage: null,
    }));

    try {
      const retrievalArticles = isKnowledgeBaseModeEnabled ? articles : [];
      const nextResult = await invokeDesktop("rag_answer_articles", {
        question: normalizedQuestion,
        writingContext: fallbackWritingContext.trim() || null,
        articles: retrievalArticles,
        llm: llmSettings,
        rag: ragSettings,
      });

      updateActiveConversation((conversation) => ({
        ...conversation,
        result: nextResult,
        messages: [
          ...conversation.messages,
          {
            id: createMessageId(),
            role: "assistant",
            content: nextResult.answer,
            result: nextResult,
          },
        ],
      }));
    } catch (askError) {
      const localizedError = localizeDesktopInvokeError(
        ui,
        parseDesktopInvokeError(askError)
      );
      updateActiveConversation((conversation) => ({
        ...conversation,
        errorMessage: localizedError,
        question: normalizedQuestion,
      }));
      toast.error(
        formatLocalized(ui.toastRagAnswerFailed, { error: localizedError })
      );
    } finally {
      updateActiveConversation((conversation) => ({
        ...conversation,
        isAsking: false,
      }));
    }
  }, [
    activeConversation,
    articles,
    desktopRuntime,
    fallbackWritingContext,
    invokeDesktop,
    isKnowledgeBaseModeEnabled,
    llmSettings,
    ragSettings,
    ui,
    updateActiveConversation,
  ]);

  return {
    conversations,
    activeConversationId,
    activeConversation,
    question: activeConversation?.question ?? "",
    setQuestion: handleQuestionChange,
    messages: activeConversation?.messages ?? [],
    result: activeConversation?.result ?? null,
    isAsking: activeConversation?.isAsking ?? false,
    errorMessage: activeConversation?.errorMessage ?? null,
    isHistoryOpen,
    isMoreMenuOpen,
    handleAsk,
    handleCreateConversation,
    handleActivateConversation,
    handleToggleHistory,
    handleToggleMoreMenu,
  };
}
