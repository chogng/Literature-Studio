import type { ElectronInvoke } from 'ls/base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../../../language/i18n';

export type LocaleServiceContext = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
};

export interface ILocaleService {
  subscribe(listener: () => void): () => void;
  getLocale(): Locale;
  applyLocale(locale: Locale): void;
  updateLocalePreference(
    locale: Locale,
    context: LocaleServiceContext,
  ): Promise<void>;
  syncDocumentLanguage(): void;
  initialize(context: LocaleServiceContext): Promise<Locale>;
}
