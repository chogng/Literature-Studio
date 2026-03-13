import type { Locale } from '../language/i18n';
import {
  defaultBatchLimit,
  defaultSameDomainOnly,
  normalizeBatchHomepageUrls,
  normalizeBatchLimit,
} from './batchSettings';

type DesktopInvokeArgs = Record<string, unknown> | undefined;
type InvokeDesktop = <T,>(command: string, args?: DesktopInvokeArgs) => Promise<T>;

export type StoredAppSettingsPayload = {
  defaultDownloadDir: string | null;
  defaultBatchHomepageUrls: string[];
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
  locale: Locale;
};

export type AppSettingsPayload = StoredAppSettingsPayload & {
  configPath?: string;
};

export type ResolvedSettingsState = {
  pdfDownloadDir: string;
  batchHomepageUrls: string[];
  batchLimit: number;
  sameDomainOnly: boolean;
  locale: Locale | null;
  configPath: string;
};

export type SaveSettingsDraft = {
  pdfDownloadDir: string;
  batchHomepageUrls: string[];
  batchLimit: number;
  sameDomainOnly: boolean;
  locale: Locale;
};

export type SaveSettingsPayloadBuild = {
  nextDir: string;
  nextHomepageUrls: string[];
  nextBatchLimit: number;
  payload: StoredAppSettingsPayload;
};

export type PartialSettingsPayload = Partial<StoredAppSettingsPayload>;

export function resolveSettingsState(
  loaded: Partial<AppSettingsPayload>,
  options: { fallbackConfigPath?: string } = {},
): ResolvedSettingsState {
  const loadedLocale = loaded.locale === 'zh' || loaded.locale === 'en' ? loaded.locale : null;
  const loadedConfigPath =
    typeof loaded.configPath === 'string' ? loaded.configPath : (options.fallbackConfigPath ?? '');

  return {
    pdfDownloadDir: typeof loaded.defaultDownloadDir === 'string' ? loaded.defaultDownloadDir : '',
    batchHomepageUrls: normalizeBatchHomepageUrls(loaded.defaultBatchHomepageUrls),
    batchLimit: normalizeBatchLimit(loaded.defaultBatchLimit, defaultBatchLimit),
    sameDomainOnly:
      typeof loaded.defaultSameDomainOnly === 'boolean'
        ? loaded.defaultSameDomainOnly
        : defaultSameDomainOnly,
    locale: loadedLocale,
    configPath: loadedConfigPath,
  };
}

export function buildSaveSettingsPayload(draft: SaveSettingsDraft): SaveSettingsPayloadBuild {
  const nextDir = draft.pdfDownloadDir.trim();
  const nextHomepageUrls = normalizeBatchHomepageUrls(draft.batchHomepageUrls);
  const nextBatchLimit = normalizeBatchLimit(draft.batchLimit, defaultBatchLimit);

  return {
    nextDir,
    nextHomepageUrls,
    nextBatchLimit,
    payload: {
      defaultDownloadDir: nextDir || null,
      defaultBatchHomepageUrls: nextHomepageUrls,
      defaultBatchLimit: nextBatchLimit,
      defaultSameDomainOnly: draft.sameDomainOnly,
      locale: draft.locale,
    },
  };
}

export async function loadAppSettings(
  desktopRuntime: boolean,
  invokeDesktop: InvokeDesktop,
): Promise<Partial<AppSettingsPayload>> {
  if (!desktopRuntime) return {};
  return invokeDesktop<AppSettingsPayload>('load_settings');
}

export async function saveAppSettings(
  desktopRuntime: boolean,
  invokeDesktop: InvokeDesktop,
  payload: StoredAppSettingsPayload,
): Promise<Partial<AppSettingsPayload>> {
  if (!desktopRuntime) return payload;
  return invokeDesktop<AppSettingsPayload>('save_settings', { settings: payload });
}

export async function saveAppSettingsPartial(
  desktopRuntime: boolean,
  invokeDesktop: InvokeDesktop,
  payload: PartialSettingsPayload,
): Promise<Partial<AppSettingsPayload>> {
  if (!desktopRuntime) return payload;
  return invokeDesktop<AppSettingsPayload>('save_settings', { settings: payload });
}
