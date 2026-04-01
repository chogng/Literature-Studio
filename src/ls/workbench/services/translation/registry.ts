import type { TranslationProviderId } from 'ls/base/parts/sandbox/common/desktopTypes.js';

export type TranslationApiStyle = 'deepl-compatible';

export type TranslationProviderDefinition = {
  id: TranslationProviderId;
  label: string;
  apiStyle: TranslationApiStyle;
  defaultBaseUrl: string;
};

export const translationProviders: ReadonlyArray<TranslationProviderDefinition> = [
  {
    id: 'deepl',
    label: 'DeepL',
    apiStyle: 'deepl-compatible',
    defaultBaseUrl: 'https://api-free.deepl.com',
  },
];

export const translationProviderIds: TranslationProviderId[] = translationProviders.map((provider) => provider.id);

export function isTranslationProviderId(value: unknown): value is TranslationProviderId {
  return typeof value === 'string' && translationProviderIds.includes(value as TranslationProviderId);
}

export function getTranslationProviderDefinition(providerId: TranslationProviderId): TranslationProviderDefinition {
  const provider = translationProviders.find((item) => item.id === providerId);
  if (!provider) {
    throw new Error(`Unknown translation provider: ${providerId}`);
  }

  return provider;
}
