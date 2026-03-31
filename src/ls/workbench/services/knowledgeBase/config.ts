import type { KnowledgeBaseSettings } from '../../../base/parts/sandbox/common/desktopTypes.js';

export function createDefaultKnowledgeBaseSettings(): KnowledgeBaseSettings {
  return {
    enabled: true,
    autoIndexDownloadedPdf: true,
    downloadDirectory: null,
    libraryStorageMode: 'linked-original',
    libraryDirectory: null,
    maxConcurrentIndexJobs: 1,
  };
}

export function cloneKnowledgeBaseSettings(
  settings: KnowledgeBaseSettings,
): KnowledgeBaseSettings {
  return {
    enabled: settings.enabled,
    autoIndexDownloadedPdf: settings.autoIndexDownloadedPdf,
    downloadDirectory: settings.downloadDirectory,
    libraryStorageMode: settings.libraryStorageMode,
    libraryDirectory: settings.libraryDirectory,
    maxConcurrentIndexJobs: settings.maxConcurrentIndexJobs,
  };
}
