import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { AppSettings, BatchSource, StoredAppSettings } from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { StorageService } from '../common/storage.js';
import { cleanText } from '../../../base/common/strings.js';
import {
  batchLimitMax,
  batchLimitMin,
  defaultBatchLimit,
  defaultSameDomainOnly,
} from '../../config/common/defaultBatchSources.js';
import {
  createDefaultLlmSettings,
  defaultLlmProviderSettings,
} from '../../../workbench/services/llm/config.js';
import {
  getDefaultModelForProvider,
  isLlmModelIdForProvider,
  isLlmProviderId,
} from '../../../workbench/services/llm/registry.js';
import {
  createDefaultTranslationSettings,
  defaultTranslationProviderSettings,
} from '../../../workbench/services/translation/config.js';
import { isTranslationProviderId } from '../../../workbench/services/translation/registry.js';

type ConfigStore = Pick<StorageService, 'loadSettings' | 'saveSettings'>;
const fallbackLocale: 'zh' | 'en' = 'zh';

type ConfigStoreOptions = {
  defaultLocale?: 'zh' | 'en';
  defaultBatchSources?: ReadonlyArray<BatchSource>;
};

async function readJson<T>(filePath: string, fallbackValue: T) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallbackValue;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(serializeConfigValue(value), null, 2), 'utf8');
}

function serializeConfigValue(value: unknown) {
  if (!value || typeof value !== 'object' || !('llm' in value) || !('translation' in value)) {
    return value;
  }

  const settings = value as StoredAppSettings;
  const serializedBatchSources = settings.defaultBatchSources.map((source) => ({
    id: source.id,
    url: source.url,
    journalTitle: source.journalTitle,
  }));
  const serializedProviders = Object.fromEntries(
    Object.entries(settings.llm.providers)
      .filter(([, provider]) => cleanText(provider.apiKey))
      .map(([providerId, provider]) => [
        providerId,
        {
          apiKey: provider.apiKey,
          model: provider.model,
        },
      ]),
  );
  const serializedTranslationProviders = Object.fromEntries(
    Object.entries(settings.translation.providers)
      .filter(([, provider]) => cleanText(provider.apiKey))
      .map(([providerId, provider]) => [
        providerId,
        {
          apiKey: provider.apiKey,
        },
      ]),
  );

  return {
    ...settings,
    defaultBatchSources: serializedBatchSources,
    llm: {
      ...settings.llm,
      providers: serializedProviders,
    },
    translation: {
      ...settings.translation,
      providers: serializedTranslationProviders,
    },
  };
}

function normalizeLocale(value: unknown, defaultLocale: 'zh' | 'en'): 'zh' | 'en' {
  if (value === 'zh' || value === 'en') {
    return value;
  }

  return defaultLocale;
}

function buildSourceId(seed: unknown, index: number) {
  const cleaned = cleanText(seed);
  if (cleaned) return cleaned;

  return String(index + 1);
}

function normalizePreferredExtractorId(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function cloneBatchSources(input: ReadonlyArray<BatchSource>): BatchSource[] {
  return input
    .map((item, index) => {
      const url = cleanText(item?.url);
      return {
        id: buildSourceId(item?.id, index),
        url,
        journalTitle: cleanText(item?.journalTitle),
        preferredExtractorId: normalizePreferredExtractorId(item?.preferredExtractorId),
      };
    })
    .filter((source) => source.url);
}

function normalizeBatchSources(
  payload: Partial<StoredAppSettings>,
  fallbackBatchSources: ReadonlyArray<BatchSource>,
): BatchSource[] {
  if (!Array.isArray(payload.defaultBatchSources)) {
    return cloneBatchSources(fallbackBatchSources);
  }

  const fallbackByUrl = new Map<string, BatchSource>();
  for (const source of fallbackBatchSources) {
    if (!source.url || fallbackByUrl.has(source.url)) {
      continue;
    }
    fallbackByUrl.set(source.url, source);
  }

  const fromStructured = payload.defaultBatchSources.map((item, index) => {
    const url = cleanText(item?.url);
    const fallbackSource = fallbackByUrl.get(url);
    return {
      id: buildSourceId(item?.id ?? fallbackSource?.id, index),
      url,
      journalTitle: cleanText(item?.journalTitle) || cleanText(fallbackSource?.journalTitle),
      preferredExtractorId: normalizePreferredExtractorId(
        item?.preferredExtractorId ?? fallbackSource?.preferredExtractorId,
      ),
    };
  });
  const normalized = fromStructured.filter((source) => source.url);
  const deduped = new Map<string, BatchSource>();

  for (const source of normalized) {
    const existing = deduped.get(source.url);
    if (!existing) {
      deduped.set(source.url, source);
      continue;
    }
    if (!existing.journalTitle && source.journalTitle) {
      deduped.set(source.url, source);
      continue;
    }
    if (!existing.id && source.id) {
      deduped.set(source.url, source);
      continue;
    }
    if (!existing.preferredExtractorId && source.preferredExtractorId) {
      deduped.set(source.url, source);
    }
  }

  return [...deduped.values()];
}

function normalizeSettings(
  payload: Partial<StoredAppSettings> = {},
  defaultLocale: 'zh' | 'en',
  fallbackBatchSources: ReadonlyArray<BatchSource>,
): StoredAppSettings {
  const downloadDir = typeof payload.defaultDownloadDir === 'string' ? cleanText(payload.defaultDownloadDir) : '';
  const normalizedBatchSources = normalizeBatchSources(payload, fallbackBatchSources);
  const parsedLimit = Number.parseInt(String(payload.defaultBatchLimit), 10);
  const normalizedLimit = Number.isNaN(parsedLimit)
    ? defaultBatchLimit
    : Math.min(batchLimitMax, Math.max(batchLimitMin, parsedLimit));

  return {
    defaultDownloadDir: downloadDir || null,
    defaultBatchSources: normalizedBatchSources,
    defaultBatchLimit: normalizedLimit,
    defaultSameDomainOnly:
      typeof payload.defaultSameDomainOnly === 'boolean'
        ? payload.defaultSameDomainOnly
        : defaultSameDomainOnly,
    useMica: typeof payload.useMica === 'boolean' ? payload.useMica : true,
    locale: normalizeLocale(payload.locale, defaultLocale),
    llm: normalizeLlmSettings(payload.llm),
    translation: normalizeTranslationSettings(payload.translation),
  };
}

function normalizeLlmSettings(payload: unknown): StoredAppSettings['llm'] {
  const defaults = createDefaultLlmSettings();
  const llmPayload =
    payload && typeof payload === 'object' ? (payload as Partial<StoredAppSettings['llm']>) : {};
  const activeProvider = isLlmProviderId(llmPayload.activeProvider)
    ? llmPayload.activeProvider
    : defaults.activeProvider;
  const providersPayload: Partial<Record<keyof StoredAppSettings['llm']['providers'], unknown>> =
    llmPayload.providers && typeof llmPayload.providers === 'object' ? llmPayload.providers : {};

  return {
    activeProvider,
    providers: {
      glm: normalizeLlmProviderSettings('glm', providersPayload.glm),
      kimi: normalizeLlmProviderSettings('kimi', providersPayload.kimi),
      deepseek: normalizeLlmProviderSettings('deepseek', providersPayload.deepseek),
    },
  };
}

function normalizeLlmProviderSettings(
  provider: keyof StoredAppSettings['llm']['providers'],
  payload: unknown,
) {
  const defaults = defaultLlmProviderSettings[provider];
  const providerPayload =
    payload && typeof payload === 'object'
      ? (payload as Partial<StoredAppSettings['llm']['providers'][typeof provider]>)
      : {};

  return {
    apiKey: cleanText(providerPayload.apiKey),
    baseUrl: defaults.baseUrl,
    model: normalizeLlmModel(provider, providerPayload.model) || defaults.model,
  };
}

function normalizeLlmModel(
  provider: keyof StoredAppSettings['llm']['providers'],
  value: unknown,
): string {
  const model = cleanText(value);
  if (!model) {
    return getDefaultModelForProvider(provider);
  }

  return isLlmModelIdForProvider(provider, model) ? model : getDefaultModelForProvider(provider);
}

function normalizeTranslationSettings(payload: unknown): StoredAppSettings['translation'] {
  const defaults = createDefaultTranslationSettings();
  const translationPayload =
    payload && typeof payload === 'object' ? (payload as Partial<StoredAppSettings['translation']>) : {};
  const activeProvider = isTranslationProviderId(translationPayload.activeProvider)
    ? translationPayload.activeProvider
    : defaults.activeProvider;
  const providersPayload:
    Partial<Record<keyof StoredAppSettings['translation']['providers'], unknown>> =
      translationPayload.providers && typeof translationPayload.providers === 'object'
        ? translationPayload.providers
        : {};

  return {
    activeProvider,
    providers: {
      deepl: normalizeTranslationProviderSettings('deepl', providersPayload.deepl),
    },
  };
}

function normalizeTranslationProviderSettings(
  provider: keyof StoredAppSettings['translation']['providers'],
  payload: unknown,
) {
  const defaults = defaultTranslationProviderSettings[provider];
  const providerPayload =
    payload && typeof payload === 'object'
      ? (payload as Partial<StoredAppSettings['translation']['providers'][typeof provider]>)
      : {};

  return {
    apiKey: cleanText(providerPayload.apiKey),
    baseUrl: defaults.baseUrl,
  };
}

function attachConfigPath(settings: StoredAppSettings, configPath: string): AppSettings {
  return {
    ...settings,
    configPath,
  };
}

export function createConfigStore(configFile: string, options: ConfigStoreOptions = {}): ConfigStore {
  const defaultLocale = options.defaultLocale === 'en' ? 'en' : fallbackLocale;
  const fallbackBatchSources = cloneBatchSources(options.defaultBatchSources ?? []);

  async function readSettings() {
    const payload = await readJson<Partial<StoredAppSettings>>(configFile, {});
    const normalized = normalizeSettings(payload, defaultLocale, fallbackBatchSources);
    if (!Array.isArray(payload.defaultBatchSources)) {
      try {
        await writeJson(configFile, normalized);
      } catch {
        // ignore write failures on lazy defaults hydration
      }
    }
    return attachConfigPath(normalized, configFile);
  }

  return {
    async loadSettings() {
      return readSettings();
    },

    async saveSettings(settings = {}) {
      const current = await readSettings();
      const { configPath: _configPath, ...currentStored } = current;
      const saved = normalizeSettings({ ...currentStored, ...settings }, defaultLocale, fallbackBatchSources);
      await writeJson(configFile, saved);
      return attachConfigPath(saved, configFile);
    },
  };
}
