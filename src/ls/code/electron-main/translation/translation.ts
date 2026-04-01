import type {
  TestTranslationConnectionPayload,
  TranslationConnectionTestResult,
  TranslationProviderId,
  TranslationSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { appError, isAppError } from 'ls/base/common/errors';
import { cleanText } from 'ls/base/common/strings';
import { defaultTranslationProviderId } from 'ls/workbench/services/translation/config';
import { isTranslationProviderId } from 'ls/workbench/services/translation/registry';

// Dedicated translation API implementations live here.
// This module should stay focused on provider-specific behavior such as:
// 1. request shaping
// 2. response parsing
// 3. connection testing
// It should not own cross-provider routing, batching, or cache orchestration.
const translationTimeoutMs = 20000;

type ResolvedTranslationRequest = {
  provider: TranslationProviderId;
  apiKey: string;
  baseUrl: string;
};

type DeepLTranslationResponse = {
  translations?: Array<{
    text?: unknown;
  }>;
};

function normalizeProvider(value: unknown): TranslationProviderId {
  if (!isTranslationProviderId(value)) {
    throw appError('LLM_PROVIDER_UNSUPPORTED', {
      provider: typeof value === 'string' ? value : '',
    });
  }

  return value;
}

function normalizeBaseUrl(value: unknown): string {
  const baseUrl = cleanText(value);
  if (!baseUrl) {
    throw appError('LLM_BASE_URL_INVALID', { value: '' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw appError('LLM_BASE_URL_INVALID', { value: baseUrl });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw appError('LLM_BASE_URL_INVALID', { value: baseUrl });
  }

  return parsedUrl.toString().replace(/\/+$/, '');
}

function normalizeApiKey(value: unknown): string {
  const apiKey = cleanText(value);
  if (!apiKey) {
    throw appError('LLM_API_KEY_MISSING');
  }

  return apiKey;
}

function resolveTranslationRequest(payload: TestTranslationConnectionPayload = {}): ResolvedTranslationRequest {
  return {
    provider: normalizeProvider(payload.provider ?? defaultTranslationProviderId),
    apiKey: normalizeApiKey(payload.apiKey),
    baseUrl: normalizeBaseUrl(payload.baseUrl),
  };
}

function resolveTranslationRequestFromSettings(settings: TranslationSettings): ResolvedTranslationRequest {
  const provider = settings.activeProvider;
  const providerSettings = settings.providers[provider];

  return resolveTranslationRequest({
    provider,
    apiKey: providerSettings.apiKey,
    baseUrl: providerSettings.baseUrl,
  });
}

async function requestDeepLTranslations(
  request: ResolvedTranslationRequest,
  texts: string[],
  timeoutMs: number,
): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = new URLSearchParams();
    payload.set('target_lang', 'ZH-HANS');
    payload.set('preserve_formatting', '1');

    texts.forEach((text) => {
      payload.append('text', text);
    });

    const response = await fetch(`${request.baseUrl}/v2/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `DeepL-Auth-Key ${request.apiKey}`,
      },
      body: payload.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = cleanText(await response.text());
      throw appError('LLM_CONNECTION_FAILED', {
        provider: request.provider,
        status: response.status,
        statusText: response.statusText || errorText || 'Request failed',
      });
    }

    const payloadJson = (await response.json()) as DeepLTranslationResponse;
    const translations = Array.isArray(payloadJson.translations) ? payloadJson.translations : [];
    const resolvedTexts = translations
      .map((item) => (typeof item?.text === 'string' ? cleanText(item.text) : ''))
      .filter(Boolean);

    if (resolvedTexts.length !== texts.length) {
      throw appError('LLM_CONNECTION_FAILED', {
        provider: request.provider,
        status: 'INVALID_RESPONSE',
        statusText: `Expected ${texts.length} translations but received ${resolvedTexts.length}`,
      });
    }

    return resolvedTexts;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw appError('LLM_CONNECTION_FAILED', {
        provider: request.provider,
        status: 'TIMEOUT',
        statusText: `Connection timed out after ${timeoutMs}ms`,
      });
    }

    if (isAppError(error)) {
      throw error;
    }

    throw appError('LLM_CONNECTION_FAILED', {
      provider: request.provider,
      status: 'NETWORK_ERROR',
      statusText: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function hasUsableTranslationSettings(settings: TranslationSettings): boolean {
  const providerSettings = settings.providers[settings.activeProvider];
  return Boolean(cleanText(providerSettings.apiKey));
}

export async function translateTextsWithDedicatedApi(
  texts: string[],
  settings: TranslationSettings,
): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const request = resolveTranslationRequestFromSettings(settings);

  switch (request.provider) {
    case 'deepl':
      return requestDeepLTranslations(request, texts, translationTimeoutMs);
    default:
      throw appError('LLM_PROVIDER_UNSUPPORTED', { provider: request.provider });
  }
}

export async function testTranslationConnection(
  payload: TestTranslationConnectionPayload = {},
): Promise<TranslationConnectionTestResult> {
  const request = resolveTranslationRequest(payload);
  const [translated] = await requestDeepLTranslations(request, ['connection test'], translationTimeoutMs);

  return {
    provider: request.provider,
    baseUrl: request.baseUrl,
    responsePreview: translated || 'Connected',
  };
}
