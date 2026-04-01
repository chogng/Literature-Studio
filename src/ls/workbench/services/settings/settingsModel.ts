import type { ElectronInvoke } from 'ls/base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../../language/i18n';
import {
  type BatchSource,
  defaultBatchLimit,
  defaultSameDomainOnly,
} from 'ls/workbench/services/config/configSchema';
import {
  type LibraryStorageMode,
  type LlmProviderId,
  type LlmProviderSettings,
  type RagProviderId,
  type RagProviderSettings,
  type TranslationProviderId,
  type TranslationProviderSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes.js';
import {
  buildSaveSettingsPayload,
  loadAppSettings,
  resolveSettingsState,
  saveAppSettings,
  saveAppSettingsPartial,
} from 'ls/workbench/services/settings/settingsService';
import {
  createDefaultKnowledgeBaseSettings,
} from 'ls/workbench/services/knowledgeBase/config.js';
import {
  addBatchSource,
  moveBatchSource,
  removeBatchSource,
  updateBatchSourceJournalTitle,
  updateBatchSourceUrl,
} from 'ls/workbench/services/settings/settingsEditing';
import { cloneLlmSettings, createDefaultLlmSettings } from 'ls/workbench/services/llm/config.js';
import { resolveLlmRoute } from 'ls/workbench/services/llm/routing.js';
import { cloneRagSettings, createDefaultRagSettings } from 'ls/workbench/services/rag/config.js';
import { resolveRagRoute } from 'ls/workbench/services/rag/routing.js';
import { cloneTranslationSettings, createDefaultTranslationSettings } from 'ls/workbench/services/translation/config.js';

export type SettingsModelSnapshot = {
  pdfDownloadDir: string;
  knowledgeBasePdfDownloadDir: string;
  pdfFileNameUseSelectionOrder: boolean;
  batchSources: BatchSource[];
  batchLimit: number;
  sameDomainOnly: boolean;
  useMica: boolean;
  knowledgeBaseEnabled: boolean;
  autoIndexDownloadedPdf: boolean;
  libraryStorageMode: LibraryStorageMode;
  libraryDirectory: string;
  maxConcurrentIndexJobs: number;
  activeRagProvider: RagProviderId;
  ragProviders: Record<RagProviderId, RagProviderSettings>;
  retrievalCandidateCount: number;
  retrievalTopK: number;
  activeLlmProvider: LlmProviderId;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  activeTranslationProvider: TranslationProviderId;
  translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  configPath: string;
  isSettingsLoading: boolean;
  isSettingsSaving: boolean;
  isTestingRagConnection: boolean;
  isTestingLlmConnection: boolean;
  isTestingTranslationConnection: boolean;
};

type SettingsModelContext = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
};

type SaveSettingsContext = SettingsModelContext & {
  locale: Locale;
};

export type ChoosePdfDownloadDirResult =
  | {
      kind: 'desktop-only';
    }
  | {
      kind: 'not-selected';
    }
  | {
      kind: 'selected';
      dir: string;
    };

export type LoadSettingsResult = {
  locale: Locale | null;
};

export type SaveSettingsResult = {
  nextDir: string;
  locale: Locale | null;
};

function areJsonEqual(previous: unknown, next: unknown) {
  return JSON.stringify(previous) === JSON.stringify(next);
}

function areSettingsModelSnapshotsEqual(
  previous: SettingsModelSnapshot,
  next: SettingsModelSnapshot,
) {
  return (
    previous.pdfDownloadDir === next.pdfDownloadDir &&
    previous.knowledgeBasePdfDownloadDir === next.knowledgeBasePdfDownloadDir &&
    previous.pdfFileNameUseSelectionOrder === next.pdfFileNameUseSelectionOrder &&
    previous.batchLimit === next.batchLimit &&
    previous.sameDomainOnly === next.sameDomainOnly &&
    previous.useMica === next.useMica &&
    previous.knowledgeBaseEnabled === next.knowledgeBaseEnabled &&
    previous.autoIndexDownloadedPdf === next.autoIndexDownloadedPdf &&
    previous.libraryStorageMode === next.libraryStorageMode &&
    previous.libraryDirectory === next.libraryDirectory &&
    previous.maxConcurrentIndexJobs === next.maxConcurrentIndexJobs &&
    previous.activeRagProvider === next.activeRagProvider &&
    previous.retrievalCandidateCount === next.retrievalCandidateCount &&
    previous.retrievalTopK === next.retrievalTopK &&
    previous.activeLlmProvider === next.activeLlmProvider &&
    previous.activeTranslationProvider === next.activeTranslationProvider &&
    previous.configPath === next.configPath &&
    previous.isSettingsLoading === next.isSettingsLoading &&
    previous.isSettingsSaving === next.isSettingsSaving &&
    previous.isTestingRagConnection === next.isTestingRagConnection &&
    previous.isTestingLlmConnection === next.isTestingLlmConnection &&
    previous.isTestingTranslationConnection === next.isTestingTranslationConnection &&
    areJsonEqual(previous.batchSources, next.batchSources) &&
    areJsonEqual(previous.ragProviders, next.ragProviders) &&
    areJsonEqual(previous.llmProviders, next.llmProviders) &&
    areJsonEqual(previous.translationProviders, next.translationProviders)
  );
}

function createInitialSettingsModelSnapshot(
  initialBatchSources: BatchSource[],
): SettingsModelSnapshot {
  const defaultKnowledgeBaseSettings = createDefaultKnowledgeBaseSettings();
  const defaultRagSettings = createDefaultRagSettings();
  const defaultLlmSettings = createDefaultLlmSettings();
  const defaultTranslationSettings = createDefaultTranslationSettings();

  return {
    pdfDownloadDir: '',
    knowledgeBasePdfDownloadDir: '',
    pdfFileNameUseSelectionOrder: false,
    batchSources: initialBatchSources,
    batchLimit: defaultBatchLimit,
    sameDomainOnly: defaultSameDomainOnly,
    useMica: true,
    knowledgeBaseEnabled: defaultKnowledgeBaseSettings.enabled,
    autoIndexDownloadedPdf: defaultKnowledgeBaseSettings.autoIndexDownloadedPdf,
    libraryStorageMode: defaultKnowledgeBaseSettings.libraryStorageMode,
    libraryDirectory: '',
    maxConcurrentIndexJobs: defaultKnowledgeBaseSettings.maxConcurrentIndexJobs,
    activeRagProvider: defaultRagSettings.activeProvider,
    ragProviders: cloneRagSettings(defaultRagSettings).providers,
    retrievalCandidateCount: defaultRagSettings.retrievalCandidateCount,
    retrievalTopK: defaultRagSettings.retrievalTopK,
    activeLlmProvider: defaultLlmSettings.activeProvider,
    llmProviders: defaultLlmSettings.providers,
    activeTranslationProvider: defaultTranslationSettings.activeProvider,
    translationProviders: defaultTranslationSettings.providers,
    configPath: '',
    isSettingsLoading: false,
    isSettingsSaving: false,
    isTestingRagConnection: false,
    isTestingLlmConnection: false,
    isTestingTranslationConnection: false,
  };
}

export class SettingsModel {
  private snapshot: SettingsModelSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(initialBatchSources: BatchSource[]) {
    this.snapshot = createInitialSettingsModelSnapshot(initialBatchSources);
  }

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setSnapshot(nextSnapshot: SettingsModelSnapshot) {
    if (
      Object.is(this.snapshot, nextSnapshot) ||
      areSettingsModelSnapshotsEqual(this.snapshot, nextSnapshot)
    ) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.emitChange();
  }

  private updateSnapshot(
    updater: (snapshot: SettingsModelSnapshot) => SettingsModelSnapshot,
  ) {
    this.setSnapshot(updater(this.snapshot));
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setBatchLimit = (batchLimit: number) => {
    if (this.snapshot.batchLimit === batchLimit) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      batchLimit,
    }));
  };

  readonly setSameDomainOnly = (sameDomainOnly: boolean) => {
    if (this.snapshot.sameDomainOnly === sameDomainOnly) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      sameDomainOnly,
    }));
  };

  readonly setUseMica = (useMica: boolean) => {
    if (this.snapshot.useMica === useMica) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      useMica,
    }));
  };

  readonly setKnowledgeBaseEnabled = (knowledgeBaseEnabled: boolean) => {
    if (this.snapshot.knowledgeBaseEnabled === knowledgeBaseEnabled) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      knowledgeBaseEnabled,
    }));
  };

  readonly setAutoIndexDownloadedPdf = (autoIndexDownloadedPdf: boolean) => {
    if (this.snapshot.autoIndexDownloadedPdf === autoIndexDownloadedPdf) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      autoIndexDownloadedPdf,
    }));
  };

  readonly setLibraryStorageMode = (libraryStorageMode: LibraryStorageMode) => {
    if (this.snapshot.libraryStorageMode === libraryStorageMode) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      libraryStorageMode,
    }));
  };

  readonly setLibraryDirectory = (libraryDirectory: string) => {
    if (this.snapshot.libraryDirectory === libraryDirectory) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      libraryDirectory,
    }));
  };

  readonly setMaxConcurrentIndexJobs = (maxConcurrentIndexJobs: number) => {
    if (this.snapshot.maxConcurrentIndexJobs === maxConcurrentIndexJobs) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      maxConcurrentIndexJobs,
    }));
  };

  readonly setActiveRagProvider = (activeRagProvider: RagProviderId) => {
    if (this.snapshot.activeRagProvider === activeRagProvider) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      activeRagProvider,
    }));
  };

  readonly setRagProviderApiKey = (provider: RagProviderId, apiKey: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      ragProviders: {
        ...snapshot.ragProviders,
        [provider]: {
          ...snapshot.ragProviders[provider],
          apiKey,
        },
      },
    }));
  };

  readonly setRagProviderBaseUrl = (provider: RagProviderId, baseUrl: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      ragProviders: {
        ...snapshot.ragProviders,
        [provider]: {
          ...snapshot.ragProviders[provider],
          baseUrl,
        },
      },
    }));
  };

  readonly setRagProviderEmbeddingModel = (provider: RagProviderId, embeddingModel: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      ragProviders: {
        ...snapshot.ragProviders,
        [provider]: {
          ...snapshot.ragProviders[provider],
          embeddingModel,
        },
      },
    }));
  };

  readonly setRagProviderRerankerModel = (provider: RagProviderId, rerankerModel: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      ragProviders: {
        ...snapshot.ragProviders,
        [provider]: {
          ...snapshot.ragProviders[provider],
          rerankerModel,
        },
      },
    }));
  };

  readonly setRagProviderEmbeddingPath = (provider: RagProviderId, embeddingPath: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      ragProviders: {
        ...snapshot.ragProviders,
        [provider]: {
          ...snapshot.ragProviders[provider],
          embeddingPath,
        },
      },
    }));
  };

  readonly setRagProviderRerankPath = (provider: RagProviderId, rerankPath: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      ragProviders: {
        ...snapshot.ragProviders,
        [provider]: {
          ...snapshot.ragProviders[provider],
          rerankPath,
        },
      },
    }));
  };

  readonly setRetrievalCandidateCount = (retrievalCandidateCount: number) => {
    if (this.snapshot.retrievalCandidateCount === retrievalCandidateCount) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      retrievalCandidateCount,
      retrievalTopK: Math.min(retrievalCandidateCount, snapshot.retrievalTopK),
    }));
  };

  readonly setRetrievalTopK = (retrievalTopK: number) => {
    if (this.snapshot.retrievalTopK === retrievalTopK) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      retrievalTopK: Math.min(snapshot.retrievalCandidateCount, retrievalTopK),
    }));
  };

  readonly setPdfDownloadDir = (pdfDownloadDir: string) => {
    if (this.snapshot.pdfDownloadDir === pdfDownloadDir) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      pdfDownloadDir,
    }));
  };

  readonly setKnowledgeBasePdfDownloadDir = (
    knowledgeBasePdfDownloadDir: string,
  ) => {
    if (this.snapshot.knowledgeBasePdfDownloadDir === knowledgeBasePdfDownloadDir) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      knowledgeBasePdfDownloadDir,
    }));
  };

  readonly setPdfFileNameUseSelectionOrder = (pdfFileNameUseSelectionOrder: boolean) => {
    if (this.snapshot.pdfFileNameUseSelectionOrder === pdfFileNameUseSelectionOrder) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      pdfFileNameUseSelectionOrder,
    }));
  };

  readonly setActiveLlmProvider = (activeLlmProvider: LlmProviderId) => {
    if (this.snapshot.activeLlmProvider === activeLlmProvider) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      activeLlmProvider,
    }));
  };

  readonly setLlmProviderApiKey = (provider: LlmProviderId, apiKey: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      llmProviders: {
        ...snapshot.llmProviders,
        [provider]: {
          ...snapshot.llmProviders[provider],
          apiKey,
        },
      },
    }));
  };

  readonly setLlmProviderModel = (provider: LlmProviderId, model: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      llmProviders: {
        ...snapshot.llmProviders,
        [provider]: {
          ...snapshot.llmProviders[provider],
          model,
        },
      },
    }));
  };

  readonly setActiveTranslationProvider = (activeTranslationProvider: TranslationProviderId) => {
    if (this.snapshot.activeTranslationProvider === activeTranslationProvider) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      activeTranslationProvider,
    }));
  };

  readonly setTranslationProviderApiKey = (provider: TranslationProviderId, apiKey: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      translationProviders: {
        ...snapshot.translationProviders,
        [provider]: {
          ...snapshot.translationProviders[provider],
          apiKey,
        },
      },
    }));
  };

  readonly resetDownloadDir = () => {
    this.setPdfDownloadDir('');
  };

  readonly handleBatchSourceUrlChange = (index: number, nextUrl: string) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      batchSources: updateBatchSourceUrl(snapshot.batchSources, index, nextUrl),
    }));
  };

  readonly handleBatchSourceJournalTitleChange = (
    index: number,
    nextJournalTitle: string,
  ) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      batchSources: updateBatchSourceJournalTitle(
        snapshot.batchSources,
        index,
        nextJournalTitle,
      ),
    }));
  };

  readonly handleAddBatchSource = () => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      batchSources: addBatchSource(snapshot.batchSources),
    }));
  };

  readonly handleRemoveBatchSource = (index: number) => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      batchSources: removeBatchSource(snapshot.batchSources, index),
    }));
  };

  readonly handleMoveBatchSource = (index: number, direction: 'up' | 'down') => {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      batchSources: moveBatchSource(snapshot.batchSources, index, direction),
    }));
  };

  async loadSettings({
    desktopRuntime,
    invokeDesktop,
  }: SettingsModelContext): Promise<LoadSettingsResult> {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      isSettingsLoading: true,
    }));

    try {
      const loaded = await loadAppSettings(desktopRuntime, invokeDesktop);
      const resolved = resolveSettingsState(loaded);

      this.updateSnapshot((snapshot) => ({
        ...snapshot,
        pdfDownloadDir: resolved.pdfDownloadDir,
        knowledgeBasePdfDownloadDir: resolved.knowledgeBasePdfDownloadDir,
        pdfFileNameUseSelectionOrder: resolved.pdfFileNameUseSelectionOrder,
        batchSources: resolved.batchSources,
        batchLimit: resolved.batchLimit,
        sameDomainOnly: resolved.sameDomainOnly,
        useMica: resolved.useMica,
        knowledgeBaseEnabled: resolved.knowledgeBase.enabled,
        autoIndexDownloadedPdf: resolved.knowledgeBase.autoIndexDownloadedPdf,
        libraryStorageMode: resolved.knowledgeBase.libraryStorageMode,
        libraryDirectory: resolved.knowledgeBase.libraryDirectory ?? '',
        maxConcurrentIndexJobs: resolved.knowledgeBase.maxConcurrentIndexJobs,
        activeRagProvider: resolved.rag.activeProvider,
        ragProviders: cloneRagSettings(resolved.rag).providers,
        retrievalCandidateCount: resolved.rag.retrievalCandidateCount,
        retrievalTopK: resolved.rag.retrievalTopK,
        activeLlmProvider: resolved.llm.activeProvider,
        llmProviders: cloneLlmSettings(resolved.llm).providers,
        activeTranslationProvider: resolved.translation.activeProvider,
        translationProviders: cloneTranslationSettings(resolved.translation).providers,
        configPath: resolved.configPath,
      }));

      return {
        locale: resolved.locale,
      };
    } finally {
      this.updateSnapshot((snapshot) => ({
        ...snapshot,
        isSettingsLoading: false,
      }));
    }
  }

  async choosePdfDownloadDir({
    desktopRuntime,
    invokeDesktop,
  }: SettingsModelContext): Promise<ChoosePdfDownloadDirResult> {
    if (!desktopRuntime) {
      return {
        kind: 'desktop-only',
      };
    }

    const selected = await invokeDesktop<string | null>('pick_download_directory');
    if (!selected) {
      return {
        kind: 'not-selected',
      };
    }

    this.setPdfDownloadDir(selected);
    return {
      kind: 'selected',
      dir: selected,
    };
  }

  async chooseLibraryDirectory({
    desktopRuntime,
    invokeDesktop,
  }: SettingsModelContext): Promise<ChoosePdfDownloadDirResult> {
    if (!desktopRuntime) {
      return {
        kind: 'desktop-only',
      };
    }

    const selected = await invokeDesktop<string | null>('pick_download_directory');
    if (!selected) {
      return {
        kind: 'not-selected',
      };
    }

    this.setLibraryDirectory(selected);
    return {
      kind: 'selected',
      dir: selected,
    };
  }

  async chooseKnowledgeBasePdfDownloadDir({
    desktopRuntime,
    invokeDesktop,
  }: SettingsModelContext): Promise<ChoosePdfDownloadDirResult> {
    if (!desktopRuntime) {
      return {
        kind: 'desktop-only',
      };
    }

    const selected = await invokeDesktop<string | null>('pick_download_directory');
    if (!selected) {
      return {
        kind: 'not-selected',
      };
    }

    this.setKnowledgeBasePdfDownloadDir(selected);
    return {
      kind: 'selected',
      dir: selected,
    };
  }

  async saveLocale(
    { desktopRuntime, invokeDesktop }: SettingsModelContext,
    locale: Locale,
  ): Promise<void> {
    await saveAppSettingsPartial(desktopRuntime, invokeDesktop, {
      locale,
    });
  }

  async saveSettingsDraft({
    desktopRuntime,
    invokeDesktop,
    locale,
  }: SaveSettingsContext): Promise<void> {
    const {
      pdfDownloadDir,
      knowledgeBasePdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      batchSources,
      batchLimit,
      sameDomainOnly,
      useMica,
      knowledgeBaseEnabled,
      autoIndexDownloadedPdf,
      libraryStorageMode,
      libraryDirectory,
      maxConcurrentIndexJobs,
      activeRagProvider,
      ragProviders,
      retrievalCandidateCount,
      retrievalTopK,
      activeLlmProvider,
      llmProviders,
      activeTranslationProvider,
      translationProviders,
      configPath,
    } =
      this.snapshot;
    const { payload } = buildSaveSettingsPayload({
      pdfDownloadDir,
      knowledgeBasePdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      batchSources,
      batchLimit,
      sameDomainOnly,
      useMica,
      locale,
      knowledgeBase: {
        enabled: knowledgeBaseEnabled,
        autoIndexDownloadedPdf,
        downloadDirectory: knowledgeBasePdfDownloadDir.trim() || null,
        libraryStorageMode,
        libraryDirectory: libraryDirectory.trim() || null,
        maxConcurrentIndexJobs,
      },
      rag: {
        enabled: knowledgeBaseEnabled,
        activeProvider: activeRagProvider,
        providers: cloneRagSettings({
          enabled: knowledgeBaseEnabled,
          activeProvider: activeRagProvider,
          providers: ragProviders,
          retrievalCandidateCount,
          retrievalTopK,
        }).providers,
        retrievalCandidateCount,
        retrievalTopK,
      },
      llm: {
        activeProvider: activeLlmProvider,
        providers: cloneLlmSettings({
          activeProvider: activeLlmProvider,
          providers: llmProviders,
        }).providers,
      },
      translation: {
        activeProvider: activeTranslationProvider,
        providers: cloneTranslationSettings({
          activeProvider: activeTranslationProvider,
          providers: translationProviders,
        }).providers,
      },
    });
    const saved = await saveAppSettings(desktopRuntime, invokeDesktop, payload);
    const resolved = resolveSettingsState(saved, {
      fallbackConfigPath: configPath,
    });

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      pdfDownloadDir: resolved.pdfDownloadDir,
      knowledgeBasePdfDownloadDir: resolved.knowledgeBasePdfDownloadDir,
      pdfFileNameUseSelectionOrder: resolved.pdfFileNameUseSelectionOrder,
      batchSources: resolved.batchSources,
      batchLimit: resolved.batchLimit,
      sameDomainOnly: resolved.sameDomainOnly,
      useMica: resolved.useMica,
      knowledgeBaseEnabled: resolved.knowledgeBase.enabled,
      autoIndexDownloadedPdf: resolved.knowledgeBase.autoIndexDownloadedPdf,
      libraryStorageMode: resolved.knowledgeBase.libraryStorageMode,
      libraryDirectory: resolved.knowledgeBase.libraryDirectory ?? '',
      maxConcurrentIndexJobs: resolved.knowledgeBase.maxConcurrentIndexJobs,
      activeRagProvider: resolved.rag.activeProvider,
      ragProviders: cloneRagSettings(resolved.rag).providers,
      retrievalCandidateCount: resolved.rag.retrievalCandidateCount,
      retrievalTopK: resolved.rag.retrievalTopK,
      activeLlmProvider: resolved.llm.activeProvider,
      llmProviders: cloneLlmSettings(resolved.llm).providers,
      activeTranslationProvider: resolved.translation.activeProvider,
      translationProviders: cloneTranslationSettings(resolved.translation).providers,
      configPath: resolved.configPath,
    }));
  }

  async saveSettings({
    desktopRuntime,
    invokeDesktop,
    locale,
  }: SaveSettingsContext): Promise<SaveSettingsResult> {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      isSettingsSaving: true,
    }));

    const {
      pdfDownloadDir,
      knowledgeBasePdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      batchSources,
      batchLimit,
      sameDomainOnly,
      useMica,
      knowledgeBaseEnabled,
      autoIndexDownloadedPdf,
      libraryStorageMode,
      libraryDirectory,
      maxConcurrentIndexJobs,
      activeRagProvider,
      ragProviders,
      retrievalCandidateCount,
      retrievalTopK,
      activeLlmProvider,
      llmProviders,
      activeTranslationProvider,
      translationProviders,
      configPath,
    } =
      this.snapshot;
    const { nextDir, payload } = buildSaveSettingsPayload({
      pdfDownloadDir,
      knowledgeBasePdfDownloadDir,
      pdfFileNameUseSelectionOrder,
      batchSources,
      batchLimit,
      sameDomainOnly,
      useMica,
      locale,
      knowledgeBase: {
        enabled: knowledgeBaseEnabled,
        autoIndexDownloadedPdf,
        downloadDirectory: knowledgeBasePdfDownloadDir.trim() || null,
        libraryStorageMode,
        libraryDirectory: libraryDirectory.trim() || null,
        maxConcurrentIndexJobs,
      },
      rag: {
        enabled: knowledgeBaseEnabled,
        activeProvider: activeRagProvider,
        providers: cloneRagSettings({
          enabled: knowledgeBaseEnabled,
          activeProvider: activeRagProvider,
          providers: ragProviders,
          retrievalCandidateCount,
          retrievalTopK,
        }).providers,
        retrievalCandidateCount,
        retrievalTopK,
      },
      llm: {
        activeProvider: activeLlmProvider,
        providers: cloneLlmSettings({
          activeProvider: activeLlmProvider,
          providers: llmProviders,
        }).providers,
      },
      translation: {
        activeProvider: activeTranslationProvider,
        providers: cloneTranslationSettings({
          activeProvider: activeTranslationProvider,
          providers: translationProviders,
        }).providers,
      },
    });

    try {
      const saved = await saveAppSettings(desktopRuntime, invokeDesktop, payload);
      const resolved = resolveSettingsState(saved, {
        fallbackConfigPath: configPath,
      });

      this.updateSnapshot((snapshot) => ({
        ...snapshot,
        pdfDownloadDir: resolved.pdfDownloadDir,
        knowledgeBasePdfDownloadDir: resolved.knowledgeBasePdfDownloadDir,
        pdfFileNameUseSelectionOrder: resolved.pdfFileNameUseSelectionOrder,
        batchSources: resolved.batchSources,
        batchLimit: resolved.batchLimit,
        sameDomainOnly: resolved.sameDomainOnly,
        useMica: resolved.useMica,
        knowledgeBaseEnabled: resolved.knowledgeBase.enabled,
        autoIndexDownloadedPdf: resolved.knowledgeBase.autoIndexDownloadedPdf,
        libraryStorageMode: resolved.knowledgeBase.libraryStorageMode,
        libraryDirectory: resolved.knowledgeBase.libraryDirectory ?? '',
        maxConcurrentIndexJobs: resolved.knowledgeBase.maxConcurrentIndexJobs,
        activeRagProvider: resolved.rag.activeProvider,
        ragProviders: cloneRagSettings(resolved.rag).providers,
        retrievalCandidateCount: resolved.rag.retrievalCandidateCount,
        retrievalTopK: resolved.rag.retrievalTopK,
        activeLlmProvider: resolved.llm.activeProvider,
        llmProviders: cloneLlmSettings(resolved.llm).providers,
        activeTranslationProvider: resolved.translation.activeProvider,
        translationProviders: cloneTranslationSettings(resolved.translation).providers,
        configPath: resolved.configPath,
      }));

      return {
        nextDir,
        locale: resolved.locale,
      };
    } finally {
      this.updateSnapshot((snapshot) => ({
        ...snapshot,
        isSettingsSaving: false,
      }));
    }
  }

  async testLlmConnection({
    invokeDesktop,
  }: SettingsModelContext) {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      isTestingLlmConnection: true,
    }));

    try {
      const { activeLlmProvider, llmProviders } = this.snapshot;
      const route = resolveLlmRoute(
        {
          activeProvider: activeLlmProvider,
          providers: llmProviders,
        },
        'chat',
      );

      return await invokeDesktop('test_llm_connection', {
        provider: route.provider,
        apiKey: route.apiKey,
        baseUrl: route.baseUrl,
        model: route.model,
      });
    } finally {
      this.updateSnapshot((snapshot) => ({
        ...snapshot,
        isTestingLlmConnection: false,
      }));
    }
  }

  async testRagConnection({
    invokeDesktop,
  }: SettingsModelContext) {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      isTestingRagConnection: true,
    }));

    try {
      const {
        activeRagProvider,
        ragProviders,
        retrievalCandidateCount,
        retrievalTopK,
        knowledgeBaseEnabled,
      } = this.snapshot;
      const route = resolveRagRoute({
        enabled: knowledgeBaseEnabled,
        activeProvider: activeRagProvider,
        providers: ragProviders,
        retrievalCandidateCount,
        retrievalTopK,
      });

      return await invokeDesktop('test_rag_connection', {
        provider: route.provider,
        apiKey: route.apiKey,
        baseUrl: route.baseUrl,
        embeddingModel: route.embeddingModel,
        rerankerModel: route.rerankerModel,
        embeddingPath: route.embeddingPath,
        rerankPath: route.rerankPath,
      });
    } finally {
      this.updateSnapshot((snapshot) => ({
        ...snapshot,
        isTestingRagConnection: false,
      }));
    }
  }

  async testTranslationConnection({
    invokeDesktop,
  }: SettingsModelContext) {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      isTestingTranslationConnection: true,
    }));

    try {
      const { activeTranslationProvider, translationProviders } = this.snapshot;
      const providerSettings = translationProviders[activeTranslationProvider];

      return await invokeDesktop('test_translation_connection', {
        provider: activeTranslationProvider,
        apiKey: providerSettings.apiKey,
        baseUrl: providerSettings.baseUrl,
      });
    } finally {
      this.updateSnapshot((snapshot) => ({
        ...snapshot,
        isTestingTranslationConnection: false,
      }));
    }
  }
}
