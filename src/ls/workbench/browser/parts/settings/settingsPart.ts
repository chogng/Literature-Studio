import { jsx, jsxs } from 'react/jsx-runtime';
import type { ChangeEvent, Ref } from 'react';
import { ArrowDown, ArrowUp, FolderOpen, Plus, Save, Trash2 } from 'lucide-react';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import { Button } from '../../../../base/browser/ui/button/button';
import { Dropdown } from '../../../../base/browser/ui/dropdown/dropdown';
import { Input } from '../../../../base/browser/ui/input/input';
import { batchLimitMax, batchLimitMin } from '../../../services/config/configSchema';
import type { BatchSource } from '../../../services/config/configSchema';
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
  settingsBatchHint: string;
  defaultPdfDir: string;
  downloadDirPlaceholder: string;
  chooseDirectory: string;
  openConfigLocation: string;
  resetDefault: string;
  saving: string;
  saveSettings: string;
  settingsHintPath: string;
  settingsConfigPath: string;
  currentDir: string;
  systemDownloads: string;
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
  pdfDownloadDir: string;
  onPdfDownloadDirChange: (value: string) => void;
  onChoosePdfDownloadDir: () => void;
  onOpenConfigLocation: () => void;
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
  showModalStyleTestButton: boolean;
  onOpenModalStyleTest: () => void;
  onResetDownloadDir: () => void;
  onSaveSettings: () => void;
};

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
  showModalStyleTestButton: boolean;
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
  onOpenConfigLocation: () => void;
  onOpenModalStyleTest: () => void;
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
    openConfigLocation: ui.openConfigLocation,
    resetDefault: ui.resetDefault,
    saving: ui.saving,
    saveSettings: ui.saveSettings,
    settingsHintPath: ui.settingsHintPath,
    settingsConfigPath: ui.settingsConfigPath,
    currentDir: ui.currentDir,
    systemDownloads: ui.systemDownloads,
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
    pdfDownloadDir,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    showModalStyleTestButton,
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
    onOpenConfigLocation,
    onOpenModalStyleTest,
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
    onOpenConfigLocation,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    showModalStyleTestButton,
    onOpenModalStyleTest,
    onResetDownloadDir,
    onSaveSettings,
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
  onPdfDownloadDirChange,
  onChoosePdfDownloadDir,
  desktopRuntime,
  isSettingsSaving,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'pdfDownloadDir'
  | 'onPdfDownloadDirChange'
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
  pdfDownloadDir,
  onPdfDownloadDirChange,
  onChoosePdfDownloadDir,
  onOpenConfigLocation,
  desktopRuntime,
  configPath,
  isSettingsSaving,
  showModalStyleTestButton,
  onOpenModalStyleTest,
  onResetDownloadDir,
  onSaveSettings,
}: SettingsPartViewProps) {
  const modalStyleTestButtonLabel =
    locale === 'zh' ? '弹窗样式测试' : 'Modal Style Test';

  return jsx('main', {
    ref: partRef,
    className: 'settings-page',
    children: jsxs('section', {
      className: 'panel settings-card',
      children: [
        jsxs('div', {
          className: 'panel-title settings-header',
          children: [
            jsx('span', { children: labels.settingsTitle }),
            jsx(Button, {
              type: 'button',
              mode: 'text',
              variant: 'primary',
              textMode: 'with',
              iconMode: 'with',
              leftIcon: jsx(Save, { size: 14, strokeWidth: 1.8 }),
              onClick: onSaveSettings,
              disabled: isSettingsLoading || isSettingsSaving,
              children: isSettingsSaving ? labels.saving : labels.saveSettings,
            }),
          ],
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
            renderDownloadDirectoryField({
              labels,
              pdfDownloadDir,
              onPdfDownloadDirChange,
              onChoosePdfDownloadDir,
              desktopRuntime,
              isSettingsSaving,
            }),
            showModalStyleTestButton
              ? jsx('div', {
                  className: 'settings-actions',
                  children: jsx(Button, {
                    type: 'button',
                    mode: 'text',
                    variant: 'outline',
                    textMode: 'with',
                    iconMode: 'without',
                    onClick: onOpenModalStyleTest,
                    disabled: isSettingsLoading || isSettingsSaving || !desktopRuntime,
                    children: modalStyleTestButtonLabel,
                  }),
                })
              : null,
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
