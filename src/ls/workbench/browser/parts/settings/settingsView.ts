import { jsx, jsxs } from 'react/jsx-runtime';
import type { ChangeEvent, Ref } from 'react';
import { ArrowDown, ArrowUp, FolderOpen, Plus, Trash2 } from 'lucide-react';
import type { Locale } from '../../../../../language/i18n';
import { Button } from '../../../../base/browser/ui/button/button';
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
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
  onResetDownloadDir: () => void;
  onSaveSettings: () => void;
};

type SettingsViewProps = SettingsPartProps & {
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

function renderLocaleButton({
  value,
  activeLocale,
  label,
  onLocaleChange,
}: {
  value: SettingsPartProps['locale'];
  activeLocale: SettingsPartProps['locale'];
  label: string;
  onLocaleChange: SettingsPartProps['onLocaleChange'];
}) {
  const className =
    activeLocale === value ? 'settings-language-btn is-active' : 'settings-language-btn';

  return jsx('button', {
    type: 'button',
    className,
    onClick: () => onLocaleChange(value),
    'aria-pressed': activeLocale === value,
    children: label,
  });
}

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
}: Pick<SettingsViewProps, 'labels' | 'locale' | 'onLocaleChange'>) {
  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsLanguage }),
      jsxs('div', {
        className: 'settings-language-toggle',
        role: 'group',
        'aria-label': labels.settingsLanguage,
        children: [
          renderLocaleButton({
            value: 'zh',
            activeLocale: locale,
            label: labels.languageChinese,
            onLocaleChange,
          }),
          renderLocaleButton({
            value: 'en',
            activeLocale: locale,
            label: labels.languageEnglish,
            onLocaleChange,
          }),
        ],
      }),
      jsx('p', { className: 'settings-hint', children: labels.settingsLanguageHint }),
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
  SettingsViewProps,
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
      jsx('p', { className: 'settings-hint', children: labels.settingsPageUrlHint }),
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
  SettingsViewProps,
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
  SettingsViewProps,
  | 'labels'
  | 'pdfDownloadDir'
  | 'onPdfDownloadDirChange'
  | 'onChoosePdfDownloadDir'
  | 'desktopRuntime'
  | 'isSettingsSaving'
>) {
  const currentDirectory = pdfDownloadDir.trim() ? pdfDownloadDir.trim() : labels.systemDownloads;

  return jsxs('label', {
    className: 'settings-field',
    children: [
      labels.defaultPdfDir,
      jsxs('p', {
        className: 'settings-hint',
        children: [labels.currentDir, currentDirectory],
      }),
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
            size: 'sm',
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
}: Pick<SettingsViewProps, 'labels' | 'configPath'>) {
  return jsxs('label', {
    className: 'settings-field',
    children: [
      labels.settingsConfigPath,
      jsx(Input, {
        className: 'settings-input-control',
        size: 'sm',
        type: 'text',
        value: configPath,
        readOnly: true,
        placeholder: '-',
      }),
    ],
  });
}

export default function SettingsView({
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
  desktopRuntime,
  configPath,
  isSettingsSaving,
  onResetDownloadDir,
  onSaveSettings,
}: SettingsViewProps) {
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
              iconMode: 'without',
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
            jsx('div', {
              className: 'settings-actions',
              children: jsx(Button, {
                type: 'button',
                mode: 'text',
                variant: 'secondary',
                textMode: 'with',
                iconMode: 'without',
                onClick: onResetDownloadDir,
                disabled: !pdfDownloadDir.trim() || isSettingsSaving,
                children: labels.resetDefault,
              }),
            }),
            jsx('p', { className: 'settings-hint', children: labels.settingsHintPath }),
            renderConfigPathField({
              labels,
              configPath,
            }),
          ],
        }),
      ],
    }),
  });
}
