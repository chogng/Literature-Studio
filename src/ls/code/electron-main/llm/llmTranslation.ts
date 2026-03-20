import type { LlmProviderId, LlmSettings } from '../../../base/parts/sandbox/common/desktopTypes.js';
import { appError } from '../../../base/common/errors.js';
import { cleanText } from '../../../base/common/strings.js';
import {
  extractResponseContent,
  requestChatCompletion,
  resolveLlmRequestFromPayload,
} from './llm.js';

const llmTranslationTimeoutMs = 45000;
const maxTranslationBatchItems = 8;
const maxTranslationBatchChars = 12000;

type TranslationBatchResponse = {
  translations?: Array<{
    index?: unknown;
    text?: unknown;
  }>;
};

function resolveLlmRequestFromSettings(settings: LlmSettings) {
  const provider = settings.activeProvider;
  const providerSettings = settings.providers[provider];

  return resolveLlmRequestFromPayload({
    provider,
    apiKey: providerSettings.apiKey,
    baseUrl: providerSettings.baseUrl,
    model: providerSettings.model,
  });
}

function parseJsonText<T>(value: string): T {
  const cleaned = cleanText(value);
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] ?? cleaned;
  return JSON.parse(candidate) as T;
}

function buildTranslationBatches(texts: string[]) {
  const batches: Array<Array<{ index: number; text: string }>> = [];
  let currentBatch: Array<{ index: number; text: string }> = [];
  let currentChars = 0;

  texts.forEach((text, index) => {
    const itemChars = text.length;
    const shouldFlush =
      currentBatch.length > 0 &&
      (currentBatch.length >= maxTranslationBatchItems || currentChars + itemChars > maxTranslationBatchChars);

    if (shouldFlush) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }

    currentBatch.push({ index, text });
    currentChars += itemChars;
  });

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

function normalizeTranslationBatch(
  responseText: string,
  batch: Array<{ index: number; text: string }>,
  provider: LlmProviderId,
) {
  let parsed: TranslationBatchResponse;
  try {
    parsed = parseJsonText<TranslationBatchResponse>(responseText);
  } catch (error) {
    throw appError('LLM_CONNECTION_FAILED', {
      provider,
      status: 'INVALID_RESPONSE',
      statusText: error instanceof Error ? error.message : 'Translation JSON parse failed',
    });
  }

  const rawTranslations = Array.isArray(parsed.translations) ? parsed.translations : [];
  const translatedByIndex = new Map<number, string>();

  rawTranslations.forEach((item) => {
    const index = Number(item?.index);
    const text = cleanText(item?.text);
    if (Number.isInteger(index) && text) {
      translatedByIndex.set(index, text);
    }
  });

  const missingItem = batch.find((item) => !translatedByIndex.has(item.index));
  if (missingItem) {
    throw appError('LLM_CONNECTION_FAILED', {
      provider,
      status: 'INVALID_RESPONSE',
      statusText: `Missing translation for item ${missingItem.index}`,
    });
  }

  return batch.map((item) => translatedByIndex.get(item.index) || item.text);
}

export async function translateTextsToChinese(texts: string[], settings: LlmSettings): Promise<string[]> {
  const normalizedTexts = texts.map((text) => cleanText(text));
  if (normalizedTexts.length === 0) {
    return [];
  }

  const request = resolveLlmRequestFromSettings(settings);
  const translatedTexts = [...normalizedTexts];
  const batches = buildTranslationBatches(normalizedTexts);

  for (const batch of batches) {
    const responseJson = await requestChatCompletion(
      request,
      {
        model: request.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a precise scientific translator. Translate each input text into concise, fluent Simplified Chinese. Preserve meaning, terminology, numbers, and line breaks. Return JSON only.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'Translate each item into Simplified Chinese.',
              output: {
                format: 'JSON object',
                schema: {
                  translations: [{ index: 0, text: 'translated text' }],
                },
              },
              rules: [
                'Keep the same index values.',
                'Do not omit any item.',
                'Do not add explanations or markdown.',
                'If the source text is already Chinese, return a polished Simplified Chinese version.',
              ],
              items: batch,
            }),
          },
        ],
        max_tokens: 4000,
        temperature: 0,
      },
      llmTranslationTimeoutMs,
    );
    const responseText = extractResponseContent(responseJson);
    const batchTranslations = normalizeTranslationBatch(responseText, batch, request.provider);

    batch.forEach((item, index) => {
      translatedTexts[item.index] = batchTranslations[index];
    });
  }

  return translatedTexts;
}
