import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';

export type LocalizationUiAction = {
  type: 'SET_DISPLAY_LANGUAGE';
  locale: Locale;
};

export type DisplayLanguageOption = {
  value: Locale;
  label: string;
};

type LocalizationUiActionListener = (action: LocalizationUiAction) => void;

const listeners = new Set<LocalizationUiActionListener>();

function emitLocalizationUiAction(action: LocalizationUiAction) {
  for (const listener of listeners) {
    listener(action);
  }
}

export function subscribeLocalizationUiActions(
  listener: LocalizationUiActionListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestSetDisplayLanguage(locale: Locale) {
  emitLocalizationUiAction({
    type: 'SET_DISPLAY_LANGUAGE',
    locale,
  });
}

export function createDisplayLanguageOptions(
  labels: Pick<LocaleMessages, 'languageChinese' | 'languageEnglish'>,
): DisplayLanguageOption[] {
  return [
    {
      value: 'zh',
      label: labels.languageChinese,
    },
    {
      value: 'en',
      label: labels.languageEnglish,
    },
  ];
}
