import type {
  TranslationProviderId,
  TranslationProviderSettings,
  TranslationSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { getTranslationProviderDefinition } from 'ls/workbench/services/translation/registry';

export const defaultTranslationProviderId: TranslationProviderId = 'deepl';

export const defaultTranslationProviderSettings: Record<TranslationProviderId, TranslationProviderSettings> = {
  deepl: {
    apiKey: '',
    baseUrl: getTranslationProviderDefinition('deepl').defaultBaseUrl,
  },
};

function cloneProviderSettings(settings: TranslationProviderSettings): TranslationProviderSettings {
  return {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
  };
}

export function createDefaultTranslationSettings(): TranslationSettings {
  return {
    activeProvider: defaultTranslationProviderId,
    providers: {
      deepl: cloneProviderSettings(defaultTranslationProviderSettings.deepl),
    },
  };
}

export function cloneTranslationSettings(settings: TranslationSettings): TranslationSettings {
  return {
    activeProvider: settings.activeProvider,
    providers: {
      deepl: cloneProviderSettings(settings.providers.deepl),
    },
  };
}
