import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, type ChangeEvent, type Ref } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, FolderOpen, Plus, PlugZap, Trash2 } from 'lucide-react';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import { Button } from '../../../../base/browser/ui/button/button';
import { Dropdown } from '../../../../base/browser/ui/dropdown/dropdown';
import { Input } from '../../../../base/browser/ui/input/input';
import { Switch } from '../../../../base/browser/ui/switch/switch';
import type {
  LibraryDocumentSummary,
  LibraryStorageMode,
  LlmProviderId,
  LlmProviderSettings,
  RagProviderId,
  RagProviderSettings,
  TranslationProviderId,
  TranslationProviderSettings,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { batchLimitMax, batchLimitMin } from '../../../services/config/configSchema';
import type { BatchSource } from '../../../services/config/configSchema';
import {
  getDefaultModelForProvider,
  getLlmModelsForProvider,
} from '../../../services/llm/registry.js';
import './media/settings.css';

export type SettingsPartLabels = {
  settingsTitle: string;
  settingsLoading: string;
  settingsLanguage: string;
  languageChinese: string;
  languageEnglish: string;
  settingsLanguageHint: string;
  settingsPageUrl: string;
  settingsPageUrlHint: string;
  pageUrlPlaceholder: string;
  settingsBatchJournalTitle: string;
  batchJournalTitlePlaceholder: string;
  addBatchUrl: string;
  removeBatchUrl: string;
  moveBatchUrlUp: string;
  moveBatchUrlDown: string;
  settingsBatchOptions: string;
  batchCount: string;
  sameDomainOnly: string;
  settingsAppearanceTitle: string;
  settingsUseMica: string;
  settingsUseMicaHint: string;
  settingsLibraryTitle: string;
  settingsKnowledgeBaseMode: string;
  settingsKnowledgeBaseModeHint: string;
  settingsKnowledgeBaseModeDisabledHint: string;
  settingsKnowledgeBaseAutoIndex: string;
  settingsKnowledgeBaseAutoIndexHint: string;
  settingsLibraryStorageMode: string;
  settingsLibraryStorageModeLinkedOriginal: string;
  settingsLibraryStorageModeManagedCopy: string;
  settingsLibraryDirectory: string;
  settingsLibraryDirectoryPlaceholder: string;
  settingsLibraryDirectoryHint: string;
  settingsLibraryDbFile: string;
  settingsLibraryFilesDir: string;
  settingsLibraryCacheDir: string;
  settingsLibraryStatusDocuments: string;
  settingsLibraryStatusFiles: string;
  settingsLibraryStatusQueuedJobs: string;
  settingsLibraryStatusEmpty: string;
  settingsLibraryRecentDocuments: string;
  settingsLibraryDocumentRegistered: string;
  settingsLibraryDocumentQueued: string;
  settingsLibraryDocumentRunning: string;
  settingsLibraryDocumentFailed: string;
  settingsLibraryMaxConcurrentJobs: string;
  settingsLibraryMaxConcurrentJobsHint: string;
  settingsRagTitle: string;
  settingsRagProvider: string;
  settingsRagProviderHint: string;
  settingsRagProviderMoark: string;
  settingsRagApiKey: string;
  settingsRagApiKeyPlaceholder: string;
  settingsRagBaseUrl: string;
  settingsRagEmbeddingModel: string;
  settingsRagRerankerModel: string;
  settingsRagEmbeddingPath: string;
  settingsRagRerankPath: string;
  settingsRagCandidateCount: string;
  settingsRagTopK: string;
  settingsRagTestConnection: string;
  settingsRagShowApiKey: string;
  settingsRagHideApiKey: string;
  settingsRagHint: string;
  settingsBatchHint: string;
  defaultPdfDir: string;
  pdfFileNameUseSelectionOrder: string;
  pdfFileNameUseSelectionOrderHint: string;
  downloadDirPlaceholder: string;
  chooseDirectory: string;
  openConfigLocation: string;
  resetDefault: string;
  settingsHintPath: string;
  settingsConfigPath: string;
  currentDir: string;
  systemDownloads: string;
  settingsLlmTitle: string;
  settingsLlmProvider: string;
  settingsLlmProviderHint: string;
  settingsLlmProviderGlm: string;
  settingsLlmProviderKimi: string;
  settingsLlmProviderDeepSeek: string;
  settingsLlmApiKey: string;
  settingsLlmApiKeyPlaceholder: string;
  settingsLlmModel: string;
  settingsLlmTestConnection: string;
  settingsLlmShowApiKey: string;
  settingsLlmHideApiKey: string;
  settingsLlmHint: string;
  settingsTranslationTitle: string;
  settingsTranslationProvider: string;
  settingsTranslationProviderHint: string;
  settingsTranslationProviderDeepL: string;
  settingsTranslationApiKey: string;
  settingsTranslationApiKeyPlaceholder: string;
  settingsTranslationTestConnection: string;
  settingsTranslationShowApiKey: string;
  settingsTranslationHideApiKey: string;
  settingsTranslationHint: string;
};

export type SettingsPartProps = {
  labels: SettingsPartLabels;
  isSettingsLoading: boolean;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  batchSources: BatchSource[];
  onBatchSourceUrlChange: (index: number, url: string) => void;
  onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void;
  onAddBatchSource: () => void;
  onRemoveBatchSource: (index: number) => void;
  onMoveBatchSource: (index: number, direction: 'up' | 'down') => void;
  batchLimit: number;
  onBatchLimitChange: (value: string) => void;
  sameDomainOnly: boolean;
  onSameDomainOnlyChange: (checked: boolean) => void;
  useMica: boolean;
  onUseMicaChange: (checked: boolean) => void;
  ragEnabled: boolean;
  onRagEnabledChange: (checked: boolean) => void;
  autoIndexDownloadedPdf: boolean;
  onAutoIndexDownloadedPdfChange: (checked: boolean) => void;
  libraryStorageMode: LibraryStorageMode;
  onLibraryStorageModeChange: (value: LibraryStorageMode) => void;
  libraryDirectory: string;
  onLibraryDirectoryChange: (value: string) => void;
  onChooseLibraryDirectory: () => void;
  maxConcurrentIndexJobs: number;
  onMaxConcurrentIndexJobsChange: (value: string) => void;
  activeRagProvider: RagProviderId;
  ragProviders: Record<RagProviderId, RagProviderSettings>;
  onRagProviderApiKeyChange: (provider: RagProviderId, apiKey: string) => void;
  onRagProviderBaseUrlChange: (provider: RagProviderId, baseUrl: string) => void;
  onRagProviderEmbeddingModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderRerankerModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderEmbeddingPathChange: (provider: RagProviderId, path: string) => void;
  onRagProviderRerankPathChange: (provider: RagProviderId, path: string) => void;
  retrievalCandidateCount: number;
  onRetrievalCandidateCountChange: (value: string) => void;
  retrievalTopK: number;
  onRetrievalTopKChange: (value: string) => void;
  onTestRagConnection: () => void;
  isLibraryLoading: boolean;
  libraryDocumentCount: number;
  libraryFileCount: number;
  libraryQueuedJobCount: number;
  libraryDocuments: LibraryDocumentSummary[];
  libraryDbFile: string;
  defaultManagedDirectory: string;
  ragCacheDir: string;
  pdfDownloadDir: string;
  pdfFileNameUseSelectionOrder: boolean;
  onPdfDownloadDirChange: (value: string) => void;
  onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void;
  onChoosePdfDownloadDir: () => void;
  activeLlmProvider: LlmProviderId;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  activeTranslationProvider: TranslationProviderId;
  onActiveTranslationProviderChange: (provider: TranslationProviderId) => void;
  translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void;
  onTestLlmConnection: () => void;
  onTestTranslationConnection: () => void;
  onOpenConfigLocation: () => void;
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
  isTestingRagConnection: boolean;
  isTestingLlmConnection: boolean;
  isTestingTranslationConnection: boolean;
  onResetDownloadDir: () => void;
};

export type SettingsPartState = {
  ui: LocaleMessages;
  isSettingsLoading: boolean;
  locale: Locale;
  batchSources: BatchSource[];
  batchLimit: number;
  sameDomainOnly: boolean;
  useMica: boolean;
  ragEnabled: boolean;
  autoIndexDownloadedPdf: boolean;
  libraryStorageMode: LibraryStorageMode;
  libraryDirectory: string;
  maxConcurrentIndexJobs: number;
  activeRagProvider: RagProviderId;
  ragProviders: Record<RagProviderId, RagProviderSettings>;
  retrievalCandidateCount: number;
  retrievalTopK: number;
  pdfDownloadDir: string;
  pdfFileNameUseSelectionOrder: boolean;
  activeLlmProvider: LlmProviderId;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  activeTranslationProvider: TranslationProviderId;
  translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  desktopRuntime: boolean;
  configPath: string;
  isLibraryLoading: boolean;
  libraryDocumentCount: number;
  libraryFileCount: number;
  libraryQueuedJobCount: number;
  libraryDocuments: LibraryDocumentSummary[];
  libraryDbFile: string;
  defaultManagedDirectory: string;
  ragCacheDir: string;
  isSettingsSaving: boolean;
  isTestingRagConnection: boolean;
  isTestingLlmConnection: boolean;
  isTestingTranslationConnection: boolean;
};

export type SettingsPartActions = {
  onLocaleChange: (locale: Locale) => void;
  onBatchSourceUrlChange: (index: number, url: string) => void;
  onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void;
  onAddBatchSource: () => void;
  onRemoveBatchSource: (index: number) => void;
  onMoveBatchSource: (index: number, direction: 'up' | 'down') => void;
  onBatchLimitChange: (value: string) => void;
  onSameDomainOnlyChange: (checked: boolean) => void;
  onUseMicaChange: (checked: boolean) => void;
  onRagEnabledChange: (checked: boolean) => void;
  onAutoIndexDownloadedPdfChange: (checked: boolean) => void;
  onLibraryStorageModeChange: (value: LibraryStorageMode) => void;
  onLibraryDirectoryChange: (value: string) => void;
  onChooseLibraryDirectory: () => void;
  onMaxConcurrentIndexJobsChange: (value: string) => void;
  onRagProviderApiKeyChange: (provider: RagProviderId, apiKey: string) => void;
  onRagProviderBaseUrlChange: (provider: RagProviderId, baseUrl: string) => void;
  onRagProviderEmbeddingModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderRerankerModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderEmbeddingPathChange: (provider: RagProviderId, path: string) => void;
  onRagProviderRerankPathChange: (provider: RagProviderId, path: string) => void;
  onRetrievalCandidateCountChange: (value: string) => void;
  onRetrievalTopKChange: (value: string) => void;
  onPdfDownloadDirChange: (value: string) => void;
  onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void;
  onChoosePdfDownloadDir: () => void;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onActiveTranslationProviderChange: (provider: TranslationProviderId) => void;
  onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void;
  onTestRagConnection: () => void;
  onTestLlmConnection: () => void;
  onTestTranslationConnection: () => void;
  onOpenConfigLocation: () => void;
  onResetDownloadDir: () => void;
};

type CreateSettingsPartLabelsParams = {
  ui: LocaleMessages;
};

type CreateSettingsPartPropsParams = {
  state: SettingsPartState;
  actions: SettingsPartActions;
};

export function createSettingsPartLabels({
  ui,
}: CreateSettingsPartLabelsParams): SettingsPartLabels {
  return {
    settingsTitle: ui.settingsTitle,
    settingsLoading: ui.settingsLoading,
    settingsLanguage: ui.settingsLanguage,
    languageChinese: ui.languageChinese,
    languageEnglish: ui.languageEnglish,
    settingsLanguageHint: ui.settingsLanguageHint,
    settingsPageUrl: ui.settingsPageUrl,
    settingsPageUrlHint: ui.settingsPageUrlHint,
    pageUrlPlaceholder: ui.pageUrlPlaceholder,
    settingsBatchJournalTitle: ui.settingsBatchJournalTitle,
    batchJournalTitlePlaceholder: ui.batchJournalTitlePlaceholder,
    addBatchUrl: ui.addBatchUrl,
    removeBatchUrl: ui.removeBatchUrl,
    moveBatchUrlUp: ui.moveBatchUrlUp,
    moveBatchUrlDown: ui.moveBatchUrlDown,
    settingsBatchOptions: ui.settingsBatchOptions,
    batchCount: ui.batchCount,
    sameDomainOnly: ui.sameDomainOnly,
    settingsAppearanceTitle: ui.settingsAppearanceTitle,
    settingsUseMica: ui.settingsUseMica,
    settingsUseMicaHint: ui.settingsUseMicaHint,
    settingsLibraryTitle: ui.settingsLibraryTitle,
    settingsKnowledgeBaseMode: ui.settingsKnowledgeBaseMode,
    settingsKnowledgeBaseModeHint: ui.settingsKnowledgeBaseModeHint,
    settingsKnowledgeBaseModeDisabledHint: ui.settingsKnowledgeBaseModeDisabledHint,
    settingsKnowledgeBaseAutoIndex: ui.settingsKnowledgeBaseAutoIndex,
    settingsKnowledgeBaseAutoIndexHint: ui.settingsKnowledgeBaseAutoIndexHint,
    settingsLibraryStorageMode: ui.settingsLibraryStorageMode,
    settingsLibraryStorageModeLinkedOriginal: ui.settingsLibraryStorageModeLinkedOriginal,
    settingsLibraryStorageModeManagedCopy: ui.settingsLibraryStorageModeManagedCopy,
    settingsLibraryDirectory: ui.settingsLibraryDirectory,
    settingsLibraryDirectoryPlaceholder: ui.settingsLibraryDirectoryPlaceholder,
    settingsLibraryDirectoryHint: ui.settingsLibraryDirectoryHint,
    settingsLibraryDbFile: ui.settingsLibraryDbFile,
    settingsLibraryFilesDir: ui.settingsLibraryFilesDir,
    settingsLibraryCacheDir: ui.settingsLibraryCacheDir,
    settingsLibraryStatusDocuments: ui.settingsLibraryStatusDocuments,
    settingsLibraryStatusFiles: ui.settingsLibraryStatusFiles,
    settingsLibraryStatusQueuedJobs: ui.settingsLibraryStatusQueuedJobs,
    settingsLibraryStatusEmpty: ui.settingsLibraryStatusEmpty,
    settingsLibraryRecentDocuments: ui.settingsLibraryRecentDocuments,
    settingsLibraryDocumentRegistered: ui.settingsLibraryDocumentRegistered,
    settingsLibraryDocumentQueued: ui.settingsLibraryDocumentQueued,
    settingsLibraryDocumentRunning: ui.settingsLibraryDocumentRunning,
    settingsLibraryDocumentFailed: ui.settingsLibraryDocumentFailed,
    settingsLibraryMaxConcurrentJobs: ui.settingsLibraryMaxConcurrentJobs,
    settingsLibraryMaxConcurrentJobsHint: ui.settingsLibraryMaxConcurrentJobsHint,
    settingsRagTitle: ui.settingsRagTitle,
    settingsRagProvider: ui.settingsRagProvider,
    settingsRagProviderHint: ui.settingsRagProviderHint,
    settingsRagProviderMoark: ui.settingsRagProviderMoark,
    settingsRagApiKey: ui.settingsRagApiKey,
    settingsRagApiKeyPlaceholder: ui.settingsRagApiKeyPlaceholder,
    settingsRagBaseUrl: ui.settingsRagBaseUrl,
    settingsRagEmbeddingModel: ui.settingsRagEmbeddingModel,
    settingsRagRerankerModel: ui.settingsRagRerankerModel,
    settingsRagEmbeddingPath: ui.settingsRagEmbeddingPath,
    settingsRagRerankPath: ui.settingsRagRerankPath,
    settingsRagCandidateCount: ui.settingsRagCandidateCount,
    settingsRagTopK: ui.settingsRagTopK,
    settingsRagTestConnection: ui.settingsRagTestConnection,
    settingsRagShowApiKey: ui.settingsRagShowApiKey,
    settingsRagHideApiKey: ui.settingsRagHideApiKey,
    settingsRagHint: ui.settingsRagHint,
    settingsBatchHint: ui.settingsBatchHint,
    defaultPdfDir: ui.defaultPdfDir,
    pdfFileNameUseSelectionOrder: ui.pdfFileNameUseSelectionOrder,
    pdfFileNameUseSelectionOrderHint: ui.pdfFileNameUseSelectionOrderHint,
    downloadDirPlaceholder: ui.downloadDirPlaceholder,
    chooseDirectory: ui.chooseDirectory,
    openConfigLocation: ui.openConfigLocation,
    resetDefault: ui.resetDefault,
    settingsHintPath: ui.settingsHintPath,
    settingsConfigPath: ui.settingsConfigPath,
    currentDir: ui.currentDir,
    systemDownloads: ui.systemDownloads,
    settingsLlmTitle: ui.settingsLlmTitle,
    settingsLlmProvider: ui.settingsLlmProvider,
    settingsLlmProviderHint: ui.settingsLlmProviderHint,
    settingsLlmProviderGlm: ui.settingsLlmProviderGlm,
    settingsLlmProviderKimi: ui.settingsLlmProviderKimi,
    settingsLlmProviderDeepSeek: ui.settingsLlmProviderDeepSeek,
    settingsLlmApiKey: ui.settingsLlmApiKey,
    settingsLlmApiKeyPlaceholder: ui.settingsLlmApiKeyPlaceholder,
    settingsLlmModel: ui.settingsLlmModel,
    settingsLlmTestConnection: ui.settingsLlmTestConnection,
    settingsLlmShowApiKey: ui.settingsLlmShowApiKey,
    settingsLlmHideApiKey: ui.settingsLlmHideApiKey,
    settingsLlmHint: ui.settingsLlmHint,
    settingsTranslationTitle: ui.settingsTranslationTitle,
    settingsTranslationProvider: ui.settingsTranslationProvider,
    settingsTranslationProviderHint: ui.settingsTranslationProviderHint,
    settingsTranslationProviderDeepL: ui.settingsTranslationProviderDeepL,
    settingsTranslationApiKey: ui.settingsTranslationApiKey,
    settingsTranslationApiKeyPlaceholder: ui.settingsTranslationApiKeyPlaceholder,
    settingsTranslationTestConnection: ui.settingsTranslationTestConnection,
    settingsTranslationShowApiKey: ui.settingsTranslationShowApiKey,
    settingsTranslationHideApiKey: ui.settingsTranslationHideApiKey,
    settingsTranslationHint: ui.settingsTranslationHint,
  };
}

// Keep settings label mapping centralized in the workbench part layer.
export function createSettingsPartProps({
  state: {
    ui,
    isSettingsLoading,
    locale,
    batchSources,
    batchLimit,
    sameDomainOnly,
    useMica,
    ragEnabled,
    autoIndexDownloadedPdf,
    libraryStorageMode,
    libraryDirectory,
    maxConcurrentIndexJobs,
    activeRagProvider,
    ragProviders,
    retrievalCandidateCount,
    retrievalTopK,
    pdfDownloadDir,
    pdfFileNameUseSelectionOrder,
    activeLlmProvider,
    llmProviders,
    activeTranslationProvider,
    translationProviders,
    desktopRuntime,
    configPath,
    isLibraryLoading,
    libraryDocumentCount,
    libraryFileCount,
    libraryQueuedJobCount,
    libraryDocuments,
    libraryDbFile,
    defaultManagedDirectory,
    ragCacheDir,
    isSettingsSaving,
    isTestingRagConnection,
    isTestingLlmConnection,
    isTestingTranslationConnection,
  },
  actions: {
    onLocaleChange,
    onBatchSourceUrlChange,
    onBatchSourceJournalTitleChange,
    onAddBatchSource,
    onRemoveBatchSource,
    onMoveBatchSource,
    onBatchLimitChange,
    onSameDomainOnlyChange,
    onUseMicaChange,
    onRagEnabledChange,
    onAutoIndexDownloadedPdfChange,
    onLibraryStorageModeChange,
    onLibraryDirectoryChange,
    onChooseLibraryDirectory,
    onMaxConcurrentIndexJobsChange,
    onRagProviderApiKeyChange,
    onRagProviderBaseUrlChange,
    onRagProviderEmbeddingModelChange,
    onRagProviderRerankerModelChange,
    onRagProviderEmbeddingPathChange,
    onRagProviderRerankPathChange,
    onRetrievalCandidateCountChange,
    onRetrievalTopKChange,
    onPdfDownloadDirChange,
    onPdfFileNameUseSelectionOrderChange,
    onChoosePdfDownloadDir,
    onActiveLlmProviderChange,
    onLlmProviderApiKeyChange,
    onLlmProviderModelChange,
    onActiveTranslationProviderChange,
    onTranslationProviderApiKeyChange,
    onTestRagConnection,
    onTestLlmConnection,
    onTestTranslationConnection,
    onOpenConfigLocation,
    onResetDownloadDir,
  },
}: CreateSettingsPartPropsParams): SettingsPartProps {
  return {
    labels: createSettingsPartLabels({ ui }),
    isSettingsLoading,
    locale,
    onLocaleChange,
    batchSources,
    onBatchSourceUrlChange,
    onBatchSourceJournalTitleChange,
    onAddBatchSource,
    onRemoveBatchSource,
    onMoveBatchSource,
    batchLimit,
    onBatchLimitChange,
    sameDomainOnly,
    onSameDomainOnlyChange,
    useMica,
    onUseMicaChange,
    ragEnabled,
    onRagEnabledChange,
    autoIndexDownloadedPdf,
    onAutoIndexDownloadedPdfChange,
    libraryStorageMode,
    onLibraryStorageModeChange,
    libraryDirectory,
    onLibraryDirectoryChange,
    onChooseLibraryDirectory,
    maxConcurrentIndexJobs,
    onMaxConcurrentIndexJobsChange,
    activeRagProvider,
    ragProviders,
    onRagProviderApiKeyChange,
    onRagProviderBaseUrlChange,
    onRagProviderEmbeddingModelChange,
    onRagProviderRerankerModelChange,
    onRagProviderEmbeddingPathChange,
    onRagProviderRerankPathChange,
    retrievalCandidateCount,
    onRetrievalCandidateCountChange,
    retrievalTopK,
    onRetrievalTopKChange,
    onTestRagConnection,
    isLibraryLoading,
    libraryDocumentCount,
    libraryFileCount,
    libraryQueuedJobCount,
    libraryDocuments,
    libraryDbFile,
    defaultManagedDirectory,
    ragCacheDir,
    pdfDownloadDir,
    pdfFileNameUseSelectionOrder,
    onPdfDownloadDirChange,
    onPdfFileNameUseSelectionOrderChange,
    onChoosePdfDownloadDir,
    activeLlmProvider,
    onActiveLlmProviderChange,
    llmProviders,
    onLlmProviderApiKeyChange,
    onLlmProviderModelChange,
    activeTranslationProvider,
    onActiveTranslationProviderChange,
    translationProviders,
    onTranslationProviderApiKeyChange,
    onTestLlmConnection,
    onTestTranslationConnection,
    onOpenConfigLocation,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    isTestingRagConnection,
    isTestingLlmConnection,
    isTestingTranslationConnection,
    onResetDownloadDir,
  };
}

export type SettingsPartViewProps = SettingsPartProps & {
  partRef?: Ref<HTMLElement>;
};

type BatchSourceRowConfig = {
  source: SettingsPartProps['batchSources'][number];
  index: number;
  total: number;
  labels: SettingsPartProps['labels'];
  isSettingsSaving: boolean;
  onMoveBatchSource: SettingsPartProps['onMoveBatchSource'];
  onBatchSourceUrlChange: SettingsPartProps['onBatchSourceUrlChange'];
  onBatchSourceJournalTitleChange: SettingsPartProps['onBatchSourceJournalTitleChange'];
  onRemoveBatchSource: SettingsPartProps['onRemoveBatchSource'];
};

function renderBatchSourceRow({
  source,
  index,
  total,
  labels,
  isSettingsSaving,
  onMoveBatchSource,
  onBatchSourceUrlChange,
  onBatchSourceJournalTitleChange,
  onRemoveBatchSource,
}: BatchSourceRowConfig) {
  return jsxs(
    'div',
    {
      className: 'settings-url-row',
      children: [
        jsxs('div', {
          className: 'settings-url-order-controls',
          children: [
            jsx(Button, {
              type: 'button',
              mode: 'icon',
              variant: 'secondary',
              size: 'sm',
              iconMode: 'with',
              textMode: 'without',
              className: 'settings-url-order-btn',
              onClick: () => onMoveBatchSource(index, 'up'),
              disabled: index === 0 || isSettingsSaving,
              title: labels.moveBatchUrlUp,
              'aria-label': labels.moveBatchUrlUp,
              children: jsx(ArrowUp, { size: 14 }),
            }),
            jsx(Button, {
              type: 'button',
              mode: 'icon',
              variant: 'secondary',
              size: 'sm',
              iconMode: 'with',
              textMode: 'without',
              className: 'settings-url-order-btn',
              onClick: () => onMoveBatchSource(index, 'down'),
              disabled: index === total - 1 || isSettingsSaving,
              title: labels.moveBatchUrlDown,
              'aria-label': labels.moveBatchUrlDown,
              children: jsx(ArrowDown, { size: 14 }),
            }),
          ],
        }),
        jsx(Input, {
          className: 'settings-input-control',
          size: 'sm',
          type: 'text',
          inputMode: 'url',
          value: source.url,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onBatchSourceUrlChange(index, event.target.value),
          placeholder: labels.pageUrlPlaceholder,
          'aria-label': `${labels.settingsPageUrl} ${index + 1}`,
        }),
        jsx(Input, {
          className: 'settings-journal-control',
          size: 'sm',
          type: 'text',
          value: source.journalTitle,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onBatchSourceJournalTitleChange(index, event.target.value),
          placeholder: labels.batchJournalTitlePlaceholder,
          'aria-label': `${labels.settingsBatchJournalTitle} ${index + 1}`,
        }),
        jsx(Button, {
          type: 'button',
          mode: 'icon',
          variant: 'danger',
          size: 'sm',
          iconMode: 'with',
          textMode: 'without',
          onClick: () => onRemoveBatchSource(index),
          disabled: total === 1 || isSettingsSaving,
          title: labels.removeBatchUrl,
          'aria-label': labels.removeBatchUrl,
          children: jsx(Trash2, { size: 16 }),
        }),
      ],
    },
    source.id || `settings-batch-url-${index}`,
  );
}

function renderLocaleField({
  labels,
  locale,
  onLocaleChange,
}: Pick<SettingsPartViewProps, 'labels' | 'locale' | 'onLocaleChange'>) {
  const languageOptions = [
    { value: 'zh', label: labels.languageChinese },
    { value: 'en', label: labels.languageEnglish },
  ];

  return jsxs('div', {
    className: 'settings-field settings-language-field',
    children: [
      jsxs('div', {
        className: 'settings-language-row',
        children: [
          jsx('span', { children: labels.settingsLanguage }),
          jsx(Dropdown, {
            className: 'settings-language-toggle',
            size: 'sm',
            value: locale,
            onChange: (event: { target: { value: string } }) =>
              onLocaleChange(event.target.value as Locale),
            'aria-label': labels.settingsLanguage,
            title: labels.settingsLanguage,
            options: languageOptions,
          }),
        ],
      }),
    ],
  });
}

function renderBatchSourcesField({
  labels,
  batchSources,
  isSettingsSaving,
  onMoveBatchSource,
  onBatchSourceUrlChange,
  onBatchSourceJournalTitleChange,
  onRemoveBatchSource,
  onAddBatchSource,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'batchSources'
  | 'isSettingsSaving'
  | 'onMoveBatchSource'
  | 'onBatchSourceUrlChange'
  | 'onBatchSourceJournalTitleChange'
  | 'onRemoveBatchSource'
  | 'onAddBatchSource'
>) {
  const batchSourceRows = batchSources.map((source, index) =>
    renderBatchSourceRow({
      source,
      index,
      total: batchSources.length,
      labels,
      isSettingsSaving,
      onMoveBatchSource,
      onBatchSourceUrlChange,
      onBatchSourceJournalTitleChange,
      onRemoveBatchSource,
    }),
  );

  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsPageUrl }),
      jsxs('div', {
        className: 'settings-url-list',
        children: [
          ...batchSourceRows,
          jsx(Button, {
            type: 'button',
            mode: 'text',
            variant: 'outline',
            size: 'sm',
            leftIcon: jsx(Plus, { size: 16 }),
            onClick: onAddBatchSource,
            disabled: isSettingsSaving,
            children: labels.addBatchUrl,
          }),
        ],
      }),
    ],
  });
}

function renderBatchOptionsField({
  labels,
  batchLimit,
  onBatchLimitChange,
  sameDomainOnly,
  onSameDomainOnlyChange,
}: Pick<
  SettingsPartViewProps,
  'labels' | 'batchLimit' | 'onBatchLimitChange' | 'sameDomainOnly' | 'onSameDomainOnlyChange'
>) {
  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsBatchOptions }),
      jsxs('div', {
        className: 'settings-batch-options',
        children: [
          jsxs('label', {
            className: 'inline-field',
            htmlFor: 'settings-batch-limit',
            children: [
              labels.batchCount,
              jsx('div', {
                className: 'settings-limit-input-wrap',
                children: jsx(Input, {
                  id: 'settings-batch-limit',
                  className: 'settings-limit-input',
                  size: 'sm',
                  type: 'number',
                  min: batchLimitMin,
                  max: batchLimitMax,
                  value: batchLimit,
                  onChange: (event: ChangeEvent<HTMLInputElement>) =>
                    onBatchLimitChange(event.target.value),
                }),
              }),
            ],
          }),
          jsxs('label', {
            className: 'inline-field checkbox-field',
            htmlFor: 'settings-same-domain-only',
            children: [
              jsx('input', {
                id: 'settings-same-domain-only',
                className: 'radix-checkbox',
                type: 'checkbox',
                checked: sameDomainOnly,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onSameDomainOnlyChange(event.target.checked),
              }),
              labels.sameDomainOnly,
            ],
          }),
        ],
      }),
      jsx('p', { className: 'settings-hint', children: labels.settingsBatchHint }),
    ],
  });
}

function renderDownloadDirectoryField({
  labels,
  pdfDownloadDir,
  pdfFileNameUseSelectionOrder,
  onPdfDownloadDirChange,
  onPdfFileNameUseSelectionOrderChange,
  onChoosePdfDownloadDir,
  desktopRuntime,
  isSettingsSaving,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'pdfDownloadDir'
  | 'pdfFileNameUseSelectionOrder'
  | 'onPdfDownloadDirChange'
  | 'onPdfFileNameUseSelectionOrderChange'
  | 'onChoosePdfDownloadDir'
  | 'desktopRuntime'
  | 'isSettingsSaving'
>) {
  return jsxs('label', {
    className: 'settings-field',
    children: [
      labels.defaultPdfDir,
      jsxs('div', {
        className: 'settings-input-row',
        children: [
          jsx(Input, {
            className: 'settings-input-control',
            size: 'sm',
            type: 'text',
            value: pdfDownloadDir,
            onChange: (event: ChangeEvent<HTMLInputElement>) =>
              onPdfDownloadDirChange(event.target.value),
            placeholder: labels.downloadDirPlaceholder,
          }),
          jsx(Button, {
            type: 'button',
            mode: 'icon',
            variant: 'secondary',
            size: 'md',
            iconMode: 'with',
            textMode: 'without',
            onClick: onChoosePdfDownloadDir,
            disabled: !desktopRuntime || isSettingsSaving,
            title: labels.chooseDirectory,
            'aria-label': labels.chooseDirectory,
            children: jsx(FolderOpen, { size: 16 }),
          }),
        ],
      }),
      jsxs('div', {
        className: 'settings-toggle-row',
        children: [
          jsxs('div', {
            children: [
              jsx('span', { className: 'settings-hint', children: labels.pdfFileNameUseSelectionOrder }),
              jsx('p', {
                className: 'settings-hint settings-toggle-subtitle',
                children: labels.pdfFileNameUseSelectionOrderHint,
              }),
            ],
          }),
          jsx(Switch, {
            checked: pdfFileNameUseSelectionOrder,
            disabled: isSettingsSaving,
            onChange: (event: ChangeEvent<HTMLInputElement>) =>
              onPdfFileNameUseSelectionOrderChange(event.target.checked),
            'aria-label': labels.pdfFileNameUseSelectionOrder,
            title: labels.pdfFileNameUseSelectionOrder,
          }),
        ],
      }),
    ],
  });
}

function renderAppearanceField({
  labels,
  useMica,
  onUseMicaChange,
  isSettingsSaving,
  desktopRuntime,
}: Pick<
  SettingsPartViewProps,
  'labels' | 'useMica' | 'onUseMicaChange' | 'isSettingsSaving' | 'desktopRuntime'
>) {
  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsAppearanceTitle }),
      jsxs('div', {
        className: 'settings-toggle-row',
        children: [
          jsx('span', {
            className: 'settings-hint',
            children: labels.settingsUseMica,
          }),
          jsx(Switch, {
            checked: useMica,
            disabled: isSettingsSaving || !desktopRuntime,
            onChange: (event: ChangeEvent<HTMLInputElement>) =>
              onUseMicaChange(event.target.checked),
            'aria-label': labels.settingsUseMica,
            title: labels.settingsUseMica,
          }),
        ],
      }),
    ],
  });
}

function resolveLibraryDocumentStatusLabel(
  labels: SettingsPartViewProps['labels'],
  document: LibraryDocumentSummary,
) {
  if (document.latestJobStatus === 'failed' || document.ingestStatus === 'failed') {
    return labels.settingsLibraryDocumentFailed;
  }

  if (document.latestJobStatus === 'running' || document.ingestStatus === 'indexing') {
    return labels.settingsLibraryDocumentRunning;
  }

  if (document.latestJobStatus === 'queued' || document.ingestStatus === 'queued') {
    return labels.settingsLibraryDocumentQueued;
  }

  return labels.settingsLibraryDocumentRegistered;
}

function renderReadOnlyPathField(
  label: string,
  value: string,
) {
  return jsxs('label', {
    className: 'settings-field',
    children: [
      label,
      jsx(Input, {
        className: 'settings-input-control',
        size: 'sm',
        type: 'text',
        value,
        readOnly: true,
        placeholder: '-',
      }),
    ],
  });
}

function renderLibraryField({
  labels,
  ragEnabled: knowledgeBaseModeEnabled,
  onRagEnabledChange: onKnowledgeBaseModeChange,
  autoIndexDownloadedPdf,
  onAutoIndexDownloadedPdfChange,
  libraryStorageMode,
  onLibraryStorageModeChange,
  libraryDirectory,
  onLibraryDirectoryChange,
  onChooseLibraryDirectory,
  maxConcurrentIndexJobs,
  onMaxConcurrentIndexJobsChange,
  desktopRuntime,
  isSettingsSaving,
  isLibraryLoading,
  libraryDocumentCount,
  libraryFileCount,
  libraryQueuedJobCount,
  libraryDocuments,
  libraryDbFile,
  defaultManagedDirectory,
  ragCacheDir,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'ragEnabled'
  | 'onRagEnabledChange'
  | 'autoIndexDownloadedPdf'
  | 'onAutoIndexDownloadedPdfChange'
  | 'libraryStorageMode'
  | 'onLibraryStorageModeChange'
  | 'libraryDirectory'
  | 'onLibraryDirectoryChange'
  | 'onChooseLibraryDirectory'
  | 'maxConcurrentIndexJobs'
  | 'onMaxConcurrentIndexJobsChange'
  | 'desktopRuntime'
  | 'isSettingsSaving'
  | 'isLibraryLoading'
  | 'libraryDocumentCount'
  | 'libraryFileCount'
  | 'libraryQueuedJobCount'
  | 'libraryDocuments'
  | 'libraryDbFile'
  | 'defaultManagedDirectory'
  | 'ragCacheDir'
>) {
  const storageModeOptions = [
    {
      value: 'linked-original',
      label: labels.settingsLibraryStorageModeLinkedOriginal,
    },
    {
      value: 'managed-copy',
      label: labels.settingsLibraryStorageModeManagedCopy,
    },
  ];
  const effectiveManagedDirectory = libraryDirectory.trim() || defaultManagedDirectory;

  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsLibraryTitle }),
      jsxs('div', {
        className: 'settings-toggle-row',
        children: [
          jsxs('div', {
            children: [
              jsx('span', { className: 'settings-hint', children: labels.settingsKnowledgeBaseMode }),
              jsx('p', {
                className: 'settings-hint settings-toggle-subtitle',
                children: labels.settingsKnowledgeBaseModeHint,
              }),
            ],
          }),
          jsx(Switch, {
            checked: knowledgeBaseModeEnabled,
            disabled: isSettingsSaving,
            onChange: (event: ChangeEvent<HTMLInputElement>) =>
              onKnowledgeBaseModeChange(event.target.checked),
            'aria-label': labels.settingsKnowledgeBaseMode,
            title: labels.settingsKnowledgeBaseMode,
          }),
        ],
      }),
      !knowledgeBaseModeEnabled
        ? jsx('p', {
            className: 'settings-hint settings-library-mode-note',
            children: labels.settingsKnowledgeBaseModeDisabledHint,
          })
        : null,
      jsxs('div', {
        className: 'settings-toggle-row',
        children: [
          jsxs('div', {
            children: [
              jsx('span', { className: 'settings-hint', children: labels.settingsKnowledgeBaseAutoIndex }),
              jsx('p', {
                className: 'settings-hint settings-toggle-subtitle',
                children: labels.settingsKnowledgeBaseAutoIndexHint,
              }),
            ],
          }),
          jsx(Switch, {
            checked: autoIndexDownloadedPdf,
            disabled: isSettingsSaving || !knowledgeBaseModeEnabled,
            onChange: (event: ChangeEvent<HTMLInputElement>) =>
              onAutoIndexDownloadedPdfChange(event.target.checked),
            'aria-label': labels.settingsKnowledgeBaseAutoIndex,
            title: labels.settingsKnowledgeBaseAutoIndex,
          }),
        ],
      }),
      jsxs('div', {
        className: 'settings-llm-grid',
        children: [
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLibraryStorageMode,
              jsx(Dropdown, {
                className: 'settings-llm-provider',
                size: 'sm',
                value: libraryStorageMode,
                options: storageModeOptions,
                onChange: (event: { target: { value: string } }) =>
                  onLibraryStorageModeChange(event.target.value as LibraryStorageMode),
                'aria-label': labels.settingsLibraryStorageMode,
                title: labels.settingsLibraryStorageMode,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLibraryMaxConcurrentJobs,
              jsx('div', {
                className: 'settings-limit-input-wrap',
                children: jsx(Input, {
                  className: 'settings-limit-input',
                  size: 'sm',
                  type: 'number',
                  inputMode: 'numeric',
                  min: 1,
                  max: 4,
                  value: String(maxConcurrentIndexJobs),
                  onChange: (event: ChangeEvent<HTMLInputElement>) =>
                    onMaxConcurrentIndexJobsChange(event.target.value),
                }),
              }),
            ],
          }),
        ],
      }),
      jsxs('label', {
        className: 'settings-field',
        children: [
          labels.settingsLibraryDirectory,
          jsxs('div', {
            className: 'settings-input-row',
            children: [
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: libraryDirectory,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onLibraryDirectoryChange(event.target.value),
                placeholder: labels.settingsLibraryDirectoryPlaceholder,
              }),
              jsx(Button, {
                type: 'button',
                mode: 'icon',
                variant: 'secondary',
                size: 'md',
                iconMode: 'with',
                textMode: 'without',
                onClick: onChooseLibraryDirectory,
                disabled: !desktopRuntime || isSettingsSaving,
                title: labels.chooseDirectory,
                'aria-label': labels.chooseDirectory,
                children: jsx(FolderOpen, { size: 16 }),
              }),
            ],
          }),
          jsx('p', {
            className: 'settings-hint',
            children: labels.settingsLibraryDirectoryHint,
          }),
          jsx('p', {
            className: 'settings-hint',
            children: `${labels.currentDir} ${effectiveManagedDirectory || '-'}`,
          }),
          jsx('p', {
            className: 'settings-hint',
            children: labels.settingsLibraryMaxConcurrentJobsHint,
          }),
        ],
      }),
      jsxs('div', {
        className: 'settings-library-stats',
        children: [
          jsxs('div', {
            className: 'settings-library-stat-card',
            children: [
              jsx('span', { className: 'settings-library-stat-label', children: labels.settingsLibraryStatusDocuments }),
              jsx('strong', { children: libraryDocumentCount }),
            ],
          }),
          jsxs('div', {
            className: 'settings-library-stat-card',
            children: [
              jsx('span', { className: 'settings-library-stat-label', children: labels.settingsLibraryStatusFiles }),
              jsx('strong', { children: libraryFileCount }),
            ],
          }),
          jsxs('div', {
            className: 'settings-library-stat-card',
            children: [
              jsx('span', { className: 'settings-library-stat-label', children: labels.settingsLibraryStatusQueuedJobs }),
              jsx('strong', { children: libraryQueuedJobCount }),
            ],
          }),
        ],
      }),
      jsxs('div', {
        className: 'settings-field',
        children: [
          jsx('span', { children: labels.settingsLibraryRecentDocuments }),
          isLibraryLoading
            ? jsx('p', { className: 'settings-hint', children: labels.settingsLoading })
            : null,
          libraryDocuments.length > 0
            ? jsx('div', {
                className: 'settings-library-doc-list',
                children: libraryDocuments.map((document) =>
                  jsxs(
                    'div',
                    {
                      className: 'settings-library-doc-item',
                      children: [
                        jsx('strong', {
                          className: 'settings-library-doc-title',
                          children: document.title || '-',
                        }),
                        jsx('span', {
                          className: 'settings-library-doc-meta',
                          children: [document.journalTitle, document.publishedAt]
                            .filter(Boolean)
                            .join(' | '),
                        }),
                        jsx('span', {
                          className: 'settings-library-doc-status',
                          children: resolveLibraryDocumentStatusLabel(labels, document),
                        }),
                      ],
                    },
                    document.documentId,
                  ),
                ),
              })
            : jsx('p', {
                className: 'settings-hint',
                children: labels.settingsLibraryStatusEmpty,
              }),
        ],
      }),
      renderReadOnlyPathField(labels.settingsLibraryDbFile, libraryDbFile),
      renderReadOnlyPathField(labels.settingsLibraryFilesDir, effectiveManagedDirectory),
      renderReadOnlyPathField(labels.settingsLibraryCacheDir, ragCacheDir),
    ],
  });
}

function RagField({
  labels,
  activeRagProvider,
  ragProviders,
  onRagProviderApiKeyChange,
  onRagProviderBaseUrlChange,
  onRagProviderEmbeddingModelChange,
  onRagProviderRerankerModelChange,
  onRagProviderEmbeddingPathChange,
  onRagProviderRerankPathChange,
  retrievalCandidateCount,
  onRetrievalCandidateCountChange,
  retrievalTopK,
  onRetrievalTopKChange,
  onTestRagConnection,
  isSettingsSaving,
  isTestingRagConnection,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'activeRagProvider'
  | 'ragProviders'
  | 'onRagProviderApiKeyChange'
  | 'onRagProviderBaseUrlChange'
  | 'onRagProviderEmbeddingModelChange'
  | 'onRagProviderRerankerModelChange'
  | 'onRagProviderEmbeddingPathChange'
  | 'onRagProviderRerankPathChange'
  | 'retrievalCandidateCount'
  | 'onRetrievalCandidateCountChange'
  | 'retrievalTopK'
  | 'onRetrievalTopKChange'
  | 'onTestRagConnection'
  | 'isSettingsSaving'
  | 'isTestingRagConnection'
>) {
  const [showApiKey, setShowApiKey] = useState(false);
  const activeProviderSettings = ragProviders[activeRagProvider];

  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsRagTitle }),
      jsx('p', { className: 'settings-hint', children: labels.settingsRagHint }),
      jsxs('div', {
        className: 'settings-llm-grid',
        children: [
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsRagProvider,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: labels.settingsRagProviderMoark,
                readOnly: true,
              }),
              jsx('p', { className: 'settings-hint', children: labels.settingsRagProviderHint }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsRagCandidateCount,
              jsx('div', {
                className: 'settings-limit-input-wrap',
                children: jsx(Input, {
                  className: 'settings-limit-input',
                  size: 'sm',
                  type: 'number',
                  inputMode: 'numeric',
                  min: 3,
                  max: 20,
                  value: String(retrievalCandidateCount),
                  onChange: (event: ChangeEvent<HTMLInputElement>) =>
                    onRetrievalCandidateCountChange(event.target.value),
                }),
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsRagTopK,
              jsx('div', {
                className: 'settings-limit-input-wrap',
                children: jsx(Input, {
                  className: 'settings-limit-input',
                  size: 'sm',
                  type: 'number',
                  inputMode: 'numeric',
                  min: 1,
                  max: retrievalCandidateCount,
                  value: String(retrievalTopK),
                  onChange: (event: ChangeEvent<HTMLInputElement>) =>
                    onRetrievalTopKChange(event.target.value),
                }),
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field settings-llm-span-2',
            children: [
              labels.settingsRagBaseUrl,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: activeProviderSettings.baseUrl,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onRagProviderBaseUrlChange(activeRagProvider, event.target.value),
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsRagEmbeddingModel,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: activeProviderSettings.embeddingModel,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onRagProviderEmbeddingModelChange(activeRagProvider, event.target.value),
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsRagRerankerModel,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: activeProviderSettings.rerankerModel,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onRagProviderRerankerModelChange(activeRagProvider, event.target.value),
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsRagEmbeddingPath,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: activeProviderSettings.embeddingPath,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onRagProviderEmbeddingPathChange(activeRagProvider, event.target.value),
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsRagRerankPath,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: activeProviderSettings.rerankPath,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onRagProviderRerankPathChange(activeRagProvider, event.target.value),
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field settings-llm-api-field settings-llm-span-2',
            children: [
              labels.settingsRagApiKey,
              jsxs('div', {
                className: 'settings-input-row settings-llm-api-row',
                children: [
                  jsx(Input, {
                    className: 'settings-input-control settings-api-key-input',
                    size: 'sm',
                    type: showApiKey ? 'text' : 'password',
                    value: activeProviderSettings.apiKey,
                    onChange: (event: ChangeEvent<HTMLInputElement>) =>
                      onRagProviderApiKeyChange(activeRagProvider, event.target.value),
                    placeholder: labels.settingsRagApiKeyPlaceholder,
                    rightIcon: jsx('button', {
                      type: 'button',
                      className: 'settings-password-toggle',
                      onClick: () => setShowApiKey((currentValue) => !currentValue),
                      'aria-label': showApiKey
                        ? labels.settingsRagHideApiKey
                        : labels.settingsRagShowApiKey,
                      title: showApiKey
                        ? labels.settingsRagHideApiKey
                        : labels.settingsRagShowApiKey,
                      children: showApiKey
                        ? jsx(EyeOff, { size: 16, strokeWidth: 1.8 })
                        : jsx(Eye, { size: 16, strokeWidth: 1.8 }),
                    }),
                  }),
                  jsx(Button, {
                    className: 'settings-llm-test-btn',
                    type: 'button',
                    mode: 'text',
                    variant: 'primary',
                    size: 'md',
                    textMode: 'with',
                    iconMode: 'with',
                    leftIcon: jsx(PlugZap, { size: 14, strokeWidth: 1.8 }),
                    isLoading: isTestingRagConnection,
                    onClick: onTestRagConnection,
                    disabled: isSettingsSaving,
                    children: labels.settingsRagTestConnection,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function LlmField({
  labels,
  activeLlmProvider,
  llmProviders,
  onActiveLlmProviderChange,
  onLlmProviderApiKeyChange,
  onLlmProviderModelChange,
  onTestLlmConnection,
  isSettingsSaving,
  isTestingLlmConnection,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'activeLlmProvider'
  | 'llmProviders'
  | 'onActiveLlmProviderChange'
  | 'onLlmProviderApiKeyChange'
  | 'onLlmProviderModelChange'
  | 'onTestLlmConnection'
  | 'isSettingsSaving'
  | 'isTestingLlmConnection'
>) {
  const [showApiKey, setShowApiKey] = useState(false);
  const providerOptions = [
    { value: 'glm', label: labels.settingsLlmProviderGlm },
    { value: 'kimi', label: labels.settingsLlmProviderKimi },
    { value: 'deepseek', label: labels.settingsLlmProviderDeepSeek },
  ];
  const activeProviderSettings = llmProviders[activeLlmProvider];
  const modelOptions = getLlmModelsForProvider(activeLlmProvider).map((model) => ({
    value: model.id,
    label: model.label,
  }));
  const selectedModelValue =
    modelOptions.find((model) => model.value === activeProviderSettings.model)?.value ??
    getDefaultModelForProvider(activeLlmProvider);

  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsLlmTitle }),
      jsxs('div', {
        className: 'settings-llm-grid',
        children: [
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLlmProvider,
              jsx(Dropdown, {
                className: 'settings-llm-provider',
                size: 'sm',
                value: activeLlmProvider,
                options: providerOptions,
                onChange: (event: { target: { value: string } }) =>
                  onActiveLlmProviderChange(event.target.value as LlmProviderId),
                'aria-label': labels.settingsLlmProvider,
                title: labels.settingsLlmProvider,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLlmModel,
              jsx(Dropdown, {
                className: 'settings-llm-provider',
                size: 'sm',
                value: selectedModelValue,
                options: modelOptions,
                onChange: (event: { target: { value: string } }) =>
                  onLlmProviderModelChange(activeLlmProvider, event.target.value),
                'aria-label': labels.settingsLlmModel,
                title: labels.settingsLlmModel,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field settings-llm-api-field',
            children: [
              labels.settingsLlmApiKey,
              jsxs('div', {
                className: 'settings-input-row settings-llm-api-row',
                children: [
                  jsx(Input, {
                    className: 'settings-input-control settings-api-key-input',
                    size: 'sm',
                    type: showApiKey ? 'text' : 'password',
                    value: activeProviderSettings.apiKey,
                    onChange: (event: ChangeEvent<HTMLInputElement>) =>
                      onLlmProviderApiKeyChange(activeLlmProvider, event.target.value),
                    placeholder: labels.settingsLlmApiKeyPlaceholder,
                    rightIcon: jsx('button', {
                      type: 'button',
                      className: 'settings-password-toggle',
                      onClick: () => setShowApiKey((currentValue) => !currentValue),
                      'aria-label': showApiKey
                        ? labels.settingsLlmHideApiKey
                        : labels.settingsLlmShowApiKey,
                      title: showApiKey
                        ? labels.settingsLlmHideApiKey
                        : labels.settingsLlmShowApiKey,
                      children: showApiKey
                        ? jsx(EyeOff, { size: 16, strokeWidth: 1.8 })
                        : jsx(Eye, { size: 16, strokeWidth: 1.8 }),
                    }),
                  }),
                  jsx(Button, {
                    className: 'settings-llm-test-btn',
                    type: 'button',
                    mode: 'text',
                    variant: 'primary',
                    size: 'md',
                    textMode: 'with',
                    iconMode: 'with',
                    leftIcon: jsx(PlugZap, { size: 14, strokeWidth: 1.8 }),
                    isLoading: isTestingLlmConnection,
                    onClick: onTestLlmConnection,
                    disabled: isSettingsSaving,
                    children: labels.settingsLlmTestConnection,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function TranslationField({
  labels,
  activeTranslationProvider,
  translationProviders,
  onActiveTranslationProviderChange,
  onTranslationProviderApiKeyChange,
  onTestTranslationConnection,
  isSettingsSaving,
  isTestingTranslationConnection,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'activeTranslationProvider'
  | 'translationProviders'
  | 'onActiveTranslationProviderChange'
  | 'onTranslationProviderApiKeyChange'
  | 'onTestTranslationConnection'
  | 'isSettingsSaving'
  | 'isTestingTranslationConnection'
>) {
  const [showApiKey, setShowApiKey] = useState(false);
  const providerOptions = [{ value: 'deepl', label: labels.settingsTranslationProviderDeepL }];
  const activeProviderSettings = translationProviders[activeTranslationProvider];

  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsTranslationTitle }),
      jsxs('div', {
        className: 'settings-llm-grid',
        children: [
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsTranslationProvider,
              jsx(Dropdown, {
                className: 'settings-llm-provider',
                size: 'sm',
                value: activeTranslationProvider,
                options: providerOptions,
                onChange: (event: { target: { value: string } }) =>
                  onActiveTranslationProviderChange(event.target.value as TranslationProviderId),
                'aria-label': labels.settingsTranslationProvider,
                title: labels.settingsTranslationProvider,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field settings-llm-api-field settings-llm-span-2',
            children: [
              labels.settingsTranslationApiKey,
              jsxs('div', {
                className: 'settings-input-row settings-llm-api-row',
                children: [
                  jsx(Input, {
                    className: 'settings-input-control settings-api-key-input',
                    size: 'sm',
                    type: showApiKey ? 'text' : 'password',
                    value: activeProviderSettings.apiKey,
                    onChange: (event: ChangeEvent<HTMLInputElement>) =>
                      onTranslationProviderApiKeyChange(activeTranslationProvider, event.target.value),
                    placeholder: labels.settingsTranslationApiKeyPlaceholder,
                    rightIcon: jsx('button', {
                      type: 'button',
                      className: 'settings-password-toggle',
                      onClick: () => setShowApiKey((currentValue) => !currentValue),
                      'aria-label': showApiKey
                        ? labels.settingsTranslationHideApiKey
                        : labels.settingsTranslationShowApiKey,
                      title: showApiKey
                        ? labels.settingsTranslationHideApiKey
                        : labels.settingsTranslationShowApiKey,
                      children: showApiKey
                        ? jsx(EyeOff, { size: 16, strokeWidth: 1.8 })
                        : jsx(Eye, { size: 16, strokeWidth: 1.8 }),
                    }),
                  }),
                  jsx(Button, {
                    className: 'settings-llm-test-btn',
                    type: 'button',
                    mode: 'text',
                    variant: 'primary',
                    size: 'md',
                    textMode: 'with',
                    iconMode: 'with',
                    leftIcon: jsx(PlugZap, { size: 14, strokeWidth: 1.8 }),
                    isLoading: isTestingTranslationConnection,
                    onClick: onTestTranslationConnection,
                    disabled: isSettingsSaving,
                    children: labels.settingsTranslationTestConnection,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function renderConfigPathField({
  labels,
  configPath,
  desktopRuntime,
  isSettingsSaving,
  onOpenConfigLocation,
}: Pick<
  SettingsPartViewProps,
  'labels' | 'configPath' | 'desktopRuntime' | 'isSettingsSaving' | 'onOpenConfigLocation'
>) {
  return jsxs('label', {
    className: 'settings-field',
    children: [
      labels.settingsConfigPath,
      jsxs('div', {
        className: 'settings-input-row',
        children: [
          jsx(Input, {
            className: 'settings-input-control',
            size: 'sm',
            type: 'text',
            value: configPath,
            readOnly: true,
            placeholder: '-',
          }),
          jsx(Button, {
            type: 'button',
            mode: 'icon',
            variant: 'secondary',
            size: 'md',
            iconMode: 'with',
            textMode: 'without',
            onClick: onOpenConfigLocation,
            disabled: !desktopRuntime || isSettingsSaving || !configPath.trim(),
            title: labels.openConfigLocation,
            'aria-label': labels.openConfigLocation,
            children: jsx(FolderOpen, { size: 16 }),
          }),
        ],
      }),
    ],
  });
}

export function SettingsPartView({
  partRef,
  labels,
  isSettingsLoading,
  locale,
  onLocaleChange,
  batchSources,
  onBatchSourceUrlChange,
  onBatchSourceJournalTitleChange,
  onAddBatchSource,
  onRemoveBatchSource,
  onMoveBatchSource,
  batchLimit,
  onBatchLimitChange,
  sameDomainOnly,
  onSameDomainOnlyChange,
  useMica,
  onUseMicaChange,
  ragEnabled,
  onRagEnabledChange,
  autoIndexDownloadedPdf,
  onAutoIndexDownloadedPdfChange,
  libraryStorageMode,
  onLibraryStorageModeChange,
  libraryDirectory,
  onLibraryDirectoryChange,
  onChooseLibraryDirectory,
  maxConcurrentIndexJobs,
  onMaxConcurrentIndexJobsChange,
  activeRagProvider,
  ragProviders,
  onRagProviderApiKeyChange,
  onRagProviderBaseUrlChange,
  onRagProviderEmbeddingModelChange,
  onRagProviderRerankerModelChange,
  onRagProviderEmbeddingPathChange,
  onRagProviderRerankPathChange,
  retrievalCandidateCount,
  onRetrievalCandidateCountChange,
  retrievalTopK,
  onRetrievalTopKChange,
  onTestRagConnection,
  isLibraryLoading,
  libraryDocumentCount,
  libraryFileCount,
  libraryQueuedJobCount,
  libraryDocuments,
  libraryDbFile,
  defaultManagedDirectory,
  ragCacheDir,
  pdfDownloadDir,
  pdfFileNameUseSelectionOrder,
  onPdfDownloadDirChange,
  onPdfFileNameUseSelectionOrderChange,
  onChoosePdfDownloadDir,
  activeLlmProvider,
  onActiveLlmProviderChange,
  llmProviders,
  onLlmProviderApiKeyChange,
  onLlmProviderModelChange,
  activeTranslationProvider,
  onActiveTranslationProviderChange,
  translationProviders,
  onTranslationProviderApiKeyChange,
  onTestLlmConnection,
  onTestTranslationConnection,
  onOpenConfigLocation,
  desktopRuntime,
  configPath,
  isSettingsSaving,
  isTestingRagConnection,
  isTestingLlmConnection,
  isTestingTranslationConnection,
}: SettingsPartViewProps) {
  return jsx('main', {
    ref: partRef,
    className: 'settings-page',
    children: jsxs('section', {
      className: 'panel settings-card',
      children: [
        jsx('div', {
          className: 'panel-title settings-header',
          children: jsx('span', { children: labels.settingsTitle }),
        }),
        jsxs('div', {
          className: 'settings-content',
          children: [
            isSettingsLoading
              ? jsx('p', { className: 'settings-hint', children: labels.settingsLoading })
              : null,
            renderLocaleField({
              labels,
              locale,
              onLocaleChange,
            }),
            renderBatchSourcesField({
              labels,
              batchSources,
              isSettingsSaving,
              onMoveBatchSource,
              onBatchSourceUrlChange,
              onBatchSourceJournalTitleChange,
              onRemoveBatchSource,
              onAddBatchSource,
            }),
            renderBatchOptionsField({
              labels,
              batchLimit,
              onBatchLimitChange,
              sameDomainOnly,
              onSameDomainOnlyChange,
            }),
            renderAppearanceField({
              labels,
              useMica,
              onUseMicaChange,
              isSettingsSaving,
              desktopRuntime,
            }),
            renderLibraryField({
              labels,
              ragEnabled,
              onRagEnabledChange,
              autoIndexDownloadedPdf,
              onAutoIndexDownloadedPdfChange,
              libraryStorageMode,
              onLibraryStorageModeChange,
              libraryDirectory,
              onLibraryDirectoryChange,
              onChooseLibraryDirectory,
              maxConcurrentIndexJobs,
              onMaxConcurrentIndexJobsChange,
              desktopRuntime,
              isSettingsSaving,
              isLibraryLoading,
              libraryDocumentCount,
              libraryFileCount,
              libraryQueuedJobCount,
              libraryDocuments,
              libraryDbFile,
              defaultManagedDirectory,
              ragCacheDir,
            }),
            jsx(RagField, {
              labels,
              activeRagProvider,
              ragProviders,
              onRagProviderApiKeyChange,
              onRagProviderBaseUrlChange,
              onRagProviderEmbeddingModelChange,
              onRagProviderRerankerModelChange,
              onRagProviderEmbeddingPathChange,
              onRagProviderRerankPathChange,
              retrievalCandidateCount,
              onRetrievalCandidateCountChange,
              retrievalTopK,
              onRetrievalTopKChange,
              onTestRagConnection,
              isSettingsSaving,
              isTestingRagConnection,
            }),
            renderDownloadDirectoryField({
              labels,
              pdfDownloadDir,
              pdfFileNameUseSelectionOrder,
              onPdfDownloadDirChange,
              onPdfFileNameUseSelectionOrderChange,
              onChoosePdfDownloadDir,
              desktopRuntime,
              isSettingsSaving,
            }),
            jsx(LlmField, {
              labels,
              activeLlmProvider,
              llmProviders,
              onActiveLlmProviderChange,
              onLlmProviderApiKeyChange,
              onLlmProviderModelChange,
              onTestLlmConnection,
              isSettingsSaving,
              isTestingLlmConnection,
            }),
            jsx(TranslationField, {
              labels,
              activeTranslationProvider,
              translationProviders,
              onActiveTranslationProviderChange,
              onTranslationProviderApiKeyChange,
              onTestTranslationConnection,
              isSettingsSaving,
              isTestingTranslationConnection,
            }),
            renderConfigPathField({
              labels,
              configPath,
              desktopRuntime,
              isSettingsSaving,
              onOpenConfigLocation,
            }),
          ],
        }),
      ],
    }),
  });
}
