import { locales, type LocaleMessages } from './locales';

export type Locale = keyof typeof locales;

export const localeStorageKey = 'journal-reader-locale';

function parseLocale(value: string | null): Locale | null {
  if (value === 'zh' || value === 'en') return value;
  return null;
}

export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';

  const stored = parseLocale(window.localStorage.getItem(localeStorageKey));
  if (stored) return stored;

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith('zh')) return 'zh';
  return 'en';
}

export function toDocumentLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en';
}

export function getLocaleMessages(locale: Locale): LocaleMessages {
  return locales[locale];
}
