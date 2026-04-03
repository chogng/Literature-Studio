import type {
  LlmProviderId,
  LlmProviderSettings,
  LlmSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import {
  getEnabledLlmModelOptionValuesForProvider,
  getLlmProviderDefinition,
  parseLlmModelOptionValue,
  serializeLlmModelOptionValue,
} from 'ls/workbench/services/llm/registry';

export const defaultLlmProviderId: LlmProviderId = 'glm';

export const defaultLlmProviderSettings: Record<LlmProviderId, LlmProviderSettings> = {
  glm: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('glm').defaultBaseUrl,
    selectedModelOption: getEnabledLlmModelOptionValuesForProvider('glm')[0] ?? '',
    enabledModelOptions: getEnabledLlmModelOptionValuesForProvider('glm'),
  },
  kimi: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('kimi').defaultBaseUrl,
    selectedModelOption: getEnabledLlmModelOptionValuesForProvider('kimi')[0] ?? '',
    enabledModelOptions: getEnabledLlmModelOptionValuesForProvider('kimi'),
  },
  deepseek: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('deepseek').defaultBaseUrl,
    selectedModelOption: getEnabledLlmModelOptionValuesForProvider('deepseek')[0] ?? '',
    enabledModelOptions: getEnabledLlmModelOptionValuesForProvider('deepseek'),
  },
  anthropic: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('anthropic').defaultBaseUrl,
    selectedModelOption: getEnabledLlmModelOptionValuesForProvider('anthropic')[0] ?? '',
    enabledModelOptions: getEnabledLlmModelOptionValuesForProvider('anthropic'),
  },
  openai: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('openai').defaultBaseUrl,
    selectedModelOption: getEnabledLlmModelOptionValuesForProvider('openai')[0] ?? '',
    enabledModelOptions: getEnabledLlmModelOptionValuesForProvider('openai'),
  },
  gemini: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('gemini').defaultBaseUrl,
    selectedModelOption: getEnabledLlmModelOptionValuesForProvider('gemini')[0] ?? '',
    enabledModelOptions: getEnabledLlmModelOptionValuesForProvider('gemini'),
  },
  custom: {
    apiKey: '',
    baseUrl: getLlmProviderDefinition('custom').defaultBaseUrl,
    selectedModelOption: getEnabledLlmModelOptionValuesForProvider('custom')[0] ?? '',
    enabledModelOptions: getEnabledLlmModelOptionValuesForProvider('custom'),
  },
};

function cloneProviderSettings(
  provider: LlmProviderId,
  settings: LlmProviderSettings,
): LlmProviderSettings {
  const enabledModelOptions = getEnabledLlmModelOptionValuesForProvider(
    provider,
    settings.enabledModelOptions,
  );
  const selectedOptionValue = settings.selectedModelOption;
  const activeOption =
    (selectedOptionValue && enabledModelOptions.includes(selectedOptionValue)
      ? parseLlmModelOptionValue(selectedOptionValue)
      : null) ??
    (enabledModelOptions[0] ? parseLlmModelOptionValue(enabledModelOptions[0]) : null);
  const selectedModelOption = activeOption
    ? serializeLlmModelOptionValue(
        provider,
        activeOption.modelId,
        activeOption.reasoningEffort,
        activeOption.serviceTier,
      )
    : '';

  return {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    selectedModelOption,
    enabledModelOptions,
    useMaxContextWindow: settings.useMaxContextWindow ?? false,
  };
}

export function createDefaultLlmSettings(): LlmSettings {
  return {
    activeProvider: defaultLlmProviderId,
    providers: {
      glm: cloneProviderSettings('glm', defaultLlmProviderSettings.glm),
      kimi: cloneProviderSettings('kimi', defaultLlmProviderSettings.kimi),
      deepseek: cloneProviderSettings('deepseek', defaultLlmProviderSettings.deepseek),
      anthropic: cloneProviderSettings('anthropic', defaultLlmProviderSettings.anthropic),
      openai: cloneProviderSettings('openai', defaultLlmProviderSettings.openai),
      gemini: cloneProviderSettings('gemini', defaultLlmProviderSettings.gemini),
      custom: cloneProviderSettings('custom', defaultLlmProviderSettings.custom),
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
      anthropic: cloneProviderSettings('anthropic', settings.providers.anthropic),
      openai: cloneProviderSettings('openai', settings.providers.openai),
      gemini: cloneProviderSettings('gemini', settings.providers.gemini),
      custom: cloneProviderSettings('custom', settings.providers.custom),
    },
  };
}

export function getLlmProviderDefaults(provider: LlmProviderId): LlmProviderSettings {
  return cloneProviderSettings(provider, defaultLlmProviderSettings[provider]);
}
