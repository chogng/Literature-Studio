import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from '../../../../base/browser/ui/toast/toast';
import type {
  ElectronInvoke,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import { formatLocalized, localizeDesktopInvokeError, parseDesktopInvokeError } from '../../../services/desktop/desktopError';
import { type BatchSource } from '../../../services/config/configSchema';
import { SettingsModel } from '../../../services/settings/settingsModel';

type UseSettingsModelParams = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
  ui: LocaleMessages;
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  initialBatchSources: BatchSource[];
};

type SettingsModelContext = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
};

const immediateAutoSaveDelayMs = 0;
const debouncedAutoSaveDelayMs = 650;

function localizeSettingsError(ui: LocaleMessages, error: unknown) {
  return localizeDesktopInvokeError(ui, parseDesktopInvokeError(error));
}

export function useSettingsModel({
  desktopRuntime,
  invokeDesktop,
  ui,
  locale,
  setLocale,
  initialBatchSources,
}: UseSettingsModelParams) {
  const settingsModel = useMemo(
    () => new SettingsModel(initialBatchSources),
    [initialBatchSources],
  );
  const settingsSnapshot = useSyncExternalStore(
    settingsModel.subscribe,
    settingsModel.getSnapshot,
    settingsModel.getSnapshot,
  );

  const settingsModelContext = useMemo<SettingsModelContext>(
    () => ({
      desktopRuntime,
      invokeDesktop,
    }),
    [desktopRuntime, invokeDesktop],
  );
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushAutoSave = useCallback(() => {
    void settingsModel.saveSettingsDraft({
      ...settingsModelContext,
      locale,
    }).catch((saveError) => {
      console.error('Failed to auto-save settings draft.', saveError);
    });
  }, [locale, settingsModel, settingsModelContext]);

  const scheduleAutoSave = useCallback(
    (delayMs: number) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = null;
        flushAutoSave();
      }, delayMs);
    },
    [flushAutoSave],
  );

  const scheduleImmediateAutoSave = useCallback(() => {
    scheduleAutoSave(immediateAutoSaveDelayMs);
  }, [scheduleAutoSave]);

  const scheduleDebouncedAutoSave = useCallback(() => {
    scheduleAutoSave(debouncedAutoSaveDelayMs);
  }, [scheduleAutoSave]);

  useEffect(() => {
    return () => {
      if (!autoSaveTimerRef.current) {
        return;
      }

      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      flushAutoSave();
    };
  }, [flushAutoSave]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { locale: loadedLocale } = await settingsModel.loadSettings(settingsModelContext);
        if (loadedLocale) {
          setLocale(loadedLocale);
        }
      } catch (loadError) {
        const localizedError = localizeSettingsError(ui, loadError);
        toast.error(formatLocalized(ui.toastLoadSettingsFailed, { error: localizedError }));
      }
    };

    void loadSettings();
  }, [setLocale, settingsModel, settingsModelContext, ui]);

  const handleChoosePdfDownloadDir = useCallback(async () => {
    try {
      const result = await settingsModel.choosePdfDownloadDir(settingsModelContext);
      if (result.kind !== 'selected') {
        return;
      }

      settingsModel.setPdfDownloadDir(result.dir);
      scheduleImmediateAutoSave();
    } catch (pickError) {
      console.error('Failed to choose PDF download directory.', pickError);
    }
  }, [scheduleImmediateAutoSave, settingsModel, settingsModelContext]);

  const handleOpenConfigLocation = useCallback(async () => {
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopDirPickerOnly);
      return;
    }

    try {
      await invokeDesktop('open_path', { path: settingsSnapshot.configPath });
    } catch (openError) {
      const localizedError = localizeSettingsError(ui, openError);
      toast.error(formatLocalized(ui.toastOpenConfigLocationFailed, { error: localizedError }));
    }
  }, [desktopRuntime, invokeDesktop, settingsSnapshot.configPath, ui]);

  const handleLocaleChange = useCallback(
    (nextLocale: Locale) => {
      setLocale(nextLocale);

      void settingsModel.saveLocale(settingsModelContext, nextLocale).catch((saveError) => {
        console.error('Failed to save locale setting.', saveError);
      });
    },
    [setLocale, settingsModel, settingsModelContext],
  );

  const handleBatchLimitChange = useCallback(
    (nextBatchLimit: number) => {
      settingsModel.setBatchLimit(nextBatchLimit);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleSameDomainOnlyChange = useCallback(
    (nextSameDomainOnly: boolean) => {
      settingsModel.setSameDomainOnly(nextSameDomainOnly);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleUseMicaChange = useCallback(
    (nextUseMica: boolean) => {
      settingsModel.setUseMica(nextUseMica);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handlePdfDownloadDirChange = useCallback(
    (nextPdfDownloadDir: string) => {
      settingsModel.setPdfDownloadDir(nextPdfDownloadDir);
      scheduleDebouncedAutoSave();
    },
    [scheduleDebouncedAutoSave, settingsModel],
  );

  const handlePdfFileNameUseSelectionOrderChange = useCallback(
    (nextPdfFileNameUseSelectionOrder: boolean) => {
      settingsModel.setPdfFileNameUseSelectionOrder(nextPdfFileNameUseSelectionOrder);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleActiveLlmProviderChange = useCallback(
    (nextProvider: 'glm' | 'kimi' | 'deepseek') => {
      settingsModel.setActiveLlmProvider(nextProvider);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleLlmProviderApiKeyChange = useCallback(
    (provider: 'glm' | 'kimi' | 'deepseek', apiKey: string) => {
      settingsModel.setLlmProviderApiKey(provider, apiKey);
      scheduleDebouncedAutoSave();
    },
    [scheduleDebouncedAutoSave, settingsModel],
  );

  const handleLlmProviderModelChange = useCallback(
    (provider: 'glm' | 'kimi' | 'deepseek', model: string) => {
      settingsModel.setLlmProviderModel(provider, model);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleActiveTranslationProviderChange = useCallback(
    (nextProvider: 'deepl') => {
      settingsModel.setActiveTranslationProvider(nextProvider);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleTranslationProviderApiKeyChange = useCallback(
    (provider: 'deepl', apiKey: string) => {
      settingsModel.setTranslationProviderApiKey(provider, apiKey);
      scheduleDebouncedAutoSave();
    },
    [scheduleDebouncedAutoSave, settingsModel],
  );

  const handleResetDownloadDir = useCallback(() => {
    settingsModel.resetDownloadDir();
    scheduleImmediateAutoSave();
  }, [scheduleImmediateAutoSave, settingsModel]);

  const handleBatchSourceUrlChange = useCallback(
    (index: number, nextUrl: string) => {
      settingsModel.handleBatchSourceUrlChange(index, nextUrl);
      scheduleDebouncedAutoSave();
    },
    [scheduleDebouncedAutoSave, settingsModel],
  );

  const handleBatchSourceJournalTitleChange = useCallback(
    (index: number, nextJournalTitle: string) => {
      settingsModel.handleBatchSourceJournalTitleChange(index, nextJournalTitle);
      scheduleDebouncedAutoSave();
    },
    [scheduleDebouncedAutoSave, settingsModel],
  );

  const handleAddBatchSource = useCallback(() => {
    settingsModel.handleAddBatchSource();
    scheduleImmediateAutoSave();
  }, [scheduleImmediateAutoSave, settingsModel]);

  const handleRemoveBatchSource = useCallback(
    (index: number) => {
      settingsModel.handleRemoveBatchSource(index);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleMoveBatchSource = useCallback(
    (index: number, direction: 'up' | 'down') => {
      settingsModel.handleMoveBatchSource(index, direction);
      scheduleImmediateAutoSave();
    },
    [scheduleImmediateAutoSave, settingsModel],
  );

  const handleTestLlmConnection = useCallback(async () => {
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopLlmTestOnly);
      return;
    }

    try {
      const result = await settingsModel.testLlmConnection(settingsModelContext);
      toast.success(
        formatLocalized(ui.toastLlmConnectionSucceeded, {
          provider: result.provider,
          model: result.model,
        }),
      );
    } catch (testError) {
      const localizedError = localizeSettingsError(ui, testError);
      toast.error(formatLocalized(ui.toastLlmConnectionFailed, { error: localizedError }));
    }
  }, [desktopRuntime, settingsModel, settingsModelContext, ui]);

  const handleTestTranslationConnection = useCallback(async () => {
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopLlmTestOnly);
      return;
    }

    try {
      const result = await settingsModel.testTranslationConnection(settingsModelContext);
      toast.success(
        formatLocalized(ui.toastTranslationConnectionSucceeded, {
          provider: result.provider,
        }),
      );
    } catch (testError) {
      const localizedError = localizeSettingsError(ui, testError);
      toast.error(formatLocalized(ui.toastTranslationConnectionFailed, { error: localizedError }));
    }
  }, [desktopRuntime, settingsModel, settingsModelContext, ui]);

  return {
    batchSources: settingsSnapshot.batchSources,
    batchLimit: settingsSnapshot.batchLimit,
    setBatchLimit: handleBatchLimitChange,
    sameDomainOnly: settingsSnapshot.sameDomainOnly,
    setSameDomainOnly: handleSameDomainOnlyChange,
    useMica: settingsSnapshot.useMica,
    setUseMica: handleUseMicaChange,
    pdfDownloadDir: settingsSnapshot.pdfDownloadDir,
    setPdfDownloadDir: handlePdfDownloadDirChange,
    pdfFileNameUseSelectionOrder: settingsSnapshot.pdfFileNameUseSelectionOrder,
    setPdfFileNameUseSelectionOrder: handlePdfFileNameUseSelectionOrderChange,
    activeLlmProvider: settingsSnapshot.activeLlmProvider,
    setActiveLlmProvider: handleActiveLlmProviderChange,
    llmProviders: settingsSnapshot.llmProviders,
    setLlmProviderApiKey: handleLlmProviderApiKeyChange,
    setLlmProviderModel: handleLlmProviderModelChange,
    activeTranslationProvider: settingsSnapshot.activeTranslationProvider,
    setActiveTranslationProvider: handleActiveTranslationProviderChange,
    translationProviders: settingsSnapshot.translationProviders,
    setTranslationProviderApiKey: handleTranslationProviderApiKeyChange,
    configPath: settingsSnapshot.configPath,
    isSettingsLoading: settingsSnapshot.isSettingsLoading,
    isSettingsSaving: settingsSnapshot.isSettingsSaving,
    isTestingLlmConnection: settingsSnapshot.isTestingLlmConnection,
    isTestingTranslationConnection: settingsSnapshot.isTestingTranslationConnection,
    handleChoosePdfDownloadDir,
    handleOpenConfigLocation,
    handleLocaleChange,
    handleUseMicaChange,
    handleTestLlmConnection,
    handleTestTranslationConnection,
    handleResetDownloadDir,
    handleBatchSourceUrlChange,
    handleBatchSourceJournalTitleChange,
    handleAddBatchSource,
    handleRemoveBatchSource,
    handleMoveBatchSource,
  };
}
