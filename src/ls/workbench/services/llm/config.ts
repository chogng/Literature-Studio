import type {
  LlmProviderId,
  LlmProviderSettings,
  LlmSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import {
  getDefaultModelForProvider,
  getLlmProviderDefinition,
} from 'ls/workbench/services/llm/registry';

export const defaultLlmProviderId: LlmProviderId = 'glm';

export const defaultLlmProviderSettings: Record<LlmProviderId, LlmProviderSettings> = {
  glm: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('glm').defaultBaseUrl,
    model: getDefaultModelForProvider('glm'),
  },
  kimi: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('kimi').defaultBaseUrl,
    model: getDefaultModelForProvider('kimi'),
  },
  deepseek: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('deepseek').defaultBaseUrl,
    model: getDefaultModelForProvider('deepseek'),
  },
};

function cloneProviderSettings(settings: LlmProviderSettings): LlmProviderSettings {
  return {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.model,
  };
}

export function createDefaultLlmSettings(): LlmSettings {
  return {
    activeProvider: defaultLlmProviderId,
    providers: {
      glm: cloneProviderSettings(defaultLlmProviderSettings.glm),
      kimi: cloneProviderSettings(defaultLlmProviderSettings.kimi),
      deepseek: cloneProviderSettings(defaultLlmProviderSettings.deepseek),
    },
  };
}

export function cloneLlmSettings(settings: LlmSettings): LlmSettings {
  return {
    activeProvider: settings.activeProvider,
    providers: {
      glm: cloneProviderSettings(settings.providers.glm),
      kimi: cloneProviderSettings(settings.providers.kimi),
      deepseek: cloneProviderSettings(settings.providers.deepseek),
    },
  };
}

export function getLlmProviderDefaults(provider: LlmProviderId): LlmProviderSettings {
  return cloneProviderSettings(defaultLlmProviderSettings[provider]);
}
