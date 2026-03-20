import type {
  AppSettings as DesktopAppSettings,
  ElectronInvoke,
  LlmSettings,
  StoredAppSettings as DesktopStoredAppSettings,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../../language/i18n';
import {
  type BatchSource,
  defaultBatchLimit,
  defaultSameDomainOnly,
  getConfigBatchSourceSeed,
  normalizeBatchLimit,
  resolveConfigBatchSources,
} from '../config/configSchema';
import { cloneLlmSettings, createDefaultLlmSettings } from '../llm/config.js';

export type StoredAppSettingsPayload = DesktopStoredAppSettings;
export type AppSettingsPayload = DesktopAppSettings;

export type ResolvedSettingsState = {
  pdfDownloadDir: string;
  batchSources: BatchSource[];
  batchLimit: number;
  sameDomainOnly: boolean;
  useMica: boolean;
  locale: Locale | null;
  configPath: string;
  llm: LlmSettings;
};

export type SaveSettingsDraft = {
  pdfDownloadDir: string;
  batchSources: BatchSource[];
  batchLimit: number;
  sameDomainOnly: boolean;
  useMica: boolean;
  locale: Locale;
  llm: LlmSettings;
};

export type SaveSettingsPayloadBuild = {
  nextDir: string;
  nextBatchSources: BatchSource[];
  nextBatchLimit: number;
  payload: StoredAppSettingsPayload;
};

export type PartialSettingsPayload = Partial<StoredAppSettingsPayload>;
const configBatchSourceSeed = getConfigBatchSourceSeed();

export function resolveSettingsState(
  loaded: Partial<AppSettingsPayload>,
  options: { fallbackConfigPath?: string } = {},
): ResolvedSettingsState {
  const loadedLocale = loaded.locale === 'zh' || loaded.locale === 'en' ? loaded.locale : null;
  const loadedConfigPath =
    typeof loaded.configPath === 'string' ? loaded.configPath : (options.fallbackConfigPath ?? '');

  const resolvedBatchSources = resolveConfigBatchSources(loaded.defaultBatchSources, configBatchSourceSeed);

  return {
    pdfDownloadDir: typeof loaded.defaultDownloadDir === 'string' ? loaded.defaultDownloadDir : '',
    batchSources: resolvedBatchSources,
    batchLimit: normalizeBatchLimit(loaded.defaultBatchLimit, defaultBatchLimit),
    sameDomainOnly:
      typeof loaded.defaultSameDomainOnly === 'boolean'
        ? loaded.defaultSameDomainOnly
        : defaultSameDomainOnly,
    useMica: typeof loaded.useMica === 'boolean' ? loaded.useMica : true,
    locale: loadedLocale,
    configPath: loadedConfigPath,
    llm: cloneLlmSettings(loaded.llm ?? createDefaultLlmSettings()),
  };
}

export function buildSaveSettingsPayload(draft: SaveSettingsDraft): SaveSettingsPayloadBuild {
  const nextDir = draft.pdfDownloadDir.trim();
  const nextBatchSources = resolveConfigBatchSources(draft.batchSources, configBatchSourceSeed);
  const nextBatchLimit = normalizeBatchLimit(draft.batchLimit, defaultBatchLimit);

  return {
    nextDir,
    nextBatchSources,
    nextBatchLimit,
    payload: {
      defaultDownloadDir: nextDir || null,
      defaultBatchSources: nextBatchSources,
      defaultBatchLimit: nextBatchLimit,
      defaultSameDomainOnly: draft.sameDomainOnly,
      useMica: draft.useMica,
      locale: draft.locale,
      llm: cloneLlmSettings(draft.llm),
    },
  };
}

export async function loadAppSettings(
  desktopRuntime: boolean,
  invokeDesktop: ElectronInvoke,
): Promise<Partial<AppSettingsPayload>> {
  if (!desktopRuntime) return {};
  return invokeDesktop('load_settings');
}

export async function saveAppSettings(
  desktopRuntime: boolean,
  invokeDesktop: ElectronInvoke,
  payload: StoredAppSettingsPayload,
): Promise<Partial<AppSettingsPayload>> {
  if (!desktopRuntime) return payload;
  return invokeDesktop('save_settings', { settings: payload });
}

export async function saveAppSettingsPartial(
  desktopRuntime: boolean,
  invokeDesktop: ElectronInvoke,
  payload: PartialSettingsPayload,
): Promise<Partial<AppSettingsPayload>> {
  if (!desktopRuntime) return payload;
  return invokeDesktop('save_settings', { settings: payload });
}
