import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from '../components/Toast';
import type { Locale } from '../language/i18n';
import type { LocaleMessages } from '../language/locales';
import {
  createEmptyBatchSource,
  type BatchSource,
  defaultBatchLimit,
  defaultSameDomainOnly,
} from '../services/config-schema';
import {
  formatLocalized,
  localizeDesktopInvokeError,
  parseDesktopInvokeError,
} from '../services/desktopError';
import {
  buildSaveSettingsPayload,
  loadAppSettings,
  resolveSettingsState,
  saveAppSettings,
  saveAppSettingsPartial,
} from '../services/settings';
import { resolveNextJournalTitleOnUrlChange } from '../services/source-journal-title';
import { sanitizeUrlInput } from '../utils/url';

type DesktopInvokeArgs = Record<string, unknown> | undefined;
type InvokeDesktop = <T,>(command: string, args?: DesktopInvokeArgs) => Promise<T>;

type BatchSourceHandlers = {
  handleBatchSourceUrlChange: (index: number, nextUrl: string) => void;
  handleBatchSourceJournalTitleChange: (index: number, nextJournalTitle: string) => void;
  handleAddBatchSource: () => void;
  handleRemoveBatchSource: (index: number) => void;
  handleMoveBatchSource: (index: number, direction: 'up' | 'down') => void;
};

function buildBatchSourceHandlers(
  setBatchSources: Dispatch<SetStateAction<BatchSource[]>>,
): BatchSourceHandlers {
  const handleBatchSourceUrlChange = (index: number, nextUrl: string) => {
    const sanitizedUrl = sanitizeUrlInput(nextUrl);
    setBatchSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index
          ? {
              ...source,
              url: sanitizedUrl,
              journalTitle: resolveNextJournalTitleOnUrlChange({
                currentJournalTitle: source.journalTitle,
                previousUrl: source.url,
                nextUrl: sanitizedUrl,
                sourceTable: current,
              }),
            }
          : source,
      ),
    );
  };

  const handleBatchSourceJournalTitleChange = (index: number, nextJournalTitle: string) => {
    setBatchSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index
          ? {
              ...source,
              journalTitle: nextJournalTitle,
            }
          : source,
      ),
    );
  };

  const handleAddBatchSource = () => {
    setBatchSources((current) => [...current, createEmptyBatchSource()]);
  };

  const handleRemoveBatchSource = (index: number) => {
    setBatchSources((current) => {
      if (current.length <= 1) {
        return [createEmptyBatchSource()];
      }

      return current.filter((_, sourceIndex) => sourceIndex !== index);
    });
  };

  const handleMoveBatchSource = (index: number, direction: 'up' | 'down') => {
    setBatchSources((current) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || index >= current.length || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const currentSource = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = currentSource;
      return next;
    });
  };

  return {
    handleBatchSourceUrlChange,
    handleBatchSourceJournalTitleChange,
    handleAddBatchSource,
    handleRemoveBatchSource,
    handleMoveBatchSource,
  };
}

type UseSettingsStateParams = {
  desktopRuntime: boolean;
  invokeDesktop: InvokeDesktop;
  ui: LocaleMessages;
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  initialBatchSources: BatchSource[];
};

export function useSettingsState({
  desktopRuntime,
  invokeDesktop,
  ui,
  locale,
  setLocale,
  initialBatchSources,
}: UseSettingsStateParams) {
  const [pdfDownloadDir, setPdfDownloadDir] = useState('');
  const [batchSources, setBatchSources] = useState<BatchSource[]>(initialBatchSources);
  const [batchLimit, setBatchLimit] = useState(defaultBatchLimit);
  const [sameDomainOnly, setSameDomainOnly] = useState(defaultSameDomainOnly);
  const [configPath, setConfigPath] = useState('');
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const batchSourceHandlers = useMemo(() => buildBatchSourceHandlers(setBatchSources), [setBatchSources]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);

      try {
        const loaded = await loadAppSettings(desktopRuntime, invokeDesktop);
        const resolved = resolveSettingsState(loaded);

        setPdfDownloadDir(resolved.pdfDownloadDir);
        setBatchSources(resolved.batchSources);
        setBatchLimit(resolved.batchLimit);
        setSameDomainOnly(resolved.sameDomainOnly);
        setConfigPath(resolved.configPath);
        if (resolved.locale) {
          setLocale(resolved.locale);
        }
      } catch (loadError) {
        const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(loadError));
        toast.error(formatLocalized(ui.toastLoadSettingsFailed, { error: localizedError }));
      } finally {
        setIsSettingsLoading(false);
      }
    };

    void loadSettings();
  }, [desktopRuntime, invokeDesktop, setLocale, ui]);

  const handleChoosePdfDownloadDir = useCallback(async () => {
    if (!desktopRuntime) {
      toast.info(ui.toastDesktopDirPickerOnly);
      return;
    }

    try {
      const selected = await invokeDesktop<string | null>('pick_download_directory');
      if (!selected) {
        toast.info(ui.toastDirNotSelected);
        return;
      }

      setPdfDownloadDir(selected);
      toast.success(formatLocalized(ui.toastDirSelected, { dir: selected }));
    } catch (pickError) {
      const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(pickError));
      toast.error(formatLocalized(ui.toastPickDirFailed, { error: localizedError }));
    }
  }, [desktopRuntime, invokeDesktop, ui]);

  const handleLocaleChange = useCallback(
    (nextLocale: Locale) => {
      setLocale(nextLocale);

      void saveAppSettingsPartial(desktopRuntime, invokeDesktop, {
        locale: nextLocale,
      }).catch((saveError) => {
        const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(saveError));
        toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: localizedError }));
      });
    },
    [desktopRuntime, invokeDesktop, setLocale, ui],
  );

  const handleSaveSettings = useCallback(async () => {
    setIsSettingsSaving(true);

    const { nextDir, payload } = buildSaveSettingsPayload({
      pdfDownloadDir,
      batchSources,
      batchLimit,
      sameDomainOnly,
      locale,
    });

    try {
      const saved = await saveAppSettings(desktopRuntime, invokeDesktop, payload);
      const resolved = resolveSettingsState(saved, { fallbackConfigPath: configPath });

      setPdfDownloadDir(resolved.pdfDownloadDir);
      setBatchSources(resolved.batchSources);
      setBatchLimit(resolved.batchLimit);
      setSameDomainOnly(resolved.sameDomainOnly);
      setConfigPath(resolved.configPath);
      if (resolved.locale) {
        setLocale(resolved.locale);
      }

      toast.success(
        nextDir
          ? formatLocalized(ui.toastSettingsSavedWithDir, { dir: nextDir })
          : ui.toastSettingsSavedUseSystemDownloads,
      );
    } catch (saveError) {
      const localizedError = localizeDesktopInvokeError(ui, parseDesktopInvokeError(saveError));
      toast.error(formatLocalized(ui.toastSaveSettingsFailed, { error: localizedError }));
    } finally {
      setIsSettingsSaving(false);
    }
  }, [
    batchLimit,
    batchSources,
    configPath,
    desktopRuntime,
    invokeDesktop,
    locale,
    pdfDownloadDir,
    sameDomainOnly,
    setLocale,
    ui,
  ]);

  const handleResetDownloadDir = useCallback(() => {
    setPdfDownloadDir('');
    toast.info(ui.toastResetDirInput);
  }, [ui]);

  return {
    batchSources,
    setBatchSources,
    batchLimit,
    setBatchLimit,
    sameDomainOnly,
    setSameDomainOnly,
    pdfDownloadDir,
    setPdfDownloadDir,
    configPath,
    isSettingsLoading,
    isSettingsSaving,
    handleChoosePdfDownloadDir,
    handleLocaleChange,
    handleSaveSettings,
    handleResetDownloadDir,
    ...batchSourceHandlers,
  };
}
