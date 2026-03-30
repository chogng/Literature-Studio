import {
  detectInitialLocale,
  toDocumentLang,
  type Locale,
} from "../../../language/i18n";

let workbenchLocale = detectInitialLocale();
const workbenchLocaleListeners = new Set<() => void>();

function emitWorkbenchLocaleChange() {
  for (const listener of workbenchLocaleListeners) {
    listener();
  }
}

export function subscribeWorkbenchLocale(listener: () => void) {
  workbenchLocaleListeners.add(listener);
  return () => {
    workbenchLocaleListeners.delete(listener);
  };
}

export function getWorkbenchLocaleSnapshot() {
  return workbenchLocale;
}

export function setWorkbenchLocale(locale: Locale) {
  if (workbenchLocale === locale) {
    return;
  }

  workbenchLocale = locale;
  emitWorkbenchLocaleChange();
}

export function syncWorkbenchDocumentLanguage() {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = toDocumentLang(workbenchLocale);
}
