import type { ElectronInvoke } from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../../language/i18n';
import {
  type BatchSource,
  defaultBatchLimit,
  defaultSameDomainOnly,
} from '../config/configSchema';
import {
  type LlmProviderId,
  type LlmProviderSettings,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import {
  buildSaveSettingsPayload,
  loadAppSettings,
  resolveSettingsState,
  saveAppSettings,
  saveAppSettingsPartial,
} from './settingsService';
import {
  addBatchSource,
  moveBatchSource,
  removeBatchSource,
  updateBatchSourceJournalTitle,
  updateBatchSourceUrl,
} from './settingsEditing';
import { cloneLlmSettings, createDefaultLlmSettings } from '../llm/config.js';
import { resolveLlmRoute } from '../llm/routing.js';

export type SettingsModelSnapshot = {
  pdfDownloadDir: string;
  batchSources: BatchSource[];
  batchLimit: number;
  sameDomainOnly: boolean;
  useMica: boolean;
  activeLlmProvider: LlmProviderId;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  configPath: string;
  isSettingsLoading: boolean;
  isSettingsSaving: boolean;
  isTestingLlmConnection: boolean;
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

function createInitialSettingsModelSnapshot(
  initialBatchSources: BatchSource[],
): SettingsModelSnapshot {
  const defaultLlmSettings = createDefaultLlmSettings();

  return {
    pdfDownloadDir: '',
    batchSources: initialBatchSources,
    batchLimit: defaultBatchLimit,
    sameDomainOnly: defaultSameDomainOnly,
    useMica: true,
    activeLlmProvider: defaultLlmSettings.activeProvider,
    llmProviders: defaultLlmSettings.providers,
    configPath: '',
    isSettingsLoading: false,
    isSettingsSaving: false,
    isTestingLlmConnection: false,
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
    if (Object.is(this.snapshot, nextSnapshot)) {
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

  readonly setPdfDownloadDir = (pdfDownloadDir: string) => {
    if (this.snapshot.pdfDownloadDir === pdfDownloadDir) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      pdfDownloadDir,
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
        batchSources: resolved.batchSources,
        batchLimit: resolved.batchLimit,
        sameDomainOnly: resolved.sameDomainOnly,
        useMica: resolved.useMica,
        activeLlmProvider: resolved.llm.activeProvider,
        llmProviders: cloneLlmSettings(resolved.llm).providers,
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

  async saveLocale(
    { desktopRuntime, invokeDesktop }: SettingsModelContext,
    locale: Locale,
  ): Promise<void> {
    await saveAppSettingsPartial(desktopRuntime, invokeDesktop, {
      locale,
    });
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
      batchSources,
      batchLimit,
      sameDomainOnly,
      useMica,
      activeLlmProvider,
      llmProviders,
      configPath,
    } =
      this.snapshot;
    const { nextDir, payload } = buildSaveSettingsPayload({
      pdfDownloadDir,
      batchSources,
      batchLimit,
      sameDomainOnly,
      useMica,
      locale,
      llm: {
        activeProvider: activeLlmProvider,
        providers: cloneLlmSettings({
          activeProvider: activeLlmProvider,
          providers: llmProviders,
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
        batchSources: resolved.batchSources,
        batchLimit: resolved.batchLimit,
        sameDomainOnly: resolved.sameDomainOnly,
        useMica: resolved.useMica,
        activeLlmProvider: resolved.llm.activeProvider,
        llmProviders: cloneLlmSettings(resolved.llm).providers,
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
}
