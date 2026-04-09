import { applyHover } from 'ls/base/browser/ui/hover/hover';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import type { BatchSource } from 'ls/workbench/services/config/configSchema';
import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes';
import {
  buildSettingsButton as buildButton,
  buildSettingsHint as buildHint,
  buildSettingsInput as buildInput,
  createSettingsElement as el,
  setSettingsFocusKey as setFocusKey,
} from 'ls/workbench/contrib/preferences/browser/settingsUiPrimitives';

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

export type BatchSourcesWidgetProps = {
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
  private readonly urlInput = buildInput({
    value: '',
    className: 'settings-input-control',
    focusKey: '',
    placeholder: '',
    onInput: (value) => this.props.onBatchSourceUrlChange(this.props.index, value),
  });
  private readonly journalInput = buildInput({
    value: '',
    className: 'settings-journal-control',
    focusKey: '',
    placeholder: '',
    onInput: (value) => this.props.onBatchSourceJournalTitleChange(this.props.index, value),
  });
  private readonly removeButton = buildButton({ label: 'X', icon: lxIconSemanticMap.settings.removeBatchSource, className: 'settings-native-icon-button', focusKey: '', title: '', onClick: () => this.props.onRemoveBatchSource(this.props.index) });

  constructor(props: BatchSourceRowViewProps) {
    this.props = props;
    this.controls.append(this.upButton, this.downButton);
    this.element.append(this.controls, this.urlInput.element, this.journalInput.element, this.removeButton);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: BatchSourceRowViewProps) {
    this.props = props;
    setFocusKey(this.upButton, `settings.batch.${props.index}.up`);
    applyHover(this.upButton, props.labels.moveBatchUrlUp);
    this.upButton.ariaLabel = props.labels.moveBatchUrlUp;
    this.upButton.disabled = props.index === 0 || props.isSettingsSaving;

    setFocusKey(this.downButton, `settings.batch.${props.index}.down`);
    applyHover(this.downButton, props.labels.moveBatchUrlDown);
    this.downButton.ariaLabel = props.labels.moveBatchUrlDown;
    this.downButton.disabled = props.index === props.total - 1 || props.isSettingsSaving;

    setFocusKey(this.urlInput.inputElement, `settings.batch.${props.index}.url`);
    this.urlInput.value = props.source.url;
    this.urlInput.setPlaceHolder(props.labels.pageUrlPlaceholder);

    setFocusKey(this.journalInput.inputElement, `settings.batch.${props.index}.journal`);
    this.journalInput.value = props.source.journalTitle;
    this.journalInput.setPlaceHolder(props.labels.batchJournalTitlePlaceholder);

    setFocusKey(this.removeButton, `settings.batch.${props.index}.remove`);
    applyHover(this.removeButton, props.labels.removeBatchUrl);
    this.removeButton.ariaLabel = props.labels.removeBatchUrl;
    this.removeButton.disabled = props.total === 1 || props.isSettingsSaving;
  }
}

export class BatchSourcesWidget {
  private props: BatchSourcesWidgetProps;
  private readonly element = el('div', 'settings-field');
  private readonly title = el('span');
  private readonly list = el('div', 'settings-url-list');
  private readonly hint = buildHint('');
  private readonly addButton = buildButton({ label: '', className: 'settings-text-button', focusKey: 'settings.batch.add', onClick: () => this.props.onAddBatchSource() });
  private rowViews: BatchSourceRowView[] = [];

  constructor(props: BatchSourcesWidgetProps) {
    this.props = props;
    this.element.append(this.title, this.list, this.hint);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: BatchSourcesWidgetProps) {
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
