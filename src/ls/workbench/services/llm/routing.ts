import type {
  LlmProviderId,
  LlmSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import {
  getDefaultModelForProvider,
  getEnabledLlmModelIdsForProvider,
  getRecommendedModelForTask,
} from 'ls/workbench/services/llm/registry';
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
  const enabledModelIds = getEnabledLlmModelIdsForProvider(
    provider,
    providerSettings.enabledModels,
  );
  const enabledModelIdSet = new Set(enabledModelIds);
  const recommendedModelId = getRecommendedModelForTask(provider, task)?.id;
  const recommendedModel =
    recommendedModelId && enabledModelIdSet.has(recommendedModelId)
      ? recommendedModelId
      : null;
  const model =
    (providerSettings.model && enabledModelIdSet.has(providerSettings.model)
      ? providerSettings.model
      : null) ??
    recommendedModel ??
    enabledModelIds[0] ??
    getDefaultModelForProvider(provider);

  return {
    provider,
    model,
    baseUrl: providerSettings.baseUrl,
    apiKey: providerSettings.apiKey,
  };
}
