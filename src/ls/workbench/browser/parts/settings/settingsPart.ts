import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import type { BatchSource } from '../../../services/config/configSchema';
import type { SettingsPartLabels, SettingsPartProps } from './settingsModel';

export type SettingsPartState = {
  ui: LocaleMessages;
  isSettingsLoading: boolean;
  locale: Locale;
  batchSources: BatchSource[];
  batchLimit: number;
  sameDomainOnly: boolean;
  pdfDownloadDir: string;
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
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
  onPdfDownloadDirChange: (value: string) => void;
  onChoosePdfDownloadDir: () => void;
  onResetDownloadDir: () => void;
  onSaveSettings: () => void;
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
    settingsBatchHint: ui.settingsBatchHint,
    defaultPdfDir: ui.defaultPdfDir,
    downloadDirPlaceholder: ui.downloadDirPlaceholder,
    chooseDirectory: ui.chooseDirectory,
    resetDefault: ui.resetDefault,
    saving: ui.saving,
    saveSettings: ui.saveSettings,
    settingsHintPath: ui.settingsHintPath,
    settingsConfigPath: ui.settingsConfigPath,
    currentDir: ui.currentDir,
    systemDownloads: ui.systemDownloads,
  };
}

// Keep settings mapping in the part layer so the settings view can stay focused on rendering.
export function createSettingsPartProps({
  state: {
    ui,
    isSettingsLoading,
    locale,
    batchSources,
    batchLimit,
    sameDomainOnly,
    pdfDownloadDir,
    desktopRuntime,
    configPath,
    isSettingsSaving,
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
    onPdfDownloadDirChange,
    onChoosePdfDownloadDir,
    onResetDownloadDir,
    onSaveSettings,
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
    pdfDownloadDir,
    onPdfDownloadDirChange,
    onChoosePdfDownloadDir,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    onResetDownloadDir,
    onSaveSettings,
  };
}
