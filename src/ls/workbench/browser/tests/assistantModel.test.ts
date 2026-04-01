import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Article,
  ElectronInvoke,
  LlmSettings,
  RagAnswerResult,
  RagSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { createAssistantModel } from 'ls/workbench/browser/assistantModel';
import { locales } from 'language/locales';

function createInvokeDesktop(): ElectronInvoke {
  return (async () =>
    ({
      answer: 'ok',
      evidence: [],
      provider: 'moark',
      llmProvider: 'glm',
      llmModel: 'test-model',
      embeddingModel: 'test-embedding',
      rerankerModel: 'test-reranker',
      rerankApplied: false,
    }) satisfies RagAnswerResult) as ElectronInvoke;
}

function createAssistantContext(locale: 'zh' | 'en') {
  return {
    desktopRuntime: true,
    invokeDesktop: createInvokeDesktop(),
    ui: locales[locale],
    isKnowledgeBaseModeEnabled: false,
    articles: [] as Article[],
    llmSettings: {} as LlmSettings,
    ragSettings: {} as RagSettings,
  };
}

test('new conversations use the active locale title', () => {
  const assistantModel = createAssistantModel(createAssistantContext('en'));

  const initialSnapshot = assistantModel.getSnapshot();
  assert.equal(initialSnapshot.conversations[0]?.title, 'New chat');

  assistantModel.handleCreateConversation();

  const nextSnapshot = assistantModel.getSnapshot();
  assert.equal(nextSnapshot.conversations[1]?.title, 'New chat 2');
});

test('locale switches update only auto-generated conversation titles', async () => {
  const assistantModel = createAssistantModel(createAssistantContext('zh'));

  assistantModel.handleCreateConversation();
  assistantModel.handleCreateConversation();

  assistantModel.handleActivateConversation(
    assistantModel.getSnapshot().conversations[1]!.id,
  );
  assistantModel.setQuestion('A custom title from the first question');

  await assistantModel.handleAsk();
  assert.equal(assistantModel.getSnapshot().conversations[1]?.title, 'A custom title fro');

  assistantModel.setContext(createAssistantContext('en'));

  const snapshot = assistantModel.getSnapshot();
  assert.equal(snapshot.conversations[0]?.title, 'New chat');
  assert.equal(snapshot.conversations[1]?.title, 'A custom title fro');
  assert.equal(snapshot.conversations[2]?.title, 'New chat 3');
});
