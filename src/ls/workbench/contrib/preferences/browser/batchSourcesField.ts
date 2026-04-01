import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon.js';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic.js';
import type { BatchSource } from 'ls/workbench/services/config/configSchema.js';
import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes.js';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

function setFocusKey<T extends HTMLElement>(node: T, key: string) {
  node.dataset.focusKey = key;
  return node;
}

function buildInput(config: {
  value: string;
  className: string;
  focusKey: string;
  placeholder?: string;
}) {
  const input = setFocusKey(el('input', `settings-native-input ${config.className}`.trim()), config.focusKey);
  input.type = 'text';
  input.value = config.value;
  input.placeholder = config.placeholder ?? '';
  return input;
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

export type BatchSourceRowViewProps = {
  source: BatchSource;
  index: number;
  total: number;
  labels: SettingsPartLabels;
  isSettingsSaving: boolean;
  onBatchSourceUrlChange: (index: number, url: string) => void;
  onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void;
  onRemoveBatchSource: (index: number) => void;
  onMoveBatchSource: (index: number, direction: 'up' | 'down') => void;
};

export type BatchSourcesFieldViewProps = {
  labels: SettingsPartLabels;
  batchSources: BatchSource[];
  isSettingsSaving: boolean;
  onBatchSourceUrlChange: (index: number, url: string) => void;
  onBatchSourceJournalTitleChange: (index: number, journalTitle: string) => void;
  onAddBatchSource: () => void;
  onRemoveBatchSource: (index: number) => void;
  onMoveBatchSource: (index: number, direction: 'up' | 'down') => void;
};

class BatchSourceRowView {
  private props: BatchSourceRowViewProps;
  private readonly element = el('div', 'settings-url-row');
  private readonly controls = el('div', 'settings-url-order-controls');
  private readonly upButton = buildButton({ label: 'Up', icon: lxIconSemanticMap.settings.moveUp, className: 'settings-native-icon-button', focusKey: '', title: '', onClick: () => this.props.onMoveBatchSource(this.props.index, 'up') });
  private readonly downButton = buildButton({ label: 'Down', icon: lxIconSemanticMap.settings.moveDown, className: 'settings-native-icon-button', focusKey: '', title: '', onClick: () => this.props.onMoveBatchSource(this.props.index, 'down') });
  private readonly urlInput = buildInput({ value: '', className: 'settings-input-control', focusKey: '', placeholder: '' });
  private readonly journalInput = buildInput({ value: '', className: 'settings-journal-control', focusKey: '', placeholder: '' });
  private readonly removeButton = buildButton({ label: 'X', icon: lxIconSemanticMap.settings.removeBatchSource, className: 'settings-native-icon-button', focusKey: '', title: '', onClick: () => this.props.onRemoveBatchSource(this.props.index) });

  constructor(props: BatchSourceRowViewProps) {
    this.props = props;
    this.controls.append(this.upButton, this.downButton);
    this.urlInput.addEventListener('input', () => this.props.onBatchSourceUrlChange(this.props.index, this.urlInput.value));
    this.journalInput.addEventListener('input', () => this.props.onBatchSourceJournalTitleChange(this.props.index, this.journalInput.value));
    this.element.append(this.controls, this.urlInput, this.journalInput, this.removeButton);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: BatchSourceRowViewProps) {
    this.props = props;
    setFocusKey(this.upButton, `settings.batch.${props.index}.up`);
    this.upButton.title = props.labels.moveBatchUrlUp;
    this.upButton.ariaLabel = props.labels.moveBatchUrlUp;
    this.upButton.disabled = props.index === 0 || props.isSettingsSaving;

    setFocusKey(this.downButton, `settings.batch.${props.index}.down`);
    this.downButton.title = props.labels.moveBatchUrlDown;
    this.downButton.ariaLabel = props.labels.moveBatchUrlDown;
    this.downButton.disabled = props.index === props.total - 1 || props.isSettingsSaving;

    setFocusKey(this.urlInput, `settings.batch.${props.index}.url`);
    this.urlInput.value = props.source.url;
    this.urlInput.placeholder = props.labels.pageUrlPlaceholder;

    setFocusKey(this.journalInput, `settings.batch.${props.index}.journal`);
    this.journalInput.value = props.source.journalTitle;
    this.journalInput.placeholder = props.labels.batchJournalTitlePlaceholder;

    setFocusKey(this.removeButton, `settings.batch.${props.index}.remove`);
    this.removeButton.title = props.labels.removeBatchUrl;
    this.removeButton.ariaLabel = props.labels.removeBatchUrl;
    this.removeButton.disabled = props.total === 1 || props.isSettingsSaving;
  }
}

export class BatchSourcesFieldView {
  private props: BatchSourcesFieldViewProps;
  private readonly element = el('div', 'settings-field');
  private readonly title = el('span');
  private readonly list = el('div', 'settings-url-list');
  private readonly hint = buildHint('');
  private readonly addButton = buildButton({ label: '', className: 'settings-text-button', focusKey: 'settings.batch.add', onClick: () => this.props.onAddBatchSource() });
  private rowViews: BatchSourceRowView[] = [];

  constructor(props: BatchSourcesFieldViewProps) {
    this.props = props;
    this.element.append(this.title, this.list, this.hint);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: BatchSourcesFieldViewProps) {
    this.props = props;
    this.title.textContent = props.labels.settingsPageUrl;
    this.hint.textContent = props.labels.settingsPageUrlHint;
    this.addButton.textContent = props.labels.addBatchUrl;
    this.addButton.disabled = props.isSettingsSaving;

    const requiredRows = props.batchSources.length;
    while (this.rowViews.length < requiredRows) {
      this.rowViews.push(new BatchSourceRowView({
        source: props.batchSources[this.rowViews.length],
        index: this.rowViews.length,
        total: requiredRows,
        labels: props.labels,
        isSettingsSaving: props.isSettingsSaving,
        onBatchSourceUrlChange: props.onBatchSourceUrlChange,
        onBatchSourceJournalTitleChange: props.onBatchSourceJournalTitleChange,
        onRemoveBatchSource: props.onRemoveBatchSource,
        onMoveBatchSource: props.onMoveBatchSource,
      }));
    }
    while (this.rowViews.length > requiredRows) {
      this.rowViews.pop();
    }

    props.batchSources.forEach((source, index) => {
      this.rowViews[index].setProps({
        source,
        index,
        total: requiredRows,
        labels: props.labels,
        isSettingsSaving: props.isSettingsSaving,
        onBatchSourceUrlChange: props.onBatchSourceUrlChange,
        onBatchSourceJournalTitleChange: props.onBatchSourceJournalTitleChange,
        onRemoveBatchSource: props.onRemoveBatchSource,
        onMoveBatchSource: props.onMoveBatchSource,
      });
    });

    this.list.replaceChildren(...this.rowViews.map((view) => view.getElement()), this.addButton);
  }
}
