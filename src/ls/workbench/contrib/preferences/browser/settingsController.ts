import { toast } from '../../../../base/browser/ui/toast/toast';
import type { ElectronInvoke } from '../../../../base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from '../../../services/desktop/desktopError';
import { type BatchSource } from '../../../services/config/configSchema';
import {
  SettingsModel,
  type SettingsModelSnapshot,
} from '../../../services/settings/settingsModel';

export type SettingsControllerContext = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
  ui: LocaleMessages;
  locale: Locale;
};

type SettingsModelContext = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
};

type CreateSettingsControllerParams = SettingsControllerContext & {
  initialBatchSources: BatchSource[];
};

const immediateAutoSaveDelayMs = 0;
const debouncedAutoSaveDelayMs = 650;

function localizeSettingsError(ui: LocaleMessages, error: unknown) {
  return localizeDesktopInvokeError(ui, parseDesktopInvokeError(error));
}

export class SettingsController {
  private context: SettingsControllerContext;
  private readonly settingsModel: SettingsModel;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  private disposed = false;
  private loadSequence = 0;

  constructor({ initialBatchSources, ...context }: CreateSettingsControllerParams) {
    this.context = context;
    this.settingsModel = new SettingsModel(initialBatchSources);
  }

  readonly subscribe = (listener: () => void) =>
    this.settingsModel.subscribe(listener);

  readonly getSnapshot = (): SettingsModelSnapshot =>
    this.settingsModel.getSnapshot();

  readonly setContext = (context: SettingsControllerContext) => {
    this.context = context;
  };

  readonly start = () => {
    if (this.started || this.disposed) {
      return;
    }

    this.started = true;
    void this.loadSettings();
  };

  readonly dispose = () => {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.flushAutoSave();
    }

    this.disposed = true;
  };

  readonly handleChoosePdfDownloadDir = async () => {
    try {
      const result = await this.settingsModel.choosePdfDownloadDir(
        this.getSettingsModelContext(),
      );
      if (result.kind === 'selected') {
        this.scheduleImmediateAutoSave();
      }
    } catch (pickError) {
      console.error('Failed to choose PDF download directory.', pickError);
    }
  };

  readonly handleChooseKnowledgeBasePdfDownloadDir = async () => {
    try {
      const result = await this.settingsModel.chooseKnowledgeBasePdfDownloadDir(
        this.getSettingsModelContext(),
      );
      if (result.kind === 'selected') {
        this.scheduleImmediateAutoSave();
      }
    } catch (pickError) {
      console.error('Failed to choose knowledge-base PDF download directory.', pickError);
    }
  };

  readonly handleChooseLibraryDirectory = async () => {
    try {
      const result = await this.settingsModel.chooseLibraryDirectory(
        this.getSettingsModelContext(),
      );
      if (result.kind === 'selected') {
        this.scheduleImmediateAutoSave();
      }
    } catch (pickError) {
      console.error('Failed to choose library directory.', pickError);
    }
  };

  readonly handleOpenConfigLocation = async () => {
    const { desktopRuntime, invokeDesktop, ui } = this.context;
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopDirPickerOnly);
      return;
    }

    try {
      await invokeDesktop('open_path', {
        path: this.settingsModel.getSnapshot().configPath,
      });
    } catch (openError) {
      const localizedError = localizeSettingsError(ui, openError);
      toast.error(
        formatLocalized(ui.toastOpenConfigLocationFailed, {
          error: localizedError,
        }),
      );
    }
  };

  readonly setBatchLimit = (nextBatchLimit: number) => {
    this.settingsModel.setBatchLimit(nextBatchLimit);
    this.scheduleImmediateAutoSave();
  };

  readonly setSameDomainOnly = (nextSameDomainOnly: boolean) => {
    this.settingsModel.setSameDomainOnly(nextSameDomainOnly);
    this.scheduleImmediateAutoSave();
  };

  readonly setUseMica = (nextUseMica: boolean) => {
    this.settingsModel.setUseMica(nextUseMica);
    this.scheduleImmediateAutoSave();
  };

  readonly setPdfDownloadDir = (nextPdfDownloadDir: string) => {
    this.settingsModel.setPdfDownloadDir(nextPdfDownloadDir);
    this.scheduleDebouncedAutoSave();
  };

  readonly setKnowledgeBasePdfDownloadDir = (
    nextKnowledgeBasePdfDownloadDir: string,
  ) => {
    this.settingsModel.setKnowledgeBasePdfDownloadDir(
      nextKnowledgeBasePdfDownloadDir,
    );
    this.scheduleDebouncedAutoSave();
  };

  readonly setPdfFileNameUseSelectionOrder = (
    nextPdfFileNameUseSelectionOrder: boolean,
  ) => {
    this.settingsModel.setPdfFileNameUseSelectionOrder(
      nextPdfFileNameUseSelectionOrder,
    );
    this.scheduleImmediateAutoSave();
  };

  readonly setKnowledgeBaseEnabled = (nextKnowledgeBaseEnabled: boolean) => {
    this.settingsModel.setKnowledgeBaseEnabled(nextKnowledgeBaseEnabled);
    this.scheduleImmediateAutoSave();
  };

  readonly setAutoIndexDownloadedPdf = (
    nextAutoIndexDownloadedPdf: boolean,
  ) => {
    this.settingsModel.setAutoIndexDownloadedPdf(nextAutoIndexDownloadedPdf);
    this.scheduleImmediateAutoSave();
  };

  readonly setLibraryStorageMode = (
    nextLibraryStorageMode: 'linked-original' | 'managed-copy',
  ) => {
    this.settingsModel.setLibraryStorageMode(nextLibraryStorageMode);
    this.scheduleImmediateAutoSave();
  };

  readonly setLibraryDirectory = (nextLibraryDirectory: string) => {
    this.settingsModel.setLibraryDirectory(nextLibraryDirectory);
    this.scheduleDebouncedAutoSave();
  };

  readonly setMaxConcurrentIndexJobs = (nextMaxConcurrentIndexJobs: number) => {
    this.settingsModel.setMaxConcurrentIndexJobs(nextMaxConcurrentIndexJobs);
    this.scheduleImmediateAutoSave();
  };

  readonly setRagProviderApiKey = (provider: 'moark', apiKey: string) => {
    this.settingsModel.setRagProviderApiKey(provider, apiKey);
    this.scheduleDebouncedAutoSave();
  };

  readonly setRagProviderBaseUrl = (provider: 'moark', baseUrl: string) => {
    this.settingsModel.setRagProviderBaseUrl(provider, baseUrl);
    this.scheduleDebouncedAutoSave();
  };

  readonly setRagProviderEmbeddingModel = (
    provider: 'moark',
    embeddingModel: string,
  ) => {
    this.settingsModel.setRagProviderEmbeddingModel(provider, embeddingModel);
    this.scheduleDebouncedAutoSave();
  };

  readonly setRagProviderRerankerModel = (
    provider: 'moark',
    rerankerModel: string,
  ) => {
    this.settingsModel.setRagProviderRerankerModel(provider, rerankerModel);
    this.scheduleDebouncedAutoSave();
  };

  readonly setRagProviderEmbeddingPath = (
    provider: 'moark',
    embeddingPath: string,
  ) => {
    this.settingsModel.setRagProviderEmbeddingPath(provider, embeddingPath);
    this.scheduleDebouncedAutoSave();
  };

  readonly setRagProviderRerankPath = (provider: 'moark', rerankPath: string) => {
    this.settingsModel.setRagProviderRerankPath(provider, rerankPath);
    this.scheduleDebouncedAutoSave();
  };

  readonly setRetrievalCandidateCount = (nextRetrievalCandidateCount: number) => {
    this.settingsModel.setRetrievalCandidateCount(nextRetrievalCandidateCount);
    this.scheduleImmediateAutoSave();
  };

  readonly setRetrievalTopK = (nextRetrievalTopK: number) => {
    this.settingsModel.setRetrievalTopK(nextRetrievalTopK);
    this.scheduleImmediateAutoSave();
  };

  readonly setActiveLlmProvider = (nextProvider: 'glm' | 'kimi' | 'deepseek') => {
    this.settingsModel.setActiveLlmProvider(nextProvider);
    this.scheduleImmediateAutoSave();
  };

  readonly setLlmProviderApiKey = (
    provider: 'glm' | 'kimi' | 'deepseek',
    apiKey: string,
  ) => {
    this.settingsModel.setLlmProviderApiKey(provider, apiKey);
    this.scheduleDebouncedAutoSave();
  };

  readonly setLlmProviderModel = (
    provider: 'glm' | 'kimi' | 'deepseek',
    model: string,
  ) => {
    this.settingsModel.setLlmProviderModel(provider, model);
    this.scheduleImmediateAutoSave();
  };

  readonly setActiveTranslationProvider = (nextProvider: 'deepl') => {
    this.settingsModel.setActiveTranslationProvider(nextProvider);
    this.scheduleImmediateAutoSave();
  };

  readonly setTranslationProviderApiKey = (
    provider: 'deepl',
    apiKey: string,
  ) => {
    this.settingsModel.setTranslationProviderApiKey(provider, apiKey);
    this.scheduleDebouncedAutoSave();
  };

  readonly handleResetDownloadDir = () => {
    this.settingsModel.resetDownloadDir();
    this.scheduleImmediateAutoSave();
  };

  readonly handleBatchSourceUrlChange = (index: number, nextUrl: string) => {
    this.settingsModel.handleBatchSourceUrlChange(index, nextUrl);
    this.scheduleDebouncedAutoSave();
  };

  readonly handleBatchSourceJournalTitleChange = (
    index: number,
    nextJournalTitle: string,
  ) => {
    this.settingsModel.handleBatchSourceJournalTitleChange(
      index,
      nextJournalTitle,
    );
    this.scheduleDebouncedAutoSave();
  };

  readonly handleAddBatchSource = () => {
    this.settingsModel.handleAddBatchSource();
    this.scheduleImmediateAutoSave();
  };

  readonly handleRemoveBatchSource = (index: number) => {
    this.settingsModel.handleRemoveBatchSource(index);
    this.scheduleImmediateAutoSave();
  };

  readonly handleMoveBatchSource = (index: number, direction: 'up' | 'down') => {
    this.settingsModel.handleMoveBatchSource(index, direction);
    this.scheduleImmediateAutoSave();
  };

  readonly handleTestLlmConnection = async () => {
    const { desktopRuntime, ui } = this.context;
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopLlmTestOnly);
      return;
    }

    try {
      const result = await this.settingsModel.testLlmConnection(
        this.getSettingsModelContext(),
      );
      toast.success(
        formatLocalized(ui.toastLlmConnectionSucceeded, {
          provider: result.provider,
          model: result.model,
        }),
      );
    } catch (testError) {
      const localizedError = localizeSettingsError(ui, testError);
      toast.error(
        formatLocalized(ui.toastLlmConnectionFailed, {
          error: localizedError,
        }),
      );
    }
  };

  readonly handleTestRagConnection = async () => {
    const { desktopRuntime, ui } = this.context;
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopLlmTestOnly);
      return;
    }

    try {
      const result = await this.settingsModel.testRagConnection(
        this.getSettingsModelContext(),
      );
      toast.success(
        formatLocalized(ui.toastRagConnectionSucceeded, {
          provider: result.provider,
          embeddingModel: result.embeddingModel,
          rerankerModel: result.rerankerModel,
        }),
      );
    } catch (testError) {
      const localizedError = localizeSettingsError(ui, testError);
      toast.error(
        formatLocalized(ui.toastRagConnectionFailed, {
          error: localizedError,
        }),
      );
    }
  };

  readonly handleTestTranslationConnection = async () => {
    const { desktopRuntime, ui } = this.context;
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopLlmTestOnly);
      return;
    }

    try {
      const result = await this.settingsModel.testTranslationConnection(
        this.getSettingsModelContext(),
      );
      toast.success(
        formatLocalized(ui.toastTranslationConnectionSucceeded, {
          provider: result.provider,
        }),
      );
    } catch (testError) {
      const localizedError = localizeSettingsError(ui, testError);
      toast.error(
        formatLocalized(ui.toastTranslationConnectionFailed, {
          error: localizedError,
        }),
      );
    }
  };

  private getSettingsModelContext(): SettingsModelContext {
    return {
      desktopRuntime: this.context.desktopRuntime,
      invokeDesktop: this.context.invokeDesktop,
    };
  }

  private loadSettings = async () => {
    const loadSequence = ++this.loadSequence;

    try {
      await this.settingsModel.loadSettings(this.getSettingsModelContext());
      if (this.disposed || loadSequence !== this.loadSequence) {
        return;
      }
    } catch (loadError) {
      if (this.disposed || loadSequence !== this.loadSequence) {
        return;
      }

      const { ui } = this.context;
      const localizedError = localizeSettingsError(ui, loadError);
      toast.error(
        formatLocalized(ui.toastLoadSettingsFailed, { error: localizedError }),
      );
    }
  };

  private flushAutoSave = () => {
    const { locale } = this.context;

    void this.settingsModel
      .saveSettingsDraft({
        ...this.getSettingsModelContext(),
        locale,
      })
      .catch((saveError: unknown) => {
        console.error('Failed to auto-save settings draft.', saveError);
      });
  };

  private scheduleAutoSave(delayMs: number) {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      this.flushAutoSave();
    }, delayMs);
  }

  private scheduleImmediateAutoSave() {
    this.scheduleAutoSave(immediateAutoSaveDelayMs);
  }

  private scheduleDebouncedAutoSave() {
    this.scheduleAutoSave(debouncedAutoSaveDelayMs);
  }
}

// The controller stays feature-local: it coordinates UI actions, autosave, and
// desktop side effects for the preferences editor, while the pure data model
// remains under services/settings.
export function createSettingsController(
  params: CreateSettingsControllerParams,
) {
  return new SettingsController(params);
}
