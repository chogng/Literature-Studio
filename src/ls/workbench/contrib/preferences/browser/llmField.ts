import { createSwitchView } from 'ls/base/browser/ui/switch/switch';
import type { LlmProviderId, LlmProviderSettings } from 'ls/base/parts/sandbox/common/desktopTypes';
import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes';
import { ApiKeyFieldView } from 'ls/workbench/contrib/preferences/browser/apiKeyField';
import {
  getEnabledLlmModelIdsForProvider,
  getLlmModelsForProvider,
  llmProviderIds,
  type LlmModelDefinition,
} from 'ls/workbench/services/llm/registry';

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

export type LlmFieldViewProps = {
  labels: SettingsPartLabels;
  activeLlmProvider: LlmProviderId;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  isSettingsSaving: boolean;
  isTestingLlmConnection: boolean;
  showApiKey: boolean;
  onToggleShowApiKey: () => void;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onLlmProviderModelEnabledChange: (
    provider: LlmProviderId,
    model: string,
    enabled: boolean,
  ) => void;
  onTestLlmConnection: () => void;
};

type LlmModelListEntry = {
  providerId: LlmProviderId;
  providerLabel: string;
  provider: LlmProviderSettings;
  model: LlmModelDefinition;
  enabledModelIds: string[];
};

export class LlmFieldView {
  private props: LlmFieldViewProps;
  private readonly element = el('div', 'settings-field');
  private readonly title = el('span');
  private readonly grid = el('div', 'settings-llm-grid');
  private readonly modelField = el('div', 'settings-field settings-llm-span-2');
  private readonly modelFieldTitle = el('span');
  private readonly modelPanel = el('div', 'settings-model-panel');
  private readonly modelSearchInput = setFocusKey(
    el('input', 'settings-native-input settings-model-search-input'),
    'settings.llm.modelSearch',
  );
  private readonly modelList = el('div', 'settings-model-list');
  private modelQuery = '';
  private readonly apiKeyField = new ApiKeyFieldView({
    title: '',
    value: '',
    placeholder: '',
    show: false,
    focusKey: 'settings.llm.apiKey',
    toggleKey: 'settings.llm.apiKey.toggle',
    toggleLabelShow: '',
    toggleLabelHide: '',
    onToggle: () => this.props.onToggleShowApiKey(),
    onInput: (value) =>
      this.props.onLlmProviderApiKeyChange(this.props.activeLlmProvider, value),
    testButtonLabel: '',
    testButtonKey: 'settings.llm.test',
    testButtonDisabled: false,
    onTest: () => this.props.onTestLlmConnection(),
    className: 'settings-field settings-llm-api-field',
  });

  constructor(props: LlmFieldViewProps) {
    this.props = props;
    this.modelSearchInput.type = 'text';
    this.modelSearchInput.autocomplete = 'off';
    this.modelSearchInput.spellcheck = false;
    this.modelSearchInput.addEventListener('input', () => {
      this.modelQuery = this.modelSearchInput.value;
      this.renderModelList();
    });
    this.modelPanel.append(this.modelSearchInput, this.modelList);
    this.modelField.append(this.modelFieldTitle, this.modelPanel);
    this.grid.append(this.modelField, this.apiKeyField.getElement());
    this.element.append(this.title, this.grid);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: LlmFieldViewProps) {
    this.props = props;
    this.title.textContent = this.props.labels.settingsLlmTitle;
    this.modelFieldTitle.textContent = this.props.labels.settingsLlmModel;
    this.modelSearchInput.placeholder = this.props.labels.settingsLlmSearchPlaceholder;
    if (this.modelSearchInput.value !== this.modelQuery) {
      this.modelSearchInput.value = this.modelQuery;
    }
    this.renderModelList();

    const provider = this.props.llmProviders[this.props.activeLlmProvider];
    const providerLabel = this.getProviderLabel(this.props.activeLlmProvider);
    this.apiKeyField.setProps({
      title: `${this.props.labels.settingsLlmApiKey} (${providerLabel})`,
      value: provider.apiKey,
      placeholder: this.props.labels.settingsLlmApiKeyPlaceholder,
      show: this.props.showApiKey,
      focusKey: 'settings.llm.apiKey',
      toggleKey: 'settings.llm.apiKey.toggle',
      toggleLabelShow: this.props.labels.settingsLlmShowApiKey,
      toggleLabelHide: this.props.labels.settingsLlmHideApiKey,
      onToggle: () => this.props.onToggleShowApiKey(),
      onInput: (value) =>
        this.props.onLlmProviderApiKeyChange(this.props.activeLlmProvider, value),
      testButtonLabel: this.props.labels.settingsLlmTestConnection,
      testButtonKey: 'settings.llm.test',
      testButtonDisabled: this.props.isSettingsSaving || this.props.isTestingLlmConnection,
      onTest: () => this.props.onTestLlmConnection(),
      className: 'settings-field settings-llm-api-field settings-llm-span-2',
    });
  }

  private getProviderLabel(providerId: LlmProviderId) {
    switch (providerId) {
      case 'glm':
        return this.props.labels.settingsLlmProviderGlm;
      case 'kimi':
        return this.props.labels.settingsLlmProviderKimi;
      case 'deepseek':
        return this.props.labels.settingsLlmProviderDeepSeek;
      default:
        return providerId;
    }
  }

  private getModelListEntries(): LlmModelListEntry[] {
    const entries: LlmModelListEntry[] = [];
    for (const providerId of llmProviderIds) {
      const provider = this.props.llmProviders[providerId];
      const enabledModelIds = getEnabledLlmModelIdsForProvider(
        providerId,
        provider.enabledModels,
      );
      const providerLabel = this.getProviderLabel(providerId);

      for (const model of getLlmModelsForProvider(providerId)) {
        entries.push({
          providerId,
          providerLabel,
          provider,
          model,
          enabledModelIds,
        });
      }
    }

    return entries;
  }

  private renderModelList() {
    const query = this.modelQuery.trim().toLowerCase();
    const entries = this.getModelListEntries().filter((entry) => {
      if (!query) {
        return true;
      }

      return [entry.model.label, entry.model.id, entry.providerLabel, entry.providerId].some(
        (value) => value.toLowerCase().includes(query),
      );
    });

    if (entries.length === 0) {
      const empty = el('div', 'settings-model-list-empty');
      empty.textContent = this.props.labels.settingsLlmNoResults;
      this.modelList.replaceChildren(empty);
      return;
    }

    this.modelList.replaceChildren(
      ...entries.map((entry) => this.renderModelListItem(entry)),
    );
  }

  private renderModelListItem(entry: LlmModelListEntry) {
    const isEnabled = entry.enabledModelIds.includes(entry.model.id);
    const isCurrent =
      this.props.activeLlmProvider === entry.providerId &&
      entry.provider.model === entry.model.id;
    const item = el(
      'div',
      [
        'settings-model-list-item',
        isCurrent ? 'is-current' : '',
        isEnabled ? '' : 'is-disabled',
      ]
        .filter(Boolean)
        .join(' '),
    );
    const nameButton = el('button', 'settings-model-list-button');
    nameButton.type = 'button';
    nameButton.disabled = !isEnabled;
    nameButton.title = entry.model.label;
    nameButton.addEventListener('click', () => {
      if (this.props.activeLlmProvider !== entry.providerId) {
        this.props.onActiveLlmProviderChange(entry.providerId);
      }
      this.props.onLlmProviderModelChange(entry.providerId, entry.model.id);
    });

    const titleRow = el('span', 'settings-model-list-title-row');
    const name = el('span', 'settings-model-list-name');
    name.textContent = entry.model.label;
    titleRow.append(name);

    const meta = el('span', 'settings-model-list-meta');
    meta.textContent = entry.model.id;
    nameButton.append(titleRow, meta);

    const switchView = createSwitchView({
      checked: isEnabled,
      disabled: isEnabled && entry.enabledModelIds.length <= 1,
      className: 'settings-model-list-switch',
      title: entry.model.label,
      onChange: (checked, event) => {
        event.stopPropagation();
        this.props.onLlmProviderModelEnabledChange(
          entry.providerId,
          entry.model.id,
          checked,
        );
      },
    });
    const switchElement = switchView.getElement();
    switchElement.addEventListener('click', (event) => event.stopPropagation());
    switchElement.addEventListener('mousedown', (event) => event.stopPropagation());

    item.append(nameButton, switchElement);
    return item;
  }
}
