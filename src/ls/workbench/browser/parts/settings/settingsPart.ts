import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, type ChangeEvent, type Ref } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, FolderOpen, Plus, PlugZap, Save, Trash2 } from 'lucide-react';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import { Button } from '../../../../base/browser/ui/button/button';
import { Dropdown } from '../../../../base/browser/ui/dropdown/dropdown';
import { Input } from '../../../../base/browser/ui/input/input';
import { Switch } from '../../../../base/browser/ui/switch/switch';
import type {
  LlmProviderId,
  LlmProviderSettings,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { batchLimitMax, batchLimitMin } from '../../../services/config/configSchema';
import type { BatchSource } from '../../../services/config/configSchema';
import { getLlmModelsForProvider } from '../../../services/llm/registry.js';
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
  settingsAppearanceTitle: string;
  settingsUseMica: string;
  settingsUseMicaHint: string;
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
  settingsLlmTitle: string;
  settingsLlmProvider: string;
  settingsLlmProviderHint: string;
  settingsLlmProviderGlm: string;
  settingsLlmProviderKimi: string;
  settingsLlmProviderDeepSeek: string;
  settingsLlmApiKey: string;
  settingsLlmApiKeyPlaceholder: string;
  settingsLlmModel: string;
  settingsLlmModelPlaceholder: string;
  settingsLlmBaseUrl: string;
  settingsLlmBaseUrlPlaceholder: string;
  settingsLlmTestConnection: string;
  settingsLlmShowApiKey: string;
  settingsLlmHideApiKey: string;
  settingsLlmHint: string;
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
  useMica: boolean;
  onUseMicaChange: (checked: boolean) => void;
  pdfDownloadDir: string;
  onPdfDownloadDirChange: (value: string) => void;
  onChoosePdfDownloadDir: () => void;
  activeLlmProvider: LlmProviderId;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderBaseUrlChange: (provider: LlmProviderId, baseUrl: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onTestLlmConnection: () => void;
  onOpenConfigLocation: () => void;
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
  isTestingLlmConnection: boolean;
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
  useMica: boolean;
  pdfDownloadDir: string;
  activeLlmProvider: LlmProviderId;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
  isTestingLlmConnection: boolean;
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
  onUseMicaChange: (checked: boolean) => void;
  onPdfDownloadDirChange: (value: string) => void;
  onChoosePdfDownloadDir: () => void;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderBaseUrlChange: (provider: LlmProviderId, baseUrl: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onTestLlmConnection: () => void;
  onOpenConfigLocation: () => void;
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
    settingsAppearanceTitle: ui.settingsAppearanceTitle,
    settingsUseMica: ui.settingsUseMica,
    settingsUseMicaHint: ui.settingsUseMicaHint,
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
    settingsLlmTitle: ui.settingsLlmTitle,
    settingsLlmProvider: ui.settingsLlmProvider,
    settingsLlmProviderHint: ui.settingsLlmProviderHint,
    settingsLlmProviderGlm: ui.settingsLlmProviderGlm,
    settingsLlmProviderKimi: ui.settingsLlmProviderKimi,
    settingsLlmProviderDeepSeek: ui.settingsLlmProviderDeepSeek,
    settingsLlmApiKey: ui.settingsLlmApiKey,
    settingsLlmApiKeyPlaceholder: ui.settingsLlmApiKeyPlaceholder,
    settingsLlmModel: ui.settingsLlmModel,
    settingsLlmModelPlaceholder: ui.settingsLlmModelPlaceholder,
    settingsLlmBaseUrl: ui.settingsLlmBaseUrl,
    settingsLlmBaseUrlPlaceholder: ui.settingsLlmBaseUrlPlaceholder,
    settingsLlmTestConnection: ui.settingsLlmTestConnection,
    settingsLlmShowApiKey: ui.settingsLlmShowApiKey,
    settingsLlmHideApiKey: ui.settingsLlmHideApiKey,
    settingsLlmHint: ui.settingsLlmHint,
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
    useMica,
    pdfDownloadDir,
    activeLlmProvider,
    llmProviders,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    isTestingLlmConnection,
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
    onUseMicaChange,
    onPdfDownloadDirChange,
    onChoosePdfDownloadDir,
    onActiveLlmProviderChange,
    onLlmProviderApiKeyChange,
    onLlmProviderBaseUrlChange,
    onLlmProviderModelChange,
    onTestLlmConnection,
    onOpenConfigLocation,
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
    useMica,
    onUseMicaChange,
    pdfDownloadDir,
    onPdfDownloadDirChange,
    onChoosePdfDownloadDir,
    activeLlmProvider,
    onActiveLlmProviderChange,
    llmProviders,
    onLlmProviderApiKeyChange,
    onLlmProviderBaseUrlChange,
    onLlmProviderModelChange,
    onTestLlmConnection,
    onOpenConfigLocation,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    isTestingLlmConnection,
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

function renderAppearanceField({
  labels,
  useMica,
  onUseMicaChange,
  isSettingsSaving,
  desktopRuntime,
}: Pick<
  SettingsPartViewProps,
  'labels' | 'useMica' | 'onUseMicaChange' | 'isSettingsSaving' | 'desktopRuntime'
>) {
  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsAppearanceTitle }),
      jsx('label', {
        className: 'inline-field checkbox-field',
        children: jsx(Switch, {
          checked: useMica,
          disabled: isSettingsSaving || !desktopRuntime,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onUseMicaChange(event.target.checked),
          label: labels.settingsUseMica,
        }),
      }),
      jsx('p', { className: 'settings-hint', children: labels.settingsUseMicaHint }),
    ],
  });
}

function LlmField({
  labels,
  activeLlmProvider,
  llmProviders,
  onActiveLlmProviderChange,
  onLlmProviderApiKeyChange,
  onLlmProviderBaseUrlChange,
  onLlmProviderModelChange,
  onTestLlmConnection,
  isSettingsSaving,
  isTestingLlmConnection,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'activeLlmProvider'
  | 'llmProviders'
  | 'onActiveLlmProviderChange'
  | 'onLlmProviderApiKeyChange'
  | 'onLlmProviderBaseUrlChange'
  | 'onLlmProviderModelChange'
  | 'onTestLlmConnection'
  | 'isSettingsSaving'
  | 'isTestingLlmConnection'
>) {
  const [showApiKey, setShowApiKey] = useState(false);
  const providerOptions = [
    { value: 'glm', label: labels.settingsLlmProviderGlm },
    { value: 'kimi', label: labels.settingsLlmProviderKimi },
    { value: 'deepseek', label: labels.settingsLlmProviderDeepSeek },
  ];
  const activeProviderSettings = llmProviders[activeLlmProvider];
  const modelHint = getLlmModelsForProvider(activeLlmProvider)
    .map((model) => model.id)
    .join(', ');

  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsLlmTitle }),
      jsxs('div', {
        className: 'settings-llm-grid',
        children: [
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLlmProvider,
              jsx(Dropdown, {
                className: 'settings-llm-provider',
                size: 'sm',
                value: activeLlmProvider,
                options: providerOptions,
                onChange: (event: { target: { value: string } }) =>
                  onActiveLlmProviderChange(event.target.value as LlmProviderId),
                'aria-label': labels.settingsLlmProvider,
                title: labels.settingsLlmProvider,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLlmModel,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: activeProviderSettings.model,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onLlmProviderModelChange(activeLlmProvider, event.target.value),
                placeholder: modelHint || labels.settingsLlmModelPlaceholder,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLlmBaseUrl,
              jsx(Input, {
                className: 'settings-input-control',
                size: 'sm',
                type: 'text',
                value: activeProviderSettings.baseUrl,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onLlmProviderBaseUrlChange(activeLlmProvider, event.target.value),
                placeholder: labels.settingsLlmBaseUrlPlaceholder,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsLlmApiKey,
              jsxs('div', {
                className: 'settings-input-row',
                children: [
                  jsx(Input, {
                    className: 'settings-input-control settings-api-key-input',
                    size: 'sm',
                    type: showApiKey ? 'text' : 'password',
                    value: activeProviderSettings.apiKey,
                    onChange: (event: ChangeEvent<HTMLInputElement>) =>
                      onLlmProviderApiKeyChange(activeLlmProvider, event.target.value),
                    placeholder: labels.settingsLlmApiKeyPlaceholder,
                    rightIcon: jsx('button', {
                      type: 'button',
                      className: 'settings-password-toggle',
                      onClick: () => setShowApiKey((currentValue) => !currentValue),
                      'aria-label': showApiKey
                        ? labels.settingsLlmHideApiKey
                        : labels.settingsLlmShowApiKey,
                      title: showApiKey
                        ? labels.settingsLlmHideApiKey
                        : labels.settingsLlmShowApiKey,
                      children: showApiKey
                        ? jsx(EyeOff, { size: 16, strokeWidth: 1.8 })
                        : jsx(Eye, { size: 16, strokeWidth: 1.8 }),
                    }),
                  }),
                  jsx(Button, {
                    type: 'button',
                    mode: 'text',
                    variant: 'primary',
                    size: 'md',
                    textMode: 'with',
                    iconMode: 'with',
                    leftIcon: jsx(PlugZap, { size: 14, strokeWidth: 1.8 }),
                    isLoading: isTestingLlmConnection,
                    onClick: onTestLlmConnection,
                    disabled: isSettingsSaving,
                    children: labels.settingsLlmTestConnection,
                  }),
                ],
              }),
            ],
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
  useMica,
  onUseMicaChange,
  pdfDownloadDir,
  onPdfDownloadDirChange,
  onChoosePdfDownloadDir,
  activeLlmProvider,
  onActiveLlmProviderChange,
  llmProviders,
  onLlmProviderApiKeyChange,
  onLlmProviderBaseUrlChange,
  onLlmProviderModelChange,
  onTestLlmConnection,
  onOpenConfigLocation,
  desktopRuntime,
  configPath,
  isSettingsSaving,
  isTestingLlmConnection,
  onSaveSettings,
}: SettingsPartViewProps) {
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
            renderAppearanceField({
              labels,
              useMica,
              onUseMicaChange,
              isSettingsSaving,
              desktopRuntime,
            }),
            renderDownloadDirectoryField({
              labels,
              pdfDownloadDir,
              onPdfDownloadDirChange,
              onChoosePdfDownloadDir,
              desktopRuntime,
              isSettingsSaving,
            }),
            jsx(LlmField, {
              labels,
              activeLlmProvider,
              llmProviders,
              onActiveLlmProviderChange,
              onLlmProviderApiKeyChange,
              onLlmProviderBaseUrlChange,
              onLlmProviderModelChange,
              onTestLlmConnection,
              isSettingsSaving,
              isTestingLlmConnection,
            }),
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
