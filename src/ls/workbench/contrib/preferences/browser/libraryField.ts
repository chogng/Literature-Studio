import type {
  LibraryDocumentSummary,
  LibraryStorageMode,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { createLxIcon } from '../../../../base/browser/ui/lxicon/lxicon.js';
import type { LxIconName } from '../../../../base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from '../../../../base/browser/ui/lxicon/lxiconSemantic.js';
import { createSwitchView } from '../../../../base/browser/ui/switch/switch.js';
import type { SettingsPartLabels } from './settingsTypes.js';

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

function buildSelect(options: readonly { value: string; label: string }[], value: string, focusKey: string, onChange: (value: string) => void, className: string) {
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

function resolveLibraryDocumentStatusLabel(labels: SettingsPartLabels, document: LibraryDocumentSummary) {
  if (document.latestJobStatus === 'failed' || document.ingestStatus === 'failed') { return labels.settingsLibraryDocumentFailed; }
  if (document.latestJobStatus === 'running' || document.ingestStatus === 'indexing') { return labels.settingsLibraryDocumentRunning; }
  if (document.latestJobStatus === 'queued' || document.ingestStatus === 'queued') { return labels.settingsLibraryDocumentQueued; }
  return labels.settingsLibraryDocumentRegistered;
}

export type LibraryFieldViewProps = {
  labels: SettingsPartLabels;
  knowledgeBaseEnabled: boolean;
  autoIndexDownloadedPdf: boolean;
  knowledgeBasePdfDownloadDir: string;
  libraryStorageMode: LibraryStorageMode;
  libraryDirectory: string;
  defaultManagedDirectory: string;
  maxConcurrentIndexJobs: number;
  desktopRuntime: boolean;
  isSettingsSaving: boolean;
  isLibraryLoading: boolean;
  libraryDocumentCount: number;
  libraryFileCount: number;
  libraryQueuedJobCount: number;
  libraryDocuments: LibraryDocumentSummary[];
  libraryDbFile: string;
  ragCacheDir: string;
  onKnowledgeBaseEnabledChange: (checked: boolean) => void;
  onAutoIndexDownloadedPdfChange: (checked: boolean) => void;
  onKnowledgeBasePdfDownloadDirChange: (value: string) => void;
  onChooseKnowledgeBasePdfDownloadDir: () => void;
  onLibraryStorageModeChange: (value: LibraryStorageMode) => void;
  onLibraryDirectoryChange: (value: string) => void;
  onChooseLibraryDirectory: () => void;
  onMaxConcurrentIndexJobsChange: (value: string) => void;
};

export class LibraryFieldView {
  private props: LibraryFieldViewProps;
  private readonly element = el('div', 'settings-field');

  constructor(props: LibraryFieldViewProps) {
    this.props = props;
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: LibraryFieldViewProps) {
    this.props = props;
    this.element.replaceChildren(this.render());
  }

  private render() {
    const field = el('div', 'settings-field');
    const title = el('span');
    title.textContent = this.props.labels.settingsLibraryTitle;
    const effectiveManagedDirectory = this.props.libraryDirectory.trim() || this.props.defaultManagedDirectory;

    field.append(title);
    field.append(this.renderToggleRow('settings.library.enabled', this.props.labels.settingsKnowledgeBaseMode, this.props.labels.settingsKnowledgeBaseModeHint, this.props.knowledgeBaseEnabled, this.props.isSettingsSaving, this.props.onKnowledgeBaseEnabledChange));
    if (!this.props.knowledgeBaseEnabled) {
      field.append(buildHint(this.props.labels.settingsKnowledgeBaseModeDisabledHint, 'settings-hint settings-library-mode-note'));
    }
    field.append(this.renderToggleRow('settings.library.autoIndex', this.props.labels.settingsKnowledgeBaseAutoIndex, this.props.labels.settingsKnowledgeBaseAutoIndexHint, this.props.autoIndexDownloadedPdf, this.props.isSettingsSaving || !this.props.knowledgeBaseEnabled, this.props.onAutoIndexDownloadedPdfChange));

    const downloadDirectoryField = el('label', 'settings-field');
    const downloadDirectoryRow = el('div', 'settings-input-row');
    downloadDirectoryRow.append(
      buildInput({ value: this.props.knowledgeBasePdfDownloadDir, className: 'settings-input-control', focusKey: 'settings.library.downloadDirectory', placeholder: this.props.labels.settingsKnowledgeBasePdfDownloadDirPlaceholder, onInput: this.props.onKnowledgeBasePdfDownloadDirChange }),
      buildButton({ label: '...', icon: lxIconSemanticMap.settings.chooseDirectory, className: 'settings-native-icon-button', focusKey: 'settings.library.chooseDownloadDirectory', title: this.props.labels.chooseDirectory, disabled: !this.props.desktopRuntime || this.props.isSettingsSaving, onClick: this.props.onChooseKnowledgeBasePdfDownloadDir }),
    );
    downloadDirectoryField.append(
      text(this.props.labels.settingsKnowledgeBasePdfDownloadDir),
      downloadDirectoryRow,
      buildHint(this.props.labels.settingsKnowledgeBasePdfDownloadDirHint),
      buildHint(`${this.props.labels.currentDir} ${this.props.knowledgeBasePdfDownloadDir.trim() || this.props.labels.systemDownloads}`),
    );
    field.append(downloadDirectoryField);

    const grid = el('div', 'settings-llm-grid');
    const storageField = el('label', 'settings-field');
    storageField.append(
      text(this.props.labels.settingsLibraryStorageMode),
      buildSelect([
        { value: 'linked-original', label: this.props.labels.settingsLibraryStorageModeLinkedOriginal },
        { value: 'managed-copy', label: this.props.labels.settingsLibraryStorageModeManagedCopy },
      ], this.props.libraryStorageMode, 'settings.library.storage', (value) => this.props.onLibraryStorageModeChange(value as LibraryStorageMode), 'settings-llm-provider'),
    );
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

    field.append(
      directoryField,
      this.renderLibraryStats(),
      this.renderLibraryRecentDocuments(),
      this.renderReadOnlyField(this.props.labels.settingsLibraryDbFile, this.props.libraryDbFile, 'settings.library.db'),
      this.renderReadOnlyField(this.props.labels.settingsLibraryFilesDir, effectiveManagedDirectory, 'settings.library.filesDir'),
      this.renderReadOnlyField(this.props.labels.settingsLibraryCacheDir, this.props.ragCacheDir, 'settings.library.cacheDir'),
    );

    return field;
  }

  private renderToggleRow(focusKey: string, title: string, hint: string, checked: boolean, disabled: boolean, onChange: (checked: boolean) => void) {
    const row = el('div', 'settings-toggle-row');
    const textBlock = el('div');
    const label = el('span', 'settings-hint');
    label.textContent = title;
    textBlock.append(label, buildHint(hint, 'settings-hint settings-toggle-subtitle'));
    row.append(textBlock, buildSwitch({ checked, focusKey, disabled, title, onChange }));
    return row;
  }

  private renderLibraryStats() {
    const stats = el('div', 'settings-library-stats');
    const addCard = (label: string, value: number) => {
      const card = el('div', 'settings-library-stat-card');
      const cardLabel = el('span', 'settings-library-stat-label');
      cardLabel.textContent = label;
      const strong = el('strong');
      strong.textContent = String(value);
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
    const title = el('span');
    title.textContent = this.props.labels.settingsLibraryRecentDocuments;
    field.append(title);
    if (this.props.isLibraryLoading) {
      field.append(buildHint(this.props.labels.settingsLoading));
    }
    if (this.props.libraryDocuments.length === 0) {
      field.append(buildHint(this.props.labels.settingsLibraryStatusEmpty));
      return field;
    }
    const list = el('div', 'settings-library-doc-list');
    for (const document of this.props.libraryDocuments) {
      const item = el('div', 'settings-library-doc-item');
      const strong = el('strong', 'settings-library-doc-title');
      strong.textContent = document.title || '-';
      const meta = el('span', 'settings-library-doc-meta');
      meta.textContent = [document.journalTitle, document.publishedAt].filter(Boolean).join(' | ');
      const status = el('span', 'settings-library-doc-status');
      status.textContent = resolveLibraryDocumentStatusLabel(this.props.labels, document);
      item.append(strong, meta, status);
      list.append(item);
    }
    field.append(list);
    return field;
  }

  private renderReadOnlyField(label: string, value: string, focusKey: string) {
    const field = el('label', 'settings-field');
    field.append(text(label), buildInput({ value, className: 'settings-input-control', focusKey, readOnly: true }));
    return field;
  }
}
