import type { LlmModelDefinition } from 'ls/workbench/services/llm/types';
import anthropic from 'ls/workbench/services/llm/models/anthropic';
import custom from 'ls/workbench/services/llm/models/custom';
import deepseek from 'ls/workbench/services/llm/models/deepseek';
import gemini from 'ls/workbench/services/llm/models/gemini';
import glm from 'ls/workbench/services/llm/models/glm';
import kimi from 'ls/workbench/services/llm/models/kimi';
import openai from 'ls/workbench/services/llm/models/openai';

const providerModelGroups = [
  glm,
  kimi,
  deepseek,
  anthropic,
  openai,
  gemini,
  custom,
] as const;

export {
  anthropic,
  custom,
  deepseek,
  gemini,
  glm,
  kimi,
  openai,
};

export const llmModels: ReadonlyArray<LlmModelDefinition> = providerModelGroups.flat();
