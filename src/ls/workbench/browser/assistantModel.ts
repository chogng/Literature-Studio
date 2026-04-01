import { toast } from "ls/base/browser/ui/toast/toast";
import type {
  Article,
  ElectronInvoke,
  LlmSettings,
  RagAnswerResult,
  RagSettings,
} from "ls/base/parts/sandbox/common/desktopTypes";
import type { LocaleMessages } from "language/locales";
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from "ls/workbench/services/desktop/desktopError";

export type AssistantModelContext = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
  ui: LocaleMessages;
  isKnowledgeBaseModeEnabled: boolean;
  articles: Article[];
  llmSettings: LlmSettings;
  ragSettings: RagSettings;
  fallbackWritingContext?: string;
  getFallbackWritingContext?: () => string;
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
  autoTitleIndex: number | null;
  question: string;
  result: RagAnswerResult | null;
  messages: AssistantChatMessage[];
  isAsking: boolean;
  errorMessage: string | null;
};

type AssistantModelState = {
  conversations: AssistantConversation[];
  activeConversationId: string;
  isHistoryOpen: boolean;
  isMoreMenuOpen: boolean;
};

export type AssistantModelSnapshot = AssistantModelState & {
  activeConversation: AssistantConversation | null;
  question: string;
  messages: AssistantChatMessage[];
  result: RagAnswerResult | null;
  isAsking: boolean;
  errorMessage: string | null;
};

function createMessageId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createConversationId() {
  return `conversation-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createDefaultConversationTitle(ui: LocaleMessages, index: number) {
  const baseTitle = ui.assistantSidebarNewConversation;
  return index === 0 ? baseTitle : `${baseTitle} ${index + 1}`;
}

function createConversation(
  ui: LocaleMessages,
  index: number,
): AssistantConversation {
  return {
    id: createConversationId(),
    title: createDefaultConversationTitle(ui, index),
    autoTitleIndex: index,
    question: "",
    result: null,
    messages: [],
    isAsking: false,
    errorMessage: null,
  };
}

function normalizeState(state: AssistantModelState): AssistantModelState {
  const activeConversationExists = state.conversations.some(
    (conversation) => conversation.id === state.activeConversationId
  );
  const nextActiveConversationId =
    activeConversationExists
      ? state.activeConversationId
      : state.conversations[0]?.id ?? "";

  if (nextActiveConversationId === state.activeConversationId) {
    return state;
  }

  return {
    ...state,
    activeConversationId: nextActiveConversationId,
  };
}

function createSnapshot(state: AssistantModelState): AssistantModelSnapshot {
  const activeConversation =
    state.conversations.find(
      (conversation) => conversation.id === state.activeConversationId
    ) ?? state.conversations[0] ?? null;

  return {
    ...state,
    activeConversation,
    question: activeConversation?.question ?? "",
    messages: activeConversation?.messages ?? [],
    result: activeConversation?.result ?? null,
    isAsking: activeConversation?.isAsking ?? false,
    errorMessage: activeConversation?.errorMessage ?? null,
  };
}

export class AssistantModel {
  private context: AssistantModelContext;
  private state: AssistantModelState;
  private snapshot: AssistantModelSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(context: AssistantModelContext) {
    this.context = context;

    const initialConversation = createConversation(context.ui, 0);
    this.state = {
      conversations: [initialConversation],
      activeConversationId: initialConversation.id,
      isHistoryOpen: false,
      isMoreMenuOpen: false,
    };
    this.snapshot = createSnapshot(this.state);
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setContext = (context: AssistantModelContext) => {
    this.context = context;
    this.updateState((state) => {
      let changed = false;
      const nextConversations = state.conversations.map((conversation) => {
        if (conversation.autoTitleIndex === null) {
          return conversation;
        }

        const nextTitle = createDefaultConversationTitle(
          context.ui,
          conversation.autoTitleIndex,
        );
        if (conversation.title === nextTitle) {
          return conversation;
        }

        changed = true;
        return {
          ...conversation,
          title: nextTitle,
        };
      });

      if (!changed) {
        return state;
      }

      return {
        ...state,
        conversations: nextConversations,
      };
    });
  };

  readonly setQuestion = (value: string) => {
    this.updateActiveConversation((conversation) => ({
      ...conversation,
      question: value,
      errorMessage: null,
    }));
  };

  readonly handleCreateConversation = () => {
    this.updateState((state) => {
      const nextConversation = createConversation(
        this.context.ui,
        state.conversations.length,
      );
      return {
        ...state,
        conversations: [...state.conversations, nextConversation],
        activeConversationId: nextConversation.id,
        isHistoryOpen: false,
        isMoreMenuOpen: false,
      };
    });
  };

  readonly handleActivateConversation = (conversationId: string) => {
    this.updateState((state) => {
      if (
        state.activeConversationId === conversationId ||
        !state.conversations.some(
          (conversation) => conversation.id === conversationId
        )
      ) {
        return state;
      }

      return {
        ...state,
        activeConversationId: conversationId,
        isHistoryOpen: false,
        isMoreMenuOpen: false,
      };
    });
  };

  readonly handleCloseConversation = (conversationId: string) => {
    this.updateState((state) => {
      if (state.conversations.length <= 1) {
        return state;
      }

      const closedConversationIndex = state.conversations.findIndex(
        (conversation) => conversation.id === conversationId
      );
      if (closedConversationIndex < 0) {
        return state;
      }

      const nextConversations = state.conversations.filter(
        (conversation) => conversation.id !== conversationId
      );
      const nextActiveConversationId =
        state.activeConversationId === conversationId
          ? nextConversations[
              Math.min(closedConversationIndex, nextConversations.length - 1)
            ]?.id ?? nextConversations[0]?.id ?? ""
          : state.activeConversationId;

      return {
        ...state,
        conversations: nextConversations,
        activeConversationId: nextActiveConversationId,
        isHistoryOpen: false,
        isMoreMenuOpen: false,
      };
    });
  };

  readonly handleToggleHistory = () => {
    this.updateState((state) => ({
      ...state,
      isHistoryOpen: !state.isHistoryOpen,
      isMoreMenuOpen: false,
    }));
  };

  readonly handleToggleMoreMenu = () => {
    this.updateState((state) => ({
      ...state,
      isHistoryOpen: false,
      isMoreMenuOpen: !state.isMoreMenuOpen,
    }));
  };

  readonly handleAsk = async () => {
    const activeConversation = this.snapshot.activeConversation;
    if (!activeConversation) {
      return;
    }

    const normalizedQuestion = activeConversation.question.trim();
    if (!normalizedQuestion) {
      this.updateConversationById(activeConversation.id, (conversation) => ({
        ...conversation,
        errorMessage: this.context.ui.assistantSidebarQuestionRequired,
      }));
      return;
    }

    const context = this.context;
    if (!context.desktopRuntime) {
      toast.info(context.ui.toastDesktopLlmTestOnly);
      return;
    }

    const userMessage: AssistantChatMessage = {
      id: createMessageId(),
      role: "user",
      content: normalizedQuestion,
    };

    this.updateConversationById(activeConversation.id, (conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? normalizedQuestion.slice(0, 18) ||
            createDefaultConversationTitle(
              context.ui,
              conversation.autoTitleIndex ?? 0,
            )
          : conversation.title,
      autoTitleIndex: null,
      messages: [...conversation.messages, userMessage],
      question: "",
      isAsking: true,
      errorMessage: null,
    }));

    try {
      const retrievalArticles = context.isKnowledgeBaseModeEnabled
        ? context.articles
        : [];
      const fallbackWritingContext =
        context.getFallbackWritingContext?.() ?? context.fallbackWritingContext ?? '';
      const nextResult = await context.invokeDesktop("rag_answer_articles", {
        question: normalizedQuestion,
        writingContext: fallbackWritingContext.trim() || null,
        articles: retrievalArticles,
        llm: context.llmSettings,
        rag: context.ragSettings,
      });

      this.updateConversationById(activeConversation.id, (conversation) => ({
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
        context.ui,
        parseDesktopInvokeError(askError)
      );

      this.updateConversationById(activeConversation.id, (conversation) => ({
        ...conversation,
        errorMessage: localizedError,
        question: normalizedQuestion,
      }));
      toast.error(
        formatLocalized(context.ui.toastRagAnswerFailed, {
          error: localizedError,
        })
      );
    } finally {
      this.updateConversationById(activeConversation.id, (conversation) => ({
        ...conversation,
        isAsking: false,
      }));
    }
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(nextState: AssistantModelState) {
    if (Object.is(this.state, nextState)) {
      return;
    }

    this.state = nextState;
    this.snapshot = createSnapshot(this.state);
    this.emitChange();
  }

  private updateState(
    updater: (state: AssistantModelState) => AssistantModelState
  ) {
    const nextState = normalizeState(updater(this.state));
    this.setState(nextState);
  }

  private updateActiveConversation(
    updater: (
      conversation: AssistantConversation
    ) => AssistantConversation
  ) {
    const activeConversation = this.snapshot.activeConversation;
    if (!activeConversation) {
      return;
    }

    this.updateConversationById(activeConversation.id, updater);
  }

  private updateConversationById(
    conversationId: string,
    updater: (
      conversation: AssistantConversation
    ) => AssistantConversation
  ) {
    this.updateState((state) => {
      let changed = false;
      const nextConversations = state.conversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const nextConversation = updater(conversation);
        if (!Object.is(nextConversation, conversation)) {
          changed = true;
        }
        return nextConversation;
      });

      if (!changed) {
        return state;
      }

      return {
        ...state,
        conversations: nextConversations,
      };
    });
  }
}

export function createAssistantModel(context: AssistantModelContext) {
  return new AssistantModel(context);
}
