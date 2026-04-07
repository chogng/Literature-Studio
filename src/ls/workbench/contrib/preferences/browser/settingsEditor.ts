import type { Locale } from 'language/i18n';
import type { LocaleMessages } from 'language/locales';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import { applyHover } from 'ls/base/browser/ui/hover/hover';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

import { DEFAULT_EDITOR_DRAFT_BODY_COLOR } from 'ls/base/common/editorDraftStyle';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import { createSwitchView } from 'ls/base/browser/ui/switch/switch';
import { BatchSourcesWidget } from 'ls/workbench/contrib/preferences/browser/batchSourcesWidget';
import { KnowledgeBaseWidget } from 'ls/workbench/contrib/preferences/browser/knowledgeBaseWidget';
import type { KnowledgeBaseWidgetProps } from 'ls/workbench/contrib/preferences/browser/knowledgeBaseWidget';

import { LlmWidget } from 'ls/workbench/contrib/preferences/browser/llmWidget';
import {
  createSettingsSectionMap,
  getSettingsPageSectionIds,
} from 'ls/workbench/contrib/preferences/browser/settingsLayout';
import type { SettingsPageId, SettingsSectionId } from 'ls/workbench/contrib/preferences/browser/settingsLayout';
import { createSettingsNavigationView } from 'ls/workbench/contrib/preferences/browser/settingsNavigationView';

import type {
  SettingsPartActions,
  SettingsDropdownOption,
  SettingsPartLabels,
  SettingsPartProps,
  SettingsPartState,
} from 'ls/workbench/contrib/preferences/browser/settingsTypes';
import { TranslationWidget } from 'ls/workbench/contrib/preferences/browser/translationWidget';
import {
  createDisplayLanguageOptions,
  requestSetDisplayLanguage,
} from 'ls/workbench/contrib/localization/browser/localizationsActions';
import { batchLimitMax, batchLimitMin } from 'ls/workbench/services/config/configSchema';
import { registerWorkbenchPartDomNode, WORKBENCH_PART_IDS } from 'ls/workbench/browser/layout';
import 'ls/workbench/contrib/preferences/browser/media/settingsEditor.css';
import 'ls/workbench/contrib/preferences/browser/media/settingsWidgets.css';

type SelectOption = SettingsDropdownOption;

type CreateSettingsPartLabelsParams = { ui: LocaleMessages };
type CreateSettingsPartPropsParams = { state: SettingsPartState; actions: SettingsPartActions };

export function createSettingsPartLabels({ ui }: CreateSettingsPartLabelsParams): SettingsPartLabels {
  return {
    settingsTitle: ui.settingsTitle, settingsLoading: ui.settingsLoading, settingsLanguage: ui.settingsLanguage, languageChinese: ui.languageChinese, languageEnglish: ui.languageEnglish, settingsLanguageHint: ui.settingsLanguageHint,
    settingsNavigationBack: ui.settingsNavigationBack, settingsNavigationGeneral: ui.settingsNavigationGeneral, settingsNavigationAppearance: ui.settingsNavigationAppearance, settingsNavigationTextEditor: ui.settingsNavigationTextEditor, settingsNavigationChat: ui.settingsNavigationChat, settingsNavigationKnowledgeBase: ui.settingsNavigationKnowledgeBase, settingsNavigationLiterature: ui.settingsNavigationLiterature, settingsTextEditorTitle: ui.settingsTextEditorTitle, settingsTextEditorHint: ui.settingsTextEditorHint,
    settingsTextEditorDefaultBodyStyle: ui.settingsTextEditorDefaultBodyStyle, settingsTextEditorFontFamily: ui.settingsTextEditorFontFamily, settingsTextEditorFontSize: ui.settingsTextEditorFontSize, settingsTextEditorLineHeight: ui.settingsTextEditorLineHeight, settingsTextEditorColor: ui.settingsTextEditorColor, settingsTextEditorResetDefaultBodyStyle: ui.settingsTextEditorResetDefaultBodyStyle,
    settingsPageUrl: ui.settingsPageUrl, settingsPageUrlHint: ui.settingsPageUrlHint, pageUrlPlaceholder: ui.pageUrlPlaceholder, settingsBatchJournalTitle: ui.settingsBatchJournalTitle, batchJournalTitlePlaceholder: ui.batchJournalTitlePlaceholder,
    addBatchUrl: ui.addBatchUrl, removeBatchUrl: ui.removeBatchUrl, moveBatchUrlUp: ui.moveBatchUrlUp, moveBatchUrlDown: ui.moveBatchUrlDown, settingsBatchOptions: ui.settingsBatchOptions, batchCount: ui.batchCount, sameDomainOnly: ui.sameDomainOnly, startDate: ui.startDate, endDate: ui.endDate,
    settingsAppearanceTitle: ui.settingsAppearanceTitle, settingsTheme: ui.settingsTheme, settingsThemeHint: ui.settingsThemeHint, settingsThemeLight: ui.settingsThemeLight, settingsThemeDark: ui.settingsThemeDark, settingsThemeSystem: ui.settingsThemeSystem, settingsUseMica: ui.settingsUseMica, settingsUseMicaHint: ui.settingsUseMicaHint, settingsLibraryTitle: ui.settingsLibraryTitle, settingsKnowledgeBaseTitle: ui.settingsKnowledgeBaseTitle, settingsKnowledgeBaseHint: ui.settingsKnowledgeBaseHint, settingsKnowledgeBaseMode: ui.settingsKnowledgeBaseMode,
    settingsKnowledgeBaseModeHint: ui.settingsKnowledgeBaseModeHint, settingsKnowledgeBaseModeDisabledHint: ui.settingsKnowledgeBaseModeDisabledHint, settingsKnowledgeBaseAutoIndex: ui.settingsKnowledgeBaseAutoIndex, settingsKnowledgeBaseAutoIndexHint: ui.settingsKnowledgeBaseAutoIndexHint,
    settingsKnowledgeBasePdfDownloadDir: ui.settingsKnowledgeBasePdfDownloadDir, settingsKnowledgeBasePdfDownloadDirPlaceholder: ui.settingsKnowledgeBasePdfDownloadDirPlaceholder, settingsKnowledgeBasePdfDownloadDirHint: ui.settingsKnowledgeBasePdfDownloadDirHint,
    settingsLibraryStorageMode: ui.settingsLibraryStorageMode, settingsLibraryStorageModeLinkedOriginal: ui.settingsLibraryStorageModeLinkedOriginal, settingsLibraryStorageModeManagedCopy: ui.settingsLibraryStorageModeManagedCopy, settingsLibraryDirectory: ui.settingsLibraryDirectory,
    settingsLibraryDirectoryPlaceholder: ui.settingsLibraryDirectoryPlaceholder, settingsLibraryDirectoryHint: ui.settingsLibraryDirectoryHint, settingsLibraryDbFile: ui.settingsLibraryDbFile, settingsLibraryFilesDir: ui.settingsLibraryFilesDir, settingsLibraryCacheDir: ui.settingsLibraryCacheDir,
    settingsLibraryStatusDocuments: ui.settingsLibraryStatusDocuments, settingsLibraryStatusFiles: ui.settingsLibraryStatusFiles, settingsLibraryStatusQueuedJobs: ui.settingsLibraryStatusQueuedJobs, settingsLibraryStatusEmpty: ui.settingsLibraryStatusEmpty, settingsLibraryRecentDocuments: ui.settingsLibraryRecentDocuments,
    settingsLibraryDocumentRegistered: ui.settingsLibraryDocumentRegistered, settingsLibraryDocumentQueued: ui.settingsLibraryDocumentQueued, settingsLibraryDocumentRunning: ui.settingsLibraryDocumentRunning, settingsLibraryDocumentFailed: ui.settingsLibraryDocumentFailed,
    settingsLibraryMaxConcurrentJobs: ui.settingsLibraryMaxConcurrentJobs, settingsLibraryMaxConcurrentJobsHint: ui.settingsLibraryMaxConcurrentJobsHint, settingsRagTitle: ui.settingsRagTitle, settingsRagProvider: ui.settingsRagProvider, settingsRagProviderHint: ui.settingsRagProviderHint,
    settingsRagProviderMoark: ui.settingsRagProviderMoark, settingsRagApiKey: ui.settingsRagApiKey, settingsRagApiKeyPlaceholder: ui.settingsRagApiKeyPlaceholder, settingsRagBaseUrl: ui.settingsRagBaseUrl, settingsRagEmbeddingModel: ui.settingsRagEmbeddingModel,
    settingsRagRerankerModel: ui.settingsRagRerankerModel, settingsRagEmbeddingPath: ui.settingsRagEmbeddingPath, settingsRagRerankPath: ui.settingsRagRerankPath, settingsRagCandidateCount: ui.settingsRagCandidateCount, settingsRagTopK: ui.settingsRagTopK,
    settingsRagTestConnection: ui.settingsRagTestConnection, settingsRagShowApiKey: ui.settingsRagShowApiKey, settingsRagHideApiKey: ui.settingsRagHideApiKey, settingsRagHint: ui.settingsRagHint, settingsBatchHint: ui.settingsBatchHint, defaultPdfDir: ui.defaultPdfDir, settingsStatusbar: ui.settingsStatusbar, settingsStatusbarHint: ui.settingsStatusbarHint,
    pdfFileNameUseSelectionOrder: ui.pdfFileNameUseSelectionOrder, pdfFileNameUseSelectionOrderHint: ui.pdfFileNameUseSelectionOrderHint, downloadDirPlaceholder: ui.downloadDirPlaceholder, chooseDirectory: ui.chooseDirectory, openConfigLocation: ui.openConfigLocation,
    resetDefault: ui.resetDefault, settingsHintPath: ui.settingsHintPath, settingsConfigPath: ui.settingsConfigPath, currentDir: ui.currentDir, systemDownloads: ui.systemDownloads, settingsLlmTitle: ui.settingsLlmTitle, settingsLlmProvider: ui.settingsLlmProvider,
    settingsLlmProviderHint: ui.settingsLlmProviderHint, settingsLlmProviderGlm: ui.settingsLlmProviderGlm, settingsLlmProviderKimi: ui.settingsLlmProviderKimi, settingsLlmProviderDeepSeek: ui.settingsLlmProviderDeepSeek, settingsLlmProviderGemini: ui.settingsLlmProviderGemini, settingsLlmApiKey: ui.settingsLlmApiKey,
    settingsLlmApiKeyPlaceholder: ui.settingsLlmApiKeyPlaceholder, settingsLlmModel: ui.settingsLlmModel, settingsLlmSearchPlaceholder: ui.settingsLlmSearchPlaceholder, settingsLlmNoResults: ui.settingsLlmNoResults, settingsLlmMaxContext: ui.settingsLlmMaxContext, settingsLlmMaxContextHint: ui.settingsLlmMaxContextHint, settingsLlmTestConnection: ui.settingsLlmTestConnection, settingsLlmShowApiKey: ui.settingsLlmShowApiKey, settingsLlmHideApiKey: ui.settingsLlmHideApiKey,
    settingsTranslationTitle: ui.settingsTranslationTitle, settingsTranslationProvider: ui.settingsTranslationProvider, settingsTranslationProviderHint: ui.settingsTranslationProviderHint, settingsTranslationProviderDeepL: ui.settingsTranslationProviderDeepL,
    settingsTranslationApiKey: ui.settingsTranslationApiKey, settingsTranslationApiKeyPlaceholder: ui.settingsTranslationApiKeyPlaceholder, settingsTranslationTestConnection: ui.settingsTranslationTestConnection, settingsTranslationShowApiKey: ui.settingsTranslationShowApiKey,
    settingsTranslationHideApiKey: ui.settingsTranslationHideApiKey, settingsTranslationHint: ui.settingsTranslationHint,
  };
}

export function createSettingsPartProps({ state, actions }: CreateSettingsPartPropsParams): SettingsPartProps {
  return { labels: createSettingsPartLabels({ ui: state.ui }), ...state, ...actions };
}

type FocusSnapshot = {
  key: string;
  selectionStart: number | null;
  selectionEnd: number | null;
} | null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

function text(value: string | number) {
  return document.createTextNode(String(value));
}

function setFocusKey<T extends HTMLElement>(node: T, key: string) {
  node.dataset.focusKey = key;
  return node;
}

function buildSelect(options: readonly SelectOption[], value: string, focusKey: string, onChange: (value: string) => void, className: string) {
  const select = setFocusKey(el('select', `settings-native-select ${className}`.trim()), focusKey);
  for (const option of options) {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.text = option.label;
    optionElement.title = option.title ?? option.label;
    select.append(optionElement);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function buildInput(config: {
  type?: string;
  value: string | number;
  className: string;
  focusKey: string;
  placeholder?: string;
  readOnly?: boolean;
  min?: string;
  max?: string;
  inputMode?: HTMLInputElement['inputMode'];
  onInput?: (value: string) => void;
}) {
  const input = setFocusKey(el('input', `settings-native-input ${config.className}`.trim()), config.focusKey);
  input.type = config.type ?? 'text';
  input.value = String(config.value);
  input.placeholder = config.placeholder ?? '';
  input.readOnly = Boolean(config.readOnly);
  if (config.min !== undefined) { input.min = config.min; }
  if (config.max !== undefined) { input.max = config.max; }
  if (config.inputMode) { input.inputMode = config.inputMode; }
  if (config.onInput) {
    input.addEventListener('input', () => config.onInput?.(input.value));
  }
  return input;
}

function buildCheckbox(config: {
  checked: boolean;
  className: string;
  focusKey: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const input = setFocusKey(el('input', config.className), config.focusKey);
  input.type = 'checkbox';
  input.checked = config.checked;
  input.disabled = Boolean(config.disabled);
  input.addEventListener('change', () => config.onChange(input.checked));
  return input;
}

function buildSwitch(config: {
  checked: boolean;
  focusKey: string;
  disabled?: boolean;
  title?: string;
  onChange: (checked: boolean) => void;
}) {
  const view = createSwitchView({
    checked: config.checked,
    disabled: config.disabled,
    className: 'settings-toggle-switch',
    title: config.title,
    onChange: config.onChange,
  });
  const element = view.getElement();
  const input = element.querySelector<HTMLInputElement>('.switch-input');
  if (input) {
    setFocusKey(input, config.focusKey);
  } else {
    setFocusKey(element, config.focusKey);
  }
  return element;
}

function buildButton(config: {
  label: string;
  icon?: LxIconName;
  className?: string;
  focusKey: string;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const extraClasses = (config.className ?? '').trim();
  const isIconButton = extraClasses.includes('settings-native-icon-button');
  const buttonClassName = [
    'settings-native-button',
    'btn-base',
    'btn-secondary',
    isIconButton ? 'btn-mode-icon btn-sm' : 'btn-md',
    extraClasses,
  ]
    .filter(Boolean)
    .join(' ');
  const button = setFocusKey(el('button', buttonClassName), config.focusKey);
  button.type = 'button';
  if (config.icon) {
    button.append(createLxIcon(config.icon));
  } else {
    button.textContent = config.label;
  }
  applyHover(button, config.title ?? config.label);
  button.ariaLabel = config.title ?? config.label;
  button.disabled = Boolean(config.disabled);
  button.addEventListener('click', () => config.onClick());
  return button;
}

function buildHint(value: string, className = 'settings-hint') {
  const hint = el('p', className);
  hint.textContent = value;
  return hint;
}

function createThemeOptions(labels: SettingsPartLabels): readonly SelectOption[] {
  return [
    { value: 'light', label: labels.settingsThemeLight },
    { value: 'dark', label: labels.settingsThemeDark },
    { value: 'system', label: labels.settingsThemeSystem },
  ];
}

function ensureCurrentSelectOption(
  options: readonly SelectOption[],
  currentValue: string,
): readonly SelectOption[] {
  const normalizedCurrentValue = currentValue.trim();
  if (!normalizedCurrentValue) {
    return options;
  }

  const hasCurrentValue = options.some(
    (option) => option.value.trim() === normalizedCurrentValue,
  );
  if (hasCurrentValue) {
    return options;
  }

  return [
    {
      value: normalizedCurrentValue,
      label: normalizedCurrentValue,
      title: normalizedCurrentValue,
    },
    ...options,
  ];
}

function toHexChannel(value: number) {
  const clamped = Math.min(255, Math.max(0, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
}

function parseRgbChannel(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith('%')) {
    const numericPercent = Number.parseFloat(normalized.slice(0, -1));
    if (!Number.isFinite(numericPercent)) {
      return null;
    }
    return (numericPercent / 100) * 255;
  }

  const numericValue = Number.parseFloat(normalized);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
}

function rgbFunctionToHex(value: string) {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^rgba?\((.*)\)$/i);
  if (!match) {
    return null;
  }

  const content = match[1].trim();
  const slashIndex = content.indexOf('/');
  const channelsPart = slashIndex >= 0 ? content.slice(0, slashIndex) : content;
  const channelTokens = channelsPart.includes(',')
    ? channelsPart.split(',').map((token) => token.trim()).filter(Boolean)
    : channelsPart.split(/\s+/).filter(Boolean);
  if (channelTokens.length < 3) {
    return null;
  }

  const red = parseRgbChannel(channelTokens[0]);
  const green = parseRgbChannel(channelTokens[1]);
  const blue = parseRgbChannel(channelTokens[2]);
  if (red === null || green === null || blue === null) {
    return null;
  }

  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
}

function normalizeHexColor(value: string) {
  const normalizedValue = value.trim();
  if (/^#(?:[0-9a-fA-F]{6})$/.test(normalizedValue)) {
    return normalizedValue.toLowerCase();
  }

  const shortHexMatch = normalizedValue.match(/^#([0-9a-fA-F]{3})$/);
  if (!shortHexMatch) {
    return null;
  }

  const [, shortHex] = shortHexMatch;
  const expandedHex = shortHex
    .split('')
    .map((channel) => `${channel}${channel}`)
    .join('');
  return `#${expandedHex}`.toLowerCase();
}

function resolveColorToHex(colorValue: string) {
  const normalizedHexColor = normalizeHexColor(colorValue);
  if (normalizedHexColor) {
    return normalizedHexColor;
  }

  const normalizedRgbColor = rgbFunctionToHex(colorValue);
  if (normalizedRgbColor) {
    return normalizedRgbColor;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const probe = document.createElement('span');
  probe.style.color = '';
  probe.style.color = colorValue.trim();
  if (!probe.style.color) {
    return null;
  }

  return normalizeHexColor(probe.style.color) ?? rgbFunctionToHex(probe.style.color);
}

function toColorPickerValue(colorValue: string) {
  return resolveColorToHex(colorValue)
    ?? resolveColorToHex(DEFAULT_EDITOR_DRAFT_BODY_COLOR)
    ?? '#000000';
}

export class SettingsPartView {
  private props: SettingsPartProps;
  private readonly navigationView: ReturnType<typeof createSettingsNavigationView>;
  private readonly content = el('div', 'settings-content');
  private readonly loadingHint = buildHint('');
  // Keep section containers stable so updates can replace only local content
  // without recreating the whole settings page.
  private readonly sections = createSettingsSectionMap(() => el('section', 'settings-section'));
  private readonly batchSourcesWidget: BatchSourcesWidget;
  private readonly knowledgeBaseWidget: KnowledgeBaseWidget;
  private readonly llmWidget: LlmWidget;
  private readonly translationWidget: TranslationWidget;
  private showRagApiKey = false;
  private showLlmApiKey = false;
  private showTranslationApiKey = false;
  private activePageId: SettingsPageId = 'general';

  constructor(props: SettingsPartProps) {
    this.props = props;
    this.navigationView = createSettingsNavigationView({
      labels: this.props.labels,
      title: this.props.labels.settingsTitle,
      activePageId: this.activePageId,
      onDidSelectPage: this.handleDidSelectPage,
    });
    this.batchSourcesWidget = new BatchSourcesWidget({
      labels: this.props.labels,
      batchSources: this.props.batchSources,
      isSettingsSaving: this.props.isSettingsSaving,
      onBatchSourceUrlChange: (index, url) => this.props.onBatchSourceUrlChange(index, url),
      onBatchSourceJournalTitleChange: (index, journalTitle) => this.props.onBatchSourceJournalTitleChange(index, journalTitle),
      onAddBatchSource: () => this.props.onAddBatchSource(),
      onRemoveBatchSource: (index) => this.props.onRemoveBatchSource(index),
      onMoveBatchSource: (index, direction) => this.props.onMoveBatchSource(index, direction),
    });
    this.knowledgeBaseWidget = new KnowledgeBaseWidget(this.getKnowledgeBaseWidgetProps());
    this.llmWidget = new LlmWidget({
      labels: this.props.labels,
      activeLlmProvider: this.props.activeLlmProvider,
      llmProviders: this.props.llmProviders,
      isSettingsSaving: this.props.isSettingsSaving,
      isTestingLlmConnection: this.props.isTestingLlmConnection,
      showApiKey: this.showLlmApiKey,
      onToggleShowApiKey: () => { this.showLlmApiKey = !this.showLlmApiKey; this.updateLlmWidget(); },
      onActiveLlmProviderChange: (provider) => this.props.onActiveLlmProviderChange(provider),
      onLlmProviderApiKeyChange: (provider, apiKey) => this.props.onLlmProviderApiKeyChange(provider, apiKey),
      onLlmProviderModelChange: (provider, model) => this.props.onLlmProviderModelChange(provider, model),
      onLlmProviderSelectedModelOption: (provider, optionValue) => this.props.onLlmProviderSelectedModelOption(provider, optionValue),
      onLlmProviderReasoningEffortChange: (provider, reasoningEffort) => this.props.onLlmProviderReasoningEffortChange(provider, reasoningEffort),
      onLlmProviderModelEnabledChange: (provider, model, enabled) => this.props.onLlmProviderModelEnabledChange(provider, model, enabled),
      onLlmProviderUseMaxContextWindowChange: (provider, useMaxContextWindow) => this.props.onLlmProviderUseMaxContextWindowChange(provider, useMaxContextWindow),
      onTestLlmConnection: () => this.props.onTestLlmConnection(),
    });
    this.translationWidget = new TranslationWidget({
      labels: this.props.labels,
      activeTranslationProvider: this.props.activeTranslationProvider,
      translationProviders: this.props.translationProviders,
      isSettingsSaving: this.props.isSettingsSaving,
      isTestingTranslationConnection: this.props.isTestingTranslationConnection,
      showApiKey: this.showTranslationApiKey,
      onToggleShowApiKey: () => { this.showTranslationApiKey = !this.showTranslationApiKey; this.updateTranslationWidget(); },
      onActiveTranslationProviderChange: (provider) => this.props.onActiveTranslationProviderChange(provider),
      onTranslationProviderApiKeyChange: (provider, apiKey) => this.props.onTranslationProviderApiKeyChange(provider, apiKey),
      onTestTranslationConnection: () => this.props.onTestTranslationConnection(),
    });
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.settings, this.content);
    this.initializeSectionContainers();
    this.updateView(undefined, true);
  }

  getElement() {
    return this.content;
  }

  getNavigationElement() {
    return this.navigationView.getElement();
  }

  getContentElement() {
    return this.content;
  }

  setProps(props: SettingsPartProps) {
    const previousProps = this.props;
    this.props = props;
    this.updateView(previousProps);
  }

  dispose() {
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.settings, null);
    this.navigationView.dispose();
    this.content.replaceChildren();
  }

  private containsManagedElement(node: Node) {
    const navigationElement = this.navigationView.getElement();
    return (
      navigationElement.contains(node) ||
      this.content.contains(node)
    );
  }

  private queryManagedFocusTarget(key: string) {
    const selector = `[data-focus-key="${key}"]`;
    const navigationElement = this.navigationView.getElement();
    return (
      this.content.querySelector<HTMLElement>(selector) ??
      navigationElement.querySelector<HTMLElement>(selector)
    );
  }

  private captureFocus(): FocusSnapshot {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !this.containsManagedElement(active)) {
      return null;
    }
    const focusNode = active.closest<HTMLElement>('[data-focus-key]');
    const key = focusNode?.dataset.focusKey;
    if (!key) {
      return null;
    }
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      return { key, selectionStart: active.selectionStart, selectionEnd: active.selectionEnd };
    }
    return { key, selectionStart: null, selectionEnd: null };
  }

  private restoreFocus(snapshot: FocusSnapshot) {
    if (!snapshot) {
      return;
    }
    const target = this.queryManagedFocusTarget(snapshot.key);
    if (!target) {
      return;
    }
    target.focus({ preventScroll: true });
    if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && snapshot.selectionStart !== null) {
      target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd ?? snapshot.selectionStart);
    }
  }

  private updateSection(container: HTMLElement, content: Node) {
    container.replaceChildren(content);
  }

  private updateBatchSourcesWidget() {
    this.batchSourcesWidget.setProps({
      labels: this.props.labels,
      batchSources: this.props.batchSources,
      isSettingsSaving: this.props.isSettingsSaving,
      onBatchSourceUrlChange: (index, url) => this.props.onBatchSourceUrlChange(index, url),
      onBatchSourceJournalTitleChange: (index, journalTitle) => this.props.onBatchSourceJournalTitleChange(index, journalTitle),
      onAddBatchSource: () => this.props.onAddBatchSource(),
      onRemoveBatchSource: (index) => this.props.onRemoveBatchSource(index),
      onMoveBatchSource: (index, direction) => this.props.onMoveBatchSource(index, direction),
    });
  }

  private getKnowledgeBaseWidgetProps(): KnowledgeBaseWidgetProps {
    return {
      title: this.props.labels.settingsKnowledgeBaseTitle,
      hint: this.props.labels.settingsKnowledgeBaseHint,
      library: {
        labels: this.props.labels,
        knowledgeBaseEnabled: this.props.knowledgeBaseEnabled,
        autoIndexDownloadedPdf: this.props.autoIndexDownloadedPdf,
        knowledgeBasePdfDownloadDir: this.props.knowledgeBasePdfDownloadDir,
        libraryStorageMode: this.props.libraryStorageMode,
        libraryDirectory: this.props.libraryDirectory,
        defaultManagedDirectory: this.props.defaultManagedDirectory,
        maxConcurrentIndexJobs: this.props.maxConcurrentIndexJobs,
        desktopRuntime: this.props.desktopRuntime,
        isSettingsSaving: this.props.isSettingsSaving,
        isLibraryLoading: this.props.isLibraryLoading,
        libraryDocumentCount: this.props.libraryDocumentCount,
        libraryFileCount: this.props.libraryFileCount,
        libraryQueuedJobCount: this.props.libraryQueuedJobCount,
        libraryDocuments: this.props.libraryDocuments,
        libraryDbFile: this.props.libraryDbFile,
        ragCacheDir: this.props.ragCacheDir,
        onKnowledgeBaseEnabledChange: (checked) => this.props.onKnowledgeBaseEnabledChange(checked),
        onAutoIndexDownloadedPdfChange: (checked) => this.props.onAutoIndexDownloadedPdfChange(checked),
        onKnowledgeBasePdfDownloadDirChange: (value) => this.props.onKnowledgeBasePdfDownloadDirChange(value),
        onChooseKnowledgeBasePdfDownloadDir: () => this.props.onChooseKnowledgeBasePdfDownloadDir(),
        onLibraryStorageModeChange: (value) => this.props.onLibraryStorageModeChange(value),
        onLibraryDirectoryChange: (value) => this.props.onLibraryDirectoryChange(value),
        onChooseLibraryDirectory: () => this.props.onChooseLibraryDirectory(),
        onMaxConcurrentIndexJobsChange: (value) => this.props.onMaxConcurrentIndexJobsChange(value),
      },
      rag: {
        labels: this.props.labels,
        activeRagProvider: this.props.activeRagProvider,
        ragProviders: this.props.ragProviders,
        retrievalCandidateCount: this.props.retrievalCandidateCount,
        retrievalTopK: this.props.retrievalTopK,
        isSettingsSaving: this.props.isSettingsSaving,
        isTestingRagConnection: this.props.isTestingRagConnection,
        showApiKey: this.showRagApiKey,
        onToggleShowApiKey: () => { this.showRagApiKey = !this.showRagApiKey; this.updateKnowledgeBaseWidget(); },
        onRagProviderApiKeyChange: (provider, apiKey) => this.props.onRagProviderApiKeyChange(provider, apiKey),
        onRagProviderBaseUrlChange: (provider, baseUrl) => this.props.onRagProviderBaseUrlChange(provider, baseUrl),
        onRagProviderEmbeddingModelChange: (provider, model) => this.props.onRagProviderEmbeddingModelChange(provider, model),
        onRagProviderRerankerModelChange: (provider, model) => this.props.onRagProviderRerankerModelChange(provider, model),
        onRagProviderEmbeddingPathChange: (provider, path) => this.props.onRagProviderEmbeddingPathChange(provider, path),
        onRagProviderRerankPathChange: (provider, path) => this.props.onRagProviderRerankPathChange(provider, path),
        onRetrievalCandidateCountChange: (value) => this.props.onRetrievalCandidateCountChange(value),
        onRetrievalTopKChange: (value) => this.props.onRetrievalTopKChange(value),
        onTestRagConnection: () => this.props.onTestRagConnection(),
      },
    };
  }

  private updateKnowledgeBaseWidget() {
    this.knowledgeBaseWidget.setProps(this.getKnowledgeBaseWidgetProps());
  }

  private updateLlmWidget() {
    this.llmWidget.setProps({
      labels: this.props.labels,
      activeLlmProvider: this.props.activeLlmProvider,
      llmProviders: this.props.llmProviders,
      isSettingsSaving: this.props.isSettingsSaving,
      isTestingLlmConnection: this.props.isTestingLlmConnection,
      showApiKey: this.showLlmApiKey,
      onToggleShowApiKey: () => { this.showLlmApiKey = !this.showLlmApiKey; this.updateLlmWidget(); },
      onActiveLlmProviderChange: (provider) => this.props.onActiveLlmProviderChange(provider),
      onLlmProviderApiKeyChange: (provider, apiKey) => this.props.onLlmProviderApiKeyChange(provider, apiKey),
      onLlmProviderModelChange: (provider, model) => this.props.onLlmProviderModelChange(provider, model),
      onLlmProviderSelectedModelOption: (provider, optionValue) => this.props.onLlmProviderSelectedModelOption(provider, optionValue),
      onLlmProviderReasoningEffortChange: (provider, reasoningEffort) => this.props.onLlmProviderReasoningEffortChange(provider, reasoningEffort),
      onLlmProviderModelEnabledChange: (provider, model, enabled) => this.props.onLlmProviderModelEnabledChange(provider, model, enabled),
      onLlmProviderUseMaxContextWindowChange: (provider, useMaxContextWindow) => this.props.onLlmProviderUseMaxContextWindowChange(provider, useMaxContextWindow),
      onTestLlmConnection: () => this.props.onTestLlmConnection(),
    });
  }

  private updateTranslationWidget() {
    this.translationWidget.setProps({
      labels: this.props.labels,
      activeTranslationProvider: this.props.activeTranslationProvider,
      translationProviders: this.props.translationProviders,
      isSettingsSaving: this.props.isSettingsSaving,
      isTestingTranslationConnection: this.props.isTestingTranslationConnection,
      showApiKey: this.showTranslationApiKey,
      onToggleShowApiKey: () => { this.showTranslationApiKey = !this.showTranslationApiKey; this.updateTranslationWidget(); },
      onActiveTranslationProviderChange: (provider) => this.props.onActiveTranslationProviderChange(provider),
      onTranslationProviderApiKeyChange: (provider, apiKey) => this.props.onTranslationProviderApiKeyChange(provider, apiKey),
      onTestTranslationConnection: () => this.props.onTestTranslationConnection(),
    });
  }

  private initializeSectionContainers() {
    for (const [id, section] of Object.entries(this.sections) as Array<[SettingsSectionId, HTMLElement]>) {
      section.dataset.sectionId = id;
      section.id = `settings-section-${id}`;
    }
  }

  private syncNavigationView() {
    this.navigationView.setProps({
      labels: this.props.labels,
      title: this.props.labels.settingsTitle,
      activePageId: this.activePageId,
      onDidSelectPage: this.handleDidSelectPage,
    });
  }

  private readonly handleDidSelectPage = (pageId: SettingsPageId) => {
    this.focusPage(pageId);
  };

  private focusPage(pageId: SettingsPageId) {
    if (this.activePageId === pageId) {
      return;
    }
    this.activePageId = pageId;
    this.renderActivePage();
    this.syncNavigationView();
  }

  private renderActivePage() {
    const pageSectionIds = getSettingsPageSectionIds(this.activePageId);
    const contentChildren = pageSectionIds.map((sectionId) => this.sections[sectionId]);
    if (this.props.isSettingsLoading) {
      contentChildren.unshift(this.loadingHint);
    }
    this.content.replaceChildren(...contentChildren);
    for (const [sectionId, section] of Object.entries(this.sections) as Array<[SettingsSectionId, HTMLElement]>) {
      section.classList.toggle('active', pageSectionIds.includes(sectionId));
    }
  }

  private shouldUpdateLocaleSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.locale !== this.props.locale ||
      previousProps.labels.settingsLanguage !== this.props.labels.settingsLanguage ||
      previousProps.labels.languageChinese !== this.props.labels.languageChinese ||
      previousProps.labels.languageEnglish !== this.props.labels.languageEnglish ||
      previousProps.labels.settingsLanguageHint !== this.props.labels.settingsLanguageHint
    );
  }

  private shouldUpdateBatchSourcesSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.batchSources !== this.props.batchSources ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.labels.settingsPageUrl !== this.props.labels.settingsPageUrl ||
      previousProps.labels.pageUrlPlaceholder !== this.props.labels.pageUrlPlaceholder ||
      previousProps.labels.batchJournalTitlePlaceholder !== this.props.labels.batchJournalTitlePlaceholder ||
      previousProps.labels.addBatchUrl !== this.props.labels.addBatchUrl ||
      previousProps.labels.removeBatchUrl !== this.props.labels.removeBatchUrl ||
      previousProps.labels.moveBatchUrlUp !== this.props.labels.moveBatchUrlUp ||
      previousProps.labels.moveBatchUrlDown !== this.props.labels.moveBatchUrlDown ||
      previousProps.labels.settingsPageUrlHint !== this.props.labels.settingsPageUrlHint
    );
  }

  private shouldUpdateBatchOptionsSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.batchLimit !== this.props.batchLimit ||
      previousProps.sameDomainOnly !== this.props.sameDomainOnly ||
      previousProps.fetchStartDate !== this.props.fetchStartDate ||
      previousProps.fetchEndDate !== this.props.fetchEndDate ||
      previousProps.labels.settingsBatchOptions !== this.props.labels.settingsBatchOptions ||
      previousProps.labels.batchCount !== this.props.labels.batchCount ||
      previousProps.labels.sameDomainOnly !== this.props.labels.sameDomainOnly ||
      previousProps.labels.startDate !== this.props.labels.startDate ||
      previousProps.labels.endDate !== this.props.labels.endDate ||
      previousProps.labels.settingsBatchHint !== this.props.labels.settingsBatchHint
    );
  }

  private shouldUpdateAppearanceSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.theme !== this.props.theme ||
      previousProps.useMica !== this.props.useMica ||
      previousProps.statusbarVisible !== this.props.statusbarVisible ||
      previousProps.desktopRuntime !== this.props.desktopRuntime ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.labels.settingsAppearanceTitle !== this.props.labels.settingsAppearanceTitle ||
      previousProps.labels.settingsTheme !== this.props.labels.settingsTheme ||
      previousProps.labels.settingsThemeHint !== this.props.labels.settingsThemeHint ||
      previousProps.labels.settingsThemeLight !== this.props.labels.settingsThemeLight ||
      previousProps.labels.settingsThemeDark !== this.props.labels.settingsThemeDark ||
      previousProps.labels.settingsThemeSystem !== this.props.labels.settingsThemeSystem ||
      previousProps.labels.settingsUseMica !== this.props.labels.settingsUseMica ||
      previousProps.labels.settingsUseMicaHint !== this.props.labels.settingsUseMicaHint ||
      previousProps.labels.settingsStatusbar !== this.props.labels.settingsStatusbar ||
      previousProps.labels.settingsStatusbarHint !== this.props.labels.settingsStatusbarHint
    );
  }

  private shouldUpdateTextEditorSection(previousProps?: SettingsPartProps) {
    if (!previousProps) {
      return true;
    }

    const previousDefaultBodyStyle = previousProps.editorDraftStyle.defaultBodyStyle;
    const currentDefaultBodyStyle = this.props.editorDraftStyle.defaultBodyStyle;

    return (
      previousDefaultBodyStyle.fontFamilyValue !== currentDefaultBodyStyle.fontFamilyValue ||
      previousDefaultBodyStyle.fontSizeValue !== currentDefaultBodyStyle.fontSizeValue ||
      previousDefaultBodyStyle.lineHeight !== currentDefaultBodyStyle.lineHeight ||
      previousDefaultBodyStyle.color !== currentDefaultBodyStyle.color ||
      previousProps.editorDraftFontFamilyOptions !== this.props.editorDraftFontFamilyOptions ||
      previousProps.editorDraftFontSizeOptions !== this.props.editorDraftFontSizeOptions ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.labels.settingsTextEditorTitle !== this.props.labels.settingsTextEditorTitle ||
      previousProps.labels.settingsTextEditorHint !== this.props.labels.settingsTextEditorHint ||
      previousProps.labels.settingsTextEditorDefaultBodyStyle !== this.props.labels.settingsTextEditorDefaultBodyStyle ||
      previousProps.labels.settingsTextEditorFontFamily !== this.props.labels.settingsTextEditorFontFamily ||
      previousProps.labels.settingsTextEditorFontSize !== this.props.labels.settingsTextEditorFontSize ||
      previousProps.labels.settingsTextEditorLineHeight !== this.props.labels.settingsTextEditorLineHeight ||
      previousProps.labels.settingsTextEditorColor !== this.props.labels.settingsTextEditorColor ||
      previousProps.labels.settingsTextEditorResetDefaultBodyStyle !== this.props.labels.settingsTextEditorResetDefaultBodyStyle
    );
  }

  private shouldUpdateKnowledgeBaseSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.knowledgeBaseEnabled !== this.props.knowledgeBaseEnabled ||
      previousProps.autoIndexDownloadedPdf !== this.props.autoIndexDownloadedPdf ||
      previousProps.knowledgeBasePdfDownloadDir !== this.props.knowledgeBasePdfDownloadDir ||
      previousProps.libraryStorageMode !== this.props.libraryStorageMode ||
      previousProps.libraryDirectory !== this.props.libraryDirectory ||
      previousProps.defaultManagedDirectory !== this.props.defaultManagedDirectory ||
      previousProps.maxConcurrentIndexJobs !== this.props.maxConcurrentIndexJobs ||
      previousProps.desktopRuntime !== this.props.desktopRuntime ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.isLibraryLoading !== this.props.isLibraryLoading ||
      previousProps.libraryDocumentCount !== this.props.libraryDocumentCount ||
      previousProps.libraryFileCount !== this.props.libraryFileCount ||
      previousProps.libraryQueuedJobCount !== this.props.libraryQueuedJobCount ||
      previousProps.libraryDocuments !== this.props.libraryDocuments ||
      previousProps.libraryDbFile !== this.props.libraryDbFile ||
      previousProps.activeRagProvider !== this.props.activeRagProvider ||
      previousProps.ragProviders !== this.props.ragProviders ||
      previousProps.retrievalCandidateCount !== this.props.retrievalCandidateCount ||
      previousProps.retrievalTopK !== this.props.retrievalTopK ||
      previousProps.ragCacheDir !== this.props.ragCacheDir ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.isTestingRagConnection !== this.props.isTestingRagConnection ||
      previousProps.labels !== this.props.labels
    );
  }

  private shouldUpdateDownloadDirectorySection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.pdfDownloadDir !== this.props.pdfDownloadDir ||
      previousProps.pdfFileNameUseSelectionOrder !== this.props.pdfFileNameUseSelectionOrder ||
      previousProps.desktopRuntime !== this.props.desktopRuntime ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.labels.defaultPdfDir !== this.props.labels.defaultPdfDir ||
      previousProps.labels.downloadDirPlaceholder !== this.props.labels.downloadDirPlaceholder ||
      previousProps.labels.chooseDirectory !== this.props.labels.chooseDirectory ||
      previousProps.labels.pdfFileNameUseSelectionOrder !== this.props.labels.pdfFileNameUseSelectionOrder ||
      previousProps.labels.pdfFileNameUseSelectionOrderHint !== this.props.labels.pdfFileNameUseSelectionOrderHint
    );
  }

  private shouldUpdateLlmSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.activeLlmProvider !== this.props.activeLlmProvider ||
      previousProps.llmProviders !== this.props.llmProviders ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.isTestingLlmConnection !== this.props.isTestingLlmConnection ||
      previousProps.labels !== this.props.labels
    );
  }

  private shouldUpdateTranslationSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.activeTranslationProvider !== this.props.activeTranslationProvider ||
      previousProps.translationProviders !== this.props.translationProviders ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.isTestingTranslationConnection !== this.props.isTestingTranslationConnection ||
      previousProps.labels !== this.props.labels
    );
  }

  private shouldUpdateConfigPathSection(previousProps?: SettingsPartProps) {
    return (
      !previousProps ||
      previousProps.configPath !== this.props.configPath ||
      previousProps.desktopRuntime !== this.props.desktopRuntime ||
      previousProps.isSettingsSaving !== this.props.isSettingsSaving ||
      previousProps.labels.settingsConfigPath !== this.props.labels.settingsConfigPath ||
      previousProps.labels.openConfigLocation !== this.props.labels.openConfigLocation
    );
  }

  private updateView(previousProps?: SettingsPartProps, forceAll = false) {
    const focusSnapshot = this.captureFocus();
    this.loadingHint.textContent = this.props.labels.settingsLoading;
    this.syncNavigationView();

    if (forceAll || this.shouldUpdateLocaleSection(previousProps)) {
      this.updateSection(this.sections.locale, this.renderLocaleField());
    }
    if (forceAll || this.shouldUpdateBatchSourcesSection(previousProps)) {
      this.updateBatchSourcesWidget();
      this.updateSection(this.sections.batchSources, this.batchSourcesWidget.getElement());
    }
    if (forceAll || this.shouldUpdateBatchOptionsSection(previousProps)) {
      this.updateSection(this.sections.batchOptions, this.renderBatchOptionsField());
    }
    if (forceAll || this.shouldUpdateAppearanceSection(previousProps)) {
      this.updateSection(this.sections.appearance, this.renderAppearanceField());
    }
    if (forceAll || this.shouldUpdateTextEditorSection(previousProps)) {
      this.updateSection(this.sections.textEditor, this.renderTextEditorField());
    }
    if (forceAll || this.shouldUpdateKnowledgeBaseSection(previousProps)) {
      this.updateKnowledgeBaseWidget();
      this.updateSection(this.sections.knowledgeBase, this.knowledgeBaseWidget.getElement());
    }
    if (forceAll || this.shouldUpdateDownloadDirectorySection(previousProps)) {
      this.updateSection(this.sections.downloadDirectory, this.renderDownloadDirectoryField());
    }
    if (forceAll || this.shouldUpdateLlmSection(previousProps)) {
      this.updateLlmWidget();
      this.updateSection(this.sections.llm, this.llmWidget.getElement());
    }
    if (forceAll || this.shouldUpdateTranslationSection(previousProps)) {
      this.updateTranslationWidget();
      this.updateSection(this.sections.translation, this.translationWidget.getElement());
    }
    if (forceAll || this.shouldUpdateConfigPathSection(previousProps)) {
      this.updateSection(this.sections.configPath, this.renderConfigPathField());
    }

    this.renderActivePage();
    this.restoreFocus(focusSnapshot);
  }

  private renderLocaleField() {
    const field = el('div', 'settings-field settings-language-field');
    const row = el('div', 'settings-language-row');
    const label = el('span');
    label.textContent = this.props.labels.settingsLanguage;
    const select = buildSelect(
      createDisplayLanguageOptions(this.props.labels),
      this.props.locale,
      'settings.locale',
      (value) => requestSetDisplayLanguage(value as Locale),
      'settings-language-toggle',
    );
    row.append(label, select);
    field.append(row, buildHint(this.props.labels.settingsLanguageHint));
    return field;
  }

  private renderBatchOptionsField() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsBatchOptions;
    const row = el('div', 'settings-batch-options');
    const limitLabel = el('label', 'inline-field');
    const wrap = el('div', 'settings-limit-input-wrap');
    wrap.append(buildInput({
      type: 'number', value: this.props.batchLimit, className: 'settings-limit-input', focusKey: 'settings.batch.limit', min: String(batchLimitMin), max: String(batchLimitMax), onInput: this.props.onBatchLimitChange,
    }));
    limitLabel.append(text(this.props.labels.batchCount), wrap);
    const checkboxLabel = el('label', 'inline-field checkbox-field');
    checkboxLabel.append(
      buildCheckbox({ checked: this.props.sameDomainOnly, className: 'radix-checkbox', focusKey: 'settings.batch.sameDomain', onChange: this.props.onSameDomainOnlyChange }),
      text(this.props.labels.sameDomainOnly),
    );
    const dateRow = el('div', 'settings-batch-date-row');
    const startDateField = el('label', 'settings-field settings-batch-date-field');
    startDateField.append(
      text(this.props.labels.startDate),
      buildInput({
        type: 'date',
        value: this.props.fetchStartDate,
        className: 'settings-input-control',
        focusKey: 'settings.batch.startDate',
        onInput: this.props.onFetchStartDateChange,
      }),
    );
    const endDateField = el('label', 'settings-field settings-batch-date-field');
    endDateField.append(
      text(this.props.labels.endDate),
      buildInput({
        type: 'date',
        value: this.props.fetchEndDate,
        className: 'settings-input-control',
        focusKey: 'settings.batch.endDate',
        onInput: this.props.onFetchEndDateChange,
      }),
    );
    dateRow.append(startDateField, endDateField);
    row.append(limitLabel, checkboxLabel);
    field.append(title, row, dateRow, buildHint(this.props.labels.settingsBatchHint));
    return field;
  }

  private renderAppearanceField() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsAppearanceTitle;
    const themeRow = el('div', 'settings-language-row');
    const themeLabel = el('span');
    themeLabel.textContent = this.props.labels.settingsTheme;
    const themeSelect = buildSelect(
      createThemeOptions(this.props.labels),
      this.props.theme,
      'settings.appearance.theme',
      (value) => {
        const nextTheme =
          value === 'dark' || value === 'light' || value === 'system'
            ? value
            : 'light';
        this.props.onThemeChange(nextTheme);
      },
      'settings-language-toggle',
    );
    themeSelect.disabled = this.props.isSettingsSaving;
    themeRow.append(themeLabel, themeSelect);
    field.append(
      title,
      themeRow,
      buildHint(this.props.labels.settingsThemeHint),
      this.renderToggleRow(
        'settings.appearance.useMica',
        this.props.labels.settingsUseMica,
        this.props.labels.settingsUseMicaHint,
        this.props.useMica,
        this.props.isSettingsSaving || !this.props.desktopRuntime,
        this.props.onUseMicaChange,
      ),
      this.renderToggleRow(
        'settings.appearance.statusbarVisible',
        this.props.labels.settingsStatusbar,
        this.props.labels.settingsStatusbarHint,
        this.props.statusbarVisible,
        this.props.isSettingsSaving,
        this.props.onStatusbarVisibleChange,
      ),
    );
    return field;
  }

  private renderDownloadDirectoryField() {
    const field = el('label', 'settings-field');
    const row = el('div', 'settings-input-row');
    row.append(
      buildInput({ value: this.props.pdfDownloadDir, className: 'settings-input-control', focusKey: 'settings.download.dir', placeholder: this.props.labels.downloadDirPlaceholder, onInput: this.props.onPdfDownloadDirChange }),
      buildButton({ label: '...', icon: lxIconSemanticMap.settings.chooseDirectory, className: 'settings-native-icon-button', focusKey: 'settings.download.choose', title: this.props.labels.chooseDirectory, disabled: !this.props.desktopRuntime || this.props.isSettingsSaving, onClick: this.props.onChoosePdfDownloadDir }),
    );
    const toggleRow = el('div', 'settings-toggle-row');
    const textBlock = el('div');
    const title = el('span', 'settings-hint'); title.textContent = this.props.labels.pdfFileNameUseSelectionOrder;
    textBlock.append(title, buildHint(this.props.labels.pdfFileNameUseSelectionOrderHint, 'settings-hint settings-toggle-subtitle'));
    toggleRow.append(textBlock, buildSwitch({
      checked: this.props.pdfFileNameUseSelectionOrder,
      focusKey: 'settings.download.selectionOrder',
      disabled: this.props.isSettingsSaving,
      title: this.props.labels.pdfFileNameUseSelectionOrder,
      onChange: this.props.onPdfFileNameUseSelectionOrderChange,
    }));
    field.append(text(this.props.labels.defaultPdfDir), row, toggleRow);
    return field;
  }

  private renderConfigPathField() {
    const field = el('label', 'settings-field');
    const row = el('div', 'settings-input-row');
    row.append(
      buildInput({ value: this.props.configPath, className: 'settings-input-control', focusKey: 'settings.config.path', readOnly: true }),
      buildButton({ label: '...', icon: lxIconSemanticMap.settings.openConfigLocation, className: 'settings-native-icon-button', focusKey: 'settings.config.open', title: this.props.labels.openConfigLocation, disabled: !this.props.desktopRuntime || this.props.isSettingsSaving || !this.props.configPath.trim(), onClick: this.props.onOpenConfigLocation }),
    );
    field.append(text(this.props.labels.settingsConfigPath), row);
    return field;
  }

  private renderTextEditorField() {
    const field = el('div', 'settings-field settings-text-editor-field');
    const title = el('span', 'settings-section-title');
    const defaultBodyStyle = this.props.editorDraftStyle.defaultBodyStyle;
    const isDisabled = this.props.isSettingsSaving;

    title.textContent = this.props.labels.settingsTextEditorTitle;
    const subtitle = buildHint(this.props.labels.settingsTextEditorHint);

    const defaultBodyStyleTitle = el('span', 'settings-text-editor-group-title');
    defaultBodyStyleTitle.textContent = this.props.labels.settingsTextEditorDefaultBodyStyle;

    const fontFamilyField = el('label', 'settings-field');
    const fontFamilySelect = buildSelect(
      ensureCurrentSelectOption(
        this.props.editorDraftFontFamilyOptions,
        defaultBodyStyle.fontFamilyValue,
      ),
      defaultBodyStyle.fontFamilyValue,
      'settings.textEditor.fontFamily',
      this.props.onEditorDraftFontFamilyChange,
      'settings-text-editor-select',
    );
    fontFamilySelect.disabled = isDisabled;
    fontFamilyField.append(text(this.props.labels.settingsTextEditorFontFamily), fontFamilySelect);

    const fontSizeField = el('label', 'settings-field');
    const fontSizeSelect = buildSelect(
      ensureCurrentSelectOption(
        this.props.editorDraftFontSizeOptions,
        defaultBodyStyle.fontSizeValue,
      ),
      defaultBodyStyle.fontSizeValue,
      'settings.textEditor.fontSize',
      this.props.onEditorDraftFontSizeChange,
      'settings-text-editor-select',
    );
    fontSizeSelect.disabled = isDisabled;
    fontSizeField.append(text(this.props.labels.settingsTextEditorFontSize), fontSizeSelect);

    const lineHeightField = el('label', 'settings-field');
    const lineHeightInput = buildInput({
      type: 'number',
      value: defaultBodyStyle.lineHeight,
      className: 'settings-input-control settings-text-editor-line-height-input',
      focusKey: 'settings.textEditor.lineHeight',
      min: '0.5',
      max: '4',
      inputMode: 'decimal',
      onInput: this.props.onEditorDraftLineHeightChange,
    });
    lineHeightInput.step = '0.1';
    lineHeightInput.disabled = isDisabled;
    lineHeightField.append(text(this.props.labels.settingsTextEditorLineHeight), lineHeightInput);

    const colorField = el('label', 'settings-field');
    const colorRow = el('div', 'settings-text-editor-color-row');
    const colorPickerInput = buildInput({
      type: 'color',
      value: toColorPickerValue(defaultBodyStyle.color),
      className: 'settings-text-editor-color-picker',
      focusKey: 'settings.textEditor.colorPicker',
      onInput: this.props.onEditorDraftColorChange,
    });
    colorPickerInput.disabled = isDisabled;
    const colorValueInput = buildInput({
      value: defaultBodyStyle.color,
      className: 'settings-input-control settings-text-editor-color-value',
      focusKey: 'settings.textEditor.colorValue',
      readOnly: true,
    });
    colorRow.append(colorPickerInput, colorValueInput);
    colorField.append(text(this.props.labels.settingsTextEditorColor), colorRow);

    const resetButton = buildButton({
      label: this.props.labels.settingsTextEditorResetDefaultBodyStyle,
      className: 'settings-text-editor-reset-button',
      focusKey: 'settings.textEditor.resetDefaultBodyStyle',
      disabled: isDisabled,
      onClick: this.props.onResetEditorDraftStyle,
    });

    field.append(
      title,
      subtitle,
      defaultBodyStyleTitle,
      fontFamilyField,
      fontSizeField,
      lineHeightField,
      colorField,
      resetButton,
    );
    return field;
  }

  private renderToggleRow(focusKey: string, title: string, hint: string, checked: boolean, disabled: boolean, onChange: (checked: boolean) => void) {
    const row = el('div', 'settings-toggle-row');
    const textBlock = el('div');
    const label = el('span', 'settings-hint'); label.textContent = title;
    textBlock.append(label, buildHint(hint, 'settings-hint settings-toggle-subtitle'));
    row.append(textBlock, buildSwitch({ checked, focusKey, disabled, title, onChange }));
    return row;
  }

}

export type SettingsTopbarActionsProps = {
  backLabel: string;
  onNavigateBack: () => void;
};

export class SettingsTopbarActionsView {
  private props: SettingsTopbarActionsProps;
  private readonly actionBarView = createActionBarView({
    className: 'sidebar-topbar-actions',
    ariaRole: 'group',
  });
  private readonly hostElement = el('div', 'sidebar-topbar-actions-host');

  constructor(props: SettingsTopbarActionsProps) {
    this.props = props;
    this.hostElement.append(this.actionBarView.getElement());
    this.render();
  }

  getElement() {
    return this.hostElement;
  }

  setProps(props: SettingsTopbarActionsProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.actionBarView.dispose();
    this.hostElement.replaceChildren();
  }

  private render() {
    const backLabel = this.props.backLabel.trim();
    this.actionBarView.setProps({
      className: 'sidebar-topbar-actions',
      ariaRole: 'group',
      items: [
        {
          label: backLabel,
          title: backLabel,
          mode: 'icon',
          buttonClassName: 'sidebar-topbar-toggle-btn',
          content: createLxIcon('arrow-left'),
          onClick: () => this.props.onNavigateBack(),
        },
      ],
    });
  }
}

export function createSettingsPartView(props: SettingsPartProps) {
  return new SettingsPartView(props);
}

export function createSettingsTopbarActionsView(
  props: SettingsTopbarActionsProps,
) {
  return new SettingsTopbarActionsView(props);
}

export default SettingsPartView;
