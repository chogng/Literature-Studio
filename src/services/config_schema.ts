import articleList from '../data/article-list';
import {
  type BatchSource,
  normalizeBatchSources,
} from './batchSettings';
import { syncConfiguredArticleList } from './sourceTable';

export type ConfigBatchSourceEntry = BatchSource;
export type ConfigBatchSourceList = BatchSource[];
export type ConfigBatchSourceFallback = ReadonlyArray<BatchSource>;

export type ConfigBatchSourceResolution = {
  batchSources: ConfigBatchSourceList;
};

const configBatchSourceSeed: ReadonlyArray<BatchSource> = articleList.map((source) => ({
  id: String(source.id),
  url: source.url,
  journalTitle: source.journalTitle,
}));

export function getConfigBatchSourceSeed(): ConfigBatchSourceList {
  return configBatchSourceSeed.map((source) => ({
    id: source.id,
    url: source.url,
    journalTitle: source.journalTitle,
  }));
}

function createConfigBatchSourceResolution(
  input: unknown,
  fallback: ConfigBatchSourceFallback = configBatchSourceSeed,
): ConfigBatchSourceResolution {
  return {
    batchSources: normalizeBatchSources(input, fallback),
  };
}

export function resolveConfigBatchSources(
  input: unknown,
  fallback: ConfigBatchSourceFallback = configBatchSourceSeed,
): ConfigBatchSourceList {
  return createConfigBatchSourceResolution(input, fallback).batchSources;
}

export function syncConfiguredArticleListFromConfig(
  input: unknown,
  fallback: ConfigBatchSourceFallback = configBatchSourceSeed,
): ConfigBatchSourceResolution {
  const resolution = createConfigBatchSourceResolution(input, fallback);
  // Settings-managed sources become the config-backed article table extension.
  syncConfiguredArticleList(resolution.batchSources);
  return resolution;
}
