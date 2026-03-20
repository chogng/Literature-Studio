import type {
  LlmProviderId,
  LlmSettings,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import {
  getDefaultModelForProvider,
  getRecommendedModelForTask,
  type LlmTask,
} from './registry.js';

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
