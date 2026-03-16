import { type BatchSource, resolveDefaultJournalTitleFromSourceUrl } from './config-schema';
import { sanitizeUrlInput } from '../utils/url';

type ResolveNextJournalTitleOnUrlChangeParams = {
  currentJournalTitle: string;
  previousUrl: string;
  nextUrl: string;
  sourceTable?: ReadonlyArray<BatchSource>;
};

export function resolveNextJournalTitleOnUrlChange({
  currentJournalTitle,
  previousUrl,
  nextUrl,
  sourceTable,
}: ResolveNextJournalTitleOnUrlChangeParams): string {
  const previousDefaultJournalTitle = resolveDefaultJournalTitleFromSourceUrl(previousUrl, sourceTable);
  const nextDefaultJournalTitle = resolveDefaultJournalTitleFromSourceUrl(nextUrl, sourceTable);
  const currentJournalTitleTrimmed = currentJournalTitle.trim();
  const shouldReplaceJournalTitle =
    !currentJournalTitleTrimmed || currentJournalTitleTrimmed === previousDefaultJournalTitle;

  return shouldReplaceJournalTitle ? nextDefaultJournalTitle : currentJournalTitle;
}

export type ResolveAddressBarUrlChangeResult = {
  sanitizedUrl: string;
  nextJournalTitle: string;
};

export function resolveAddressBarUrlChange(
  nextUrlInput: string,
  previousUrl: string,
  currentJournalTitle: string,
): ResolveAddressBarUrlChangeResult {
  const sanitizedUrl = sanitizeUrlInput(nextUrlInput);

  return {
    sanitizedUrl,
    nextJournalTitle: resolveNextJournalTitleOnUrlChange({
      currentJournalTitle,
      previousUrl,
      nextUrl: sanitizedUrl,
    }),
  };
}
