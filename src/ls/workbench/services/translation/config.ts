import type {
  TranslationProviderId,
  TranslationProviderSettings,
  TranslationSettings,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import { getTranslationProviderDefinition } from './registry.js';

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
