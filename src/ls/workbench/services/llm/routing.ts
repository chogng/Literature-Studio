import type {
  LlmProviderId,
  LlmSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { getDefaultModelForProvider, getRecommendedModelForTask } from 'ls/workbench/services/llm/registry';
import type { LlmTask } from 'ls/workbench/services/llm/registry';

export type ResolvedLlmRoute = {
  provider: LlmProviderId;
  model: string;
  baseUrl: string;
  apiKey: string;
};

export function resolveLlmRoute(settings: LlmSettings, task: LlmTask): ResolvedLlmRoute {
  const provider = settings.activeProvider;
  const providerSettings = settings.providers[provider];
  const recommendedModel = getRecommendedModelForTask(provider, task)?.id;
  const model = providerSettings.model || recommendedModel || getDefaultModelForProvider(provider);

  return {
    provider,
    model,
    baseUrl: providerSettings.baseUrl,
    apiKey: providerSettings.apiKey,
  };
}
