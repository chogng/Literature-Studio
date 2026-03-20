import type { LlmProviderId } from '../../../base/parts/sandbox/common/desktopTypes.js';

export type LlmApiStyle = 'openai-compatible';
export type LlmTask = 'chat' | 'summary' | 'reasoning';
export type LlmModelCapability = 'chat' | 'reasoning' | 'fast' | 'long-context';

export type LlmProviderDefinition = {
  id: LlmProviderId;
  label: string;
  apiStyle: LlmApiStyle;
  defaultBaseUrl: string;
};

export type LlmModelDefinition = {
  id: string;
  label: string;
  provider: LlmProviderId;
  apiStyle: LlmApiStyle;
  capabilities: LlmModelCapability[];
  recommendedFor: LlmTask[];
  enabled: boolean;
};

export const llmProviders: ReadonlyArray<LlmProviderDefinition> = [
  {
    id: 'glm',
    label: 'GLM',
    apiStyle: 'openai-compatible',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  },
  {
    id: 'kimi',
    label: 'Kimi',
    apiStyle: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiStyle: 'openai-compatible',
    defaultBaseUrl: 'https://api.deepseek.com',
  },
];

export const llmProviderIds: LlmProviderId[] = llmProviders.map((provider) => provider.id);

export const llmModels: ReadonlyArray<LlmModelDefinition> = [
  {
    id: 'glm-4.6',
    label: 'GLM-4.6',
    provider: 'glm',
    apiStyle: 'openai-compatible',
    capabilities: ['chat', 'reasoning'],
    recommendedFor: ['chat', 'reasoning', 'summary'],
    enabled: true,
  },
  {
    id: 'glm-4.5-air',
    label: 'GLM-4.5-Air',
    provider: 'glm',
    apiStyle: 'openai-compatible',
    capabilities: ['chat', 'fast'],
    recommendedFor: ['chat', 'summary'],
    enabled: true,
  },
  {
    id: 'kimi-thinking-preview',
    label: 'Kimi Thinking Preview',
    provider: 'kimi',
    apiStyle: 'openai-compatible',
    capabilities: ['chat', 'reasoning', 'long-context'],
    recommendedFor: ['reasoning', 'summary'],
    enabled: true,
  },
  {
    id: 'moonshot-v1-8k',
    label: 'Moonshot V1 8K',
    provider: 'kimi',
    apiStyle: 'openai-compatible',
    capabilities: ['chat', 'fast'],
    recommendedFor: ['chat'],
    enabled: true,
  },
  {
    id: 'deepseek-chat',
    label: 'DeepSeek Chat',
    provider: 'deepseek',
    apiStyle: 'openai-compatible',
    capabilities: ['chat', 'fast'],
    recommendedFor: ['chat', 'summary'],
    enabled: true,
  },
  {
    id: 'deepseek-reasoner',
    label: 'DeepSeek Reasoner',
    provider: 'deepseek',
    apiStyle: 'openai-compatible',
    capabilities: ['chat', 'reasoning'],
    recommendedFor: ['reasoning'],
    enabled: true,
  },
];

export function isLlmProviderId(value: unknown): value is LlmProviderId {
  return typeof value === 'string' && llmProviderIds.includes(value as LlmProviderId);
}

export function getLlmProviderDefinition(providerId: LlmProviderId): LlmProviderDefinition {
  const provider = llmProviders.find((item) => item.id === providerId);
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerId}`);
  }

  return provider;
}

export function getLlmModelsForProvider(providerId: LlmProviderId): LlmModelDefinition[] {
  return llmModels.filter((model) => model.provider === providerId && model.enabled);
}

export function getDefaultModelForProvider(providerId: LlmProviderId): string {
  const providerModels = getLlmModelsForProvider(providerId);
  return providerModels[0]?.id ?? '';
}

export function getRecommendedModelForTask(
  providerId: LlmProviderId,
  task: LlmTask,
): LlmModelDefinition | null {
  const exactMatch =
    getLlmModelsForProvider(providerId).find((model) => model.recommendedFor.includes(task)) ?? null;
  return exactMatch;
}
