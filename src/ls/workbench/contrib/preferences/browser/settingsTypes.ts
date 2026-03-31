import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
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
import type { BatchSource } from '../../../services/config/configSchema.js';

// Keep preferences types separate from the editor implementation so field views
// can depend on stable contracts without importing the editor host module.
export type SettingsPartLabels = {
  settingsTitle: string; settingsLoading: string; settingsLanguage: string; languageChinese: string; languageEnglish: string; settingsLanguageHint: string;
  settingsNavigationGeneral: string; settingsNavigationTextEditor: string; settingsNavigationChat: string; settingsNavigationKnowledgeBase: string; settingsNavigationLiterature: string; settingsTextEditorTitle: string; settingsTextEditorHint: string;
  settingsPageUrl: string; settingsPageUrlHint: string; pageUrlPlaceholder: string; settingsBatchJournalTitle: string; batchJournalTitlePlaceholder: string;
  addBatchUrl: string; removeBatchUrl: string; moveBatchUrlUp: string; moveBatchUrlDown: string; settingsBatchOptions: string; batchCount: string; sameDomainOnly: string;
  settingsAppearanceTitle: string; settingsUseMica: string; settingsUseMicaHint: string; settingsLibraryTitle: string; settingsKnowledgeBaseMode: string;
  settingsKnowledgeBaseTitle: string; settingsKnowledgeBaseHint: string; settingsKnowledgeBaseModeHint: string; settingsKnowledgeBaseModeDisabledHint: string; settingsKnowledgeBaseAutoIndex: string; settingsKnowledgeBaseAutoIndexHint: string;
  settingsKnowledgeBasePdfDownloadDir: string; settingsKnowledgeBasePdfDownloadDirPlaceholder: string; settingsKnowledgeBasePdfDownloadDirHint: string;
  settingsLibraryStorageMode: string; settingsLibraryStorageModeLinkedOriginal: string; settingsLibraryStorageModeManagedCopy: string; settingsLibraryDirectory: string;
  settingsLibraryDirectoryPlaceholder: string; settingsLibraryDirectoryHint: string; settingsLibraryDbFile: string; settingsLibraryFilesDir: string; settingsLibraryCacheDir: string;
  settingsLibraryStatusDocuments: string; settingsLibraryStatusFiles: string; settingsLibraryStatusQueuedJobs: string; settingsLibraryStatusEmpty: string; settingsLibraryRecentDocuments: string;
  settingsLibraryDocumentRegistered: string; settingsLibraryDocumentQueued: string; settingsLibraryDocumentRunning: string; settingsLibraryDocumentFailed: string;
  settingsLibraryMaxConcurrentJobs: string; settingsLibraryMaxConcurrentJobsHint: string; settingsRagTitle: string; settingsRagProvider: string; settingsRagProviderHint: string;
  settingsRagProviderMoark: string; settingsRagApiKey: string; settingsRagApiKeyPlaceholder: string; settingsRagBaseUrl: string; settingsRagEmbeddingModel: string;
  settingsRagRerankerModel: string; settingsRagEmbeddingPath: string; settingsRagRerankPath: string; settingsRagCandidateCount: string; settingsRagTopK: string;
  settingsRagTestConnection: string; settingsRagShowApiKey: string; settingsRagHideApiKey: string; settingsRagHint: string; settingsBatchHint: string; defaultPdfDir: string;
  pdfFileNameUseSelectionOrder: string; pdfFileNameUseSelectionOrderHint: string; downloadDirPlaceholder: string; chooseDirectory: string; openConfigLocation: string;
  resetDefault: string; settingsHintPath: string; settingsConfigPath: string; currentDir: string; systemDownloads: string; settingsLlmTitle: string; settingsLlmProvider: string;
  settingsLlmProviderHint: string; settingsLlmProviderGlm: string; settingsLlmProviderKimi: string; settingsLlmProviderDeepSeek: string; settingsLlmApiKey: string;
  settingsLlmApiKeyPlaceholder: string; settingsLlmModel: string; settingsLlmTestConnection: string; settingsLlmShowApiKey: string; settingsLlmHideApiKey: string;
  settingsLlmHint: string; settingsTranslationTitle: string; settingsTranslationProvider: string; settingsTranslationProviderHint: string; settingsTranslationProviderDeepL: string;
  settingsTranslationApiKey: string; settingsTranslationApiKeyPlaceholder: string; settingsTranslationTestConnection: string; settingsTranslationShowApiKey: string;
  settingsTranslationHideApiKey: string; settingsTranslationHint: string;
};

export type SettingsPartProps = {
  labels: SettingsPartLabels; isSettingsLoading: boolean; locale: Locale; batchSources: BatchSource[];
  onBatchSourceUrlChange: (index: number, url: string) => void; onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void; onAddBatchSource: () => void;
  onRemoveBatchSource: (index: number) => void; onMoveBatchSource: (index: number, direction: 'up' | 'down') => void; batchLimit: number; onBatchLimitChange: (value: string) => void;
  sameDomainOnly: boolean; onSameDomainOnlyChange: (checked: boolean) => void; useMica: boolean; onUseMicaChange: (checked: boolean) => void; knowledgeBaseEnabled: boolean;
  onKnowledgeBaseEnabledChange: (checked: boolean) => void; autoIndexDownloadedPdf: boolean; onAutoIndexDownloadedPdfChange: (checked: boolean) => void; knowledgeBasePdfDownloadDir: string; onKnowledgeBasePdfDownloadDirChange: (value: string) => void; onChooseKnowledgeBasePdfDownloadDir: () => void; libraryStorageMode: LibraryStorageMode;
  onLibraryStorageModeChange: (value: LibraryStorageMode) => void; libraryDirectory: string; onLibraryDirectoryChange: (value: string) => void; onChooseLibraryDirectory: () => void;
  maxConcurrentIndexJobs: number; onMaxConcurrentIndexJobsChange: (value: string) => void; activeRagProvider: RagProviderId; ragProviders: Record<RagProviderId, RagProviderSettings>;
  onRagProviderApiKeyChange: (provider: RagProviderId, apiKey: string) => void; onRagProviderBaseUrlChange: (provider: RagProviderId, baseUrl: string) => void;
  onRagProviderEmbeddingModelChange: (provider: RagProviderId, model: string) => void; onRagProviderRerankerModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderEmbeddingPathChange: (provider: RagProviderId, path: string) => void; onRagProviderRerankPathChange: (provider: RagProviderId, path: string) => void;
  retrievalCandidateCount: number; onRetrievalCandidateCountChange: (value: string) => void; retrievalTopK: number; onRetrievalTopKChange: (value: string) => void;
  onTestRagConnection: () => void; isLibraryLoading: boolean; libraryDocumentCount: number; libraryFileCount: number; libraryQueuedJobCount: number; libraryDocuments: LibraryDocumentSummary[];
  libraryDbFile: string; defaultManagedDirectory: string; ragCacheDir: string; pdfDownloadDir: string; pdfFileNameUseSelectionOrder: boolean; onPdfDownloadDirChange: (value: string) => void;
  onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void; onChoosePdfDownloadDir: () => void; activeLlmProvider: LlmProviderId; onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>; onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void; onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  activeTranslationProvider: TranslationProviderId; onActiveTranslationProviderChange: (provider: TranslationProviderId) => void; translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void; onTestLlmConnection: () => void; onTestTranslationConnection: () => void;
  onOpenConfigLocation: () => void; desktopRuntime: boolean; configPath: string; isSettingsSaving: boolean; isTestingRagConnection: boolean; isTestingLlmConnection: boolean;
  isTestingTranslationConnection: boolean; onResetDownloadDir: () => void;
};

export type SettingsPartState = {
  ui: LocaleMessages; isSettingsLoading: boolean; locale: Locale; batchSources: BatchSource[]; batchLimit: number; sameDomainOnly: boolean; useMica: boolean;
  knowledgeBaseEnabled: boolean; autoIndexDownloadedPdf: boolean; knowledgeBasePdfDownloadDir: string; libraryStorageMode: LibraryStorageMode; libraryDirectory: string; maxConcurrentIndexJobs: number; activeRagProvider: RagProviderId;
  ragProviders: Record<RagProviderId, RagProviderSettings>; retrievalCandidateCount: number; retrievalTopK: number; pdfDownloadDir: string; pdfFileNameUseSelectionOrder: boolean;
  activeLlmProvider: LlmProviderId; llmProviders: Record<LlmProviderId, LlmProviderSettings>; activeTranslationProvider: TranslationProviderId; translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  desktopRuntime: boolean; configPath: string; isLibraryLoading: boolean; libraryDocumentCount: number; libraryFileCount: number; libraryQueuedJobCount: number; libraryDocuments: LibraryDocumentSummary[];
  libraryDbFile: string; defaultManagedDirectory: string; ragCacheDir: string; isSettingsSaving: boolean; isTestingRagConnection: boolean; isTestingLlmConnection: boolean; isTestingTranslationConnection: boolean;
};

export type SettingsPartActions = {
  onBatchSourceUrlChange: (index: number, url: string) => void; onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void;
  onAddBatchSource: () => void; onRemoveBatchSource: (index: number) => void; onMoveBatchSource: (index: number, direction: 'up' | 'down') => void; onBatchLimitChange: (value: string) => void;
  onSameDomainOnlyChange: (checked: boolean) => void; onUseMicaChange: (checked: boolean) => void; onKnowledgeBaseEnabledChange: (checked: boolean) => void; onAutoIndexDownloadedPdfChange: (checked: boolean) => void; onKnowledgeBasePdfDownloadDirChange: (value: string) => void; onChooseKnowledgeBasePdfDownloadDir: () => void;
  onLibraryStorageModeChange: (value: LibraryStorageMode) => void; onLibraryDirectoryChange: (value: string) => void; onChooseLibraryDirectory: () => void; onMaxConcurrentIndexJobsChange: (value: string) => void;
  onRagProviderApiKeyChange: (provider: RagProviderId, apiKey: string) => void; onRagProviderBaseUrlChange: (provider: RagProviderId, baseUrl: string) => void; onRagProviderEmbeddingModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderRerankerModelChange: (provider: RagProviderId, model: string) => void; onRagProviderEmbeddingPathChange: (provider: RagProviderId, path: string) => void; onRagProviderRerankPathChange: (provider: RagProviderId, path: string) => void;
  onRetrievalCandidateCountChange: (value: string) => void; onRetrievalTopKChange: (value: string) => void; onPdfDownloadDirChange: (value: string) => void; onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void;
  onChoosePdfDownloadDir: () => void; onActiveLlmProviderChange: (provider: LlmProviderId) => void; onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void; onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onActiveTranslationProviderChange: (provider: TranslationProviderId) => void; onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void; onTestRagConnection: () => void;
  onTestLlmConnection: () => void; onTestTranslationConnection: () => void; onOpenConfigLocation: () => void; onResetDownloadDir: () => void;
};
