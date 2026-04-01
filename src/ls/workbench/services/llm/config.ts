import type {
  LlmProviderId,
  LlmProviderSettings,
  LlmSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import {
  getEnabledLlmModelIdsForProvider,
  getDefaultModelForProvider,
  getLlmProviderDefinition,
} from 'ls/workbench/services/llm/registry';

export const defaultLlmProviderId: LlmProviderId = 'glm';

export const defaultLlmProviderSettings: Record<LlmProviderId, LlmProviderSettings> = {
  glm: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('glm').defaultBaseUrl,
    model: getDefaultModelForProvider('glm'),
    enabledModels: getEnabledLlmModelIdsForProvider('glm'),
  },
  kimi: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('kimi').defaultBaseUrl,
    model: getDefaultModelForProvider('kimi'),
    enabledModels: getEnabledLlmModelIdsForProvider('kimi'),
  },
  deepseek: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('deepseek').defaultBaseUrl,
    model: getDefaultModelForProvider('deepseek'),
    enabledModels: getEnabledLlmModelIdsForProvider('deepseek'),
  },
};

function cloneProviderSettings(
  provider: LlmProviderId,
  settings: LlmProviderSettings,
): LlmProviderSettings {
  const enabledModels = getEnabledLlmModelIdsForProvider(
    provider,
    settings.enabledModels,
  );
  const model = enabledModels.includes(settings.model)
    ? settings.model
    : (enabledModels[0] ?? getDefaultModelForProvider(provider));

  return {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model,
    enabledModels,
  };
}

export function createDefaultLlmSettings(): LlmSettings {
  return {
    activeProvider: defaultLlmProviderId,
    providers: {
      glm: cloneProviderSettings('glm', defaultLlmProviderSettings.glm),
      kimi: cloneProviderSettings('kimi', defaultLlmProviderSettings.kimi),
      deepseek: cloneProviderSettings('deepseek', defaultLlmProviderSettings.deepseek),
    },
  };
}

export function cloneLlmSettings(settings: LlmSettings): LlmSettings {
  return {
    activeProvider: settings.activeProvider,
    providers: {
      glm: cloneProviderSettings('glm', settings.providers.glm),
      kimi: cloneProviderSettings('kimi', settings.providers.kimi),
      deepseek: cloneProviderSettings('deepseek', settings.providers.deepseek),
    },
  };
}

export function getLlmProviderDefaults(provider: LlmProviderId): LlmProviderSettings {
  return cloneProviderSettings(provider, defaultLlmProviderSettings[provider]);
}
