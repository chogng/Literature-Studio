import {
  useCallback,
  useEffect,
  useMemo,
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
      if (result.kind === 'desktop-only') {
        toast.info(ui.toastDesktopDirPickerOnly);
        return;
      }

      if (result.kind === 'not-selected') {
        toast.info(ui.toastDirNotSelected);
        return;
      }

      toast.success(formatLocalized(ui.toastDirSelected, { dir: result.dir }));
    } catch (pickError) {
      const localizedError = localizeSettingsError(ui, pickError);
      toast.error(formatLocalized(ui.toastPickDirFailed, { error: localizedError }));
    }
  }, [settingsModel, settingsModelContext, ui]);

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
        const localizedError = localizeSettingsError(ui, saveError);
        toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: localizedError }));
      });
    },
    [setLocale, settingsModel, settingsModelContext, ui],
  );

  const handleSaveSettings = useCallback(async () => {
    try {
      const result = await settingsModel.saveSettings({
        ...settingsModelContext,
        locale,
      });
      if (result.locale) {
        setLocale(result.locale);
      }

      toast.success(ui.toastSettingsSaved);
    } catch (saveError) {
      const localizedError = localizeSettingsError(ui, saveError);
      toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: localizedError }));
    }
  }, [locale, setLocale, settingsModel, settingsModelContext, ui]);

  const handleResetDownloadDir = useCallback(() => {
    settingsModel.resetDownloadDir();
    toast.info(ui.toastResetDirInput);
  }, [settingsModel, ui]);

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

  return {
    batchSources: settingsSnapshot.batchSources,
    batchLimit: settingsSnapshot.batchLimit,
    setBatchLimit: settingsModel.setBatchLimit,
    sameDomainOnly: settingsSnapshot.sameDomainOnly,
    setSameDomainOnly: settingsModel.setSameDomainOnly,
    useMica: settingsSnapshot.useMica,
    setUseMica: settingsModel.setUseMica,
    pdfDownloadDir: settingsSnapshot.pdfDownloadDir,
    setPdfDownloadDir: settingsModel.setPdfDownloadDir,
    activeLlmProvider: settingsSnapshot.activeLlmProvider,
    setActiveLlmProvider: settingsModel.setActiveLlmProvider,
    llmProviders: settingsSnapshot.llmProviders,
    setLlmProviderApiKey: settingsModel.setLlmProviderApiKey,
    setLlmProviderModel: settingsModel.setLlmProviderModel,
    configPath: settingsSnapshot.configPath,
    isSettingsLoading: settingsSnapshot.isSettingsLoading,
    isSettingsSaving: settingsSnapshot.isSettingsSaving,
    isTestingLlmConnection: settingsSnapshot.isTestingLlmConnection,
    handleChoosePdfDownloadDir,
    handleOpenConfigLocation,
    handleLocaleChange,
    handleSaveSettings,
    handleTestLlmConnection,
    handleResetDownloadDir,
    handleBatchSourceUrlChange: settingsModel.handleBatchSourceUrlChange,
    handleBatchSourceJournalTitleChange: settingsModel.handleBatchSourceJournalTitleChange,
    handleAddBatchSource: settingsModel.handleAddBatchSource,
    handleRemoveBatchSource: settingsModel.handleRemoveBatchSource,
    handleMoveBatchSource: settingsModel.handleMoveBatchSource,
  };
}
