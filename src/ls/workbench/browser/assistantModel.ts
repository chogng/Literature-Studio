import { useCallback, useState } from 'react';
import { toast } from '../../base/browser/ui/toast/toast';
import type {
  Article,
  ElectronInvoke,
  LlmSettings,
  RagAnswerResult,
  RagSettings,
} from '../../base/parts/sandbox/common/desktopTypes.js';
import type { LocaleMessages } from '../../../language/locales';
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from '../services/desktop/desktopError';

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
      role: 'user';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      content: string;
      result: RagAnswerResult;
    };

export function useAssistantModel({
  desktopRuntime,
  invokeDesktop,
  ui,
  isKnowledgeBaseModeEnabled,
  articles,
  llmSettings,
  ragSettings,
  fallbackWritingContext = '',
}: UseAssistantModelParams) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<RagAnswerResult | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMessageId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const handleAsk = useCallback(async () => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      setErrorMessage(ui.assistantSidebarQuestionRequired);
      return;
    }

    if (!isKnowledgeBaseModeEnabled) {
      setErrorMessage(ui.assistantSidebarDescriptionDisabled);
      return;
    }

    if (articles.length === 0) {
      setErrorMessage(ui.assistantSidebarNoArticles);
      return;
    }

    if (!desktopRuntime) {
      toast.info(ui.toastDesktopLlmTestOnly);
      return;
    }

    const userMessage: AssistantChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: normalizedQuestion,
    };

    setMessages((previousMessages) => [...previousMessages, userMessage]);
    setQuestion('');
    setIsAsking(true);
    setErrorMessage(null);

    try {
      const nextResult = await invokeDesktop('rag_answer_articles', {
        question: normalizedQuestion,
        writingContext: fallbackWritingContext.trim() || null,
        articles,
        llm: llmSettings,
        rag: ragSettings,
      });
      setResult(nextResult);
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: createMessageId(),
          role: 'assistant',
          content: nextResult.answer,
          result: nextResult,
        },
      ]);
    } catch (askError) {
      const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(askError));
      setErrorMessage(localizedError);
      toast.error(formatLocalized(ui.toastRagAnswerFailed, { error: localizedError }));
      setQuestion(normalizedQuestion);
    } finally {
      setIsAsking(false);
    }
  }, [
    articles,
    desktopRuntime,
    invokeDesktop,
    isKnowledgeBaseModeEnabled,
    llmSettings,
    question,
    ragSettings,
    ui,
    fallbackWritingContext,
  ]);

  return {
    question,
    setQuestion,
    messages,
    result,
    isAsking,
    errorMessage,
    handleAsk,
  };
}
