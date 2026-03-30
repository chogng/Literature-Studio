import type { Locale } from '../../../../../language/i18n';
import type { LocaleMessages } from '../../../../../language/locales';
import type {
  LibraryDocumentSummary,
  LibraryStorageMode,
  LlmProviderId,
  LlmProviderSettings,
  RagProviderId,
  RagProviderSettings,
  TranslationProviderId,
  TranslationProviderSettings,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { createLxIcon, type LxIconName } from '../../../../base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from '../../../../base/browser/ui/lxicon/lxiconSemantic.js';
import { createSwitchView } from '../../../../base/browser/ui/switch/switch.js';
import {
  createDisplayLanguageOptions,
  requestSetDisplayLanguage,
} from '../../../contrib/localization/browser/localizationsActions';
import { batchLimitMax, batchLimitMin } from '../../../services/config/configSchema';
import type { BatchSource } from '../../../services/config/configSchema';
import { getDefaultModelForProvider, getLlmModelsForProvider } from '../../../services/llm/registry.js';
import { registerWorkbenchPartDomNode, WORKBENCH_PART_IDS } from '../../layout';
import './media/settings.css';

type SelectOption = { value: string; label: string };

export type SettingsPartLabels = {
  settingsTitle: string; settingsLoading: string; settingsLanguage: string; languageChinese: string; languageEnglish: string; settingsLanguageHint: string;
  settingsPageUrl: string; settingsPageUrlHint: string; pageUrlPlaceholder: string; settingsBatchJournalTitle: string; batchJournalTitlePlaceholder: string;
  addBatchUrl: string; removeBatchUrl: string; moveBatchUrlUp: string; moveBatchUrlDown: string; settingsBatchOptions: string; batchCount: string; sameDomainOnly: string;
  settingsAppearanceTitle: string; settingsUseMica: string; settingsUseMicaHint: string; settingsLibraryTitle: string; settingsKnowledgeBaseMode: string;
  settingsKnowledgeBaseModeHint: string; settingsKnowledgeBaseModeDisabledHint: string; settingsKnowledgeBaseAutoIndex: string; settingsKnowledgeBaseAutoIndexHint: string;
  settingsLibraryStorageMode: string; settingsLibraryStorageModeLinkedOriginal: string; settingsLibraryStorageModeManagedCopy: string; settingsLibraryDirectory: string;
  settingsLibraryDirectoryPlaceholder: string; settingsLibraryDirectoryHint: string; settingsLibraryDbFile: string; settingsLibraryFilesDir: string; settingsLibraryCacheDir: string;
  settingsLibraryStatusDocuments: string; settingsLibraryStatusFiles: string; settingsLibraryStatusQueuedJobs: string; settingsLibraryStatusEmpty: string; settingsLibraryRecentDocuments: string;
  settingsLibraryDocumentRegistered: string; settingsLibraryDocumentQueued: string; settingsLibraryDocumentRunning: string; settingsLibraryDocumentFailed: string;
  settingsLibraryMaxConcurrentJobs: string; settingsLibraryMaxConcurrentJobsHint: string; settingsRagTitle: string; settingsRagProvider: string; settingsRagProviderHint: string;
  settingsRagProviderMoark: string; settingsRagApiKey: string; settingsRagApiKeyPlaceholder: string; settingsRagBaseUrl: string; settingsRagEmbeddingModel: string;
  settingsRagRerankerModel: string; settingsRagEmbeddingPath: string; settingsRagRerankPath: string; settingsRagCandidateCount: string; settingsRagTopK: string;
  settingsRagTestConnection: string; settingsRagShowApiKey: string; settingsRagHideApiKey: string; settingsRagHint: string; settingsBatchHint: string; defaultPdfDir: string;
  pdfFileNameUseSelectionOrder: string; pdfFileNameUseSelectionOrderHint: string; downloadDirPlaceholder: string; chooseDirectory: string; openConfigLocation: string;
  resetDefault: string; settingsHintPath: string; settingsConfigPath: string; currentDir: string; systemDownloads: string; settingsLlmTitle: string; settingsLlmProvider: string;
  settingsLlmProviderHint: string; settingsLlmProviderGlm: string; settingsLlmProviderKimi: string; settingsLlmProviderDeepSeek: string; settingsLlmApiKey: string;
  settingsLlmApiKeyPlaceholder: string; settingsLlmModel: string; settingsLlmTestConnection: string; settingsLlmShowApiKey: string; settingsLlmHideApiKey: string;
  settingsLlmHint: string; settingsTranslationTitle: string; settingsTranslationProvider: string; settingsTranslationProviderHint: string; settingsTranslationProviderDeepL: string;
  settingsTranslationApiKey: string; settingsTranslationApiKeyPlaceholder: string; settingsTranslationTestConnection: string; settingsTranslationShowApiKey: string;
  settingsTranslationHideApiKey: string; settingsTranslationHint: string;
};

export type SettingsPartProps = {
  labels: SettingsPartLabels; isSettingsLoading: boolean; locale: Locale; batchSources: BatchSource[];
  onBatchSourceUrlChange: (index: number, url: string) => void; onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void; onAddBatchSource: () => void;
  onRemoveBatchSource: (index: number) => void; onMoveBatchSource: (index: number, direction: 'up' | 'down') => void; batchLimit: number; onBatchLimitChange: (value: string) => void;
  sameDomainOnly: boolean; onSameDomainOnlyChange: (checked: boolean) => void; useMica: boolean; onUseMicaChange: (checked: boolean) => void; ragEnabled: boolean;
  onRagEnabledChange: (checked: boolean) => void; autoIndexDownloadedPdf: boolean; onAutoIndexDownloadedPdfChange: (checked: boolean) => void; libraryStorageMode: LibraryStorageMode;
  onLibraryStorageModeChange: (value: LibraryStorageMode) => void; libraryDirectory: string; onLibraryDirectoryChange: (value: string) => void; onChooseLibraryDirectory: () => void;
  maxConcurrentIndexJobs: number; onMaxConcurrentIndexJobsChange: (value: string) => void; activeRagProvider: RagProviderId; ragProviders: Record<RagProviderId, RagProviderSettings>;
  onRagProviderApiKeyChange: (provider: RagProviderId, apiKey: string) => void; onRagProviderBaseUrlChange: (provider: RagProviderId, baseUrl: string) => void;
  onRagProviderEmbeddingModelChange: (provider: RagProviderId, model: string) => void; onRagProviderRerankerModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderEmbeddingPathChange: (provider: RagProviderId, path: string) => void; onRagProviderRerankPathChange: (provider: RagProviderId, path: string) => void;
  retrievalCandidateCount: number; onRetrievalCandidateCountChange: (value: string) => void; retrievalTopK: number; onRetrievalTopKChange: (value: string) => void;
  onTestRagConnection: () => void; isLibraryLoading: boolean; libraryDocumentCount: number; libraryFileCount: number; libraryQueuedJobCount: number; libraryDocuments: LibraryDocumentSummary[];
  libraryDbFile: string; defaultManagedDirectory: string; ragCacheDir: string; pdfDownloadDir: string; pdfFileNameUseSelectionOrder: boolean; onPdfDownloadDirChange: (value: string) => void;
  onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void; onChoosePdfDownloadDir: () => void; activeLlmProvider: LlmProviderId; onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>; onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void; onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  activeTranslationProvider: TranslationProviderId; onActiveTranslationProviderChange: (provider: TranslationProviderId) => void; translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void; onTestLlmConnection: () => void; onTestTranslationConnection: () => void;
  onOpenConfigLocation: () => void; desktopRuntime: boolean; configPath: string; isSettingsSaving: boolean; isTestingRagConnection: boolean; isTestingLlmConnection: boolean;
  isTestingTranslationConnection: boolean; onResetDownloadDir: () => void;
};

export type SettingsPartState = {
  ui: LocaleMessages; isSettingsLoading: boolean; locale: Locale; batchSources: BatchSource[]; batchLimit: number; sameDomainOnly: boolean; useMica: boolean;
  ragEnabled: boolean; autoIndexDownloadedPdf: boolean; libraryStorageMode: LibraryStorageMode; libraryDirectory: string; maxConcurrentIndexJobs: number; activeRagProvider: RagProviderId;
  ragProviders: Record<RagProviderId, RagProviderSettings>; retrievalCandidateCount: number; retrievalTopK: number; pdfDownloadDir: string; pdfFileNameUseSelectionOrder: boolean;
  activeLlmProvider: LlmProviderId; llmProviders: Record<LlmProviderId, LlmProviderSettings>; activeTranslationProvider: TranslationProviderId; translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  desktopRuntime: boolean; configPath: string; isLibraryLoading: boolean; libraryDocumentCount: number; libraryFileCount: number; libraryQueuedJobCount: number; libraryDocuments: LibraryDocumentSummary[];
  libraryDbFile: string; defaultManagedDirectory: string; ragCacheDir: string; isSettingsSaving: boolean; isTestingRagConnection: boolean; isTestingLlmConnection: boolean; isTestingTranslationConnection: boolean;
};

export type SettingsPartActions = {
  onBatchSourceUrlChange: (index: number, url: string) => void; onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void;
  onAddBatchSource: () => void; onRemoveBatchSource: (index: number) => void; onMoveBatchSource: (index: number, direction: 'up' | 'down') => void; onBatchLimitChange: (value: string) => void;
  onSameDomainOnlyChange: (checked: boolean) => void; onUseMicaChange: (checked: boolean) => void; onRagEnabledChange: (checked: boolean) => void; onAutoIndexDownloadedPdfChange: (checked: boolean) => void;
  onLibraryStorageModeChange: (value: LibraryStorageMode) => void; onLibraryDirectoryChange: (value: string) => void; onChooseLibraryDirectory: () => void; onMaxConcurrentIndexJobsChange: (value: string) => void;
  onRagProviderApiKeyChange: (provider: RagProviderId, apiKey: string) => void; onRagProviderBaseUrlChange: (provider: RagProviderId, baseUrl: string) => void; onRagProviderEmbeddingModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderRerankerModelChange: (provider: RagProviderId, model: string) => void; onRagProviderEmbeddingPathChange: (provider: RagProviderId, path: string) => void; onRagProviderRerankPathChange: (provider: RagProviderId, path: string) => void;
  onRetrievalCandidateCountChange: (value: string) => void; onRetrievalTopKChange: (value: string) => void; onPdfDownloadDirChange: (value: string) => void; onPdfFileNameUseSelectionOrderChange: (checked: boolean) => void;
  onChoosePdfDownloadDir: () => void; onActiveLlmProviderChange: (provider: LlmProviderId) => void; onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void; onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onActiveTranslationProviderChange: (provider: TranslationProviderId) => void; onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void; onTestRagConnection: () => void;
  onTestLlmConnection: () => void; onTestTranslationConnection: () => void; onOpenConfigLocation: () => void; onResetDownloadDir: () => void;
};

type CreateSettingsPartLabelsParams = { ui: LocaleMessages };
type CreateSettingsPartPropsParams = { state: SettingsPartState; actions: SettingsPartActions };

export function createSettingsPartLabels({ ui }: CreateSettingsPartLabelsParams): SettingsPartLabels {
  return {
    settingsTitle: ui.settingsTitle, settingsLoading: ui.settingsLoading, settingsLanguage: ui.settingsLanguage, languageChinese: ui.languageChinese, languageEnglish: ui.languageEnglish, settingsLanguageHint: ui.settingsLanguageHint,
    settingsPageUrl: ui.settingsPageUrl, settingsPageUrlHint: ui.settingsPageUrlHint, pageUrlPlaceholder: ui.pageUrlPlaceholder, settingsBatchJournalTitle: ui.settingsBatchJournalTitle, batchJournalTitlePlaceholder: ui.batchJournalTitlePlaceholder,
    addBatchUrl: ui.addBatchUrl, removeBatchUrl: ui.removeBatchUrl, moveBatchUrlUp: ui.moveBatchUrlUp, moveBatchUrlDown: ui.moveBatchUrlDown, settingsBatchOptions: ui.settingsBatchOptions, batchCount: ui.batchCount, sameDomainOnly: ui.sameDomainOnly,
    settingsAppearanceTitle: ui.settingsAppearanceTitle, settingsUseMica: ui.settingsUseMica, settingsUseMicaHint: ui.settingsUseMicaHint, settingsLibraryTitle: ui.settingsLibraryTitle, settingsKnowledgeBaseMode: ui.settingsKnowledgeBaseMode,
    settingsKnowledgeBaseModeHint: ui.settingsKnowledgeBaseModeHint, settingsKnowledgeBaseModeDisabledHint: ui.settingsKnowledgeBaseModeDisabledHint, settingsKnowledgeBaseAutoIndex: ui.settingsKnowledgeBaseAutoIndex, settingsKnowledgeBaseAutoIndexHint: ui.settingsKnowledgeBaseAutoIndexHint,
    settingsLibraryStorageMode: ui.settingsLibraryStorageMode, settingsLibraryStorageModeLinkedOriginal: ui.settingsLibraryStorageModeLinkedOriginal, settingsLibraryStorageModeManagedCopy: ui.settingsLibraryStorageModeManagedCopy, settingsLibraryDirectory: ui.settingsLibraryDirectory,
    settingsLibraryDirectoryPlaceholder: ui.settingsLibraryDirectoryPlaceholder, settingsLibraryDirectoryHint: ui.settingsLibraryDirectoryHint, settingsLibraryDbFile: ui.settingsLibraryDbFile, settingsLibraryFilesDir: ui.settingsLibraryFilesDir, settingsLibraryCacheDir: ui.settingsLibraryCacheDir,
    settingsLibraryStatusDocuments: ui.settingsLibraryStatusDocuments, settingsLibraryStatusFiles: ui.settingsLibraryStatusFiles, settingsLibraryStatusQueuedJobs: ui.settingsLibraryStatusQueuedJobs, settingsLibraryStatusEmpty: ui.settingsLibraryStatusEmpty, settingsLibraryRecentDocuments: ui.settingsLibraryRecentDocuments,
    settingsLibraryDocumentRegistered: ui.settingsLibraryDocumentRegistered, settingsLibraryDocumentQueued: ui.settingsLibraryDocumentQueued, settingsLibraryDocumentRunning: ui.settingsLibraryDocumentRunning, settingsLibraryDocumentFailed: ui.settingsLibraryDocumentFailed,
    settingsLibraryMaxConcurrentJobs: ui.settingsLibraryMaxConcurrentJobs, settingsLibraryMaxConcurrentJobsHint: ui.settingsLibraryMaxConcurrentJobsHint, settingsRagTitle: ui.settingsRagTitle, settingsRagProvider: ui.settingsRagProvider, settingsRagProviderHint: ui.settingsRagProviderHint,
    settingsRagProviderMoark: ui.settingsRagProviderMoark, settingsRagApiKey: ui.settingsRagApiKey, settingsRagApiKeyPlaceholder: ui.settingsRagApiKeyPlaceholder, settingsRagBaseUrl: ui.settingsRagBaseUrl, settingsRagEmbeddingModel: ui.settingsRagEmbeddingModel,
    settingsRagRerankerModel: ui.settingsRagRerankerModel, settingsRagEmbeddingPath: ui.settingsRagEmbeddingPath, settingsRagRerankPath: ui.settingsRagRerankPath, settingsRagCandidateCount: ui.settingsRagCandidateCount, settingsRagTopK: ui.settingsRagTopK,
    settingsRagTestConnection: ui.settingsRagTestConnection, settingsRagShowApiKey: ui.settingsRagShowApiKey, settingsRagHideApiKey: ui.settingsRagHideApiKey, settingsRagHint: ui.settingsRagHint, settingsBatchHint: ui.settingsBatchHint, defaultPdfDir: ui.defaultPdfDir,
    pdfFileNameUseSelectionOrder: ui.pdfFileNameUseSelectionOrder, pdfFileNameUseSelectionOrderHint: ui.pdfFileNameUseSelectionOrderHint, downloadDirPlaceholder: ui.downloadDirPlaceholder, chooseDirectory: ui.chooseDirectory, openConfigLocation: ui.openConfigLocation,
    resetDefault: ui.resetDefault, settingsHintPath: ui.settingsHintPath, settingsConfigPath: ui.settingsConfigPath, currentDir: ui.currentDir, systemDownloads: ui.systemDownloads, settingsLlmTitle: ui.settingsLlmTitle, settingsLlmProvider: ui.settingsLlmProvider,
    settingsLlmProviderHint: ui.settingsLlmProviderHint, settingsLlmProviderGlm: ui.settingsLlmProviderGlm, settingsLlmProviderKimi: ui.settingsLlmProviderKimi, settingsLlmProviderDeepSeek: ui.settingsLlmProviderDeepSeek, settingsLlmApiKey: ui.settingsLlmApiKey,
    settingsLlmApiKeyPlaceholder: ui.settingsLlmApiKeyPlaceholder, settingsLlmModel: ui.settingsLlmModel, settingsLlmTestConnection: ui.settingsLlmTestConnection, settingsLlmShowApiKey: ui.settingsLlmShowApiKey, settingsLlmHideApiKey: ui.settingsLlmHideApiKey,
    settingsLlmHint: ui.settingsLlmHint, settingsTranslationTitle: ui.settingsTranslationTitle, settingsTranslationProvider: ui.settingsTranslationProvider, settingsTranslationProviderHint: ui.settingsTranslationProviderHint, settingsTranslationProviderDeepL: ui.settingsTranslationProviderDeepL,
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
  return setFocusKey(view.getElement(), config.focusKey);
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
  button.title = config.title ?? config.label;
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

function resolveLibraryDocumentStatusLabel(labels: SettingsPartLabels, document: LibraryDocumentSummary) {
  if (document.latestJobStatus === 'failed' || document.ingestStatus === 'failed') { return labels.settingsLibraryDocumentFailed; }
  if (document.latestJobStatus === 'running' || document.ingestStatus === 'indexing') { return labels.settingsLibraryDocumentRunning; }
  if (document.latestJobStatus === 'queued' || document.ingestStatus === 'queued') { return labels.settingsLibraryDocumentQueued; }
  return labels.settingsLibraryDocumentRegistered;
}

export class SettingsPartView {
  private props: SettingsPartProps;
  private readonly element = el('main', 'settings-page');
  private showRagApiKey = false;
  private showLlmApiKey = false;
  private showTranslationApiKey = false;

  constructor(props: SettingsPartProps) {
    this.props = props;
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.settings, this.element);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: SettingsPartProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.settings, null);
    this.element.replaceChildren();
  }

  private captureFocus(): FocusSnapshot {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !this.element.contains(active)) {
      return null;
    }
    const key = active.dataset.focusKey;
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
    const target = this.element.querySelector<HTMLElement>(`[data-focus-key="${snapshot.key}"]`);
    if (!target) {
      return;
    }
    target.focus();
    if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && snapshot.selectionStart !== null) {
      target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd ?? snapshot.selectionStart);
    }
  }

  private render() {
    const focusSnapshot = this.captureFocus();
    const root = el('section', 'panel settings-card');
    root.append(this.renderHeader(), this.renderContent());
    this.element.replaceChildren(root);
    this.restoreFocus(focusSnapshot);
  }

  private renderHeader() {
    const header = el('div', 'panel-title settings-header');
    const title = el('span');
    title.textContent = this.props.labels.settingsTitle;
    header.append(title);
    return header;
  }

  private renderContent() {
    const content = el('div', 'settings-content');
    if (this.props.isSettingsLoading) {
      content.append(buildHint(this.props.labels.settingsLoading));
    }
    content.append(
      this.renderLocaleField(),
      this.renderBatchSourcesField(),
      this.renderBatchOptionsField(),
      this.renderAppearanceField(),
      this.renderLibraryField(),
      this.renderRagField(),
      this.renderDownloadDirectoryField(),
      this.renderLlmField(),
      this.renderTranslationField(),
      this.renderConfigPathField(),
    );
    return content;
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

  private renderBatchSourcesField() {
    const field = el('div', 'settings-field');
    const title = el('span');
    title.textContent = this.props.labels.settingsPageUrl;
    const list = el('div', 'settings-url-list');
    this.props.batchSources.forEach((source, index, all) => list.append(this.renderBatchSourceRow(source, index, all.length)));
    list.append(buildButton({
      label: this.props.labels.addBatchUrl,
      className: 'settings-text-button',
      focusKey: 'settings.batch.add',
      disabled: this.props.isSettingsSaving,
      onClick: this.props.onAddBatchSource,
    }));
    field.append(title, list, buildHint(this.props.labels.settingsPageUrlHint));
    return field;
  }

  private renderBatchSourceRow(source: BatchSource, index: number, total: number) {
    const row = el('div', 'settings-url-row');
    const controls = el('div', 'settings-url-order-controls');
    controls.append(
      buildButton({ label: 'Up', icon: lxIconSemanticMap.settings.moveUp, className: 'settings-native-icon-button', focusKey: `settings.batch.${index}.up`, title: this.props.labels.moveBatchUrlUp, disabled: index === 0 || this.props.isSettingsSaving, onClick: () => this.props.onMoveBatchSource(index, 'up') }),
      buildButton({ label: 'Down', icon: lxIconSemanticMap.settings.moveDown, className: 'settings-native-icon-button', focusKey: `settings.batch.${index}.down`, title: this.props.labels.moveBatchUrlDown, disabled: index === total - 1 || this.props.isSettingsSaving, onClick: () => this.props.onMoveBatchSource(index, 'down') }),
    );
    const urlInput = buildInput({
      value: source.url,
      className: 'settings-input-control',
      focusKey: `settings.batch.${index}.url`,
      placeholder: this.props.labels.pageUrlPlaceholder,
      onInput: (value) => this.props.onBatchSourceUrlChange(index, value),
    });
    const journalInput = buildInput({
      value: source.journalTitle,
      className: 'settings-journal-control',
      focusKey: `settings.batch.${index}.journal`,
      placeholder: this.props.labels.batchJournalTitlePlaceholder,
      onInput: (value) => this.props.onBatchSourceJournalTitleChange(index, value),
    });
    const removeButton = buildButton({
      label: 'X',
      icon: lxIconSemanticMap.settings.removeBatchSource,
      className: 'settings-native-icon-button',
      focusKey: `settings.batch.${index}.remove`,
      title: this.props.labels.removeBatchUrl,
      disabled: total === 1 || this.props.isSettingsSaving,
      onClick: () => this.props.onRemoveBatchSource(index),
    });
    row.append(controls, urlInput, journalInput, removeButton);
    return row;
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
    row.append(limitLabel, checkboxLabel);
    field.append(title, row, buildHint(this.props.labels.settingsBatchHint));
    return field;
  }

  private renderAppearanceField() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsAppearanceTitle;
    field.append(
      title,
      this.renderToggleRow(
        'settings.appearance.useMica',
        this.props.labels.settingsUseMica,
        this.props.labels.settingsUseMicaHint,
        this.props.useMica,
        this.props.isSettingsSaving || !this.props.desktopRuntime,
        this.props.onUseMicaChange,
      ),
    );
    return field;
  }

  private renderLibraryField() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsLibraryTitle;
    const effectiveManagedDirectory = this.props.libraryDirectory.trim() || this.props.defaultManagedDirectory;
    field.append(title);
    field.append(this.renderToggleRow('settings.library.enabled', this.props.labels.settingsKnowledgeBaseMode, this.props.labels.settingsKnowledgeBaseModeHint, this.props.ragEnabled, this.props.isSettingsSaving, this.props.onRagEnabledChange));
    if (!this.props.ragEnabled) { field.append(buildHint(this.props.labels.settingsKnowledgeBaseModeDisabledHint, 'settings-hint settings-library-mode-note')); }
    field.append(this.renderToggleRow('settings.library.autoIndex', this.props.labels.settingsKnowledgeBaseAutoIndex, this.props.labels.settingsKnowledgeBaseAutoIndexHint, this.props.autoIndexDownloadedPdf, this.props.isSettingsSaving || !this.props.ragEnabled, this.props.onAutoIndexDownloadedPdfChange));

    const grid = el('div', 'settings-llm-grid');
    const storageField = el('label', 'settings-field');
    storageField.append(text(this.props.labels.settingsLibraryStorageMode), buildSelect([
      { value: 'linked-original', label: this.props.labels.settingsLibraryStorageModeLinkedOriginal },
      { value: 'managed-copy', label: this.props.labels.settingsLibraryStorageModeManagedCopy },
    ], this.props.libraryStorageMode, 'settings.library.storage', (value) => this.props.onLibraryStorageModeChange(value as LibraryStorageMode), 'settings-llm-provider'));
    const jobsField = el('label', 'settings-field');
    const jobsWrap = el('div', 'settings-limit-input-wrap');
    jobsWrap.append(buildInput({ type: 'number', value: this.props.maxConcurrentIndexJobs, className: 'settings-limit-input', focusKey: 'settings.library.maxJobs', min: '1', max: '4', onInput: this.props.onMaxConcurrentIndexJobsChange }));
    jobsField.append(text(this.props.labels.settingsLibraryMaxConcurrentJobs), jobsWrap);
    grid.append(storageField, jobsField);
    field.append(grid);

    const directoryField = el('label', 'settings-field');
    const directoryRow = el('div', 'settings-input-row');
    directoryRow.append(
      buildInput({ value: this.props.libraryDirectory, className: 'settings-input-control', focusKey: 'settings.library.directory', placeholder: this.props.labels.settingsLibraryDirectoryPlaceholder, onInput: this.props.onLibraryDirectoryChange }),
      buildButton({ label: '...', icon: lxIconSemanticMap.settings.chooseDirectory, className: 'settings-native-icon-button', focusKey: 'settings.library.chooseDirectory', title: this.props.labels.chooseDirectory, disabled: !this.props.desktopRuntime || this.props.isSettingsSaving, onClick: this.props.onChooseLibraryDirectory }),
    );
    directoryField.append(
      text(this.props.labels.settingsLibraryDirectory),
      directoryRow,
      buildHint(this.props.labels.settingsLibraryDirectoryHint),
      buildHint(`${this.props.labels.currentDir} ${effectiveManagedDirectory || '-'}`),
      buildHint(this.props.labels.settingsLibraryMaxConcurrentJobsHint),
    );
    field.append(directoryField, this.renderLibraryStats(), this.renderLibraryRecentDocuments(), this.renderReadOnlyField(this.props.labels.settingsLibraryDbFile, this.props.libraryDbFile, 'settings.library.db'), this.renderReadOnlyField(this.props.labels.settingsLibraryFilesDir, effectiveManagedDirectory, 'settings.library.filesDir'), this.renderReadOnlyField(this.props.labels.settingsLibraryCacheDir, this.props.ragCacheDir, 'settings.library.cacheDir'));
    return field;
  }

  private renderLibraryStats() {
    const stats = el('div', 'settings-library-stats');
    const addCard = (label: string, value: number) => {
      const card = el('div', 'settings-library-stat-card');
      const cardLabel = el('span', 'settings-library-stat-label'); cardLabel.textContent = label;
      const strong = el('strong'); strong.textContent = String(value);
      card.append(cardLabel, strong);
      stats.append(card);
    };
    addCard(this.props.labels.settingsLibraryStatusDocuments, this.props.libraryDocumentCount);
    addCard(this.props.labels.settingsLibraryStatusFiles, this.props.libraryFileCount);
    addCard(this.props.labels.settingsLibraryStatusQueuedJobs, this.props.libraryQueuedJobCount);
    return stats;
  }

  private renderLibraryRecentDocuments() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsLibraryRecentDocuments;
    field.append(title);
    if (this.props.isLibraryLoading) { field.append(buildHint(this.props.labels.settingsLoading)); }
    if (this.props.libraryDocuments.length === 0) {
      field.append(buildHint(this.props.labels.settingsLibraryStatusEmpty));
      return field;
    }
    const list = el('div', 'settings-library-doc-list');
    for (const document of this.props.libraryDocuments) {
      const item = el('div', 'settings-library-doc-item');
      const strong = el('strong', 'settings-library-doc-title'); strong.textContent = document.title || '-';
      const meta = el('span', 'settings-library-doc-meta'); meta.textContent = [document.journalTitle, document.publishedAt].filter(Boolean).join(' | ');
      const status = el('span', 'settings-library-doc-status'); status.textContent = resolveLibraryDocumentStatusLabel(this.props.labels, document);
      item.append(strong, meta, status);
      list.append(item);
    }
    field.append(list);
    return field;
  }

  private renderRagField() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsRagTitle;
    const provider = this.props.ragProviders[this.props.activeRagProvider];
    const grid = el('div', 'settings-llm-grid');
    const providerField = el('label', 'settings-field');
    providerField.append(text(this.props.labels.settingsRagProvider), buildInput({ value: this.props.labels.settingsRagProviderMoark, className: 'settings-input-control', focusKey: 'settings.rag.provider', readOnly: true }), buildHint(this.props.labels.settingsRagProviderHint));
    grid.append(providerField);
    grid.append(this.renderNumberField(this.props.labels.settingsRagCandidateCount, this.props.retrievalCandidateCount, 'settings.rag.candidates', '3', '20', this.props.onRetrievalCandidateCountChange));
    grid.append(this.renderNumberField(this.props.labels.settingsRagTopK, this.props.retrievalTopK, 'settings.rag.topK', '1', String(this.props.retrievalCandidateCount), this.props.onRetrievalTopKChange));
    grid.append(this.renderTextField(this.props.labels.settingsRagBaseUrl, provider.baseUrl, 'settings.rag.baseUrl', (value) => this.props.onRagProviderBaseUrlChange(this.props.activeRagProvider, value), 'settings-field settings-llm-span-2'));
    grid.append(this.renderTextField(this.props.labels.settingsRagEmbeddingModel, provider.embeddingModel, 'settings.rag.embeddingModel', (value) => this.props.onRagProviderEmbeddingModelChange(this.props.activeRagProvider, value)));
    grid.append(this.renderTextField(this.props.labels.settingsRagRerankerModel, provider.rerankerModel, 'settings.rag.rerankerModel', (value) => this.props.onRagProviderRerankerModelChange(this.props.activeRagProvider, value)));
    grid.append(this.renderTextField(this.props.labels.settingsRagEmbeddingPath, provider.embeddingPath, 'settings.rag.embeddingPath', (value) => this.props.onRagProviderEmbeddingPathChange(this.props.activeRagProvider, value)));
    grid.append(this.renderTextField(this.props.labels.settingsRagRerankPath, provider.rerankPath, 'settings.rag.rerankPath', (value) => this.props.onRagProviderRerankPathChange(this.props.activeRagProvider, value)));
    grid.append(this.renderApiKeyField({
      title: this.props.labels.settingsRagApiKey, value: provider.apiKey, placeholder: this.props.labels.settingsRagApiKeyPlaceholder, show: this.showRagApiKey,
      focusKey: 'settings.rag.apiKey', toggleKey: 'settings.rag.apiKey.toggle', toggleLabelShow: this.props.labels.settingsRagShowApiKey, toggleLabelHide: this.props.labels.settingsRagHideApiKey,
      onToggle: () => { this.showRagApiKey = !this.showRagApiKey; this.render(); },
      onInput: (value) => this.props.onRagProviderApiKeyChange(this.props.activeRagProvider, value),
      testButtonLabel: this.props.labels.settingsRagTestConnection, testButtonKey: 'settings.rag.test', testButtonDisabled: this.props.isSettingsSaving || this.props.isTestingRagConnection, onTest: this.props.onTestRagConnection,
    }));
    field.append(title, buildHint(this.props.labels.settingsRagHint), grid);
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

  private renderLlmField() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsLlmTitle;
    const grid = el('div', 'settings-llm-grid');
    const provider = this.props.llmProviders[this.props.activeLlmProvider];
    const models = getLlmModelsForProvider(this.props.activeLlmProvider).map((model) => ({ value: model.id, label: model.label }));
    const selectedModel = models.find((model) => model.value === provider.model)?.value ?? getDefaultModelForProvider(this.props.activeLlmProvider);
    const providerField = el('label', 'settings-field');
    providerField.append(text(this.props.labels.settingsLlmProvider), buildSelect([
      { value: 'glm', label: this.props.labels.settingsLlmProviderGlm },
      { value: 'kimi', label: this.props.labels.settingsLlmProviderKimi },
      { value: 'deepseek', label: this.props.labels.settingsLlmProviderDeepSeek },
    ], this.props.activeLlmProvider, 'settings.llm.provider', (value) => this.props.onActiveLlmProviderChange(value as LlmProviderId), 'settings-llm-provider'));
    const modelField = el('label', 'settings-field');
    modelField.append(text(this.props.labels.settingsLlmModel), buildSelect(models, selectedModel, 'settings.llm.model', (value) => this.props.onLlmProviderModelChange(this.props.activeLlmProvider, value), 'settings-llm-provider'));
    grid.append(providerField, modelField);
    grid.append(this.renderApiKeyField({
      title: this.props.labels.settingsLlmApiKey, value: provider.apiKey, placeholder: this.props.labels.settingsLlmApiKeyPlaceholder, show: this.showLlmApiKey,
      focusKey: 'settings.llm.apiKey', toggleKey: 'settings.llm.apiKey.toggle', toggleLabelShow: this.props.labels.settingsLlmShowApiKey, toggleLabelHide: this.props.labels.settingsLlmHideApiKey,
      onToggle: () => { this.showLlmApiKey = !this.showLlmApiKey; this.render(); },
      onInput: (value) => this.props.onLlmProviderApiKeyChange(this.props.activeLlmProvider, value),
      testButtonLabel: this.props.labels.settingsLlmTestConnection, testButtonKey: 'settings.llm.test', testButtonDisabled: this.props.isSettingsSaving || this.props.isTestingLlmConnection, onTest: this.props.onTestLlmConnection,
      className: 'settings-field settings-llm-api-field',
    }));
    field.append(title, buildHint(this.props.labels.settingsLlmHint), grid);
    return field;
  }

  private renderTranslationField() {
    const field = el('div', 'settings-field');
    const title = el('span'); title.textContent = this.props.labels.settingsTranslationTitle;
    const grid = el('div', 'settings-llm-grid');
    const providerField = el('label', 'settings-field');
    providerField.append(text(this.props.labels.settingsTranslationProvider), buildSelect([{ value: 'deepl', label: this.props.labels.settingsTranslationProviderDeepL }], this.props.activeTranslationProvider, 'settings.translation.provider', (value) => this.props.onActiveTranslationProviderChange(value as TranslationProviderId), 'settings-llm-provider'));
    grid.append(providerField);
    grid.append(this.renderApiKeyField({
      title: this.props.labels.settingsTranslationApiKey, value: this.props.translationProviders[this.props.activeTranslationProvider].apiKey, placeholder: this.props.labels.settingsTranslationApiKeyPlaceholder, show: this.showTranslationApiKey,
      focusKey: 'settings.translation.apiKey', toggleKey: 'settings.translation.apiKey.toggle', toggleLabelShow: this.props.labels.settingsTranslationShowApiKey, toggleLabelHide: this.props.labels.settingsTranslationHideApiKey,
      onToggle: () => { this.showTranslationApiKey = !this.showTranslationApiKey; this.render(); },
      onInput: (value) => this.props.onTranslationProviderApiKeyChange(this.props.activeTranslationProvider, value),
      testButtonLabel: this.props.labels.settingsTranslationTestConnection, testButtonKey: 'settings.translation.test', testButtonDisabled: this.props.isSettingsSaving || this.props.isTestingTranslationConnection, onTest: this.props.onTestTranslationConnection,
    }));
    field.append(title, buildHint(this.props.labels.settingsTranslationHint), grid);
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

  private renderToggleRow(focusKey: string, title: string, hint: string, checked: boolean, disabled: boolean, onChange: (checked: boolean) => void) {
    const row = el('div', 'settings-toggle-row');
    const textBlock = el('div');
    const label = el('span', 'settings-hint'); label.textContent = title;
    textBlock.append(label, buildHint(hint, 'settings-hint settings-toggle-subtitle'));
    row.append(textBlock, buildSwitch({ checked, focusKey, disabled, title, onChange }));
    return row;
  }

  private renderReadOnlyField(label: string, value: string, focusKey: string) {
    const field = el('label', 'settings-field');
    field.append(text(label), buildInput({ value, className: 'settings-input-control', focusKey, readOnly: true }));
    return field;
  }

  private renderNumberField(label: string, value: number, focusKey: string, min: string, max: string, onInput: (value: string) => void) {
    const field = el('label', 'settings-field');
    const wrap = el('div', 'settings-limit-input-wrap');
    wrap.append(buildInput({ type: 'number', value, className: 'settings-limit-input', focusKey, min, max, inputMode: 'numeric', onInput }));
    field.append(text(label), wrap);
    return field;
  }

  private renderTextField(label: string, value: string, focusKey: string, onInput: (value: string) => void, className = 'settings-field') {
    const field = el('label', className);
    field.append(text(label), buildInput({ value, className: 'settings-input-control', focusKey, onInput }));
    return field;
  }

  private renderApiKeyField(config: {
    title: string; value: string; placeholder: string; show: boolean; focusKey: string; toggleKey: string; toggleLabelShow: string; toggleLabelHide: string; onToggle: () => void;
    onInput: (value: string) => void; testButtonLabel: string; testButtonKey: string; testButtonDisabled: boolean; onTest: () => void; className?: string;
  }) {
    const field = el('label', config.className ?? 'settings-field settings-llm-api-field settings-llm-span-2');
    const row = el('div', 'settings-input-row settings-llm-api-row');
    const inputWrap = el('div', 'settings-native-input-wrap settings-api-key-input');
    const input = buildInput({ type: config.show ? 'text' : 'password', value: config.value, className: 'settings-input-control', focusKey: config.focusKey, placeholder: config.placeholder, onInput: config.onInput });
    const toggle = buildButton({ label: config.show ? config.toggleLabelHide : config.toggleLabelShow, className: 'settings-password-toggle', focusKey: config.toggleKey, title: config.show ? config.toggleLabelHide : config.toggleLabelShow, onClick: config.onToggle });
    const testButton = buildButton({ label: config.testButtonLabel, className: 'settings-llm-test-btn', focusKey: config.testButtonKey, disabled: config.testButtonDisabled, onClick: config.onTest });
    inputWrap.append(input, toggle);
    row.append(inputWrap, testButton);
    field.append(text(config.title), row);
    return field;
  }
}

export function createSettingsPartView(props: SettingsPartProps) {
  return new SettingsPartView(props);
}

export default SettingsPartView;
