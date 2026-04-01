import en from 'language/locales/en';
import zh from 'language/locales/zh';

export type LocaleMessages = {
  [Key in keyof typeof zh]: string;
};

export const locales: Record<'zh' | 'en', LocaleMessages> = {
  zh,
  en,
};
