import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, type ChangeEvent, type Ref } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, FolderOpen, Plus, PlugZap, Trash2 } from 'lucide-react';
import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import { Button } from '../../../../base/browser/ui/button/button';
import { Dropdown } from '../../../../base/browser/ui/dropdown/dropdown';
import { Input } from '../../../../base/browser/ui/input/input';
import { Switch } from '../../../../base/browser/ui/switch/switch';
import type {
  LlmProviderId,
  LlmProviderSettings,
  TranslationProviderId,
  TranslationProviderSettings,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { batchLimitMax, batchLimitMin } from '../../../services/config/configSchema';
import type { BatchSource } from '../../../services/config/configSchema';
import {
  getDefaultModelForProvider,
  getLlmModelsForProvider,
} from '../../../services/llm/registry.js';
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
  pdfFileNameUseSelectionOrder: string;
  pdfFileNameUseSelectionOrderHint: string;
  downloadDirPlaceholder: string;
  chooseDirectory: string;
  openConfigLocation: string;
  resetDefault: string;
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
  settingsLlmTestConnection: string;
  settingsLlmShowApiKey: string;
  settingsLlmHideApiKey: string;
  settingsLlmHint: string;
  settingsTranslationTitle: string;
  settingsTranslationProvider: string;
  settingsTranslationProviderHint: string;
  settingsTranslationProviderDeepL: string;
  settingsTranslationApiKey: string;
  settingsTranslationApiKeyPlaceholder: string;
  settingsTranslationTestConnection: string;
  settingsTranslationShowApiKey: string;
  settingsTranslationHideApiKey: string;
  settingsTranslationHint: string;
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
  pdfFileNameUseSelectionOrder: boolean;
  onPdfDownloadDirChange: (value: string) => void;
  onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void;
  onChoosePdfDownloadDir: () => void;
  activeLlmProvider: LlmProviderId;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  activeTranslationProvider: TranslationProviderId;
  onActiveTranslationProviderChange: (provider: TranslationProviderId) => void;
  translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void;
  onTestLlmConnection: () => void;
  onTestTranslationConnection: () => void;
  onOpenConfigLocation: () => void;
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
  isTestingLlmConnection: boolean;
  isTestingTranslationConnection: boolean;
  onResetDownloadDir: () => void;
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
  pdfFileNameUseSelectionOrder: boolean;
  activeLlmProvider: LlmProviderId;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  activeTranslationProvider: TranslationProviderId;
  translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  desktopRuntime: boolean;
  configPath: string;
  isSettingsSaving: boolean;
  isTestingLlmConnection: boolean;
  isTestingTranslationConnection: boolean;
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
  onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void;
  onChoosePdfDownloadDir: () => void;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onActiveTranslationProviderChange: (provider: TranslationProviderId) => void;
  onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void;
  onTestLlmConnection: () => void;
  onTestTranslationConnection: () => void;
  onOpenConfigLocation: () => void;
  onResetDownloadDir: () => void;
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
    pdfFileNameUseSelectionOrder: ui.pdfFileNameUseSelectionOrder,
    pdfFileNameUseSelectionOrderHint: ui.pdfFileNameUseSelectionOrderHint,
    downloadDirPlaceholder: ui.downloadDirPlaceholder,
    chooseDirectory: ui.chooseDirectory,
    openConfigLocation: ui.openConfigLocation,
    resetDefault: ui.resetDefault,
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
    settingsLlmTestConnection: ui.settingsLlmTestConnection,
    settingsLlmShowApiKey: ui.settingsLlmShowApiKey,
    settingsLlmHideApiKey: ui.settingsLlmHideApiKey,
    settingsLlmHint: ui.settingsLlmHint,
    settingsTranslationTitle: ui.settingsTranslationTitle,
    settingsTranslationProvider: ui.settingsTranslationProvider,
    settingsTranslationProviderHint: ui.settingsTranslationProviderHint,
    settingsTranslationProviderDeepL: ui.settingsTranslationProviderDeepL,
    settingsTranslationApiKey: ui.settingsTranslationApiKey,
    settingsTranslationApiKeyPlaceholder: ui.settingsTranslationApiKeyPlaceholder,
    settingsTranslationTestConnection: ui.settingsTranslationTestConnection,
    settingsTranslationShowApiKey: ui.settingsTranslationShowApiKey,
    settingsTranslationHideApiKey: ui.settingsTranslationHideApiKey,
    settingsTranslationHint: ui.settingsTranslationHint,
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
    pdfFileNameUseSelectionOrder,
    activeLlmProvider,
    llmProviders,
    activeTranslationProvider,
    translationProviders,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    isTestingLlmConnection,
    isTestingTranslationConnection,
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
    onPdfFileNameUseSelectionOrderChange,
    onChoosePdfDownloadDir,
    onActiveLlmProviderChange,
    onLlmProviderApiKeyChange,
    onLlmProviderModelChange,
    onActiveTranslationProviderChange,
    onTranslationProviderApiKeyChange,
    onTestLlmConnection,
    onTestTranslationConnection,
    onOpenConfigLocation,
    onResetDownloadDir,
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
    pdfFileNameUseSelectionOrder,
    onPdfDownloadDirChange,
    onPdfFileNameUseSelectionOrderChange,
    onChoosePdfDownloadDir,
    activeLlmProvider,
    onActiveLlmProviderChange,
    llmProviders,
    onLlmProviderApiKeyChange,
    onLlmProviderModelChange,
    activeTranslationProvider,
    onActiveTranslationProviderChange,
    translationProviders,
    onTranslationProviderApiKeyChange,
    onTestLlmConnection,
    onTestTranslationConnection,
    onOpenConfigLocation,
    desktopRuntime,
    configPath,
    isSettingsSaving,
    isTestingLlmConnection,
    isTestingTranslationConnection,
    onResetDownloadDir,
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
  pdfFileNameUseSelectionOrder,
  onPdfDownloadDirChange,
  onPdfFileNameUseSelectionOrderChange,
  onChoosePdfDownloadDir,
  desktopRuntime,
  isSettingsSaving,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'pdfDownloadDir'
  | 'pdfFileNameUseSelectionOrder'
  | 'onPdfDownloadDirChange'
  | 'onPdfFileNameUseSelectionOrderChange'
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
      jsxs('div', {
        className: 'settings-toggle-row',
        children: [
          jsxs('div', {
            children: [
              jsx('span', { className: 'settings-hint', children: labels.pdfFileNameUseSelectionOrder }),
              jsx('p', {
                className: 'settings-hint settings-toggle-subtitle',
                children: labels.pdfFileNameUseSelectionOrderHint,
              }),
            ],
          }),
          jsx(Switch, {
            checked: pdfFileNameUseSelectionOrder,
            disabled: isSettingsSaving,
            onChange: (event: ChangeEvent<HTMLInputElement>) =>
              onPdfFileNameUseSelectionOrderChange(event.target.checked),
            'aria-label': labels.pdfFileNameUseSelectionOrder,
            title: labels.pdfFileNameUseSelectionOrder,
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
      jsxs('div', {
        className: 'settings-toggle-row',
        children: [
          jsx('span', {
            className: 'settings-hint',
            children: labels.settingsUseMica,
          }),
          jsx(Switch, {
            checked: useMica,
            disabled: isSettingsSaving || !desktopRuntime,
            onChange: (event: ChangeEvent<HTMLInputElement>) =>
              onUseMicaChange(event.target.checked),
            'aria-label': labels.settingsUseMica,
            title: labels.settingsUseMica,
          }),
        ],
      }),
    ],
  });
}

function LlmField({
  labels,
  activeLlmProvider,
  llmProviders,
  onActiveLlmProviderChange,
  onLlmProviderApiKeyChange,
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
  const modelOptions = getLlmModelsForProvider(activeLlmProvider).map((model) => ({
    value: model.id,
    label: model.label,
  }));
  const selectedModelValue =
    modelOptions.find((model) => model.value === activeProviderSettings.model)?.value ??
    getDefaultModelForProvider(activeLlmProvider);

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
              jsx(Dropdown, {
                className: 'settings-llm-provider',
                size: 'sm',
                value: selectedModelValue,
                options: modelOptions,
                onChange: (event: { target: { value: string } }) =>
                  onLlmProviderModelChange(activeLlmProvider, event.target.value),
                'aria-label': labels.settingsLlmModel,
                title: labels.settingsLlmModel,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field settings-llm-api-field',
            children: [
              labels.settingsLlmApiKey,
              jsxs('div', {
                className: 'settings-input-row settings-llm-api-row',
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
                    className: 'settings-llm-test-btn',
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

function TranslationField({
  labels,
  activeTranslationProvider,
  translationProviders,
  onActiveTranslationProviderChange,
  onTranslationProviderApiKeyChange,
  onTestTranslationConnection,
  isSettingsSaving,
  isTestingTranslationConnection,
}: Pick<
  SettingsPartViewProps,
  | 'labels'
  | 'activeTranslationProvider'
  | 'translationProviders'
  | 'onActiveTranslationProviderChange'
  | 'onTranslationProviderApiKeyChange'
  | 'onTestTranslationConnection'
  | 'isSettingsSaving'
  | 'isTestingTranslationConnection'
>) {
  const [showApiKey, setShowApiKey] = useState(false);
  const providerOptions = [{ value: 'deepl', label: labels.settingsTranslationProviderDeepL }];
  const activeProviderSettings = translationProviders[activeTranslationProvider];

  return jsxs('div', {
    className: 'settings-field',
    children: [
      jsx('span', { children: labels.settingsTranslationTitle }),
      jsxs('div', {
        className: 'settings-llm-grid',
        children: [
          jsxs('label', {
            className: 'settings-field',
            children: [
              labels.settingsTranslationProvider,
              jsx(Dropdown, {
                className: 'settings-llm-provider',
                size: 'sm',
                value: activeTranslationProvider,
                options: providerOptions,
                onChange: (event: { target: { value: string } }) =>
                  onActiveTranslationProviderChange(event.target.value as TranslationProviderId),
                'aria-label': labels.settingsTranslationProvider,
                title: labels.settingsTranslationProvider,
              }),
            ],
          }),
          jsxs('label', {
            className: 'settings-field settings-llm-api-field settings-llm-span-2',
            children: [
              labels.settingsTranslationApiKey,
              jsxs('div', {
                className: 'settings-input-row settings-llm-api-row',
                children: [
                  jsx(Input, {
                    className: 'settings-input-control settings-api-key-input',
                    size: 'sm',
                    type: showApiKey ? 'text' : 'password',
                    value: activeProviderSettings.apiKey,
                    onChange: (event: ChangeEvent<HTMLInputElement>) =>
                      onTranslationProviderApiKeyChange(activeTranslationProvider, event.target.value),
                    placeholder: labels.settingsTranslationApiKeyPlaceholder,
                    rightIcon: jsx('button', {
                      type: 'button',
                      className: 'settings-password-toggle',
                      onClick: () => setShowApiKey((currentValue) => !currentValue),
                      'aria-label': showApiKey
                        ? labels.settingsTranslationHideApiKey
                        : labels.settingsTranslationShowApiKey,
                      title: showApiKey
                        ? labels.settingsTranslationHideApiKey
                        : labels.settingsTranslationShowApiKey,
                      children: showApiKey
                        ? jsx(EyeOff, { size: 16, strokeWidth: 1.8 })
                        : jsx(Eye, { size: 16, strokeWidth: 1.8 }),
                    }),
                  }),
                  jsx(Button, {
                    className: 'settings-llm-test-btn',
                    type: 'button',
                    mode: 'text',
                    variant: 'primary',
                    size: 'md',
                    textMode: 'with',
                    iconMode: 'with',
                    leftIcon: jsx(PlugZap, { size: 14, strokeWidth: 1.8 }),
                    isLoading: isTestingTranslationConnection,
                    onClick: onTestTranslationConnection,
                    disabled: isSettingsSaving,
                    children: labels.settingsTranslationTestConnection,
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
  pdfFileNameUseSelectionOrder,
  onPdfDownloadDirChange,
  onPdfFileNameUseSelectionOrderChange,
  onChoosePdfDownloadDir,
  activeLlmProvider,
  onActiveLlmProviderChange,
  llmProviders,
  onLlmProviderApiKeyChange,
  onLlmProviderModelChange,
  activeTranslationProvider,
  onActiveTranslationProviderChange,
  translationProviders,
  onTranslationProviderApiKeyChange,
  onTestLlmConnection,
  onTestTranslationConnection,
  onOpenConfigLocation,
  desktopRuntime,
  configPath,
  isSettingsSaving,
  isTestingLlmConnection,
  isTestingTranslationConnection,
}: SettingsPartViewProps) {
  return jsx('main', {
    ref: partRef,
    className: 'settings-page',
    children: jsxs('section', {
      className: 'panel settings-card',
      children: [
        jsxs('div', {
          className: 'panel-title settings-header',
          children: jsx('span', { children: labels.settingsTitle }),
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
              pdfFileNameUseSelectionOrder,
              onPdfDownloadDirChange,
              onPdfFileNameUseSelectionOrderChange,
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
              onLlmProviderModelChange,
              onTestLlmConnection,
              isSettingsSaving,
              isTestingLlmConnection,
            }),
            jsx(TranslationField, {
              labels,
              activeTranslationProvider,
              translationProviders,
              onActiveTranslationProviderChange,
              onTranslationProviderApiKeyChange,
              onTestTranslationConnection,
              isSettingsSaving,
              isTestingTranslationConnection,
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
