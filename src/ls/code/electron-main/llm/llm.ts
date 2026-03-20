import type {
  LlmConnectionTestResult,
  LlmProviderId,
  TestLlmConnectionPayload,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import { appError, isAppError } from '../../../base/common/errors.js';
import { cleanText } from '../../../base/common/strings.js';
import { defaultLlmProviderId } from '../../../workbench/services/llm/config.js';
import { isLlmProviderId } from '../../../workbench/services/llm/registry.js';

const llmTestTimeoutMs = 15000;

function normalizeProvider(value: unknown): LlmProviderId {
  if (!isLlmProviderId(value)) {
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

function normalizeModel(value: unknown): string {
  const model = cleanText(value);
  if (!model) {
    throw appError('LLM_MODEL_MISSING');
  }

  return model;
}

function extractResponsePreview(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Connected';
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    const cleaned = cleanText(content).replace(/\s+/g, ' ');
    return cleaned || 'Connected';
  }

  return 'Connected';
}

export async function testLlmConnection(
  payload: TestLlmConnectionPayload = {},
): Promise<LlmConnectionTestResult> {
  const provider = normalizeProvider(payload.provider ?? defaultLlmProviderId);
  const apiKey = normalizeApiKey(payload.apiKey);
  const baseUrl = normalizeBaseUrl(payload.baseUrl);
  const model = normalizeModel(payload.model);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, llmTestTimeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: 'Reply with OK only.',
          },
        ],
        max_tokens: 8,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = cleanText(await response.text());
      throw appError('LLM_CONNECTION_FAILED', {
        provider,
        status: response.status,
        statusText: response.statusText || errorText || 'Request failed',
      });
    }

    const responseJson = (await response.json()) as unknown;
    return {
      provider,
      model,
      baseUrl,
      responsePreview: extractResponsePreview(responseJson),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw appError('LLM_CONNECTION_FAILED', {
        provider,
        status: 'TIMEOUT',
        statusText: `Connection timed out after ${llmTestTimeoutMs}ms`,
      });
    }

    if (isAppError(error)) {
      throw error;
    }

    throw appError('LLM_CONNECTION_FAILED', {
      provider,
      status: 'NETWORK_ERROR',
      statusText: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
